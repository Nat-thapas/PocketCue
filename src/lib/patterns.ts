import type { Pattern } from './types';

export const BUILTIN_PATTERNS: Pattern[] = [
	{ id: 'tap', name: 'Tap', sequence: [80] },
	{ id: 'short', name: 'Short', sequence: [250] },
	{ id: 'long', name: 'Long', sequence: [900] },
	{ id: 'double', name: 'Double', sequence: [200, 150, 200] },
	{ id: 'triple', name: 'Triple', sequence: [200, 150, 200, 150, 200] },
	{ id: 'long-short', name: 'Long – short', sequence: [700, 200, 200] },
	{ id: 'triple-long', name: 'Triple long', sequence: [600, 300, 600, 300, 600] },
	{ id: 'escalating', name: 'Escalating', sequence: [100, 200, 200, 200, 350, 200, 600] },
	{
		id: 'sos',
		name: 'SOS',
		sequence: [150, 100, 150, 100, 150, 300, 450, 100, 450, 100, 450, 300, 150, 100, 150, 100, 150]
	},
	{ id: 'alarm', name: 'Alarm', sequence: [500, 200, 500, 200, 500, 200, 500, 200, 500] }
].map((p) => ({ ...p, builtin: true }));

export const FALLBACK_PATTERN_ID = 'short';

export const MAX_SEGMENT_MS = 10_000;
export const MAX_SEGMENTS = 64;

/** Clamp a sequence to something the Vibration API will accept. */
export function sanitizeSequence(seq: number[]): number[] {
	const out = seq
		.map((n) => Math.round(Number(n)))
		.filter((n) => Number.isFinite(n))
		.map((n) => Math.min(MAX_SEGMENT_MS, Math.max(0, n)))
		.slice(0, MAX_SEGMENTS);
	return out.length ? out : [200];
}

export function parseSequence(text: string): number[] {
	return text
		.split(/[\s,;]+/)
		.filter(Boolean)
		.map(Number)
		.filter((n) => Number.isFinite(n));
}

export function sequenceDuration(seq: number[]): number {
	return seq.reduce((a, b) => a + b, 0);
}
