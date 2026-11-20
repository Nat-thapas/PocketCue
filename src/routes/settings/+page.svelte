<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import * as ToggleGroup from '#lib/components/ui/toggle-group/index.js';
	import * as AlertDialog from '#lib/components/ui/alert-dialog/index.js';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { Switch } from '#lib/components/ui/switch/index.js';
	import { Separator } from '#lib/components/ui/separator/index.js';
	import CheckIcon from '@lucide/svelte/icons/check';
	import XIcon from '@lucide/svelte/icons/x';
	import VibrateIcon from '@lucide/svelte/icons/vibrate';
	import { setMode, resetMode, userPrefersMode } from 'mode-watcher';
	import { store } from '#lib/store.svelte.js';
	import { vibrationSupported, vibrate } from '#lib/haptics.js';
	import { wakeLock } from '#lib/wake-lock.svelte.js';
	import { fullscreen } from '#lib/fullscreen.svelte.js';
	import DurationInput from '#lib/components/duration-input.svelte';
	import type { ClockMode } from '#lib/types.js';
	import { toast } from 'svelte-sonner';

	const support = [
		{ label: 'Vibration', ok: vibrationSupported() },
		{ label: 'Keep screen awake (Wake Lock)', ok: wakeLock.supported },
		{ label: 'Full screen', ok: fullscreen.supported },
		{ label: 'Secure context (HTTPS)', ok: typeof window !== 'undefined' && window.isSecureContext }
	];

	let resetOpen = $state(false);
</script>

<svelte:head>
	<title>Settings · PocketCue</title>
</svelte:head>

<div class="grid gap-4">
	<h1 class="text-2xl font-semibold tracking-tight">Settings</h1>

	<Card.Root>
		<Card.Header>
			<Card.Title>Appearance</Card.Title>
		</Card.Header>
		<Card.Content class="grid gap-2">
			<Label>Theme</Label>
			<ToggleGroup.Root
				type="single"
				variant="outline"
				value={userPrefersMode.current}
				onValueChange={(v) => {
					if (v === 'light' || v === 'dark') setMode(v);
					else if (v === 'system') resetMode();
				}}
				class="justify-start"
			>
				<ToggleGroup.Item value="light" class="px-3">Light</ToggleGroup.Item>
				<ToggleGroup.Item value="dark" class="px-3">Dark</ToggleGroup.Item>
				<ToggleGroup.Item value="system" class="px-3">System</ToggleGroup.Item>
			</ToggleGroup.Root>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>While presenting</Card.Title>
		</Card.Header>
		<Card.Content class="grid gap-4">
			<div class="flex items-center justify-between gap-4">
				<Label for="hold" class="grid gap-1">
					<span>Hold to confirm</span>
					<span class="text-xs font-normal text-muted-foreground">
						Pause, stop and time adjustments need a press-and-hold, so a stray tap does nothing.
					</span>
				</Label>
				<Switch id="hold" bind:checked={store.settings.holdToConfirm} />
			</div>
			{#if store.settings.holdToConfirm}
				<div class="grid gap-2">
					<Label>Hold duration</Label>
					<ToggleGroup.Root
						type="single"
						variant="outline"
						value={String(store.settings.holdMs)}
						onValueChange={(v) => v && (store.settings.holdMs = Number(v))}
						class="justify-start"
					>
						{#each [500, 800, 1200, 2000] as ms (ms)}
							<ToggleGroup.Item value={String(ms)} class="px-3">{ms / 1000} s</ToggleGroup.Item>
						{/each}
					</ToggleGroup.Root>
				</div>
			{/if}
			<Separator />
			<div class="flex items-center justify-between gap-4">
				<Label for="pocket" class="grid gap-1">
					<span>Start in pocket mode</span>
					<span class="text-xs font-normal text-muted-foreground">
						Black, dimmed screen that saves battery and hides the timer. Double-tap to leave it.
					</span>
				</Label>
				<Switch id="pocket" bind:checked={store.settings.autoPocket} />
			</div>
			<Separator />
			<div class="flex items-center justify-between gap-4">
				<Label for="fullscreen" class="grid gap-1">
					<span>Go full screen</span>
					<span class="text-xs font-normal text-muted-foreground">
						Hide the browser's address bar and buttons while presenting, so they're harder to hit by
						accident. Not needed when PocketCue is installed as an app.
					</span>
				</Label>
				<Switch id="fullscreen" bind:checked={store.settings.fullscreen} />
			</div>
			<Separator />
			<div class="grid gap-2">
				<Label for="nudge">Default nudge</Label>
				<DurationInput
					id="nudge"
					bind:value={
						() => store.settings.defaultNudgeSeconds,
						(v) => (store.settings.defaultNudgeSeconds = Math.max(1, v))
					}
				/>
				<p class="text-xs text-muted-foreground">
					How far the −/+ buttons shift the timer. Each talk can override this.
				</p>
			</div>
			<Separator />
			<div class="grid gap-2">
				<Label>Main clock shows</Label>
				<ToggleGroup.Root
					type="single"
					variant="outline"
					value={store.settings.defaultClock}
					onValueChange={(v) => v && (store.settings.defaultClock = v as ClockMode)}
					class="justify-start"
				>
					<ToggleGroup.Item value="remaining" class="px-3">Time remaining</ToggleGroup.Item>
					<ToggleGroup.Item value="elapsed" class="px-3">Time elapsed</ToggleGroup.Item>
				</ToggleGroup.Root>
				<p class="text-xs text-muted-foreground">You can also tap the clock to switch.</p>
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>This device</Card.Title>
			<Card.Description>
				Keep the timer screen open while presenting: Android can't vibrate from a background tab or
				with the screen off.
			</Card.Description>
		</Card.Header>
		<Card.Content class="grid gap-3">
			<ul class="grid gap-2 text-sm">
				{#each support as s (s.label)}
					<li class="flex items-center gap-2">
						{#if s.ok}
							<CheckIcon class="size-4 text-emerald-600 dark:text-emerald-400" />
						{:else}
							<XIcon class="size-4 text-destructive" />
						{/if}
						{s.label}
					</li>
				{/each}
			</ul>
			<Button
				variant="outline"
				class="justify-self-start"
				onclick={() => {
					if (!vibrate([200, 100, 200])) toast.error('Vibration is not available here');
				}}
			>
				<VibrateIcon /> Test vibration
			</Button>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Data</Card.Title>
			<Card.Description>Everything is stored only in this browser.</Card.Description>
		</Card.Header>
		<Card.Content>
			<Button variant="destructive" onclick={() => (resetOpen = true)}>Reset all data</Button>
		</Card.Content>
	</Card.Root>
</div>

<AlertDialog.Root bind:open={resetOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Reset everything?</AlertDialog.Title>
			<AlertDialog.Description>
				All talks, custom patterns and settings will be deleted.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action
				class={buttonVariants({ variant: 'destructive' })}
				onclick={() => {
					store.resetAll();
					resetOpen = false;
					toast.success('All data reset');
				}}
			>
				Reset
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
