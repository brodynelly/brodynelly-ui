<script>
	import Sheet from './Sheet.svelte';

	let {
		open = $bindable(false),
		dismissible = true,
		onclose = undefined,
		longContent = false,
		showNested = false
	} = $props();
	let nestedOpen = $state(false);
</script>

<button type="button" onclick={() => (open = true)}>Open sheet</button>
<button type="button" data-testid="background-action">Background action</button>
<output data-testid="open-state">{open ? 'open' : 'closed'}</output>

<Sheet
	bind:open
	title="Travel details"
	description="Review your next trip."
	{dismissible}
	{onclose}
>
	<label>
		Trip name
		<input value="Kyoto" />
	</label>
	{#if longContent}
		{#each Array(30).keys() as index (index)}
			<p>Trip detail {index + 1}</p>
		{/each}
	{/if}
	{#if showNested}
		<button type="button" onclick={() => (nestedOpen = true)}>Open nested sheet</button>
		<Sheet bind:open={nestedOpen} title="Nested sheet">
			<button type="button" onclick={() => (nestedOpen = false)}>Finish nested sheet</button>
		</Sheet>
	{/if}
	{#snippet footer()}
		<button type="button" onclick={() => (open = false)}>Done</button>
	{/snippet}
</Sheet>
