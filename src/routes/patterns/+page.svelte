<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import * as AlertDialog from '#lib/components/ui/alert-dialog/index.js';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.js';
	import PatternBar from '#lib/components/pattern-bar.svelte';
	import PatternEditorDialog from '#lib/components/pattern-editor-dialog.svelte';
	import PlayIcon from '@lucide/svelte/icons/play';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import { store } from '#lib/store.svelte.js';
	import { play } from '#lib/haptics.js';
	import { sequenceDuration } from '#lib/patterns.js';
	import type { Pattern } from '#lib/types.js';
	import { toast } from 'svelte-sonner';

	let editorOpen = $state(false);
	/** Pattern being edited (custom), or template for a new one. */
	let editing = $state<{ id: string | null; name: string; sequence: number[] } | null>(null);
	let deleting = $state<Pattern | null>(null);

	const builtins = $derived(store.patterns.filter((p) => p.builtin));
	const deletingUsage = $derived(deleting ? store.patternUsage(deleting.id) : []);

	function openNew(template?: Pattern) {
		editing = template
			? { id: null, name: `${template.name} (custom)`, sequence: [...template.sequence] }
			: null;
		editorOpen = true;
	}

	function openEdit(p: Pattern) {
		editing = { id: p.id, name: p.name, sequence: [...p.sequence] };
		editorOpen = true;
	}

	function save(name: string, sequence: number[]) {
		if (editing?.id) {
			store.updatePattern(editing.id, name, sequence);
			toast.success('Pattern updated');
		} else {
			store.addPattern(name, sequence);
			toast.success('Pattern created');
		}
	}
</script>

<svelte:head>
	<title>Patterns · PocketCue</title>
</svelte:head>

{#snippet row(p: Pattern)}
	<li class="flex items-center gap-3 py-2.5">
		<div class="min-w-0 flex-1">
			<div class="flex items-baseline justify-between gap-2">
				<span class="truncate font-medium">{p.name}</span>
				<span class="shrink-0 text-xs text-muted-foreground tabular-nums">
					{(sequenceDuration(p.sequence) / 1000).toFixed(1)} s
				</span>
			</div>
			<PatternBar sequence={p.sequence} class="mt-1.5" />
		</div>
		<div class="flex shrink-0 items-center">
			<Button
				variant="ghost"
				size="icon"
				aria-label="Test {p.name}"
				onclick={() => play(p.sequence)}
			>
				<PlayIcon />
			</Button>
			{#if p.builtin}
				<Button
					variant="ghost"
					size="icon"
					aria-label="Customise {p.name}"
					onclick={() => openNew(p)}
				>
					<CopyIcon />
				</Button>
			{:else}
				<Button variant="ghost" size="icon" aria-label="Edit {p.name}" onclick={() => openEdit(p)}>
					<PencilIcon />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					aria-label="Delete {p.name}"
					onclick={() => (deleting = p)}
				>
					<TrashIcon />
				</Button>
			{/if}
		</div>
	</li>
{/snippet}

<div class="grid gap-4">
	<div class="flex items-center justify-between gap-2">
		<h1 class="text-2xl font-semibold tracking-tight">Patterns</h1>
		<Button onclick={() => openNew()}><PlusIcon /> New pattern</Button>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>Custom</Card.Title>
			<Card.Description>
				Your own patterns, available in every talk. Copy a preset to start from it.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if store.customPatterns.length}
				<ul class="divide-y">
					{#each store.customPatterns as p (p.id)}
						{@render row(p)}
					{/each}
				</ul>
			{:else}
				<p class="text-sm text-muted-foreground">No custom patterns yet.</p>
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Presets</Card.Title>
		</Card.Header>
		<Card.Content>
			<ul class="divide-y">
				{#each builtins as p (p.id)}
					{@render row(p)}
				{/each}
			</ul>
		</Card.Content>
	</Card.Root>
</div>

<PatternEditorDialog bind:open={editorOpen} pattern={editing} onsave={save} />

<AlertDialog.Root open={deleting !== null} onOpenChange={(o) => !o && (deleting = null)}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Delete “{deleting?.name}”?</AlertDialog.Title>
			<AlertDialog.Description>
				{#if deletingUsage.length}
					It's used by {deletingUsage.map((p) => p.name).join(', ')}. Those cues will switch to the
					“Short” preset.
				{:else}
					This can't be undone.
				{/if}
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action
				class={buttonVariants({ variant: 'destructive' })}
				onclick={() => {
					if (deleting) store.deletePattern(deleting.id);
					deleting = null;
				}}
			>
				Delete
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
