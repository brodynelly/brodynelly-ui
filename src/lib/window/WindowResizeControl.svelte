<script>
	import WindowControlPill from './WindowControlPill.svelte';

	/**
	 * Selects a resize appearance; it does not invoke the browser Fullscreen API.
	 * @typedef {Omit<import('svelte/elements').HTMLButtonAttributes, 'children' | 'type' | 'aria-pressed'> & {
	 *   mode?: 'floating' | 'full-screen';
	 *   selected?: boolean;
	 *   label?: string;
	 *   disabled?: boolean;
	 *   onclick?: import('svelte/elements').MouseEventHandler<HTMLButtonElement>;
	 * }} Props
	 */

	/** @type {Props} */
	let { mode = 'floating', selected = false, label, disabled = false, onclick, ...rest } = $props();

	let controlLabel = $derived(label ?? (mode === 'full-screen' ? 'Full screen' : 'Floating'));
</script>

<WindowControlPill {...rest} {selected} {disabled} {onclick} data-resize-state={mode}>
	<span class="apple-window-resize-glyph" aria-hidden="true"></span>
	<span>{controlLabel}</span>
</WindowControlPill>

<style>
	.apple-window-resize-glyph {
		position: relative;
		display: block;
		flex: none;
		inline-size: var(--apple-window-resize-glyph-size, 18px);
		block-size: var(--apple-window-resize-glyph-size, 18px);
	}

	.apple-window-resize-glyph::before,
	.apple-window-resize-glyph::after {
		content: '';
		position: absolute;
		right: 0;
		bottom: 0;
		border-right: var(--apple-window-resize-glyph-stroke, 1.5px) solid currentColor;
		border-bottom: var(--apple-window-resize-glyph-stroke, 1.5px) solid currentColor;
		border-radius: 0 0 3px 0;
	}

	.apple-window-resize-glyph::before {
		inline-size: 16px;
		block-size: 16px;
	}

	.apple-window-resize-glyph::after {
		inline-size: 9px;
		block-size: 9px;
	}
</style>
