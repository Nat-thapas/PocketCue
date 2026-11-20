<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import * as Card from '#lib/components/ui/card/index.js';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
	import * as AlertDialog from '#lib/components/ui/alert-dialog/index.js';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import PlayIcon from '@lucide/svelte/icons/play';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import EllipsisIcon from '@lucide/svelte/icons/ellipsis-vertical';
	import TimerIcon from '@lucide/svelte/icons/timer';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
	import { store } from '#lib/store.svelte.js';
	import { formatDuration } from '#lib/format.js';
	import { vibrationSupported } from '#lib/haptics.js';
	import type { Profile } from '#lib/types.js';

	const runningProfile = $derived(
		store.session ? store.profile(store.session.profileId) : undefined
	);
	const canVibrate = vibrationSupported();

	let deleting = $state<Profile | null>(null);

	function newProfile() {
		const p = store.addProfile();
		void goto(resolve(`/edit?id=${p.id}`));
	}

	function summary(p: Profile): string[] {
		const parts: string[] = [];
		const alerts = p.alerts.filter((a) => a.enabled).length;
		if (alerts) parts.push(`${alerts} alert${alerts === 1 ? '' : 's'}`);
		if (p.interval.enabled) parts.push(`every ${formatDuration(p.interval.everySeconds)}`);
		if (p.durationSeconds > 0 && p.end.enabled) parts.push('end');
		if (p.durationSeconds > 0 && p.overtime.enabled) parts.push('overtime');
		return parts;
	}
</script>

<svelte:head>
	<title>Talks · PocketCue</title>
</svelte:head>

<div class="grid gap-4">
	{#if !canVibrate}
		<div
			class="flex gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-200"
		>
			<TriangleAlertIcon class="mt-0.5 size-4 shrink-0" />
			<p>
				This browser doesn't support vibration. Open this page in Chrome on Android for haptic
				alerts. Sound and screen flash still work here.
			</p>
		</div>
	{/if}

	{#if store.session && runningProfile}
		<a
			href={resolve(`/run?id=${runningProfile.id}`)}
			class="flex items-center gap-3 rounded-2xl bg-primary p-4 text-primary-foreground"
		>
			<TimerIcon class="size-5 shrink-0" />
			<div class="min-w-0 flex-1">
				<div class="font-medium">
					{store.session.pausedElapsedMs === null ? 'Timer running' : 'Timer paused'}
				</div>
				<div class="truncate text-sm opacity-80">{runningProfile.name}</div>
			</div>
			<span class="text-sm font-medium">Return →</span>
		</a>
	{/if}

	<div class="flex items-center justify-between gap-2">
		<h1 class="text-2xl font-semibold tracking-tight">Talks</h1>
		<Button onclick={newProfile}><PlusIcon /> New talk</Button>
	</div>

	{#if store.profiles.length === 0}
		<Card.Root>
			<Card.Content class="grid justify-items-center gap-3 py-8 text-center">
				<p class="text-muted-foreground">No talks yet. Create one to set up your timing cues.</p>
				<Button onclick={newProfile}><PlusIcon /> New talk</Button>
			</Card.Content>
		</Card.Root>
	{/if}

	{#each store.profiles as profile (profile.id)}
		<Card.Root size="sm">
			<Card.Header>
				<Card.Title class="truncate text-base">{profile.name}</Card.Title>
				<Card.Description class="flex flex-wrap items-center gap-1.5">
					<Badge variant="secondary">
						{profile.durationSeconds > 0 ? formatDuration(profile.durationSeconds) : 'Open-ended'}
					</Badge>
					{#each summary(profile) as part (part)}
						<span class="text-xs">· {part}</span>
					{/each}
				</Card.Description>
				<Card.Action>
					<DropdownMenu.Root>
						<DropdownMenu.Trigger
							class={buttonVariants({ variant: 'ghost', size: 'icon' })}
							aria-label="More actions"
						>
							<EllipsisIcon />
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="end">
							<DropdownMenu.Item onclick={() => store.duplicateProfile(profile.id)}>
								<CopyIcon /> Duplicate
							</DropdownMenu.Item>
							<DropdownMenu.Item variant="destructive" onclick={() => (deleting = profile)}>
								<TrashIcon /> Delete
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</Card.Action>
			</Card.Header>
			<Card.Footer class="gap-2">
				<Button href={resolve(`/run?id=${profile.id}`)} class="flex-1" size="lg">
					<PlayIcon /> Present
				</Button>
				<Button href={resolve(`/edit?id=${profile.id}`)} variant="outline" size="lg">
					<PencilIcon /> Edit
				</Button>
			</Card.Footer>
		</Card.Root>
	{/each}
</div>

<AlertDialog.Root open={deleting !== null} onOpenChange={(o) => !o && (deleting = null)}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Delete “{deleting?.name}”?</AlertDialog.Title>
			<AlertDialog.Description>This can't be undone.</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action
				class={buttonVariants({ variant: 'destructive' })}
				onclick={() => {
					if (deleting) store.deleteProfile(deleting.id);
					deleting = null;
				}}
			>
				Delete
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
