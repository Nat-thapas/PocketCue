<script lang="ts">
	import { Button, type ButtonProps } from '#lib/components/ui/button/index.js';
	import { store } from '#lib/store.svelte.js';
	import { vibrate } from '#lib/haptics.js';
	import { cn } from '#lib/utils.js';

	/**
	 * A button that, when "hold to confirm" is enabled in settings, must be pressed and held
	 * to trigger — protects against accidental taps while presenting.
	 */
	let {
		onconfirm,
		requireHold,
		class: className,
		children,
		...rest
	}: Omit<ButtonProps, 'onclick'> & { onconfirm: () => void; requireHold?: boolean } = $props();

	const hold = $derived(requireHold ?? store.settings.holdToConfirm);
	let progress = $state(0);
	let raf = 0;
	let started = 0;
	let active = false;

	function begin() {
		if (!hold || active) return;
		active = true;
		started = performance.now();
		const step = () => {
			progress = Math.min(1, (performance.now() - started) / store.settings.holdMs);
			if (progress >= 1) {
				cancel();
				vibrate([30]);
				onconfirm();
			} else {
				raf = requestAnimationFrame(step);
			}
		};
		raf = requestAnimationFrame(step);
	}

	function cancel() {
		cancelAnimationFrame(raf);
		active = false;
		progress = 0;
	}
</script>

<Button
	{...rest}
	class={cn('relative touch-none overflow-hidden select-none', className)}
	onpointerdown={(e: PointerEvent) => {
		if (!hold || e.button !== 0) return;
		(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
		begin();
	}}
	onpointerup={cancel}
	onpointercancel={cancel}
	onkeydown={(e: KeyboardEvent) => {
		if (hold && (e.key === 'Enter' || e.key === ' ')) {
			e.preventDefault();
			if (!e.repeat) begin();
		}
	}}
	onkeyup={(e: KeyboardEvent) => {
		if (e.key === 'Enter' || e.key === ' ') cancel();
	}}
	onclick={() => {
		if (!hold) onconfirm();
	}}
	oncontextmenu={(e: Event) => e.preventDefault()}
>
	{#if hold}
		<span
			class="pointer-events-none absolute inset-y-0 left-0 bg-current opacity-20"
			style:width="{progress * 100}%"
			aria-hidden="true"
		></span>
	{/if}
	{@render children?.()}
</Button>
