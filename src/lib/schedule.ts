import { formatClock } from './format';
import type { Profile } from './types';

export type EventKind = 'start' | 'alert' | 'interval' | 'end' | 'overtime';

export interface ScheduledEvent {
	/** Elapsed time (ms since start) at which the event fires. */
	atMs: number;
	kind: EventKind;
	label: string;
	patternId: string;
	key: string;
}

const PRIORITY: Record<EventKind, number> = {
	end: 5,
	alert: 4,
	start: 3,
	overtime: 2,
	interval: 1
};

/** Upper bound on repeating events generated for a single query (e.g. after the tab was hidden). */
const MAX_REPEATS = 3;

function intervalEvent(p: Profile, k: number): ScheduledEvent {
	const at = k * p.interval.everySeconds * 1000;
	return {
		atMs: at,
		kind: 'interval',
		label: p.interval.label.trim() || formatClock(at),
		patternId: p.interval.patternId,
		key: `interval-${k}`
	};
}

function overtimeEvent(p: Profile, k: number): ScheduledEvent {
	const over = k * p.overtime.everySeconds * 1000;
	const at = p.durationSeconds * 1000 + over;
	const auto = `+${formatClock(over)} over`;
	return {
		atMs: at,
		kind: 'overtime',
		label: p.overtime.label.trim() ? `${p.overtime.label.trim()} (${auto})` : auto,
		patternId: p.overtime.patternId,
		key: `overtime-${k}`
	};
}

const hasInterval = (p: Profile) => p.interval.enabled && p.interval.everySeconds > 0;
const hasOvertime = (p: Profile) =>
	p.durationSeconds > 0 && p.overtime.enabled && p.overtime.everySeconds > 0;

/** Events that happen once: start, explicit alerts and the end alert. */
export function staticEvents(p: Profile): ScheduledEvent[] {
	const out: ScheduledEvent[] = [];
	const dur = p.durationSeconds * 1000;

	if (p.startPatternId) {
		out.push({ atMs: 0, kind: 'start', label: 'Go', patternId: p.startPatternId, key: 'start' });
	}

	for (const a of p.alerts) {
		if (!a.enabled) continue;
		let at: number;
		if (a.anchor === 'elapsed') {
			at = a.seconds * 1000;
		} else {
			if (dur <= 0) continue;
			at = dur - a.seconds * 1000;
		}
		if (at < 0) continue;
		const auto =
			a.anchor === 'elapsed'
				? `${formatClock(a.seconds * 1000)} in`
				: `${formatClock(a.seconds * 1000)} left`;
		out.push({
			atMs: at,
			kind: 'alert',
			label: a.label.trim() || auto,
			patternId: a.patternId,
			key: `alert-${a.id}`
		});
	}

	if (dur > 0 && p.end.enabled) {
		out.push({
			atMs: dur,
			kind: 'end',
			label: p.end.label.trim() || "Time's up",
			patternId: p.end.patternId,
			key: 'end'
		});
	}

	return out.sort((a, b) => a.atMs - b.atMs);
}

/** All events with `fromMs < atMs <= toMs`. */
export function eventsBetween(p: Profile, fromMs: number, toMs: number): ScheduledEvent[] {
	if (toMs <= fromMs) return [];
	const out = staticEvents(p).filter((e) => e.atMs > fromMs && e.atMs <= toMs);
	const dur = p.durationSeconds * 1000;

	if (hasInterval(p)) {
		const every = p.interval.everySeconds * 1000;
		const kMax = Math.floor(toMs / every);
		let k = Math.max(1, Math.floor(fromMs / every) + 1, kMax - MAX_REPEATS + 1);
		for (; k <= kMax; k++) {
			if (dur > 0 && k * every >= dur) break;
			out.push(intervalEvent(p, k));
		}
	}

	if (hasOvertime(p)) {
		const every = p.overtime.everySeconds * 1000;
		const kMax = Math.floor((toMs - dur) / every);
		let k = Math.max(1, Math.floor((fromMs - dur) / every) + 1, kMax - MAX_REPEATS + 1);
		for (; k <= kMax; k++) out.push(overtimeEvent(p, k));
	}

	return out.sort((a, b) => a.atMs - b.atMs);
}

/** The first event strictly after `fromMs`. */
export function nextEvent(p: Profile, fromMs: number): ScheduledEvent | null {
	const candidates: ScheduledEvent[] = [];
	const first = staticEvents(p).find((e) => e.atMs > fromMs);
	if (first) candidates.push(first);
	const dur = p.durationSeconds * 1000;

	if (hasInterval(p)) {
		const every = p.interval.everySeconds * 1000;
		const k = Math.max(1, Math.floor(fromMs / every) + 1);
		if (dur <= 0 || k * every < dur) candidates.push(intervalEvent(p, k));
	}
	if (hasOvertime(p)) {
		const every = p.overtime.everySeconds * 1000;
		const k = Math.max(1, Math.floor((fromMs - dur) / every) + 1);
		candidates.push(overtimeEvent(p, k));
	}

	if (!candidates.length) return null;
	return candidates.reduce((best, e) =>
		e.atMs < best.atMs || (e.atMs === best.atMs && PRIORITY[e.kind] > PRIORITY[best.kind])
			? e
			: best
	);
}

/** When several events fire together, the most important one decides the vibration. */
export function primaryEvent(events: ScheduledEvent[]): ScheduledEvent | null {
	if (!events.length) return null;
	return events.reduce((best, e) => {
		const pe = PRIORITY[e.kind];
		const pb = PRIORITY[best.kind];
		return pe > pb || (pe === pb && e.atMs > best.atMs) ? e : best;
	});
}

/** A chronological preview of the whole plan (for the editor and progress bar). */
export function timeline(p: Profile, maxRepeats = 60, overtimePreview = 2): ScheduledEvent[] {
	const out = staticEvents(p);
	const dur = p.durationSeconds * 1000;
	if (hasInterval(p)) {
		const every = p.interval.everySeconds * 1000;
		for (let k = 1; k <= maxRepeats; k++) {
			if (dur > 0 && k * every >= dur) break;
			out.push(intervalEvent(p, k));
		}
	}
	if (hasOvertime(p)) {
		for (let k = 1; k <= overtimePreview; k++) out.push(overtimeEvent(p, k));
	}
	return out.sort((a, b) => a.atMs - b.atMs || PRIORITY[b.kind] - PRIORITY[a.kind]);
}

export type Phase = 'normal' | 'warning' | 'critical' | 'overtime';

export function phaseAt(p: Profile, elapsedMs: number): Phase {
	const dur = p.durationSeconds * 1000;
	if (dur <= 0) return 'normal';
	const remaining = dur - elapsedMs;
	if (remaining <= 0) return 'overtime';
	if (p.criticalSeconds > 0 && remaining <= p.criticalSeconds * 1000) return 'critical';
	if (p.warningSeconds > 0 && remaining <= p.warningSeconds * 1000) return 'warning';
	return 'normal';
}
