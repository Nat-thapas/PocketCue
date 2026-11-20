<script lang="ts">
	import './layout.css';
	import { asset } from '$app/paths';
	import { page } from '$app/state';
	import { ModeWatcher } from 'mode-watcher';
	import { Toaster } from '#lib/components/ui/sonner/index.js';
	import AppHeader from '#lib/components/app-header.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const fullscreen = $derived(page.route.id === '/run');
</script>

<svelte:head>
	<link rel="icon" href={asset('favicon.svg')} type="image/svg+xml" />
	<link rel="manifest" href={asset('manifest.webmanifest')} />
	<link rel="apple-touch-icon" href={asset('icon-192.png')} />
</svelte:head>

<ModeWatcher />
<Toaster position="top-center" />

{#if fullscreen}
	{@render children()}
{:else}
	<AppHeader />
	<main class="mx-auto max-w-2xl px-4 pt-6 pb-16">
		{@render children()}
	</main>
{/if}
