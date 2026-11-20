<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import * as Card from '#lib/components/ui/card/index.js';
	import * as ToggleGroup from '#lib/components/ui/toggle-group/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { Switch } from '#lib/components/ui/switch/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Separator } from '#lib/components/ui/separator/index.js';
	import DurationInput from '#lib/components/duration-input.svelte';
	import PatternSelect from '#lib/components/pattern-select.svelte';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import PlayIcon from '@lucide/svelte/icons/play';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import { store, createAlert } from '#lib/store.svelte.js';
	import { timeline, type EventKind } from '#lib/schedule.js';
	import { formatClock, formatDuration, formatShortDuration } from '#lib/format.js';
	import type { AlertAnchor, TimedAlert } from '#lib/types.js';

	const profile = $derived(store.profile(page.url.searchParams.get('id')));
	const events = $derived(profile ? timeline(profile, 30, 2) : []);

	const KIND_LABEL: Record<EventKind, string> = {
		start: 'Start',
		alert: 'Alert',
		interval: 'Repeat',
		end: 'End',
		overtime: 'Overtime'
	};

	function addAlert() {
		if (!profile) return;
		const last = profile.alerts.at(-1);
		profile.alerts.push(
			createAlert({
				anchor: last?.anchor ?? (profile.durationSeconds > 0 ? 'remaining' : 'elapsed'),
				patternId: last?.patternId ?? 'double'
			})
		);
	}

	function alertProblem(a: TimedAlert): string | null {
		if (!profile) return null;
		const dur = profile.durationSeconds;
		if (a.anchor === 'remaining' && dur <= 0) return 'Needs a planned duration.';
		if (a.anchor === 'remaining' && a.seconds > dur) return 'Longer than the talk — will not fire.';
		if (a.anchor === 'elapsed' && dur > 0 && a.seconds > dur)
			return 'After the planned end (fires in overtime).';
		return null;
	}
</script>

<svelte:head>
	<title>{profile ? `Edit ${profile.name}` : 'Edit'} · PocketCue</title>
</svelte:head>

