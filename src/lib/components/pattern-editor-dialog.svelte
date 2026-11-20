<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import PatternForm from './pattern-form.svelte';
	import type { Pattern } from '#lib/types.js';

	let {
		open = $bindable(false),
		pattern = null,
		onsave
	}: {
		open: boolean;
		/** Pattern to edit, or a template to start from. Null for a blank pattern. */
		pattern?: Pick<Pattern, 'name' | 'sequence'> | null;
		onsave: (name: string, sequence: number[]) => void;
	} = $props();
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-h-[90dvh] overflow-y-auto sm:max-w-md">
		<PatternForm {pattern} {onsave} ondone={() => (open = false)} />
	</Dialog.Content>
</Dialog.Root>
