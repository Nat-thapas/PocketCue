/** A vibration pattern: alternating vibrate/pause durations in milliseconds (starts with vibrate). */
export interface Pattern {
	id: string;
	name: string;
	sequence: number[];
	builtin?: boolean;
}

/** Whether an alert time is measured from the start or counted back from the planned end. */
export type AlertAnchor = 'elapsed' | 'remaining';

export interface TimedAlert {
	id: string;
	enabled: boolean;
	label: string;
	anchor: AlertAnchor;
	seconds: number;
	patternId: string;
}

export interface RepeatRule {
	enabled: boolean;
	everySeconds: number;
	patternId: string;
	label: string;
}

export interface EndAlert {
	enabled: boolean;
	patternId: string;
	label: string;
}

export interface Profile {
	id: string;
	name: string;
	/** Planned duration in seconds. 0 means open-ended (no end, no remaining-time alerts). */
	durationSeconds: number;
	alerts: TimedAlert[];
	/** Repeating pulse during the talk (stops at the planned end). */
	interval: RepeatRule;
	/** Alert fired exactly at the planned end. */
	end: EndAlert;
	/** Repeating alert after the planned end. */
	overtime: RepeatRule;
	/** Seconds remaining at which the screen turns amber. 0 = off. */
	warningSeconds: number;
	/** Seconds remaining at which the screen turns red. 0 = off. */
	criticalSeconds: number;
	/** Countdown before the timer starts, in seconds. */
	startDelaySeconds: number;
	/** Pattern played when the timer actually starts (after the countdown). null = none. */
	startPatternId: string | null;
	/** Seconds the −/+ buttons shift the timer by. null = use the default from settings. */
	nudgeSeconds: number | null;
	sound: boolean;
	flash: boolean;
	createdAt: number;
	updatedAt: number;
}

export type ClockMode = 'elapsed' | 'remaining';

export interface Settings {
	holdToConfirm: boolean;
	holdMs: number;
	defaultClock: ClockMode;
	autoPocket: boolean;
	/** Default nudge for the −/+ buttons, in seconds. */
	defaultNudgeSeconds: number;
	/** Enter full screen while presenting (ignored when installed as an app). */
	fullscreen: boolean;
}

/** A running (or paused) timer. Persisted so a reload doesn't lose it. */
export interface Session {
	profileId: string;
	/** Epoch ms at which elapsed time was 0 (in the future during the start countdown). */
	anchorEpoch: number;
	/** Elapsed ms when paused, or null while running. */
	pausedElapsedMs: number | null;
}
