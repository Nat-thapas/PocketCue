<script lang="ts">
	import { untrack } from 'svelte';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import PatternBar from './pattern-bar.svelte';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import XIcon from '@lucide/svelte/icons/x';
	import PlayIcon from '@lucide/svelte/icons/play';
	import {
		MAX_SEGMENTS,
		MAX_SEGMENT_MS,
		parseSequence,
		sanitizeSequence,
		sequenceDuration
	} from '#lib/patterns.js';
	import { play } from '#lib/haptics.js';
	import type { Pattern } from '#lib/types.js';

	let {
		pattern = null,
		onsave,
		ondone
	}: {
		/** Pattern to edit, or a template to start from. Null for a blank pattern. */
		pattern?: Pick<Pattern, 'name' | 'sequence'> | null;
		onsave: (name: string, sequence: number[]) => void;
		ondone: () => void;
	} = $props();

	// Mounted fresh each time the dialog opens, so the initial values come straight from props.
	const initial = untrack(() => ({
		name: pattern?.name ?? '',
		sequence: [...(pattern?.sequence ?? [200, 100, 200])]
	}));
	let name = $state(initial.name);
	let segments = $state<number[]>(initial.sequence);
	let raw = $state(initial.sequence.join(', '));

	const clean = $derived(sanitizeSequence(segments));
	const total = $derived(sequenceDuration(clean));

	function sync() {
		raw = segments.join(', ');
	}

	function setSegment(i: number, v: string) {
		const n = Math.round(Number(v));
		segments[i] = Number.isFinite(n) ? Math.min(MAX_SEGMENT_MS, Math.max(0, n)) : 0;
		sync();
	}

	function addPair() {
		if (segments.length + 2 > MAX_SEGMENTS) return;
		if (segments.length % 2 === 1) segments.push(150, 200);
		else segments.push(200, 150);
		sync();
	}

	function removeAt(i: number) {
		segments.splice(i, 1);
		sync();
	}

	function applyRaw() {
		segments = parseSequence(raw);
		raw = segments.join(', ');
	}

	function submit(e: SubmitEvent) {
		e.preventDefault();
		onsave(name.trim() || 'Custom pattern', clean);
		ondone();
	}
</script>

<form onsubmit={submit} class="grid gap-4">
	<Dialog.Header>
		<Dialog.Title>{pattern?.name ? 'Edit pattern' : 'New pattern'}</Dialog.Title>
		<Dialog.Description>
			Alternate vibration and pause durations in milliseconds.
		</Dialog.Description>
	</Dialog.Header>

	<div class="grid gap-2">
		<Label for="pattern-name">Name</Label>
		<Input id="pattern-name" bind:value={name} placeholder="e.g. Five minutes left" />
	</div>

	<div class="grid gap-2">
		<div class="flex items-center justify-between">
			<span class="text-sm font-medium">Preview</span>
			<span class="text-xs text-muted-foreground tabular-nums">{total} ms total</span>
		</div>
		<PatternBar sequence={clean} class="h-3" />
		{#if total > 10_000}
			<p class="text-xs text-destructive">Some browsers cut vibrations longer than 10 seconds.</p>
		{/if}
	</div>

	<div class="grid gap-1.5">
		{#each segments as ms, i (i)}
			<div class="flex items-center gap-2">
				<span class="w-20 shrink-0 text-sm {i % 2 === 0 ? 'font-medium' : 'text-muted-foreground'}">
					{i % 2 === 0 ? 'Vibrate' : 'Pause'}
				</span>
				<Input
					type="number"
					inputmode="numeric"
					min="0"
					max={MAX_SEGMENT_MS}
					step="10"
					value={ms}
					onchange={(e) => setSegment(i, e.currentTarget.value)}
					class="w-24 text-right tabular-nums"
					aria-label="{i % 2 === 0 ? 'Vibrate' : 'Pause'} {Math.floor(i / 2) + 1} (ms)"
				/>
				<span class="text-sm text-muted-foreground">ms</span>
				<Button
					variant="ghost"
					size="icon-sm"
					class="ml-auto"
					aria-label="Remove step"
					disabled={segments.length <= 1}
					onclick={() => removeAt(i)}
				>
					<XIcon />
				</Button>
			</div>
		{/each}
		<Button
			variant="outline"
			size="sm"
			class="justify-self-start"
			onclick={addPair}
			disabled={segments.length + 2 > MAX_SEGMENTS}
		>
			<PlusIcon /> Add step
		</Button>
	</div>

	<div class="grid gap-2">
		<Label for="pattern-raw">Or type the sequence</Label>
		<Input
			id="pattern-raw"
			bind:value={raw}
			onchange={applyRaw}
			placeholder="200, 100, 200"
			class="font-mono"
		/>
	</div>

	<Dialog.Footer class="gap-2">
		<Button variant="outline" onclick={() => play(clean)}>
			<PlayIcon /> Test
		</Button>
		<Button type="submit">Save pattern</Button>
	</Dialog.Footer>
</form>
