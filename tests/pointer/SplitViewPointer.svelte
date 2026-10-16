<script>
	import SplitView from '../../src/lib/split-view/SplitView.svelte';

	let { dir = 'ltr' } = $props();
	let ratio = $state(4 / 9);
	let show = $state(true);
</script>

{#if show}
	<SplitView bind:ratio {dir} style="width: 720px; height: 400px">
		{#snippet sidebar()}
			<button type="button">Sidebar action</button>
		{/snippet}
		<button type="button">Content action</button>
	</SplitView>
{/if}
<output data-testid="ratio">{ratio}</output>
<button type="button" onclick={() => (show = !show)}>{show ? 'Hide' : 'Show'} split view</button>