{#if !profile}
	<Card.Root>
		<Card.Content class="grid justify-items-center gap-3 py-8 text-center">
			<p class="text-muted-foreground">This talk doesn't exist (anymore).</p>
			<Button href={resolve('/')} variant="outline"><ArrowLeftIcon /> Back to talks</Button>
		</Card.Content>
	</Card.Root>
{:else}
	<div class="grid gap-4">
		<div class="flex items-center gap-2">
			<Button href={resolve('/')} variant="ghost" size="icon" aria-label="Back">
				<ArrowLeftIcon />
			</Button>
			<h1 class="min-w-0 flex-1 truncate text-2xl font-semibold tracking-tight">{profile.name}</h1>
			<Button href={resolve(`/run?id=${profile.id}`)}><PlayIcon /> Present</Button>
		</div>
		<p class="-mt-2 text-xs text-muted-foreground">Changes are saved automatically.</p>

		<!-- Basics -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Basics</Card.Title>
			</Card.Header>
			<Card.Content class="grid gap-4">
				<div class="grid gap-2">
					<Label for="name">Name</Label>
					<Input id="name" bind:value={profile.name} />
				</div>
				<div class="grid gap-2">
					<Label for="duration">Planned duration</Label>
					<DurationInput id="duration" bind:value={profile.durationSeconds} />
					<p class="text-xs text-muted-foreground">
						Set to 0 for an open-ended timer (no end, overtime or time-remaining alerts).
					</p>
				</div>
				<div class="grid gap-2">
					<Label>Countdown before start</Label>
					<ToggleGroup.Root
						type="single"
						variant="outline"
						value={String(profile.startDelaySeconds)}
						onValueChange={(v) => v && profile && (profile.startDelaySeconds = Number(v))}
						class="justify-start"
					>
						{#each [0, 3, 5, 10] as s (s)}
							<ToggleGroup.Item value={String(s)} class="px-3">
								{s ? `${s} s` : 'None'}
							</ToggleGroup.Item>
						{/each}
					</ToggleGroup.Root>
				</div>
				<div class="grid gap-2">
					<Label for="start-pattern">Vibrate when the timer starts</Label>
					<PatternSelect
						id="start-pattern"
						bind:value={profile.startPatternId}
						allowNone
						sound={profile.sound}
					/>
				</div>
				<div class="grid gap-2">
					<Label>Nudge buttons shift the timer by</Label>
					<div class="flex flex-wrap items-center gap-3">
						<ToggleGroup.Root
							type="single"
							variant="outline"
							value={profile.nudgeSeconds === null ? 'default' : 'custom'}
							onValueChange={(v) => {
								if (!profile) return;
								if (v === 'default') profile.nudgeSeconds = null;
								else if (v === 'custom' && profile.nudgeSeconds === null)
									profile.nudgeSeconds = store.settings.defaultNudgeSeconds;
							}}
						>
							<ToggleGroup.Item value="default" class="px-3">
								Default ({formatShortDuration(store.settings.defaultNudgeSeconds)})
							</ToggleGroup.Item>
							<ToggleGroup.Item value="custom" class="px-3">Custom</ToggleGroup.Item>
						</ToggleGroup.Root>
						{#if profile.nudgeSeconds !== null}
							<DurationInput
								aria-label="Nudge amount"
								bind:value={
									() => profile.nudgeSeconds ?? store.settings.defaultNudgeSeconds,
									(v) => (profile.nudgeSeconds = Math.max(1, v))
								}
							/>
						{/if}
					</div>
					<p class="text-xs text-muted-foreground">
						For the −/+ buttons on the timer screen. The default is set in Settings.
					</p>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Alerts -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Alerts</Card.Title>
				<Card.Description>
					One-off cues at a time after the start or before the end.
				</Card.Description>
			</Card.Header>
			<Card.Content class="grid gap-3">
				{#each profile.alerts as alert, i (alert.id)}
					{@const problem = alertProblem(alert)}
					<div class="grid gap-3 rounded-2xl border p-3 {alert.enabled ? '' : 'opacity-60'}">
						<div class="flex items-center gap-2">
							<Input
								bind:value={alert.label}
								placeholder="Label, e.g. Wrap up"
								aria-label="Alert label"
								class="flex-1"
							/>
							<Switch bind:checked={alert.enabled} aria-label="Enabled" />
							<Button
								variant="ghost"
								size="icon"
								aria-label="Delete alert"
								onclick={() => profile.alerts.splice(i, 1)}
							>
								<TrashIcon />
							</Button>
						</div>
						<div class="flex flex-wrap items-center gap-2">
							<DurationInput bind:value={alert.seconds} aria-label="Alert time" />
							<ToggleGroup.Root
								type="single"
								variant="outline"
								size="sm"
								value={alert.anchor}
								onValueChange={(v) => v && (alert.anchor = v as AlertAnchor)}
							>
								<ToggleGroup.Item value="elapsed" class="px-2.5">after start</ToggleGroup.Item>
								<ToggleGroup.Item value="remaining" class="px-2.5">before end</ToggleGroup.Item>
							</ToggleGroup.Root>
						</div>
						<PatternSelect bind:value={alert.patternId} sound={profile.sound} />
						{#if problem}
							<p class="text-xs text-amber-700 dark:text-amber-400">{problem}</p>
						{/if}
					</div>
				{/each}
				<Button variant="outline" onclick={addAlert} class="justify-self-start">
					<PlusIcon /> Add alert
				</Button>
			</Card.Content>
		</Card.Root>

		<!-- Repeating -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Repeating pulse</Card.Title>
				<Card.Description>A regular nudge during the talk, e.g. every 5 minutes.</Card.Description>
				<Card.Action>
					<Switch bind:checked={profile.interval.enabled} aria-label="Enable repeating pulse" />
				</Card.Action>
			</Card.Header>
			{#if profile.interval.enabled}
				<Card.Content class="grid gap-4">
					<div class="grid gap-2">
						<Label for="interval-every">Every</Label>
						<DurationInput id="interval-every" bind:value={profile.interval.everySeconds} />
					</div>
					<div class="grid gap-2">
						<Label for="interval-pattern">Pattern</Label>
						<PatternSelect
							id="interval-pattern"
							bind:value={profile.interval.patternId}
							sound={profile.sound}
						/>
					</div>
					<div class="grid gap-2">
						<Label for="interval-label">Label (optional)</Label>
						<Input
							id="interval-label"
							bind:value={profile.interval.label}
							placeholder="Defaults to the elapsed time"
						/>
					</div>
				</Card.Content>
			{/if}
		</Card.Root>

		<!-- End & overtime -->
		{#if profile.durationSeconds > 0}
			<Card.Root>
				<Card.Header>
					<Card.Title>End of talk</Card.Title>
					<Card.Description>At {formatClock(profile.durationSeconds * 1000)}.</Card.Description>
					<Card.Action>
						<Switch bind:checked={profile.end.enabled} aria-label="Enable end alert" />
					</Card.Action>
				</Card.Header>
				{#if profile.end.enabled}
					<Card.Content class="grid gap-4">
						<div class="grid gap-2">
							<Label for="end-label">Label</Label>
							<Input id="end-label" bind:value={profile.end.label} placeholder="Time's up" />
						</div>
						<div class="grid gap-2">
							<Label for="end-pattern">Pattern</Label>
							<PatternSelect
								id="end-pattern"
								bind:value={profile.end.patternId}
								sound={profile.sound}
							/>
						</div>
					</Card.Content>
				{/if}
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>Overtime</Card.Title>
					<Card.Description>Keep nagging after the planned end.</Card.Description>
					<Card.Action>
						<Switch bind:checked={profile.overtime.enabled} aria-label="Enable overtime alerts" />
					</Card.Action>
				</Card.Header>
				{#if profile.overtime.enabled}
					<Card.Content class="grid gap-4">
						<div class="grid gap-2">
							<Label for="overtime-every">Every</Label>
							<DurationInput id="overtime-every" bind:value={profile.overtime.everySeconds} />
						</div>
						<div class="grid gap-2">
							<Label for="overtime-pattern">Pattern</Label>
							<PatternSelect
								id="overtime-pattern"
								bind:value={profile.overtime.patternId}
								sound={profile.sound}
							/>
						</div>
					</Card.Content>
				{/if}
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>Screen colours</Card.Title>
					<Card.Description>
						The timer turns amber, then red, as the end approaches. Overtime is always red. Set to 0
						to turn a phase off.
					</Card.Description>
				</Card.Header>
				<Card.Content class="grid gap-4">
					<div class="grid gap-2">
						<Label for="warning" class="flex items-center gap-2">
							<span class="size-3 rounded-full bg-amber-400"></span> Amber when remaining
						</Label>
						<DurationInput id="warning" bind:value={profile.warningSeconds} />
					</div>
					<div class="grid gap-2">
						<Label for="critical" class="flex items-center gap-2">
							<span class="size-3 rounded-full bg-red-600"></span> Red when remaining
						</Label>
						<DurationInput id="critical" bind:value={profile.criticalSeconds} />
					</div>
				</Card.Content>
			</Card.Root>
		{/if}

		<!-- Feedback -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Extra feedback</Card.Title>
			</Card.Header>
			<Card.Content class="grid gap-4">
				<div class="flex items-center justify-between gap-4">
					<Label for="flash" class="grid gap-1">
						<span>Flash screen</span>
						<span class="text-xs font-normal text-muted-foreground">
							Flash and show the alert label for a few seconds.
						</span>
					</Label>
					<Switch id="flash" bind:checked={profile.flash} />
				</div>
				<Separator />
				<div class="flex items-center justify-between gap-4">
					<Label for="sound" class="grid gap-1">
						<span>Beep</span>
						<span class="text-xs font-normal text-muted-foreground">
							Play a tone along with each vibration — handy for rehearsing.
						</span>
					</Label>
					<Switch id="sound" bind:checked={profile.sound} />
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Timeline -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Timeline</Card.Title>
				<Card.Description>
					{events.length ? 'Everything that will fire, in order.' : 'Nothing scheduled yet.'}
				</Card.Description>
			</Card.Header>
			{#if events.length}
				<Card.Content>
					<ol class="grid gap-2">
						{#each events as e (e.key)}
							<li class="flex items-center gap-3 text-sm">
								<span class="w-16 shrink-0 text-right font-mono tabular-nums">
									{formatClock(e.atMs)}
								</span>
								<Badge
									variant={e.kind === 'end' || e.kind === 'overtime' ? 'destructive' : 'secondary'}
								>
									{KIND_LABEL[e.kind]}
								</Badge>
								<span class="min-w-0 flex-1 truncate">{e.label}</span>
								<span class="shrink-0 text-xs text-muted-foreground">
									{store.pattern(e.patternId).name}
								</span>
							</li>
						{/each}
						{#if profile.durationSeconds > 0 && profile.overtime.enabled}
							<li class="pl-19 text-xs text-muted-foreground">
								…and every {formatDuration(profile.overtime.everySeconds)} after that.
							</li>
						{/if}
					</ol>
				</Card.Content>
			{/if}
		</Card.Root>
	</div>
{/if}
