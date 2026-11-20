const pad = (n: number) => String(n).padStart(2, '0');

/** Format milliseconds as m:ss or h:mm:ss. `round` controls how partial seconds are treated. */
export function formatClock(ms: number, round: 'floor' | 'ceil' = 'floor'): string {
	const neg = ms < 0;
	const raw = Math.abs(ms) / 1000;
	const total = round === 'ceil' ? Math.ceil(raw - 1e-6) : Math.floor(raw + 1e-6);
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = total % 60;
	const body = h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
	return (neg && total > 0 ? '-' : '') + body;
}

/** Human-friendly duration, e.g. "12 min", "1 h 5 min", "2 min 30 s". */
export function formatDuration(seconds: number): string {
	if (seconds <= 0) return '0 s';
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = seconds % 60;
	const parts: string[] = [];
	if (h) parts.push(`${h} h`);
	if (m) parts.push(`${m} min`);
	if (s) parts.push(`${s} s`);
	return parts.join(' ');
}

export function uid(): string {
	if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
		try {
			return crypto.randomUUID();
		} catch {
			// not a secure context
		}
	}
	return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

/** Compact duration for button labels, e.g. "30 s", "1 min", "1:30". */
export function formatShortDuration(seconds: number): string {
	if (seconds < 60) return `${seconds} s`;
	if (seconds % 60 === 0) return `${seconds / 60} min`;
	return formatClock(seconds * 1000);
}
