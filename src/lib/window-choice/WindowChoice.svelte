<script>
	import { Spring, prefersReducedMotion } from 'svelte/motion';
	import Window from '../window/Window.svelte';

	/**
	 * A selectable window preview. Put interactive window content in Window instead.
	 * @typedef {Omit<import('svelte/elements').HTMLButtonAttributes, 'children' | 'onclick'> & {
	 * label?: string;
	 * active?: boolean;
	 * split?: boolean;
	 * selected?: boolean;
	 * onclick?: (event: MouseEvent) => void;
	 * }} Props
	 */
	/** @type {Props} */
	let {
		label = 'Window',
		active = true,
		split = false,
		selected = $bindable(false),
		disabled = false,
		onclick,
		onpointerenter,
		onpointerleave,
		onpointerdown,
		onpointerup,
		onpointercancel,
		onblur,
		onkeydown,
		onkeyup,
		class: className = '',
		style = '',
		...rest
	} = $props();

	let hovered = $state(false);
	let pressed = $state(false);
	const position = new Spring(0, { stiffness: 0.25, damping: 0.8 });
	const scale = new Spring(1, { stiffness: 0.3, damping: 0.85 });

	$effect(() => {
		const reduced = prefersReducedMotion.current;
		position.set(disabled ? 0 : pressed ? -1 : hovered ? -5 : 0, { instant: reduced });
		scale.set(!disabled && pressed ? 0.995 : 1, { instant: reduced });
	});
</script>

<button
	{...rest}
	type="button"
	class="apple-window-choice {className}"
	style="--choice-y: {position.current}px; --choice-scale: {scale.current}; {style}"
	aria-label={rest['aria-label'] ?? `Select ${label.toLowerCase()}`}
	aria-pressed={selected}
	{disabled}
	onpointerenter={(event) => {
		hovered = true;
		onpointerenter?.(event);
	}}
	onpointerleave={(event) => {
		hovered = false;
		pressed = false;
		onpointerleave?.(event);
	}}
	onpointerdown={(event) => {
		onpointerdown?.(event);
		if (!disabled && !event.defaultPrevented && event.button === 0 && event.isPrimary)
			pressed = true;
	}}
	onpointerup={(event) => {
		pressed = false;
		onpointerup?.(event);
	}}
	onpointercancel={(event) => {
		pressed = false;
		onpointercancel?.(event);
	}}
	onblur={(event) => {
		pressed = false;
		onblur?.(event);
	}}
	onkeydown={(event) => {
		onkeydown?.(event);
		if (!disabled && !event.defaultPrevented && (event.key === ' ' || event.key === 'Enter')) {
			pressed = true;
		}
	}}
	onkeyup={(event) => {
		if (event.key === ' ' || event.key === 'Enter') pressed = false;
		onkeyup?.(event);
	}}
	onclick={(event) => {
		selected = true;
		onclick?.(event);
	}}
>
	<Window {active} {split} {selected} aria-hidden="true" style="border-radius: inherit;" />
	<span class="window-label">{label}</span>
</button>

<style>
	.apple-window-choice {
		--choice-label-default: #424245;
		box-sizing: border-box;
		display: block;
		width: 100%;
		min-height: 44px;
		padding: 0;
		border: 0;
		border-radius: clamp(17px, 2.2vw, var(--apple-window-radius, 34px));
		background: transparent;
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;
		transform: translateY(var(--choice-y)) scale(var(--choice-scale));
	}

	.apple-window-choice:focus-visible {
		outline: 3px solid var(--apple-accent, #0088ff);
		outline-offset: 8px;
	}

	.apple-window-choice:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.window-label {
		display: block;
		margin-top: 19px;
		color: var(
			--apple-window-choice-label,
			var(--apple-secondary-label, var(--choice-label-default))
		);
		font-size: 15px;
		line-height: 1.4;
	}

	.apple-window-choice:hover .window-label,
	.apple-window-choice[aria-pressed='true'] .window-label {
		color: inherit;
	}

	@media (max-width: 760px) {
		.apple-window-choice {
			border-radius: clamp(20px, 6vw, 34px);
		}

		.window-label {
			margin-top: 13px;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.apple-window-choice {
			transform: none;
		}
	}

	@media (prefers-color-scheme: dark) {
		.apple-window-choice {
			--choice-label-default: #e6e6e6;
		}
	}
</style>
