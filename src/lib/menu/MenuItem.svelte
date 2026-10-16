<script>
	/**
	 * @typedef {Object} Props
	 * @property {string} [label=''] Accessible label and typeahead text; also the default visible content.
	 * @property {boolean} [disabled=false] Prevents activation and is skipped by keyboard navigation.
	 * @property {boolean} [destructive=false] Marks a destructive action visually.
	 * @property {boolean} [checked] Bindable state. Supplying a boolean gives the menuitemcheckbox role.
	 * @property {(event: MouseEvent) => void} [onclick] Called before activation; preventDefault() prevents toggling and keeps the menu open.
	 * @property {import('svelte').Snippet} [children] Noninteractive content in place of the label.
	 * @property {string} [id]
	 * @property {string} [class]
	 * @property {string} [style]
	 */

	/** @type {Props} */
	let {
		label = '',
		disabled = false,
		destructive = false,
		checked = $bindable(undefined),
		onclick,
		children,
		id,
		class: className = '',
		style
	} = $props();

	/** @param {MouseEvent} event */
	function activate(event) {
		if (disabled) {
			event.preventDefault();
			return;
		}
		onclick?.(event);
		if (!event.defaultPrevented && checked !== undefined) checked = !checked;
	}
</script>

<button
	class={`menu-item ${className}`}
	class:destructive
	{id}
	{style}
	type="button"
	role={checked === undefined ? 'menuitem' : 'menuitemcheckbox'}
	aria-label={label || undefined}
	aria-checked={checked}
	aria-disabled={disabled || undefined}
	{disabled}
	tabindex="-1"
	data-menu-label={label || undefined}
	onclick={activate}
>
	{#if checked !== undefined}
		<span class="menu-check" aria-hidden="true">
			{#if checked}
				<svg viewBox="0 0 20 20" width="20" height="20" fill="none">
					<path
						d="m4.5 10 3.5 3.5 7.5-8"
						stroke="currentColor"
						stroke-width="1.8"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			{/if}
		</span>
	{/if}
	<span class="menu-item-content">
		{#if children}
			{@render children()}
		{:else}
			{label}
		{/if}
	</span>
</button>

<style>
	.menu-item {
		align-items: center;
		appearance: none;
		background: transparent;
		border: 0;
		border-radius: 18px;
		box-sizing: border-box;
		color: inherit;
		cursor: pointer;
		display: flex;
		flex: 0 0 auto;
		font-family: var(--sans-serif-font-family, ui-sans-serif, system-ui, sans-serif);
		font-size: 15px;
		font-weight: 500;
		gap: 8px;
		letter-spacing: 0.01em;
		line-height: 20px;
		margin: 0;
		min-height: 44px;
		padding: 10px 12px;
		text-align: start;
		touch-action: manipulation;
		width: 100%;
		-webkit-tap-highlight-color: transparent;
	}

	.menu-item-content {
		flex: 1;
		min-width: 0;
		overflow-wrap: anywhere;
	}

	.menu-check {
		align-items: center;
		display: inline-flex;
		flex: 0 0 20px;
		justify-content: center;
	}

	.menu-item.destructive {
		color: var(--menu-destructive, #c52228);
	}

	.menu-item:focus-visible {
		background: var(--fills-tertiary, rgb(118 118 128 / 12%));
		outline: 2px solid var(--colors-accent, #007aff);
		outline-offset: -2px;
	}

	@media (hover: hover) {
		.menu-item:hover:not(:disabled) {
			background: var(--fills-tertiary, rgb(118 118 128 / 12%));
		}
	}

	.menu-item:active:not(:disabled) {
		background: var(--fills-primary, rgb(120 120 120 / 20%));
	}

	.menu-item:disabled {
		color: var(--menu-disabled, #737378);
		cursor: default;
	}

	@media (prefers-color-scheme: dark) {
		.menu-item.destructive {
			color: var(--menu-destructive, #ff696c);
		}
		.menu-item:disabled {
			color: var(--menu-disabled, #969699);
		}
	}

	@media (prefers-contrast: more) {
		.menu-item:focus-visible {
			outline-width: 3px;
		}
	}

	@media (forced-colors: active) {
		.menu-item.destructive {
			color: ButtonText;
		}
		.menu-item:focus-visible,
		.menu-item:active:not(:disabled) {
			background: Highlight;
			color: HighlightText;
			outline-color: Highlight;
		}
		.menu-item:disabled {
			color: GrayText;
		}
	}
</style>
