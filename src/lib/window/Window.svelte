<script>
	/**
	 * A non-interactive window surface. Put selection behavior on a parent control,
	 * or compose interactive content inside it without creating nested buttons.
	 *
	 * @typedef {Omit<import('svelte/elements').HTMLAttributes<HTMLSpanElement>, 'children'> & {
	 *   active?: boolean;
	 *   selected?: boolean;
	 *   split?: boolean;
	 *   sidebar?: import('svelte').Snippet;
	 *   children?: import('svelte').Snippet;
	 * }} Props
	 */

	/** @type {Props} */
	let {
		active = true,
		selected = false,
		split = false,
		sidebar,
		children,
		class: className = '',
		style,
		...rest
	} = $props();
</script>

<span
	{...rest}
	class={['apple-window', className]}
	{style}
	data-kind={split ? 'split' : 'plain'}
	data-state={active ? 'active' : 'inactive'}
	data-selected={selected}
>
	{#if split}
		<span class="apple-window__sidebar">{@render sidebar?.()}</span>
	{/if}
	<span class="apple-window__content">{@render children?.()}</span>
</span>

<style>
	.apple-window {
		/* A light surface owns matching inherited content/control roles, in every OS mode. */
		--apple-label: var(--apple-window-color, #1d1d1f);
		--apple-secondary-label: var(--apple-window-secondary-label, #424245);
		--apple-action-text: var(--apple-window-action-text, #0050a4);
		--apple-focus-ring: var(--apple-window-focus-ring, var(--apple-action-text));
		--apple-control-fill: var(--apple-window-fill, #d1d1d6);
		--apple-control-solid-fill: var(--apple-window-fill, #d1d1d6);
		--apple-control-track: var(--apple-window-track, #c7c7cc);
		--apple-control-solid-track: var(--apple-window-track, #c7c7cc);
		--apple-control-edge: var(--apple-window-control-edge, #59595f);
		--apple-switch-track: var(--apple-window-track, #c7c7cc);
		--apple-switch-solid-track: var(--apple-window-track, #c7c7cc);
		--labels-primary: var(--apple-label);
		--labels-secondary: var(--apple-secondary-label);
		color-scheme: light;
		box-sizing: border-box;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		inline-size: 100%;
		min-inline-size: 0;
		aspect-ratio: var(--apple-window-aspect-ratio, 9 / 5);
		overflow: hidden;
		border-radius: var(--apple-window-radius, 34px);
		background: var(--apple-window-surface, #fff);
		color: var(--apple-window-color, #1d1d1f);
		box-shadow: var(--apple-window-shadow, 0 20px 34px oklch(0% 0 0 / 0.22));
		font-family: var(
			--apple-window-font-family,
			'SF Pro',
			'SF Pro Text',
			'Helvetica Neue',
			Helvetica,
			Arial,
			sans-serif
		);
	}

	.apple-window[data-kind='split'] {
		grid-template-columns: var(--apple-window-columns, minmax(0, 4fr) minmax(0, 5fr));
	}

	.apple-window[data-selected='true'] {
		box-shadow:
			0 0 0 2px var(--apple-window-accent, #0088ff),
			var(--apple-window-shadow, 0 20px 34px oklch(0% 0 0 / 0.22));
	}

	.apple-window__sidebar,
	.apple-window__content {
		box-sizing: border-box;
		display: block;
		min-inline-size: 0;
		min-block-size: 0;
	}

	.apple-window__sidebar {
		background: var(--apple-window-sidebar-active, oklch(89.32% 0.0026 228));
	}

	.apple-window[data-state='inactive'] .apple-window__sidebar {
		background: var(--apple-window-sidebar-inactive, oklch(94.94% 0.0013 286));
	}

	.apple-window__content {
		background: var(--apple-window-surface, #fff);
	}

	@media (prefers-contrast: more) {
		.apple-window {
			outline: 1px solid var(--apple-window-color, #1d1d1f);
			outline-offset: -1px;
		}
	}

	@media (forced-colors: active) {
		.apple-window {
			outline: 1px solid CanvasText;
			outline-offset: -1px;
		}

		.apple-window[data-selected='true'] {
			outline: 2px solid Highlight;
			outline-offset: 2px;
		}
	}
</style>
