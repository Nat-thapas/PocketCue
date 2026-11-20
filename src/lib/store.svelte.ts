import { browser } from '$app/env';
import { uid } from './format';
import { BUILTIN_PATTERNS, FALLBACK_PATTERN_ID } from './patterns';
import type { Pattern, Profile, Session, Settings, TimedAlert } from './types';

const KEYS = {
	profiles: 'pocketcue:profiles',
	patterns: 'pocketcue:patterns',
	settings: 'pocketcue:settings',
	session: 'pocketcue:session'
} as const;

function load<T>(key: string, fallback: T): T {
	if (!browser) return fallback;
	try {
		const raw = localStorage.getItem(key);
		return raw ? (JSON.parse(raw) as T) : fallback;
	} catch {
		return fallback;
	}
}

function save(key: string, value: unknown) {
	if (!browser) return;
	try {
		if (value === null || value === undefined) localStorage.removeItem(key);
		else localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// storage full or blocked
	}
}

export const DEFAULT_SETTINGS: Settings = {
	holdToConfirm: true,
	holdMs: 800,
	defaultClock: 'remaining',
	autoPocket: false,
	defaultNudgeSeconds: 60,
	fullscreen: true
};

export function createAlert(partial: Partial<TimedAlert> = {}): TimedAlert {
	return {
		id: uid(),
		enabled: true,
		label: '',
		anchor: 'remaining',
		seconds: 120,
		patternId: 'double',
		...partial
	};
}

export function createProfile(partial: Partial<Profile> = {}): Profile {
	const now = Date.now();
	return {
		id: uid(),
		name: 'New talk',
		durationSeconds: 15 * 60,
		alerts: [],
		interval: { enabled: false, everySeconds: 5 * 60, patternId: 'tap', label: '' },
		end: { enabled: true, patternId: 'long-short', label: "Time's up" },
		overtime: { enabled: true, everySeconds: 60, patternId: 'alarm', label: '' },
		warningSeconds: 2 * 60,
		criticalSeconds: 60,
		startDelaySeconds: 3,
		startPatternId: 'tap',
		nudgeSeconds: null,
		sound: false,
		flash: true,
		createdAt: now,
		updatedAt: now,
		...partial
	};
}

function sampleProfile(): Profile {
	return createProfile({
		name: '10-minute talk',
		durationSeconds: 10 * 60,
		alerts: [
			createAlert({ label: 'Halfway', anchor: 'elapsed', seconds: 5 * 60, patternId: 'double' }),
			createAlert({ label: 'Wrap up', anchor: 'remaining', seconds: 2 * 60, patternId: 'triple' })
		]
	});
}

/** Fill in missing fields from older stored data. */
function normalizeProfile(raw: Partial<Profile>): Profile {
	const base = createProfile();
	return {
		...base,
		...raw,
		interval: { ...base.interval, ...raw.interval },
		end: { ...base.end, ...raw.end },
		overtime: { ...base.overtime, ...raw.overtime },
		alerts: (raw.alerts ?? []).map((a) => createAlert(a)),
		id: raw.id ?? base.id
	};
}

class AppStore {
	profiles = $state<Profile[]>([]);
	customPatterns = $state<Pattern[]>([]);
	settings = $state<Settings>({ ...DEFAULT_SETTINGS });
	session = $state<Session | null>(null);

	constructor() {
		const stored = load<Partial<Profile>[] | null>(KEYS.profiles, null);
		this.profiles = stored ? stored.map(normalizeProfile) : [sampleProfile()];
		this.customPatterns = load<Pattern[]>(KEYS.patterns, []).map((p) => ({ ...p, builtin: false }));
		this.settings = { ...DEFAULT_SETTINGS, ...load<Partial<Settings>>(KEYS.settings, {}) };
		this.session = load<Session | null>(KEYS.session, null);

		$effect.root(() => {
			$effect(() => save(KEYS.profiles, $state.snapshot(this.profiles)));
			$effect(() => save(KEYS.patterns, $state.snapshot(this.customPatterns)));
			$effect(() => save(KEYS.settings, $state.snapshot(this.settings)));
			$effect(() => save(KEYS.session, $state.snapshot(this.session)));
		});
	}

	get patterns(): Pattern[] {
		return [...BUILTIN_PATTERNS, ...this.customPatterns];
	}

	pattern(id: string | null | undefined): Pattern {
		return (
			this.patterns.find((p) => p.id === id) ??
			BUILTIN_PATTERNS.find((p) => p.id === FALLBACK_PATTERN_ID)!
		);
	}

	profile(id: string | null | undefined): Profile | undefined {
		return this.profiles.find((p) => p.id === id);
	}

	addProfile(partial: Partial<Profile> = {}): Profile {
		this.profiles.push(createProfile(partial));
		return this.profiles[this.profiles.length - 1];
	}

	duplicateProfile(id: string): Profile | undefined {
		const src = this.profile(id);
		if (!src) return;
		const copy: Profile = $state.snapshot(src);
		const now = Date.now();
		copy.id = uid();
		copy.name = `${src.name} (copy)`;
		copy.alerts = copy.alerts.map((a) => ({ ...a, id: uid() }));
		copy.createdAt = now;
		copy.updatedAt = now;
		const index = this.profiles.findIndex((p) => p.id === id);
		this.profiles.splice(index + 1, 0, copy);
		return this.profiles[index + 1];
	}

	deleteProfile(id: string) {
		this.profiles = this.profiles.filter((p) => p.id !== id);
		if (this.session?.profileId === id) this.session = null;
	}

	addPattern(name: string, sequence: number[]): Pattern {
		this.customPatterns.push({ id: `custom-${uid()}`, name, sequence, builtin: false });
		return this.customPatterns[this.customPatterns.length - 1];
	}

	updatePattern(id: string, name: string, sequence: number[]) {
		const p = this.customPatterns.find((x) => x.id === id);
		if (p) {
			p.name = name;
			p.sequence = sequence;
		}
	}

	/** Profiles that reference a pattern. */
	patternUsage(id: string): Profile[] {
		return this.profiles.filter(
			(p) =>
				p.startPatternId === id ||
				p.interval.patternId === id ||
				p.end.patternId === id ||
				p.overtime.patternId === id ||
				p.alerts.some((a) => a.patternId === id)
		);
	}

	/** Delete a custom pattern, pointing anything that used it at the fallback pattern. */
	deletePattern(id: string) {
		for (const p of this.patternUsage(id)) {
			if (p.startPatternId === id) p.startPatternId = FALLBACK_PATTERN_ID;
			if (p.interval.patternId === id) p.interval.patternId = FALLBACK_PATTERN_ID;
			if (p.end.patternId === id) p.end.patternId = FALLBACK_PATTERN_ID;
			if (p.overtime.patternId === id) p.overtime.patternId = FALLBACK_PATTERN_ID;
			for (const a of p.alerts) if (a.patternId === id) a.patternId = FALLBACK_PATTERN_ID;
		}
		this.customPatterns = this.customPatterns.filter((p) => p.id !== id);
	}

	resetAll() {
		this.profiles = [sampleProfile()];
		this.customPatterns = [];
		this.settings = { ...DEFAULT_SETTINGS };
		this.session = null;
	}
}

export const store = new AppStore();

/** Elapsed ms for a session at `now` (negative during the start countdown). */
export function sessionElapsed(s: Session, now = Date.now()): number {
	return s.pausedElapsedMs ?? now - s.anchorEpoch;
}
