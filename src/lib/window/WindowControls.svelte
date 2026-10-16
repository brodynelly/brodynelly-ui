<script>
	import WindowControlPill from './WindowControlPill.svelte';

	/**
	 * A single appearance selector, not three separate window-action buttons.
	 * Selection is controlled by the caller through `selected` and `onclick`.
	 *
	 * @typedef {Omit<import('svelte/elements').HTMLButtonAttributes, 'children' | 'type' | 'aria-pressed'> & {
	 *   active?: boolean;
	 *   selected?: boolean;
	 *   label?: string;
	 *   disabled?: boolean;
	 *   onclick?: import('svelte/elements').MouseEventHandler<HTMLButtonElement>;
	 * }} Props
	 */

	/** @type {Props} */
	let { active = true, selected = false, label, disabled = false, onclick, ...rest } = $props();

	let controlLabel = $derived(label ?? (active ? 'Active' : 'Inactive'));
</script>

<WindowControlPill
	{...rest}
	{selected}
	{disabled}
	{onclick}
	data-control-state={active ? 'active' : 'inactive'}
>
	<span class="apple-window-traffic" data-state={active ? 'active' : 'inactive'} aria-hidden="true">
		<span></span><span></span><span></span>
	</span>
	<span>{controlLabel}</span>
</WindowControlPill>

<style>
	.apple-window-traffic {
		display: flex;
		align-items: center;
		flex: none;
		gap: var(--apple-window-dot-gap, 7px);
	}

	.apple-window-traffic > span {
		display: block;
		inline-size: var(--apple-window-dot-size, 8px);
		block-size: var(--apple-window-dot-size, 8px);
		border-radius: 50%;
		background: var(--apple-window-dot-active, currentColor);
	}

	.apple-window-traffic[data-state='inactive'] > span {
		background: var(--apple-window-dot-inactive, currentColor);
	}

	@media (forced-colors: active) {
		.apple-window-traffic > span {
			background: ButtonText;
		}
	}
</style>
