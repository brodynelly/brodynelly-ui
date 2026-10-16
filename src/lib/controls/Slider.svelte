<script>
	import { untrack } from 'svelte';

	/**
	 * A native range with a continuously updated fill. `class` and `style` apply
	 * to the wrapper; remaining attributes apply to the range. Native `oninput`
	 * and `onchange` events are forwarded after the numeric binding is updated.
	 * @typedef {Omit<import('svelte/elements').HTMLInputAttributes, 'type' | 'role' | 'value' | 'min' | 'max' | 'step'> & {
	 *   value?: number;
	 *   min?: number;
	 *   max?: number;
	 *   step?: number;
	 *   label: string;
	 * }} Props
	 */
	/** @type {Props} */
	let {
		value = $bindable(50),
		min = 0,
		max = 100,
		step = 1,
		label,
		disabled = false,
		oninput,
		onchange,
		id,
		class: className,
		style,
		...rest
	} = $props();

	const generatedId = $props.id();
	/** @type {HTMLInputElement | undefined} */
	let input = $state();
	let inputId = $derived(id ?? generatedId);

	// The browser owns range sanitization (including step rounding and changed bounds).
	// Read it back after DOM updates, without dispatching user input/change callbacks.
	$effect(() => {
		const node = input;
		const requested = value;
		const bounds = [min, max, step];
		if (!node) return;
		untrack(() => {
			node.min = String(bounds[0]);
			node.max = String(bounds[1]);
			node.step = String(bounds[2]);
			node.value = String(requested);
			const sanitized = node.valueAsNumber;
			if (Number.isFinite(sanitized) && !Object.is(value, sanitized)) value = sanitized;
		});
	});
	let progress = $derived(
		max > min && Number.isFinite(value)
			? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))
			: 0
	);

	/** @param {Event & { currentTarget: HTMLInputElement }} event */
	function handleInput(event) {
		value = event.currentTarget.valueAsNumber;
		oninput?.(event);
	}

	/** @param {Event & { currentTarget: HTMLInputElement }} event */
	function handleChange(event) {
		value = event.currentTarget.valueAsNumber;
		onchange?.(event);
	}
</script>

<div class={['apple-slider', className]} {style} data-disabled={disabled || undefined}>
	<label class="slider-label" for={inputId}>
		<span>{label}</span>
		<span class="slider-value" aria-hidden="true">{value}</span>
	</label>
	<input
		{...rest}
		id={inputId}
		type="range"
		{min}
		{max}
		{step}
		{disabled}
		bind:this={input}
		bind:value
		oninput={handleInput}
		onchange={handleChange}
		style:--slider-progress={`${progress}%`}
	/>
</div>

<style>
	.apple-slider {
		--slider-thumb-edge: #303034;
		--slider-fill: var(--apple-accent, var(--colors-accent, #0088ff));
		--slider-track: var(--apple-control-track, var(--fills-primary, #78787833));
		--slider-text: var(--apple-label, var(--labels-primary, #1c1c1e));
		box-sizing: border-box;
		color: var(--slider-text);
		display: grid;
		font-family: var(
			--apple-font-family,
			var(--sans-serif-font-family, ui-sans-serif, system-ui, -apple-system, sans-serif)
		);
		font-size: 17px;
		font-weight: 400;
		line-height: 22px;
		min-width: 0;
		width: 100%;
	}

	.slider-label {
		align-items: baseline;
		cursor: pointer;
		display: flex;
		gap: 12px;
		justify-content: space-between;
		overflow-wrap: anywhere;
	}

	.slider-value {
		font-variant-numeric: tabular-nums;
	}

	input {
		-webkit-appearance: none;
		appearance: none;
		background: transparent;
		border: 0;
		border-radius: 8px;
		box-sizing: border-box;
		cursor: pointer;
		display: block;
		height: 44px;
		margin: 0;
		min-height: 44px;
		min-width: 44px;
		padding: 0;
		width: 100%;
	}

	input::-webkit-slider-runnable-track {
		background: linear-gradient(
			var(--slider-direction, to right),
			var(--slider-fill) 0 var(--slider-progress),
			var(--slider-track) var(--slider-progress) 100%
		);
		border-radius: 100px;
		height: 6px;
	}

	input:dir(rtl) {
		--slider-direction: to left;
	}

	input::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		background: var(--apple-control-thumb, #fff);
		border: 1px solid var(--slider-thumb-edge);
		border-radius: 100px;
		box-shadow: 0 2px 5px #0003;
		box-sizing: border-box;
		height: 24px;
		margin-top: -9px;
		width: 38px;
	}

	input::-moz-range-track {
		background: var(--slider-track);
		border-radius: 100px;
		height: 6px;
	}

	input::-moz-range-progress {
		background: var(--slider-fill);
		border-radius: 100px;
		height: 6px;
	}

	input::-moz-range-thumb {
		background: var(--apple-control-thumb, #fff);
		border: 1px solid var(--slider-thumb-edge);
		border-radius: 100px;
		box-shadow: 0 2px 5px #0003;
		box-sizing: border-box;
		height: 24px;
		width: 38px;
	}

	input:focus-visible {
		outline: 2px solid var(--slider-fill);
		outline-offset: 2px;
	}

	input:active:not(:disabled)::-webkit-slider-thumb {
		box-shadow: 0 2px 8px #0005;
	}

	input:active:not(:disabled)::-moz-range-thumb {
		box-shadow: 0 2px 8px #0005;
	}

	.apple-slider[data-disabled] {
		opacity: 0.5;
	}

	input:disabled,
	.apple-slider[data-disabled] .slider-label {
		cursor: not-allowed;
	}

	@media (prefers-color-scheme: dark) {
		.apple-slider {
			--slider-track: var(--apple-control-track, var(--fills-primary, #7878805c));
			--slider-text: var(--apple-label, var(--labels-primary, #f5f5f7));
		}
	}

	@media (prefers-reduced-motion: reduce) {
		input {
			transition: none;
		}
	}

	@media (prefers-reduced-transparency: reduce) {
		.apple-slider {
			--slider-track: var(--apple-control-solid-track, #d1d1d6);
		}

		@media (prefers-color-scheme: dark) {
			.apple-slider {
				--slider-track: var(--apple-control-solid-track, #48484a);
			}
		}
	}

	@media (prefers-contrast: more) {
		.apple-slider {
			--slider-track: var(--apple-control-solid-track, #8e8e93);
		}

		input::-webkit-slider-thumb {
			border: 1px solid var(--slider-text);
		}

		input::-moz-range-thumb {
			border: 1px solid var(--slider-text);
		}

		.apple-slider[data-disabled] {
			opacity: 1;
		}
	}

	@media (forced-colors: active) {
		.apple-slider {
			--slider-fill: Highlight;
			--slider-track: GrayText;
		}

		input {
			forced-color-adjust: none;
		}

		input::-webkit-slider-thumb {
			background: ButtonFace;
			border: 1px solid ButtonText;
			box-shadow: none;
		}

		input::-moz-range-thumb {
			background: ButtonFace;
			border: 1px solid ButtonText;
			box-shadow: none;
		}

		.apple-slider[data-disabled] {
			--slider-fill: GrayText;
			color: GrayText;
			opacity: 1;
		}
	}
</style>
