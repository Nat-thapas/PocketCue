<script lang="ts">
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import SunIcon from '@lucide/svelte/icons/sun';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import MonitorIcon from '@lucide/svelte/icons/monitor';
	import { setMode, resetMode } from 'mode-watcher';
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<Button {...props} variant="ghost" size="icon" aria-label="Theme">
				<SunIcon class="scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
				<MoonIcon class="absolute scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
			</Button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="end">
		<DropdownMenu.Item onclick={() => setMode('light')}><SunIcon /> Light</DropdownMenu.Item>
		<DropdownMenu.Item onclick={() => setMode('dark')}><MoonIcon /> Dark</DropdownMenu.Item>
		<DropdownMenu.Item onclick={() => resetMode()}><MonitorIcon /> System</DropdownMenu.Item>
	</DropdownMenu.Content>
</DropdownMenu.Root>
