<script>
	/**
	 * A bounded numeric stepper. Values are clamped when bounds change, and
	 * decimal steps avoid floating-point display artifacts. `onchange` receives
	 * `(value, event)` after a user increment/decrement, not for prop updates.
	 * Other attributes, including `class` and `style`, apply to the group.
	 * @typedef {Omit<import('svelte/elements').HTMLAttributes<HTMLDivElement>, 'onchange' | 'oninput' | 'role'> & {
	 *   value?: number;
	 *   min?: number;
	 *   max?: number;
	 *   step?: number;
	 *   label: string;
	 *   disabled?: boolean;
	 *   onchange?: (value: number, event: MouseEvent & { currentTarget: HTMLButtonElement }) => void;
	 * }} Props
	 */
	/** @type {Props} */
	let {
		value = $bindable(0),
		min = 0,
		max = 100,
		step = 1,
		label,
		disabled = false,
		onchange,
		id,
		class: className,
		style,
		...rest
	} = $props();

	const generatedId = $props.id();
	let labelId = $derived(`${id ?? generatedId}-label`);
	let valueId = $derived(`${id ?? generatedId}-value`);
	let lowerBound = $derived(Number.isFinite(min) ? min : 0);
	let upperBound = $derived(Math.max(lowerBound, Number.isFinite(max) ? max : 100));
	let increment = $derived(Number.isFinite(step) && step > 0 ? step : 1);
	let currentValue = $derived(
		Math.min(upperBound, Math.max(lowerBound, Number.isFinite(value) ? value : lowerBound))
	);

	$effect(() => {
		if (value !== currentValue) value = currentValue;
	});

	/**
	 * @param {number} direction
	 * @param {MouseEvent & { currentTarget: HTMLButtonElement }} event
	 */
	function changeValue(direction, event) {
		if (disabled) return;
		const next = Math.min(
			upperBound,
			Math.max(lowerBound, Number((currentValue + direction * increment).toPrecision(15)))
		);
		if (next === currentValue) return;
		value = next;
		onchange?.(value, event);
	}
</script>

<div
	{...rest}
	{id}
	class={['apple-stepper', className]}
	{style}
	role="group"
	aria-labelledby={labelId}
	aria-disabled={disabled || undefined}
	data-disabled={disabled || undefined}
>
	<span class="stepper-label" id={labelId}>{label}</span>
	<div class="stepper-control">
		<button
			type="button"
			class="decrement"
			aria-label={`Decrease ${label}`}
			aria-describedby={valueId}
			disabled={disabled || currentValue <= lowerBound}
			onclick={(event) => changeValue(-1, event)}
		>
			<svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
				<path d="M4 10h12" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
			</svg>
		</button>
		<output id={valueId} aria-labelledby={labelId} aria-live="polite" aria-atomic="true">
			{currentValue}
		</output>
		<button
			type="button"
			class="increment"
			aria-label={`Increase ${label}`}
			aria-describedby={valueId}
			disabled={disabled || currentValue >= upperBound}
			onclick={(event) => changeValue(1, event)}
		>
			<svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
				<path
					d="M4 10h12M10 4v12"
					stroke="currentColor"
					stroke-width="1.75"
					stroke-linecap="round"
				/>
			</svg>
		</button>
	</div>
</div>

<style>
	.apple-stepper {
		--stepper-fill: var(--apple-control-fill, var(--fills-tertiary, #7676801f));
		--stepper-text: var(--apple-label, var(--labels-primary, #1c1c1e));
		--stepper-press: var(--apple-control-press, #00000014);
		align-items: center;
		box-sizing: border-box;
		color: var(--stepper-text);
		display: inline-flex;
		flex-wrap: wrap;
		font-family: var(
			--apple-font-family,
			var(--sans-serif-font-family, ui-sans-serif, system-ui, -apple-system, sans-serif)
		);
		font-size: 17px;
		font-weight: 400;
		gap: 12px;
		line-height: 22px;
		min-height: 44px;
	}

	.stepper-label {
		overflow-wrap: anywhere;
	}

	.stepper-control {
		align-items: center;
		background: var(--stepper-fill);
		border-radius: 100px;
		display: inline-flex;
		flex-shrink: 0;
	}

	button {
		align-items: center;
		appearance: none;
		background: transparent;
		border: 0;
		box-sizing: border-box;
		color: inherit;
		cursor: pointer;
		display: inline-flex;
		font: inherit;
		justify-content: center;
		margin: 0;
		min-height: 44px;
		min-width: 46px;
		padding: 10px;
		touch-action: manipulation;
	}

	.decrement {
		border-radius: 100px 0 0 100px;
	}

	.increment {
		border-radius: 0 100px 100px 0;
	}

	.apple-stepper:dir(rtl) .decrement {
		border-radius: 0 100px 100px 0;
	}

	.apple-stepper:dir(rtl) .increment {
		border-radius: 100px 0 0 100px;
	}

	button:active:not(:disabled) {
		background: var(--stepper-press);
	}

	button:focus-visible {
		outline: 2px solid var(--apple-accent, var(--colors-accent, #0088ff));
		outline-offset: 2px;
	}

	button:disabled {
		cursor: not-allowed;
		opacity: 0.35;
	}

	output {
		border-inline: 1px solid var(--apple-control-separator, var(--separators-non-opaque, #3c3c434d));
		box-sizing: content-box;
		font-variant-numeric: tabular-nums;
		min-width: 2ch;
		padding-inline: 10px;
		text-align: center;
	}

	.apple-stepper[data-disabled] {
		opacity: 0.5;
	}

	.apple-stepper[data-disabled] button:disabled {
		opacity: 1;
	}

	@media (prefers-color-scheme: dark) {
		.apple-stepper {
			--stepper-fill: var(--apple-control-fill, var(--fills-tertiary, #7676803d));
			--stepper-text: var(--apple-label, var(--labels-primary, #f5f5f7));
			--stepper-press: var(--apple-control-press, #ffffff1f);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		button {
			transition: none;
		}
	}

	@media (prefers-reduced-transparency: reduce) {
		.apple-stepper {
			--stepper-fill: var(--apple-control-solid-fill, #efeff0);
		}

		@media (prefers-color-scheme: dark) {
			.apple-stepper {
				--stepper-fill: var(--apple-control-solid-fill, #2c2c2e);
			}
		}
	}

	@media (prefers-contrast: more) {
		.stepper-control {
			outline: 1px solid currentColor;
			outline-offset: -1px;
		}

		.apple-stepper[data-disabled] {
			opacity: 1;
		}

		button:disabled {
			color: GrayText;
			opacity: 1;
		}
	}

	@media (forced-colors: active) {
		.stepper-control {
			outline: 1px solid ButtonText;
		}

		button:focus-visible {
			outline-color: Highlight;
		}

		button:disabled,
		.apple-stepper[data-disabled] {
			color: GrayText;
			opacity: 1;
		}
	}
</style>
