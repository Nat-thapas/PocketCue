<script lang="ts" module>
	/**
	 * Last elapsed time we checked for events, kept across in-app navigation so that leaving and
	 * returning to the run screen catches up on cues that were due meanwhile.
	 */
	let checkpoint: { profileId: string; anchorEpoch: number; ms: number } | null = null;
</script>

<script lang="ts">
	import { onDestroy } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { Button } from '#lib/components/ui/button/index.js';
	import HoldButton from '#lib/components/hold-button.svelte';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import PlayIcon from '@lucide/svelte/icons/play';
	import PauseIcon from '@lucide/svelte/icons/pause';
	import SquareIcon from '@lucide/svelte/icons/square';
	import MoonStarIcon from '@lucide/svelte/icons/moon-star';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import SunIcon from '@lucide/svelte/icons/sun';
	import LockIcon from '@lucide/svelte/icons/lock';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
	import MaximizeIcon from '@lucide/svelte/icons/maximize';
	import MinimizeIcon from '@lucide/svelte/icons/minimize';
	import { store, sessionElapsed } from '#lib/store.svelte.js';
	import {
		eventsBetween,
		nextEvent,
		phaseAt,
		primaryEvent,
		timeline,
		type EventKind,
		type Phase,
		type ScheduledEvent
	} from '#lib/schedule.js';
	import { formatClock, formatDuration, formatShortDuration } from '#lib/format.js';
	import { play, stopVibration, unlockAudio, vibrationSupported } from '#lib/haptics.js';
	import { wakeLock } from '#lib/wake-lock.svelte.js';
	import { fullscreen } from '#lib/fullscreen.svelte.js';
	import type { ClockMode } from '#lib/types.js';
	import { toast } from 'svelte-sonner';
	import { cn } from '#lib/utils.js';

	const profile = $derived(store.profile(page.url.searchParams.get('id')));
	const session = $derived(
		store.session && profile && store.session.profileId === profile.id ? store.session : null
	);
	const otherSession = $derived(
		store.session && profile && store.session.profileId !== profile.id ? store.session : null
	);
	const otherProfile = $derived(otherSession ? store.profile(otherSession.profileId) : undefined);

	let now = $state(Date.now());
	let lastChecked = -Infinity;
	let clockMode = $state<ClockMode>(store.settings.defaultClock);
	let pocket = $state(false);
	let needsActivation = $state(false);
	let banner = $state<{ id: number; label: string; kind: EventKind } | null>(null);
	let flashId = $state(0);
	let bannerTimer: ReturnType<typeof setTimeout> | undefined;
	let flashTimer: ReturnType<typeof setTimeout> | undefined;

	const canVibrate = vibrationSupported();
	const hasDuration = $derived((profile?.durationSeconds ?? 0) > 0);
	const durationMs = $derived((profile?.durationSeconds ?? 0) * 1000);
	const elapsed = $derived(session ? sessionElapsed(session, now) : 0);
	const paused = $derived(session?.pausedElapsedMs != null);
	const counting = $derived(!!session && elapsed < 0);
	const phase = $derived<Phase>(
		profile && session && elapsed >= 0 ? phaseAt(profile, elapsed) : 'normal'
	);
	const nudgeSeconds = $derived(
		Math.max(1, profile?.nudgeSeconds ?? store.settings.defaultNudgeSeconds)
	);
	const nudgeLabel = $derived(formatShortDuration(nudgeSeconds));
	const mode = $derived<ClockMode>(hasDuration ? clockMode : 'elapsed');
	const upcoming = $derived(profile && session ? nextEvent(profile, elapsed) : null);
	const markers = $derived(
		profile && hasDuration
			? timeline(profile, 120, 0).filter((e) => e.atMs > 0 && e.atMs <= durationMs)
			: []
	);

	const mainClock = $derived.by(() => {
		if (!hasDuration || mode === 'elapsed') return formatClock(Math.max(0, elapsed));
		const remaining = durationMs - Math.max(0, elapsed);
		return remaining >= 0 ? formatClock(remaining, 'ceil') : `+${formatClock(-remaining)}`;
	});
	const subClock = $derived.by(() => {
		if (!hasDuration) return 'elapsed';
		if (mode === 'elapsed') {
			const remaining = durationMs - Math.max(0, elapsed);
			return remaining >= 0
				? `${formatClock(remaining, 'ceil')} remaining`
				: `+${formatClock(-remaining)} over`;
		}
		return `${formatClock(Math.max(0, elapsed))} elapsed`;
	});

	const PHASE_CLASS: Record<Phase, string> = {
		normal: 'bg-background text-foreground',
		warning: 'bg-amber-400 text-amber-950',
		critical: 'bg-red-600 text-white',
		overtime: 'bg-red-700 text-white overtime-pulse'
	};
	const coloured = $derived(phase !== 'normal');
	const ctrlClass = $derived(
		coloured
			? 'border-transparent bg-black/15 text-current hover:bg-black/25 hover:text-current'
			: ''
	);

	// --- Restore a session that survived a reload or navigation ---
	$effect.pre(() => {
		if (!session || !profile) return;
		if (lastChecked !== -Infinity) return;
		if (
			checkpoint &&
			checkpoint.profileId === profile.id &&
			checkpoint.anchorEpoch === session.anchorEpoch
		) {
			lastChecked = checkpoint.ms;
		} else {
			lastChecked = sessionElapsed(session);
		}
		const activated = navigator.userActivation?.hasBeenActive ?? true;
		if (!activated) needsActivation = true;
		else void wakeLock.request();
	});

	// --- Engine ---
	function tick() {
		now = Date.now();
		if (!session || !profile) return;
		const e = sessionElapsed(session, now);
		if (!paused && e > lastChecked) {
			const fired = eventsBetween(profile, lastChecked, e);
			lastChecked = e;
			if (fired.length) fire(fired);
		} else {
			lastChecked = e;
		}
		checkpoint = { profileId: profile.id, anchorEpoch: session.anchorEpoch, ms: lastChecked };
	}

	function fire(events: ScheduledEvent[]) {
		if (!profile) return;
		const primary = primaryEvent(events)!;
		play(store.pattern(primary.patternId).sequence, { sound: profile.sound });

		const labels = [primary.label, ...events.filter((e) => e !== primary).map((e) => e.label)];
		const label = [...new Set(labels)].join(' · ');
		if (profile.flash || pocket) {
			clearTimeout(bannerTimer);
			banner = { id: Date.now(), label, kind: primary.kind };
			bannerTimer = setTimeout(() => (banner = null), 3500);
		}
		if (profile.flash && !pocket) {
			clearTimeout(flashTimer);
			flashId = Date.now();
			flashTimer = setTimeout(() => (flashId = 0), 1500);
		}
	}

	$effect(() => {
		if (!session) return;
		const id = setInterval(tick, 100);
		const onVisible = () => document.visibilityState === 'visible' && tick();
		document.addEventListener('visibilitychange', onVisible);
		return () => {
			clearInterval(id);
			document.removeEventListener('visibilitychange', onVisible);
		};
	});

	onDestroy(() => {
		clearTimeout(bannerTimer);
		clearTimeout(flashTimer);
		void wakeLock.release();
		void fullscreen.exit();
	});

	/** Hide browser controls while presenting. Needs a user gesture, so only call from handlers. */
	function enterFullscreen() {
		if (store.settings.fullscreen) void fullscreen.enter();
	}

	// --- Controls ---
	function start() {
		if (!profile) return;
		unlockAudio();
		const delay = profile.startDelaySeconds * 1000;
		const anchorEpoch = Date.now() + delay;
		store.session = { profileId: profile.id, anchorEpoch, pausedElapsedMs: null };
		lastChecked = -delay - 1;
		checkpoint = { profileId: profile.id, anchorEpoch, ms: lastChecked };
		now = Date.now();
		void wakeLock.request();
		enterFullscreen();
		if (store.settings.autoPocket) pocket = true;
	}

	function togglePause() {
		if (!store.session || !session) return;
		const t = Date.now();
		if (store.session.pausedElapsedMs === null) {
			store.session.pausedElapsedMs = sessionElapsed(session, t);
			stopVibration();
		} else {
			unlockAudio();
			store.session.anchorEpoch = t - store.session.pausedElapsedMs;
			store.session.pausedElapsedMs = null;
			void wakeLock.request();
			enterFullscreen();
		}
		now = t;
		tick();
	}

	function adjust(deltaMs: number) {
		if (!store.session || !session) return;
		const t = Date.now();
		const current = sessionElapsed(session, t);
		const target = Math.max(0, current + deltaMs);
		const applied = target - current;
		if (store.session.pausedElapsedMs !== null) store.session.pausedElapsedMs = target;
		else store.session.anchorEpoch -= applied;
		// Skip over cues we jumped past instead of firing them all at once.
		lastChecked = target;
		now = t;
		tick();
	}

	function stop() {
		const final = elapsed;
		store.session = null;
		checkpoint = null;
		lastChecked = -Infinity;
		pocket = false;
		banner = null;
		stopVibration();
		void wakeLock.release();
		void fullscreen.exit();
		if (final > 0) toast(`Stopped at ${formatClock(final)}`);
	}

	function activate() {
		needsActivation = false;
		unlockAudio();
		void wakeLock.request();
		enterFullscreen();
	}

	// Double-tap to leave pocket mode.
	let lastTap = 0;
	function pocketTap() {
		const t = Date.now();
		if (t - lastTap < 400) {
			pocket = false;
			lastTap = 0;
		} else {
			lastTap = t;
		}
	}
