<script>
	/**
	 * A native search input with an accessible, keyboard-operable clear button.
	 * `class` and `style` apply to the wrapper; other attributes target the input.
	 * Callbacks receive native events after the binding updates. Clearing emits
	 * bubbling `input` and `change` events, then leaves focus in the input.
	 * @typedef {Omit<import('svelte/elements').HTMLInputAttributes, 'type' | 'role' | 'value'> & {
	 *   value?: string;
	 *   label?: string;
	 * }} Props
	 */
	/** @type {Props} */
	let {
		value = $bindable(''),
		label = 'Search',
		placeholder = 'Search',
		disabled = false,
		readonly = false,
		oninput,
		onchange,
		id,
		class: className,
		style,
		...rest
	} = $props();

	const generatedId = $props.id();
	let inputId = $derived(id ?? generatedId);
	/** @type {HTMLInputElement | undefined} */
	let input = $state();

	/** @param {Event & { currentTarget: HTMLInputElement }} event */
	function handleInput(event) {
		value = event.currentTarget.value;
		oninput?.(event);
	}

	/** @param {Event & { currentTarget: HTMLInputElement }} event */
	function handleChange(event) {
		value = event.currentTarget.value;
		onchange?.(event);
	}

	function clear() {
		if (disabled || readonly || !input || value === '') return;
		value = '';
		input.value = '';
		input.focus();
		input.dispatchEvent(new Event('input', { bubbles: true }));
		input.dispatchEvent(new Event('change', { bubbles: true }));
	}
</script>

<div class={['apple-search-field', className]} {style} data-disabled={disabled || undefined}>
	<label class="search-label" for={inputId}>{label}</label>
	<div class="search-control">
		<svg
			class="search-icon"
			width="20"
			height="20"
			viewBox="0 0 20 20"
			fill="none"
			aria-hidden="true"
		>
			<circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" stroke-width="1.6" />
			<path d="m12.5 12.5 4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
		</svg>
		<input
			{...rest}
			id={inputId}
			type="search"
			{placeholder}
			{disabled}
			{readonly}
			bind:this={input}
			bind:value
			oninput={handleInput}
			onchange={handleChange}
		/>
		{#if value !== ''}
			<button
				type="button"
				aria-label={`Clear ${label}`}
				disabled={disabled || readonly}
				onclick={clear}
			>
				<svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
					<circle cx="10" cy="10" r="8" fill="currentColor" />
					<path
						d="m7.5 7.5 5 5m0-5-5 5"
						stroke="var(--apple-control-thumb, #fff)"
						stroke-width="1.5"
						stroke-linecap="round"
					/>
				</svg>
			</button>
		{/if}
	</div>
</div>

<style>
	.apple-search-field {
		--search-fill: var(--apple-control-fill, var(--fills-tertiary, #7676801f));
		--search-text: var(--apple-label, var(--labels-primary, #1c1c1e));
		--search-secondary: var(--apple-secondary-label, #59595f);
		box-sizing: border-box;
		color: var(--search-text);
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

	.search-label {
		clip-path: inset(50%);
		height: 1px;
		overflow: hidden;
		position: absolute;
		white-space: nowrap;
		width: 1px;
	}

	.search-control {
		align-items: center;
		background: var(--search-fill);
		border: 1px solid transparent;
		border-radius: var(--apple-control-radius, 12px);
		box-sizing: border-box;
		display: flex;
		gap: 8px;
		min-height: 44px;
		padding-inline-start: 12px;
	}

	.search-control:focus-within {
		outline: 2px solid var(--apple-focus-ring, var(--apple-accent, var(--colors-accent, #0088ff)));
		outline-offset: 2px;
	}

	.search-icon {
		color: var(--search-secondary);
		flex-shrink: 0;
		pointer-events: none;
	}

	input {
		-webkit-appearance: none;
		appearance: none;
		background: transparent;
		border: 0;
		border-radius: 0;
		box-sizing: border-box;
		color: inherit;
		flex: 1;
		font: inherit;
		margin: 0;
		min-height: 44px;
		min-width: 0;
		padding: 10px 12px 10px 0;
		user-select: text;
		width: 100%;
	}

	input:focus {
		outline: none;
	}

	input::placeholder {
		color: var(--search-secondary);
		opacity: 1;
	}

	input::-webkit-search-cancel-button,
	input::-webkit-search-decoration {
		-webkit-appearance: none;
		appearance: none;
	}

	button {
		align-items: center;
		appearance: none;
		background: transparent;
		border: 0;
		border-radius: 10px;
		box-sizing: border-box;
		color: var(--search-secondary);
		cursor: pointer;
		display: inline-flex;
		flex: 0 0 44px;
		justify-content: center;
		margin: 0;
		min-height: 44px;
		min-width: 44px;
		padding: 0;
		touch-action: manipulation;
	}

	button:active:not(:disabled) {
		background: var(--apple-control-press, #78788029);
	}

	button:focus-visible {
		outline: 2px solid var(--apple-focus-ring, var(--apple-accent, var(--colors-accent, #0088ff)));
		outline-offset: -3px;
	}

	input:disabled,
	button:disabled {
		cursor: not-allowed;
	}

	.apple-search-field[data-disabled] {
		opacity: 0.5;
	}

	@media (prefers-color-scheme: dark) {
		.apple-search-field {
			--search-fill: var(--apple-control-fill, var(--fills-tertiary, #7676803d));
			--search-text: var(--apple-label, var(--labels-primary, #f5f5f7));
			--search-secondary: var(--apple-secondary-label, #aeaeb2);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		button,
		.search-control {
			transition: none;
		}
	}

	@media (prefers-reduced-transparency: reduce) {
		.apple-search-field {
			--search-fill: var(--apple-control-solid-fill, #efeff0);
		}

		@media (prefers-color-scheme: dark) {
			.apple-search-field {
				--search-fill: var(--apple-control-solid-fill, #2c2c2e);
			}
		}
	}

	@media (prefers-contrast: more) {
		.search-control {
			border-color: currentColor;
		}

		.apple-search-field[data-disabled] {
			opacity: 1;
		}
	}

	@media (forced-colors: active) {
		.search-control {
			background: Field;
			border-color: FieldText;
			color: FieldText;
		}

		.search-control:focus-within,
		button:focus-visible {
			outline-color: Highlight;
		}

		.apple-search-field[data-disabled] {
			color: GrayText;
			opacity: 1;
		}
	}
</style>
