<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { Button } from '#lib/components/ui/button/index.js';
	import ThemeToggle from './theme-toggle.svelte';
	import VibrateIcon from '@lucide/svelte/icons/vibrate';
	import ListIcon from '@lucide/svelte/icons/list';
	import AudioWaveformIcon from '@lucide/svelte/icons/audio-waveform';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import { cn } from '#lib/utils.js';

	const links = [
		{ href: resolve('/'), label: 'Talks', icon: ListIcon, match: '/' },
		{ href: resolve('/patterns'), label: 'Patterns', icon: AudioWaveformIcon, match: '/patterns' },
		{ href: resolve('/settings'), label: 'Settings', icon: SettingsIcon, match: '/settings' }
	];
</script>

<header
	class="sticky top-0 z-30 border-b bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60"
>
	<div class="mx-auto flex h-14 max-w-2xl items-center gap-2 px-4">
		<a href={resolve('/')} class="mr-auto flex items-center gap-2 font-semibold">
			<span class="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground">
				<VibrateIcon class="size-4" />
			</span>
			<span class="hidden sm:inline">PocketCue</span>
		</a>
		<nav class="flex items-center gap-0.5">
			{#each links as link (link.href)}
				{@const current =
					link.match === '/'
						? page.route.id === '/' || page.route.id === '/edit'
						: page.route.id === link.match}
				<Button
					href={link.href}
					variant="ghost"
					size="sm"
					class={cn(current && 'bg-muted text-foreground')}
					aria-current={current ? 'page' : undefined}
				>
					<link.icon />
					<span class="max-[380px]:sr-only">{link.label}</span>
				</Button>
			{/each}
		</nav>
		<ThemeToggle />
	</div>
</header>