</script>

<svelte:head>
	<title>{profile ? profile.name : 'Timer'} · PocketCue</title>
	<meta name="theme-color" content={pocket ? '#000000' : undefined} />
</svelte:head>

{#if !profile}
	<div class="grid min-h-dvh place-items-center p-6 text-center">
		<div class="grid justify-items-center gap-3">
			<p class="text-muted-foreground">This talk doesn't exist (anymore).</p>
			<Button href={resolve('/')} variant="outline"><ArrowLeftIcon /> Back to talks</Button>
		</div>
	</div>
{:else}
	<div
		class={cn(
			'flex min-h-dvh flex-col transition-colors duration-700 select-none',
			PHASE_CLASS[phase]
		)}
	>
		<!-- Top bar -->
		<div class="flex items-center gap-2 p-3">
			{#if !session || paused}
				<Button href={resolve('/')} variant="ghost" size="icon" aria-label="Back" class={ctrlClass}>
					<ArrowLeftIcon />
				</Button>
			{:else}
				<span class="size-8"></span>
			{/if}
			{#if fullscreen.available}<span class="size-8"></span>{/if}
			<div class="min-w-0 flex-1 text-center">
				<div class="truncate text-sm font-medium">{profile.name}</div>
				{#if session}
					<div class="flex items-center justify-center gap-1 text-xs opacity-70">
						{#if wakeLock.active}
							<SunIcon class="size-3" /> Screen stays on
						{:else}
							<TriangleAlertIcon class="size-3" /> Keep the screen on
						{/if}
						{#if store.settings.holdToConfirm}
							<span aria-hidden="true">·</span> <LockIcon class="size-3" /> Hold buttons
						{/if}
					</div>
				{/if}
			</div>
			{#if fullscreen.available}
				<Button
					variant="ghost"
					size="icon"
					aria-label={fullscreen.active ? 'Exit full screen' : 'Full screen'}
					class={ctrlClass}
					onclick={() => fullscreen.toggle()}
				>
					{#if fullscreen.active}<MinimizeIcon />{:else}<MaximizeIcon />{/if}
				</Button>
			{/if}
			{#if session}
				<Button
					variant="ghost"
					size="icon"
					aria-label="Pocket mode"
					class={ctrlClass}
					onclick={() => (pocket = true)}
				>
					<MoonStarIcon />
				</Button>
			{:else}
				<Button
					href={resolve(`/edit?id=${profile.id}`)}
					variant="ghost"
					size="icon"
					aria-label="Edit talk"
					class={ctrlClass}
				>
					<PencilIcon />
				</Button>
			{/if}
		</div>

		{#if !canVibrate}
			<p class="mx-4 rounded-2xl bg-amber-500/15 p-3 text-center text-xs">
				Vibration isn't supported in this browser — only flash{profile.sound ? ' and sound' : ''} cues
				will work.
			</p>
		{/if}

		<!-- Clock -->
		<div class="flex flex-1 flex-col items-center justify-center gap-6 px-4">
			{#if counting}
				<div class="grid justify-items-center gap-2">
					<div class="text-sm tracking-widest uppercase opacity-70">Starting in</div>
					<div class="text-[min(45vw,14rem)] leading-none font-semibold tabular-nums">
						{Math.ceil(-elapsed / 1000)}
					</div>
				</div>
			{:else if session}
				<button
					type="button"
					class="grid justify-items-center gap-1 rounded-3xl px-4 py-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
					onclick={() =>
						hasDuration && (clockMode = clockMode === 'elapsed' ? 'remaining' : 'elapsed')}
					aria-label="Switch between elapsed and remaining time"
				>
					<span
						class="text-[min(22vw,9rem)] leading-none font-semibold tracking-tight tabular-nums {paused
							? 'opacity-50'
							: ''}"
					>
						{mainClock}
					</span>
					<span class="text-base tabular-nums opacity-70">
						{paused ? 'Paused · ' : ''}{subClock}
					</span>
				</button>
			{:else}
				<div class="grid justify-items-center gap-2 text-center">
					<div class="text-[min(22vw,9rem)] leading-none font-semibold tracking-tight tabular-nums">
						{hasDuration ? formatClock(durationMs) : '0:00'}
					</div>
					<div class="text-sm text-muted-foreground">
						{hasDuration ? formatDuration(profile.durationSeconds) : 'Open-ended'}
						{#if profile.startDelaySeconds}· {profile.startDelaySeconds} s countdown{/if}
					</div>
				</div>
			{/if}

			{#if hasDuration}
				<div class="relative h-2 w-full max-w-md rounded-full bg-current/15">
					<div
						class="absolute inset-y-0 left-0 rounded-full bg-current/70"
						style:width="{Math.min(100, (Math.max(0, elapsed) / durationMs) * 100)}%"
					></div>
					{#each markers as m (m.key)}
						<div
							class="absolute top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current ring-2 ring-current/20"
							style:left="{(m.atMs / durationMs) * 100}%"
							title="{formatClock(m.atMs)} {m.label}"
						></div>
					{/each}
				</div>
			{/if}

			{#if session && upcoming}
				<div class="grid justify-items-center text-center">
					<div class="text-xs tracking-widest uppercase opacity-60">Next</div>
					<div class="max-w-xs truncate text-lg font-medium">{upcoming.label}</div>
					<div class="text-sm tabular-nums opacity-70">
						in {formatClock(upcoming.atMs - elapsed, 'ceil')} · {store.pattern(upcoming.patternId)
							.name}
					</div>
				</div>
			{:else if session && !counting}
				<div class="text-sm opacity-60">No more cues</div>
			{/if}
		</div>

		<!-- Controls -->
		<div class="mx-auto grid w-full max-w-md gap-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
			{#if session}
				{#if !counting}
					<div class="grid grid-cols-3 gap-3">
						<HoldButton
							variant="outline"
							size="lg"
							class={cn('h-14', ctrlClass)}
							onconfirm={() => adjust(-nudgeSeconds * 1000)}
						>
							−{nudgeLabel}
						</HoldButton>
						<HoldButton
							variant="secondary"
							size="lg"
							class={cn('h-14', ctrlClass)}
							onconfirm={togglePause}
						>
							{#if paused}<PlayIcon /> Resume{:else}<PauseIcon /> Pause{/if}
						</HoldButton>
						<HoldButton
							variant="outline"
							size="lg"
							class={cn('h-14', ctrlClass)}
							onconfirm={() => adjust(nudgeSeconds * 1000)}
						>
							+{nudgeLabel}
						</HoldButton>
					</div>
				{/if}
				<HoldButton
					variant={coloured ? 'secondary' : 'destructive'}
					size="lg"
					class={cn('h-14', ctrlClass)}
					onconfirm={stop}
				>
					<SquareIcon />
					{counting ? 'Cancel' : 'Stop'}
				</HoldButton>
			{:else}
				{#if otherSession}
					<p class="text-center text-xs text-muted-foreground">
						Starting will stop the timer running for “{otherProfile?.name ?? 'another talk'}”.
					</p>
				{/if}
				<Button size="lg" class="h-16 text-lg" onclick={start}><PlayIcon /> Start</Button>
			{/if}
		</div>
	</div>

	<!-- Alert flash -->
	{#if flashId}
		{#key flashId}
			<div class="flash pointer-events-none fixed inset-0 z-40 bg-white" aria-hidden="true"></div>
		{/key}
	{/if}

	<!-- Alert label -->
	{#if banner && !pocket}
		{#key banner.id}
			<div class="pointer-events-none fixed inset-x-0 top-1/4 z-40 flex justify-center px-4">
				<div
					class="banner max-w-full rounded-3xl bg-foreground px-8 py-5 text-center text-3xl font-semibold text-background shadow-2xl"
					role="status"
				>
					{banner.label}
				</div>
			</div>
		{/key}
	{/if}

	<!-- Pocket mode -->
	{#if pocket}
		<button
			type="button"
			class="fixed inset-0 z-50 flex cursor-default flex-col items-center justify-center gap-3 bg-black text-neutral-600 outline-none"
			onclick={pocketTap}
			aria-label="Pocket mode. Double-tap to exit."
		>
			<span
				class={cn(
					'text-5xl font-semibold tabular-nums',
					phase === 'warning' && 'text-amber-700',
					(phase === 'critical' || phase === 'overtime') && 'text-red-800'
				)}
			>
				{counting ? Math.ceil(-elapsed / 1000) : mainClock}
			</span>
			{#if banner}
				<span class="text-lg text-neutral-500">{banner.label}</span>
			{:else if upcoming}
				<span class="text-sm">Next: {upcoming.label}</span>
			{/if}
			<span class="absolute bottom-8 text-xs text-neutral-800">Double-tap to exit</span>
		</button>
	{/if}

	<!-- Re-arm after reload -->
	{#if needsActivation}
		<button
			type="button"
			class="fixed inset-0 z-[60] grid place-items-center bg-background/95 p-6 text-center backdrop-blur"
			onclick={activate}
		>
			<span class="grid gap-2">
				<span class="text-xl font-semibold">Tap to resume alerts</span>
				<span class="text-sm text-muted-foreground">
					The timer kept running, but the browser needs a tap before it can vibrate again.
				</span>
			</span>
		</button>
	{/if}
{/if}

<style>
	.flash {
		animation: flash 1.2s ease-out forwards;
	}
	@keyframes flash {
		0%,
		30% {
			opacity: 0.9;
		}
		15%,
		50%,
		100% {
			opacity: 0;
		}
		40% {
			opacity: 0.7;
		}
	}
	.banner {
		animation: banner 3.5s ease-out forwards;
	}
	@keyframes banner {
		0% {
			opacity: 0;
			transform: scale(0.9);
		}
		6%,
		85% {
			opacity: 1;
			transform: scale(1);
		}
		100% {
			opacity: 0;
		}
	}
	:global(.overtime-pulse) {
		animation: overtime 2s ease-in-out infinite;
	}
	@keyframes overtime {
		50% {
			background-color: oklch(39.6% 0.141 25.723);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.flash {
			animation-duration: 0.6s;
		}
		:global(.overtime-pulse) {
			animation: none;
		}
	}
</style>
