/** Keeps the screen on while wanted, re-acquiring the lock when the page becomes visible again. */
class WakeLockManager {
	active = $state(false);
	readonly supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
	#sentinel: WakeLockSentinel | null = null;
	#wanted = false;

	constructor() {
		if (typeof document !== 'undefined') {
			document.addEventListener('visibilitychange', () => {
				if (this.#wanted && document.visibilityState === 'visible') void this.#acquire();
			});
		}
	}

	async request() {
		this.#wanted = true;
		await this.#acquire();
	}

	async release() {
		this.#wanted = false;
		const s = this.#sentinel;
		this.#sentinel = null;
		this.active = false;
		await s?.release().catch(() => {});
	}

	async #acquire() {
		if (!this.supported || this.#sentinel) return;
		try {
			const s = await navigator.wakeLock.request('screen');
			if (!this.#wanted) {
				await s.release();
				return;
			}
			this.#sentinel = s;
			this.active = true;
			s.addEventListener('release', () => {
				if (this.#sentinel === s) this.#sentinel = null;
				this.active = false;
			});
		} catch {
			this.active = false;
		}
	}
}

export const wakeLock = new WakeLockManager();
