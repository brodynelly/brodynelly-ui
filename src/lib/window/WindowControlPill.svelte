<script>
	/**
	 * Shared visual treatment for the source sheet's appearance selectors.
	 * @typedef {Omit<import('svelte/elements').HTMLButtonAttributes, 'children' | 'type' | 'aria-pressed'> & {
	 *   selected?: boolean;
	 *   children?: import('svelte').Snippet;
	 * }} Props
	 */

	/** @type {Props} */
	let {
		selected = false,
		disabled = false,
		children,
		class: className = '',
		style,
		...rest
	} = $props();
</script>

<button
	{...rest}
	type="button"
	class={['apple-window-control', className]}
	{style}
	{disabled}
	aria-pressed={selected}
>
	{@render children?.()}
</button>

<style>
	.apple-window-control {
		--pill-label: #1d1d1f;
		--pill-border: #6e6e73;
		--pill-fill: #e5e5ea;
		--pill-hover: #d1d1d6;
		--pill-pressed: #c7c7cc;
		box-sizing: border-box;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--apple-window-control-gap, 12px);
		min-inline-size: 44px;
		min-block-size: 44px;
		margin: 0;
		padding: var(--apple-window-control-padding, 9px 15px);
		border: 1px solid var(--apple-window-control-border, var(--pill-border));
		border-radius: var(--apple-window-control-radius, 980px);
		background: var(--apple-window-control-background, var(--apple-control-fill, var(--pill-fill)));
		color: var(--apple-window-control-color, var(--apple-label, var(--pill-label)));
		font-family: var(
			--apple-window-font-family,
			'SF Pro',
			'SF Pro Text',
			'Helvetica Neue',
			Helvetica,
			Arial,
			sans-serif
		);
		font-size: var(--apple-window-control-font-size, 14px);
		font-weight: 400;
		line-height: 1.4;
		text-align: start;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		transition:
			background-color 150ms cubic-bezier(0.28, 0, 0.22, 1),
			border-color 150ms cubic-bezier(0.28, 0, 0.22, 1);
	}

	.apple-window-control:enabled:hover {
		border-color: var(--apple-window-control-hover-border, currentColor);
		background: var(
			--apple-window-control-hover-background,
			var(--apple-control-fill, var(--pill-hover))
		);
	}

	.apple-window-control[aria-pressed='true'] {
		border-color: var(--apple-window-control-selected-border, currentColor);
		background: var(
			--apple-window-control-selected-background,
			var(--apple-control-fill, var(--pill-hover))
		);
	}

	.apple-window-control:enabled:active {
		border-color: var(--apple-window-control-selected-border, currentColor);
		background: var(
			--apple-window-control-pressed-background,
			var(--apple-control-fill, var(--pill-pressed))
		);
	}

	.apple-window-control:focus-visible {
		outline: 3px solid var(--apple-window-accent, #0088ff);
		outline-offset: 5px;
	}

	.apple-window-control:disabled {
		opacity: var(--apple-window-control-disabled-opacity, 0.5);
		cursor: default;
	}

	@media (prefers-reduced-motion: reduce) {
		.apple-window-control {
			transition: none;
		}
	}

	@media (prefers-color-scheme: dark) {
		.apple-window-control {
			--pill-label: #f5f5f7;
			--pill-border: #aeaeb2;
			--pill-fill: #2c2c2e;
			--pill-hover: #3a3a3c;
			--pill-pressed: #48484a;
		}
	}

	@media (prefers-reduced-transparency: reduce) {
		.apple-window-control {
			background: var(
				--apple-window-control-solid-background,
				var(--apple-control-solid-fill, var(--pill-fill))
			);
		}

		.apple-window-control:enabled:hover,
		.apple-window-control[aria-pressed='true'] {
			background: var(
				--apple-window-control-solid-selected-background,
				var(--apple-control-solid-fill, var(--pill-hover))
			);
		}

		.apple-window-control:enabled:active {
			background: var(--apple-window-control-solid-pressed-background, var(--pill-pressed));
		}
	}

	@media (prefers-contrast: more) {
		.apple-window-control {
			border-color: currentColor;
			background: var(
				--apple-window-control-solid-background,
				var(--apple-control-solid-fill, var(--pill-fill))
			);
		}

		.apple-window-control[aria-pressed='true'] {
			outline: 1px solid currentColor;
			outline-offset: 2px;
		}

		.apple-window-control:focus-visible {
			outline: 3px solid var(--apple-window-accent, #0088ff);
			outline-offset: 5px;
		}
	}

	@media (forced-colors: active) {
		.apple-window-control {
			border-color: ButtonText;
		}

		.apple-window-control[aria-pressed='true'] {
			outline: 2px solid Highlight;
			outline-offset: 2px;
		}

		.apple-window-control:focus-visible {
			outline: 3px solid Highlight;
			outline-offset: 5px;
		}
	}
</style>
