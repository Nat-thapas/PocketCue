export function vibrationSupported(): boolean {
	return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

export function vibrate(sequence: number[]): boolean {
	if (!vibrationSupported()) return false;
	try {
		return navigator.vibrate(sequence);
	} catch {
		return false;
	}
}

export function stopVibration() {
	if (vibrationSupported()) {
		try {
			navigator.vibrate(0);
		} catch {
			// ignore
		}
	}
}

let ctx: AudioContext | null = null;

/** Create/resume the audio context. Call from a user gesture (e.g. the Start button). */
export function unlockAudio() {
	try {
		ctx ??= new AudioContext();
		if (ctx.state === 'suspended') void ctx.resume();
	} catch {
		ctx = null;
	}
}

/** Play beeps that mirror a vibration pattern. */
export function beep(sequence: number[], frequency = 880) {
	unlockAudio();
	if (!ctx) return;
	const osc = ctx.createOscillator();
	const gain = ctx.createGain();
	osc.type = 'sine';
	osc.frequency.value = frequency;
	osc.connect(gain).connect(ctx.destination);

	let t = ctx.currentTime + 0.02;
	gain.gain.setValueAtTime(0, t);
	sequence.forEach((ms, i) => {
		const d = Math.max(ms, 0) / 1000;
		if (i % 2 === 0 && d > 0) {
			const len = Math.max(d, 0.04);
			gain.gain.setValueAtTime(0, t);
			gain.gain.linearRampToValueAtTime(0.25, t + 0.01);
			gain.gain.setValueAtTime(0.25, t + len - 0.015);
			gain.gain.linearRampToValueAtTime(0, t + len);
			t += len;
		} else {
			t += d;
		}
	});
	osc.start();
	osc.stop(t + 0.05);
}

/** Vibrate (and optionally beep) a pattern. */
export function play(sequence: number[], opts: { sound?: boolean } = {}) {
	vibrate(sequence);
	if (opts.sound) beep(sequence);
}
