<script>
	import { onDestroy } from 'svelte';

	/**
	 * A two-pane layout with a bindable sidebar fraction (0–1).
	 * Arrow keys change the fraction by 1%, or 10% with Shift; Home/End use
	 * the bounds. Escape, pointer cancellation, or window blur cancels a drag.
	 * The layout fills its parent and can be composed inside `Window`.
	 *
	 * @typedef {Omit<import('svelte/elements').HTMLAttributes<HTMLDivElement>, 'children'> & {
	 *   ratio?: number;
	 *   minRatio?: number;
	 *   maxRatio?: number;
	 *   active?: boolean;
	 *   resizable?: boolean;
	 *   label?: string;
	 *   sidebar?: import('svelte').Snippet;
	 *   children?: import('svelte').Snippet;
	 * }} Props
	 */

	/** @type {Props} */
	let {
		ratio = $bindable(4 / 9),
		minRatio = 0.2,
		maxRatio = 0.8,
		active = true,
		resizable = true,
		label = 'Resize sidebar',
		sidebar,
		children,
		class: className = '',
		style,
		...rest
	} = $props();

	const id = $props.id();
	const sidebarId = `${id}-sidebar`;

	/** @type {HTMLDivElement | undefined} */
	let root = $state();
	let dragging = $state(false);

	/** @type {{ pointerId: number; target: HTMLDivElement; startX: number; startRatio: number; width: number; direction: number } | undefined} */
	let drag;

	let lowerBound = $derived(Math.max(0, Math.min(1, Number.isFinite(minRatio) ? minRatio : 0.2)));
	let upperBound = $derived(
		Math.max(lowerBound, Math.min(1, Number.isFinite(maxRatio) ? maxRatio : 0.8))
	);
	let effectiveRatio = $derived(clamp(Number.isFinite(ratio) ? ratio : 4 / 9));
	let canResize = $derived(resizable && upperBound > lowerBound);
	let percent = $derived(Number((effectiveRatio * 100).toFixed(2)));

	/** @param {number} value */
	function clamp(value) {
		return Math.max(lowerBound, Math.min(upperBound, value));
	}

	// Keep the bound value consistent with the visible and accessible layout.
	$effect(() => {
		if (ratio !== effectiveRatio) ratio = effectiveRatio;
	});

	$effect(() => {
		if (!canResize) finishDrag(true);
	});

	/** @param {boolean} [cancel] */
	function finishDrag(cancel = false) {
		const session = drag;
		if (!session) return;

		// Clear first: releasing capture can synchronously dispatch a lost event.
		drag = undefined;
		dragging = false;
		if (cancel) ratio = clamp(session.startRatio);
		if (session.target.hasPointerCapture(session.pointerId)) {
			session.target.releasePointerCapture(session.pointerId);
		}
	}

	/** @param {PointerEvent & { currentTarget: HTMLDivElement }} event */
	function handlePointerDown(event) {
		if (!canResize || drag || event.button !== 0 || !event.isPrimary || !root) return;

		const width = root.getBoundingClientRect().width;
		if (width <= 0) return;

		const target = event.currentTarget;
		target.setPointerCapture(event.pointerId);
		drag = {
			pointerId: event.pointerId,
			target,
			startX: event.clientX,
			startRatio: effectiveRatio,
			width,
			direction: getComputedStyle(root).direction === 'rtl' ? -1 : 1
		};
		dragging = true;
		target.focus({ preventScroll: true });
		event.preventDefault();
	}

	/** @param {PointerEvent} event */
	function updateFromPointer(event) {
		if (!drag || drag.pointerId !== event.pointerId) return;

		// Preserve the grab offset; there is no snap-to-center or release inertia.
		ratio = clamp(drag.startRatio + ((event.clientX - drag.startX) * drag.direction) / drag.width);
	}

	/** @param {PointerEvent} event */
	function handlePointerMove(event) {
		if (!drag || drag.pointerId !== event.pointerId) return;
		event.preventDefault();
		updateFromPointer(event);
	}

	/** @param {PointerEvent} event */
	function handlePointerUp(event) {
		if (!drag || drag.pointerId !== event.pointerId) return;
		updateFromPointer(event);
		finishDrag();
	}

	/** @param {PointerEvent} event */
	function handlePointerCancel(event) {
		if (drag?.pointerId === event.pointerId) finishDrag(true);
	}

	function cancelDrag() {
		finishDrag(true);
	}

	/** @param {KeyboardEvent} event */
	function handleKeyDown(event) {
		if (event.key === 'Escape' && drag) {
			event.preventDefault();
			finishDrag(true);
			return;
		}
		if (!canResize || event.altKey || event.ctrlKey || event.metaKey) return;

		const direction = root && getComputedStyle(root).direction === 'rtl' ? -1 : 1;
		const step = event.shiftKey ? 0.1 : 0.01;
		let nextRatio;
		switch (event.key) {
			case 'ArrowLeft':
				nextRatio = effectiveRatio - step * direction;
				break;
			case 'ArrowRight':
				nextRatio = effectiveRatio + step * direction;
				break;
			case 'Home':
				nextRatio = lowerBound;
				break;
			case 'End':
				nextRatio = upperBound;
				break;
			default:
				return;
		}

		event.preventDefault();
		finishDrag();
		ratio = clamp(nextRatio);
	}

	// No document-level pointer listeners, timers, or animation frames survive unmount.
	onDestroy(() => finishDrag());
