<script lang="ts">
	import { cn } from '#lib/utils.js';
	import { sequenceDuration } from '#lib/patterns.js';

	let { sequence, class: className }: { sequence: number[]; class?: string } = $props();

	const total = $derived(sequenceDuration(sequence) || 1);
</script>

<div
	class={cn('flex h-2 w-full overflow-hidden rounded-full bg-muted', className)}
	role="img"
	aria-label="Pattern: {sequence.join(', ')} ms"
>
	{#each sequence as ms, i (i)}
		<div
			class={cn('h-full shrink-0', i % 2 === 0 ? 'rounded-full bg-primary' : 'bg-transparent')}
			style:width="{(ms / total) * 100}%"
		></div>
	{/each}
</div>
