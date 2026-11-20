<script lang="ts">
	import * as Select from '#lib/components/ui/select/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import PatternBar from './pattern-bar.svelte';
	import PlayIcon from '@lucide/svelte/icons/play';
	import { store } from '#lib/store.svelte.js';
	import { play } from '#lib/haptics.js';
	import { cn } from '#lib/utils.js';

	const NONE = '__none__';

	let {
		value = $bindable(),
		allowNone = false,
		sound = false,
		class: className,
		id
	}: {
		value: string | null;
		allowNone?: boolean;
		sound?: boolean;
		class?: string;
		id?: string;
	} = $props();

	const builtins = $derived(store.patterns.filter((p) => p.builtin));
	const custom = $derived(store.patterns.filter((p) => !p.builtin));
	const selected = $derived(value ? store.pattern(value) : null);
</script>

<div class={cn('flex min-w-0 items-center gap-1.5', className)}>
	<Select.Root
		type="single"
		value={value ?? NONE}
		onValueChange={(v) => (value = v === NONE ? null : v)}
	>
		<Select.Trigger {id} class="w-full min-w-0 flex-1">
			<span class="truncate">{selected ? selected.name : 'None'}</span>
		</Select.Trigger>
		<Select.Content>
			{#if allowNone}
				<Select.Item value={NONE} label="None">None</Select.Item>
			{/if}
			<Select.Group>
				<Select.GroupHeading>Presets</Select.GroupHeading>
				{#each builtins as p (p.id)}
					<Select.Item value={p.id} label={p.name}>
						<span class="w-28 truncate">{p.name}</span>
						<PatternBar sequence={p.sequence} class="w-20" />
					</Select.Item>
				{/each}
			</Select.Group>
			{#if custom.length}
				<Select.Group>
					<Select.GroupHeading>Custom</Select.GroupHeading>
					{#each custom as p (p.id)}
						<Select.Item value={p.id} label={p.name}>
							<span class="w-28 truncate">{p.name}</span>
							<PatternBar sequence={p.sequence} class="w-20" />
						</Select.Item>
					{/each}
				</Select.Group>
			{/if}
		</Select.Content>
	</Select.Root>
	<Button
		variant="ghost"
		size="icon"
		aria-label="Test pattern"
		disabled={!selected}
		onclick={() => selected && play(selected.sequence, { sound })}
	>
		<PlayIcon />
	</Button>
</div>
