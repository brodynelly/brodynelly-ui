<script>
	/**
	 * A native, form-compatible switch. `class` and `style` apply to the label;
	 * remaining attributes apply to the checkbox. `onchange` receives the native
	 * event after `checked` has been updated.
	 * @typedef {Omit<import('svelte/elements').HTMLInputAttributes, 'type' | 'role' | 'checked'> & {
	 *   checked?: boolean;
	 *   label: string;
	 * }} Props
	 */
	/** @type {Props} */
	let {
		checked = $bindable(false),
		label,
		disabled = false,
		onchange,
		id,
		class: className,
		style,
		...rest
	} = $props();

	const generatedId = $props.id();
	let inputId = $derived(id ?? generatedId);

	/** @param {Event & { currentTarget: HTMLInputElement }} event */
	function handleChange(event) {
		checked = event.currentTarget.checked;
		onchange?.(event);
	}
</script>

<label
	class={['apple-switch', className]}
	for={inputId}
	{style}
	data-disabled={disabled || undefined}
>
	<span class="switch-label">{label}</span>
	<span class="switch-control">
		<input
			{...rest}
			id={inputId}
			type="checkbox"
			role="switch"
			{disabled}
			bind:checked
			onchange={handleChange}
		/>
		<span class="switch-track" aria-hidden="true">
			<span class="switch-thumb"></span>
		</span>
	</span>
</label>

<style>
	.apple-switch {
		--switch-edge: var(--apple-control-edge, #6e6e73);
		--switch-thumb-edge: #303034;
		--switch-off: var(--apple-switch-track, var(--labels-tertiary, #3c3c434d));
		--switch-text: var(--apple-label, var(--labels-primary, #1c1c1e));
		align-items: center;
		box-sizing: border-box;
		color: var(--switch-text);
		cursor: pointer;
		display: inline-flex;
		font-family: var(
			--apple-font-family,
			var(--sans-serif-font-family, ui-sans-serif, system-ui, -apple-system, sans-serif)
		);
		font-size: 17px;
		font-weight: 400;
		gap: 12px;
		line-height: 22px;
		min-height: 44px;
		touch-action: manipulation;
	}

	.switch-label {
		overflow-wrap: anywhere;
	}

	.switch-control {
		align-items: center;
		display: inline-flex;
		flex: 0 0 64px;
		height: 44px;
		position: relative;
		width: 64px;
	}

	input {
		box-sizing: border-box;
		cursor: inherit;
		height: 100%;
		inset: 0;
		margin: 0;
		opacity: 0;
		position: absolute;
		width: 100%;
		z-index: 1;
	}

	.switch-track {
		background: var(--switch-off);
		box-shadow: inset 0 0 0 1px var(--switch-edge);
		border-radius: 100px;
		box-sizing: border-box;
		display: block;
		height: 28px;
		pointer-events: none;
		position: relative;
		width: 64px;
	}

	.switch-thumb {
		background: var(--apple-control-thumb, #fff);
		border-radius: 100px;
		box-shadow:
			inset 0 0 0 1px var(--switch-thumb-edge),
			0 1px 3px #00000026;
		height: 24px;
		inset-block-start: 2px;
		inset-inline-start: 2px;
		position: absolute;
		transition: transform 160ms cubic-bezier(0.2, 0.8, 0.2, 1);
		width: 38px;
	}

	input:checked + .switch-track {
		background: var(--apple-switch-on, var(--colors-green, #34c759));
	}

	input:checked + .switch-track .switch-thumb {
		transform: translateX(22px);
	}

	.apple-switch:dir(rtl) input:checked + .switch-track .switch-thumb {
		transform: translateX(-22px);
	}

	input:focus-visible + .switch-track {
		outline: 2px solid var(--apple-accent, var(--colors-accent, #0088ff));
		outline-offset: 3px;
	}

	input:active:not(:disabled) + .switch-track .switch-thumb {
		box-shadow:
			inset 0 0 0 1px var(--switch-thumb-edge),
			0 0 0 4px #ffffff40;
	}

	.apple-switch[data-disabled] {
		cursor: not-allowed;
		opacity: 0.5;
	}

	@media (prefers-color-scheme: dark) {
		.apple-switch {
			--switch-edge: var(--apple-control-edge, #aeaeb2);
			--switch-off: var(--apple-switch-track, var(--labels-tertiary, #ebebf54d));
			--switch-text: var(--apple-label, var(--labels-primary, #f5f5f7));
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.switch-thumb {
			transition: none;
		}
	}

	@media (prefers-reduced-transparency: reduce) {
		.apple-switch {
			--switch-off: var(--apple-switch-solid-track, #c4c4c6);
		}

		@media (prefers-color-scheme: dark) {
			.apple-switch {
				--switch-off: var(--apple-switch-solid-track, #46464a);
			}
		}
	}

	@media (prefers-contrast: more) {
		.switch-track {
			outline: 1px solid currentColor;
			outline-offset: -1px;
		}

		.switch-thumb {
			box-shadow: 0 0 0 1px #0009;
		}

		.apple-switch[data-disabled] {
			opacity: 1;
		}
	}

	@media (forced-colors: active) {
		.switch-track {
			background: Canvas;
			forced-color-adjust: none;
			outline: 1px solid CanvasText;
		}

		.switch-thumb {
			background: CanvasText;
			box-shadow: none;
		}

		input:checked + .switch-track {
			background: Highlight;
		}

		input:checked + .switch-track .switch-thumb {
			background: HighlightText;
		}

		input:focus-visible + .switch-track {
			outline-color: Highlight;
		}

		.apple-switch[data-disabled] {
			color: GrayText;
			opacity: 1;
		}
	}
</style>
