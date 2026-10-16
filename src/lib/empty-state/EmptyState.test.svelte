<script>
	import EmptyState from './EmptyState.svelte';

	/** @type {{ onaction?: () => void }} */
	let { onaction } = $props();
</script>

<EmptyState
	title="No saved places"
	description="Save a place to find it here later."
	class="custom-empty-state"
	style="width: 402px;"
>
	{#snippet illustration()}
		<svg width="50" height="50" viewBox="0 0 50 50" aria-hidden="true">
			<circle cx="25" cy="25" r="20" fill="currentColor" />
		</svg>
	{/snippet}
	<p data-testid="empty-state-details">Your places are private.</p>
	{#snippet action()}
		<button type="button" onclick={onaction}>Find a place</button>
		<a href="#help">Learn about saved places</a>
	{/snippet}
</EmptyState>