</script>

<svelte:window onblur={cancelDrag} />

<div
	{...rest}
	bind:this={root}
	class={['apple-split-view', className]}
	style={`${style ?? ''}; --apple-window-split-ratio: ${effectiveRatio}`}
	data-state={active ? 'active' : 'inactive'}
	data-resizable={canResize}
	data-dragging={dragging}
>
	<div class="apple-split-view__sidebar" id={sidebarId}>{@render sidebar?.()}</div>
	<div class="apple-split-view__content">{@render children?.()}</div>
	{#if canResize}
		<!-- A value-bearing separator follows the WAI-ARIA window splitter pattern. -->
		<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
		<div
			class="apple-split-view__separator"
			role="separator"
			tabindex="0"
			aria-label={label}
			aria-orientation="vertical"
			aria-controls={sidebarId}
			aria-valuemin={Number((lowerBound * 100).toFixed(2))}
			aria-valuemax={Number((upperBound * 100).toFixed(2))}
			aria-valuenow={percent}
			aria-valuetext={`${percent}% sidebar`}
			onkeydown={handleKeyDown}
			onpointerdown={handlePointerDown}
			onpointermove={handlePointerMove}
			onpointerup={handlePointerUp}
			onpointercancel={handlePointerCancel}
			onlostpointercapture={handlePointerCancel}
		></div>
	{/if}
</div>

<style>
	.apple-split-view {
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
		position: relative;
		display: grid;
		grid-template-columns:
			minmax(0, calc(var(--apple-window-split-ratio, 0.4444444444) * 100%))
			minmax(0, 1fr);
		inline-size: 100%;
		block-size: 100%;
		min-inline-size: 0;
		min-block-size: 0;
		isolation: isolate;
		background: var(--apple-window-surface, #fff);
		color: var(--apple-window-color, #1d1d1f);
	}

	.apple-split-view__sidebar,
	.apple-split-view__content {
		box-sizing: border-box;
		min-inline-size: 0;
		min-block-size: 0;
		overflow: auto;
	}

	.apple-split-view__sidebar {
		background: var(--apple-window-sidebar-active, oklch(89.32% 0.0026 228));
	}

	.apple-split-view[data-state='inactive'] .apple-split-view__sidebar {
		background: var(--apple-window-sidebar-inactive, oklch(94.94% 0.0013 286));
	}

	.apple-split-view__content {
		background: var(--apple-window-surface, #fff);
	}

	/* The 44px hit region owns a real gutter, not the edge of a consumer's control. */
	.apple-split-view[data-resizable='true'] > .apple-split-view__sidebar {
		padding-inline-end: calc(var(--apple-window-separator-hit-size, 44px) / 2);
	}

	.apple-split-view[data-resizable='true'] > .apple-split-view__content {
		padding-inline-start: calc(var(--apple-window-separator-hit-size, 44px) / 2);
	}

	.apple-split-view__separator {
		box-sizing: border-box;
		position: absolute;
		z-index: 1;
		inset-block: 0;
		inset-inline-start: calc(
			var(--apple-window-split-ratio, 0.4444444444) * 100% -
				var(--apple-window-separator-hit-size, 44px) / 2
		);
		display: flex;
		justify-content: center;
		inline-size: var(--apple-window-separator-hit-size, 44px);
		cursor: col-resize;
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
		-webkit-tap-highlight-color: transparent;
	}

	.apple-split-view__separator::before {
		content: '';
		inline-size: var(--apple-window-separator-width, 1px);
		background: var(--apple-splitter-grip, #6e6e73);
	}

	.apple-split-view__separator:focus-visible {
		outline: 2px solid var(--apple-focus-ring);
		outline-offset: -2px;
	}

	.apple-split-view__separator:focus-visible::before,
	.apple-split-view[data-dragging='true'] .apple-split-view__separator::before {
		background: var(--apple-focus-ring);
	}

	@media (prefers-contrast: more) {
		.apple-split-view__separator::before {
			background: var(--apple-window-color, #1d1d1f);
		}
	}

	@media (forced-colors: active) {
		.apple-split-view__separator::before {
			background: CanvasText;
		}

		.apple-split-view__separator:focus-visible {
			outline-color: Highlight;
		}
	}
</style>
