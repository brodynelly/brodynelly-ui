<script>
	import Switch from '../Switch.svelte';
	import Slider from '../Slider.svelte';
	import Stepper from '../Stepper.svelte';
	import SearchField from '../SearchField.svelte';

	/** @typedef {{ value: boolean | number | string, bound: boolean | number | string, type: string }} Snapshot */
	/**
	 * @typedef {{
	 *   checked?: boolean;
	 *   sliderValue?: number;
	 *   sliderMin?: number;
	 *   sliderMax?: number;
	 *   sliderStep?: number;
	 *   stepperValue?: number;
	 *   stepperMin?: number;
	 *   stepperMax?: number;
	 *   stepperStep?: number;
	 *   searchValue?: string;
	 *   disabled?: boolean;
	 *   onSwitchChange?: (snapshot: Snapshot) => void;
	 *   onSliderInput?: (snapshot: Snapshot) => void;
	 *   onSliderChange?: (snapshot: Snapshot) => void;
	 *   onStepperChange?: (snapshot: Snapshot) => void;
	 *   onSearchInput?: (snapshot: Snapshot) => void;
	 *   onSearchChange?: (snapshot: Snapshot) => void;
	 * }} Props
	 */
	/** @type {Props} */
	let {
		checked = $bindable(false),
		sliderValue = $bindable(50),
		sliderMin = 0,
		sliderMax = 100,
		sliderStep = 1,
		stepperValue = $bindable(0),
		stepperMin = 0,
		stepperMax = 3,
		stepperStep = 1,
		searchValue = $bindable(''),
		disabled = $bindable(false),
		onSwitchChange,
		onSliderInput,
		onSliderChange,
		onStepperChange,
		onSearchInput,
		onSearchChange
	} = $props();

	let submissions = $state(0);
</script>

<form
	onsubmit={(event) => {
		event.preventDefault();
		submissions += 1;
	}}
>
	<Switch
		label="Wi-Fi"
		name="wifi"
		{disabled}
		bind:checked
		onchange={(event) =>
			onSwitchChange?.({ value: event.currentTarget.checked, bound: checked, type: event.type })}
	/>
	<Slider
		label="Volume"
		name="volume"
		min={sliderMin}
		max={sliderMax}
		step={sliderStep}
		{disabled}
		bind:value={sliderValue}
		oninput={(event) =>
			onSliderInput?.({
				value: event.currentTarget.valueAsNumber,
				bound: sliderValue,
				type: event.type
			})}
		onchange={(event) =>
			onSliderChange?.({
				value: event.currentTarget.valueAsNumber,
				bound: sliderValue,
				type: event.type
			})}
	/>
	<Stepper
		label="Copies"
		min={stepperMin}
		max={stepperMax}
		step={stepperStep}
		{disabled}
		bind:value={stepperValue}
		onchange={(value, event) => onStepperChange?.({ value, bound: stepperValue, type: event.type })}
	/>
	<SearchField
		label="Search music"
		name="query"
		{disabled}
		bind:value={searchValue}
		oninput={(event) =>
			onSearchInput?.({ value: event.currentTarget.value, bound: searchValue, type: event.type })}
		onchange={(event) =>
			onSearchChange?.({ value: event.currentTarget.value, bound: searchValue, type: event.type })}
	/>
	<button
		type="button"
		onclick={() => {
			checked = true;
			sliderValue = 75;
			stepperValue = 2;
			searchValue = 'Updated';
		}}
	>
		Update bindings
	</button>
	<button type="button" onclick={() => (disabled = !disabled)}>
		{disabled ? 'Enable' : 'Disable'} controls
	</button>
</form>

<output data-testid="bound-switch">{String(checked)}</output>
<output data-testid="bound-slider">{sliderValue}</output>
<output data-testid="bound-stepper">{stepperValue}</output>
<output data-testid="bound-search">{searchValue}</output>
<output data-testid="submissions">{submissions}</output>
