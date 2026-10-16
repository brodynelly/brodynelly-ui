<script>
	import SplitView from './SplitView.svelte';

	let {
		ratio = $bindable(4 / 9),
		minRatio = 0.2,
		maxRatio = 0.8,
		resizable = true,
		active = true,
		dir = 'ltr',
		show = true
	} = $props();
</script>

{#if show}
	<SplitView
		bind:ratio
		{minRatio}
		{maxRatio}
		{resizable}
		{active}
		{dir}
		style="width: 720px; height: 400px"
	>
		{#snippet sidebar()}
			<button type="button">Sidebar action</button>
		{/snippet}
		<button type="button">Content action</button>
	</SplitView>
{/if}
<output data-testid="ratio">{ratio}</output>
