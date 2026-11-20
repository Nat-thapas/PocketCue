<script lang="ts">
	import { Input } from '#lib/components/ui/input/index.js';
	import { cn } from '#lib/utils.js';

	let {
		value = $bindable(0),
		id,
		class: className,
		'aria-label': ariaLabel
	}: { value: number; id?: string; class?: string; 'aria-label'?: string } = $props();

	const minutes = $derived(Math.floor(value / 60));
	const seconds = $derived(value % 60);

	function toInt(v: string) {
		const n = Math.floor(Number(v));
		return Number.isFinite(n) && n > 0 ? n : 0;
	}

	function setMinutes(e: Event & { currentTarget: HTMLInputElement }) {
		value = toInt(e.currentTarget.value) * 60 + seconds;
		e.currentTarget.value = String(minutes);
	}

	function setSeconds(e: Event & { currentTarget: HTMLInputElement }) {
		// Seconds above 59 carry over into minutes.
		value = minutes * 60 + toInt(e.currentTarget.value);
		e.currentTarget.value = String(seconds);
	}
</script>

<div class={cn('flex items-center gap-1.5', className)} role="group" aria-label={ariaLabel}>
	<Input
		{id}
		type="number"
		inputmode="numeric"
		min="0"
		value={minutes}
		onchange={setMinutes}
		onfocus={(e) => e.currentTarget.select()}
		class="w-16 text-center tabular-nums"
		aria-label="Minutes"
	/>
	<span class="text-sm text-muted-foreground">min</span>
	<Input
		type="number"
		inputmode="numeric"
		min="0"
		max="59"
		value={seconds}
		onchange={setSeconds}
		onfocus={(e) => e.currentTarget.select()}
		class="w-16 text-center tabular-nums"
		aria-label="Seconds"
	/>
	<span class="text-sm text-muted-foreground">s</span>
</div>
