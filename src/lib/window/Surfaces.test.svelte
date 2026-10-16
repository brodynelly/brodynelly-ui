<script>
	import '../styles.css';
	import Window from './Window.svelte';
	import WindowControls from './WindowControls.svelte';
	import WindowChoice from '../window-choice/WindowChoice.svelte';
	import SplitView from '../split-view/SplitView.svelte';
	import SearchField from '../controls/SearchField.svelte';
	import Switch from '../controls/Switch.svelte';
	import Slider from '../controls/Slider.svelte';
	import Stepper from '../controls/Stepper.svelte';
	import EmptyState from '../empty-state/EmptyState.svelte';
	import Menu from '../menu/Menu.svelte';
	import MenuItem from '../menu/MenuItem.svelte';
	import Sheet from '../sheet/Sheet.svelte';

	let { kind = 'window', checked = false, level = 0 } = $props();
	const Surface = $derived(kind === 'window' ? Window : SplitView);
	let query = $state('Notes');
	let open = $state(false);
</script>

<SearchField label="Default search" />
<WindowChoice label="Default preview" style="width: 240px;" />
<WindowControls />
<Switch label="Default switch" {checked} />
<Slider label="Default slider" value={level} />
<Menu label="Default actions"><MenuItem label="Default item" /></Menu>

<Surface
	{...kind === 'window' ? { split: true } : {}}
	style="width: 720px; min-height: 400px; --apple-window-aspect-ratio: auto;"
>
	{#snippet sidebar()}
		<SearchField label="Surface search" bind:value={query} />
		<Switch label="Sidebar switch" />
		<Slider label="Sidebar slider" />
		<Stepper label="Sidebar count" value={1} />
		<Menu label="Sidebar actions"><MenuItem label="Sidebar item" /></Menu>
	{/snippet}
	<EmptyState title="No surface items" description="Create an item to get started." />
	<Switch label="Surface switch" {checked} />
	<Slider label="Surface slider" value={level} />
	<Menu label="Surface actions"><MenuItem label="Surface item" /></Menu>
	<button type="button" onclick={() => (open = true)}>Open surface sheet</button>
	<Sheet bind:open title="Surface sheet" description="A readable overlay description.">
		<SearchField label="Overlay search" />
		<EmptyState title="No overlay items" description="The overlay owns its foreground roles." />
	</Sheet>
</Surface>
