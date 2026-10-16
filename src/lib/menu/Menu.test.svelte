<script>
	import Menu from './Menu.svelte';
	import MenuItem from './MenuItem.svelte';
	import MenuSeparator from './MenuSeparator.svelte';

	let {
		onselect = () => {},
		ondisabled = () => {},
		customTrigger = false,
		secondMenu = false
	} = $props();
	let open = $state(false);
	let checked = $state(false);
	let visible = $state(true);
</script>

<button type="button">Before menu</button>
{#if visible}
	<Menu bind:open label="Document actions" class="test-menu" style="--menu-separator: #888">
		{#snippet trigger(isOpen)}
			{#if customTrigger}
				<span>Actions {isOpen ? 'open' : 'closed'}</span>
			{:else}
				<span>Document actions</span>
			{/if}
		{/snippet}
		<MenuItem label="Archive" onclick={onselect} />
		<MenuItem label="Blocked" disabled onclick={ondisabled} />
		<MenuItem label="Duplicate" onclick={onselect} />
		<MenuItem label="Download" onclick={onselect} />
		<MenuSeparator />
		<MenuItem label="Keep open" onclick={(event) => event.preventDefault()} />
		<MenuItem label="Show details" bind:checked />
		<MenuItem label="Keep unchecked" checked={false} onclick={(event) => event.preventDefault()} />
		<MenuItem label="Delete" destructive onclick={onselect} />
	</Menu>
{/if}
<button type="button">After menu</button>
<button type="button" onclick={() => (open = !open)}>Toggle bound state</button>
<button type="button" onclick={() => (visible = !visible)}>Toggle mount</button>
<output aria-label="Menu state">{open ? 'open' : 'closed'}</output>
<output aria-label="Checked state">{checked ? 'checked' : 'unchecked'}</output>
<div data-testid="outside" style="position: fixed; right: 16px; bottom: 16px; padding: 16px;">
	Outside area
</div>
{#if secondMenu}
	<Menu label="Other actions">
		<MenuItem label="Other item" />
	</Menu>
{/if}
