/** Thin wrapper around the Fullscreen API, used to hide browser controls while presenting. */
class FullscreenManager {
	active = $state(false);
	readonly supported =
		typeof document !== 'undefined' &&
		document.fullscreenEnabled &&
		typeof document.documentElement.requestFullscreen === 'function';

	constructor() {
		if (typeof document !== 'undefined') {
			document.addEventListener('fullscreenchange', () => {
				this.active = document.fullscreenElement !== null;
			});
		}
	}

	/** True when running as an installed app, where the browser UI is already hidden. */
	get standalone(): boolean {
		return (
			typeof matchMedia !== 'undefined' &&
			matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches
		);
	}

	get available(): boolean {
		// Enable fullscreen for standalone mode as well
		// since notification bar and navigation bar are still visible
		return this.supported; // && !this.standalone;
	}

	/** Must be called from a user gesture (or shortly after one). */
	async enter() {
		if (!this.available || document.fullscreenElement) return;
		try {
			await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
		} catch {
			// Not allowed right now (e.g. no user activation) — ignore.
		}
	}

	async exit() {
		if (typeof document === 'undefined' || !document.fullscreenElement) return;
		try {
			await document.exitFullscreen();
		} catch {
			// ignore
		}
	}

	toggle() {
		return this.active ? this.exit() : this.enter();
	}
}

export const fullscreen = new FullscreenManager();
