<script>
	import { onMount, untrack } from 'svelte';
	import { releaseVelocity, shouldDismiss, stepSpring } from './sheet-motion.js';
	import { lockScroll } from './scroll-lock.js';

	/**
	 * @typedef {Object} Props
	 * @property {boolean} [open=false] Whether the modal is open; supports bind:open.
	 * @property {string} title Accessible, visible title.
	 * @property {string} [description=''] Optional description announced with the dialog.
	 * @property {import('svelte').Snippet} [children] Independently scrollable sheet content.
	 * @property {import('svelte').Snippet} [footer] Optional fixed footer, outside the scrolling content.
	 * @property {boolean} [dismissible=true] Enables the close button, Escape, backdrop and drag dismissal.
	 * @property {() => void} [onclose] Called once after a completed close, including a bound or native close; not on unmount.
	 */
	/** @type {Props} */
	let {
		open = $bindable(false),
		title,
		description = '',
		children,
		footer,
		dismissible = true,
		onclose
	} = $props();

	const id = $props.id();
	/** @type {HTMLDialogElement | undefined} */
	let dialog = $state();
	/** @type {HTMLHeadingElement | undefined} */
	let heading = $state();
	let offset = $state(0);
	let closing = $state(false);
	let dragging = $state(false);
	let reducedMotion = $state(false);
	let closeDistance = $state(600);
	let sessionOpen = false;
	let disposed = false;
	let frame = 0;
	let velocity = 0;
	/** @type {(() => void) | undefined} */
	let unlockScroll;
	/** @type {HTMLElement | null} */
	let previousFocus = null;
	/** @type {number | null} */
	let backdropPointer = null;
	/** @type {{ pointer: number, handle: HTMLElement, startY: number, startOffset: number, samples: { position: number, time: number }[] } | null} */
	let drag = null;
	/** @type {(() => void) | undefined} */
	let onRest;

	const opacity = $derived(reducedMotion ? 1 : Math.max(0, 1 - offset / closeDistance));

	function stopMotion() {
		cancelAnimationFrame(frame);
		frame = 0;
		onRest = undefined;
	}

	/** @param {number} target @param {number} [initialVelocity] @param {() => void} [complete] */
	function springTo(target, initialVelocity = velocity, complete) {
		stopMotion();
		if (reducedMotion) {
			offset = 0;
			velocity = 0;
			complete?.();
			return;
		}
		velocity = initialVelocity;
		onRest = complete;
		let lastTime = performance.now();
		const maximum = Math.max(offset, target, closeDistance);

		/** @param {number} now */
		function tick(now) {
			if (disposed) return;
			const next = stepSpring(offset, velocity, target, (now - lastTime) / 1000, maximum);
			offset = next.position;
			velocity = next.velocity;
			lastTime = now;
			if (next.settled) {
				frame = 0;
				const callback = onRest;
				onRest = undefined;
				callback?.();
			} else {
				frame = requestAnimationFrame(tick);
			}
		}

		frame = requestAnimationFrame(tick);
	}

	function clearDrag() {
		const current = drag;
		drag = null;
		dragging = false;
		if (current?.handle.hasPointerCapture(current.pointer)) {
			current.handle.releasePointerCapture(current.pointer);
		}
	}

	/** @param {HTMLDialogElement} element */
	function measureCloseDistance(element) {
		// The rect already contains the presentation transform; subtract it out.
		const top = element.getBoundingClientRect().top - offset;
		return Math.max(
			element.offsetHeight + 24,
			(element.ownerDocument.defaultView?.innerHeight ?? 0) - top + 24
		);
	}

	/** @param {HTMLDialogElement} element @param {boolean} ownedFocus */
	function restoreFocus(element, ownedFocus) {
		const active = element.ownerDocument.activeElement;
		// close() normally restores focus itself. Only fill in when it did not;
		// never pull focus out of another native modal or a newly focused control.
		if (
			ownedFocus &&
			previousFocus?.isConnected &&
			!previousFocus.closest('[inert]') &&
			(active === element.ownerDocument.body || active === element || element.contains(active))
		) {
			previousFocus.focus({ preventScroll: true });
		}
		previousFocus = null;
	}

	/** @param {boolean} [notify] @param {HTMLDialogElement} [element] */
	function completeClose(notify = true, element = dialog) {
		if (!element) return;
		const wasOpen = sessionOpen;
		const active = element.ownerDocument.activeElement;
		// Svelte may detach the focused subtree before running mount cleanup.
		const ownedFocus =
			element.contains(active) ||
			(disposed && !element.isConnected && active === element.ownerDocument.body);
		stopMotion();
		clearDrag();
		sessionOpen = false;
		closing = false;
		backdropPointer = null;
		if (!disposed) open = false;
		if (element.open) element.close();
		unlockScroll?.();
		unlockScroll = undefined;
		offset = 0;
		velocity = 0;
		restoreFocus(element, ownedFocus);
		if (wasOpen && notify) onclose?.();
	}

	/** @param {number} [initialVelocity] */
	function beginClose(initialVelocity = velocity) {
		if (!dialog?.open || closing) return;
		clearDrag();
		closing = true;
		closeDistance = measureCloseDistance(dialog);
		springTo(closeDistance, initialVelocity, () => {
			if (!open && closing) completeClose();
		});
	}

	/** @param {number} [initialVelocity] */
	function requestClose(initialVelocity = velocity) {
		if (!dismissible) return;
		open = false;
		beginClose(initialVelocity);
	}

	/** @param {HTMLDialogElement} element @param {boolean} shouldOpen */
	function synchronize(element, shouldOpen) {
		if (disposed) return;
		if (shouldOpen) {
			if (!element.open) {
				const active = element.ownerDocument.activeElement;
				previousFocus = active instanceof HTMLElement ? active : null;
				element.showModal();
				sessionOpen = true;
				unlockScroll = lockScroll(element.ownerDocument);
				closeDistance = measureCloseDistance(element);
				offset = reducedMotion ? 0 : 24;
				heading?.focus({ preventScroll: true });
				springTo(0, 0);
			} else if (closing) {
				closing = false;
				if (!drag) springTo(0);
			}
		} else {
			beginClose();
		}
	}

	$effect(() => {
		const element = dialog;
		const shouldOpen = open;
		if (element) untrack(() => synchronize(element, shouldOpen));
	});

	$effect(() => {
		if (!dismissible) {
			untrack(() => {
				if (!drag) return;
				clearDrag();
				springTo(0);
			});
		}
	});

	onMount(() => {
		const element = dialog;
		const media = window.matchMedia('(prefers-reduced-motion: reduce)');
		function updateMotionPreference() {
			reducedMotion = media.matches;
			if (!reducedMotion) return;
			stopMotion();
			offset = 0;
			velocity = 0;
			if (closing) completeClose();
		}
		updateMotionPreference();
		media.addEventListener('change', updateMotionPreference);
		return () => {
			disposed = true;
			media.removeEventListener('change', updateMotionPreference);
			completeClose(false, element);
			// A bound node can already be cleared during teardown.
			stopMotion();
			unlockScroll?.();
		};
	});

	/** @param {Event} event */
	function handleCancel(event) {
		event.preventDefault();
		requestClose();
	}

	function handleNativeClose() {
		// An earlier queued close event must not close a rapidly reopened dialog.
		if (!dialog?.open && sessionOpen) completeClose();
	}

	/** @param {PointerEvent} event */
	function outside(event) {
		if (!dialog || event.target !== dialog) return false;
		const rect = dialog.getBoundingClientRect();
		return (
			event.clientX < rect.left ||
			event.clientX > rect.right ||
			event.clientY < rect.top ||
			event.clientY > rect.bottom
		);
	}

	/** @param {PointerEvent} event */
	function handleBackdropDown(event) {
		backdropPointer = event.button === 0 && outside(event) ? event.pointerId : null;
	}

	/** @param {PointerEvent} event */
	function handleBackdropUp(event) {
		const dismiss = backdropPointer === event.pointerId && outside(event);
		backdropPointer = null;
		if (dismiss) requestClose();
	}

	/** @param {PointerEvent} event */
	function handleDragStart(event) {
		if (!dismissible || !dialog?.open || drag || event.button !== 0 || !event.isPrimary) return;
		event.preventDefault();
		stopMotion();
		closing = false;
		open = true;
		const handle = /** @type {HTMLElement} */ (event.currentTarget);
		drag = {
			pointer: event.pointerId,
			handle,
			startY: event.clientY,
			startOffset: offset,
			samples: [{ position: offset, time: event.timeStamp }]
		};
		dragging = true;
		try {
			handle.setPointerCapture(event.pointerId);
		} catch {
			// The pointer may have been canceled before capture was established.
		}
	}

	/** @param {PointerEvent} event */
	function handleDragMove(event) {
		if (!drag || drag.pointer !== event.pointerId) return;
		const position = Math.max(0, drag.startOffset + event.clientY - drag.startY);
		// Reduced motion keeps the displacement for the decision, but not the
		// large moving surface. The equivalent feedback is a static dismissal.
		if (!reducedMotion) offset = position;
		drag.samples.push({ position, time: event.timeStamp });
		drag.samples = drag.samples.filter((sample) => event.timeStamp - sample.time <= 100);
	}

	/** @param {PointerEvent} event @param {boolean} [canceled] */
	function handleDragEnd(event, canceled = false) {
		if (!drag || drag.pointer !== event.pointerId || !dialog) return;
		if (!canceled) handleDragMove(event);
		const samples = drag.samples;
		const position = samples[samples.length - 1].position;
		const release = canceled ? 0 : releaseVelocity(samples, event.timeStamp);
		clearDrag();
		if (!canceled && shouldDismiss(position, release, dialog.offsetHeight)) {
			requestClose(release);
		} else {
			springTo(0, release);
		}
	}
</script>

<dialog
	bind:this={dialog}
	class="sheet"
	class:dragging
	class:closing
	class:has-footer={!!footer}
	aria-labelledby={`${id}-title`}
	aria-describedby={description ? `${id}-description` : undefined}
	style:--sheet-offset={`${reducedMotion ? 0 : offset}px`}
	style:--sheet-opacity={opacity}
	oncancel={handleCancel}
	onclose={handleNativeClose}
	onpointerdown={handleBackdropDown}
	onpointerup={handleBackdropUp}
	onpointercancel={() => (backdropPointer = null)}
>
	{#if dismissible}
		<div
			class="sheet-handle"
			aria-hidden="true"
			onpointerdown={handleDragStart}
			onpointermove={handleDragMove}
			onpointerup={(event) => handleDragEnd(event)}
			onpointercancel={(event) => handleDragEnd(event, true)}
			onlostpointercapture={(event) => handleDragEnd(event, true)}
		>
			<span></span>
		</div>
	{/if}
	<header class:with-handle={dismissible}>
		<h2 id={`${id}-title`} tabindex="-1" bind:this={heading}>{title}</h2>
		{#if description}
			<p id={`${id}-description`}>{description}</p>
		{/if}
		{#if dismissible}
			<button
				class="sheet-close"
				type="button"
				aria-label="Close sheet"
				onclick={() => requestClose()}
			>
				<svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
					<path
						d="m6 6 12 12M18 6 6 18"
						stroke="currentColor"
						stroke-width="2.25"
						stroke-linecap="round"
					/>
				</svg>
			</button>
		{/if}
	</header>
	<div class="sheet-content">
		{@render children?.()}
	</div>
	{#if footer}
		<footer>{@render footer()}</footer>
	{/if}
</dialog>

<style>
	.sheet {
		--sheet-fallback-surface: #fff;
		--sheet-fallback-label: #000;
		--sheet-fallback-secondary: #59595f;
		--sheet-fallback-fill: #f2f2f7;
		--sheet-fallback-separator: rgb(60 60 67 / 18%);
		--sheet-fallback-grabber: #ccc;
		--sheet-control-edge: #59595f;
		--sheet-action-text: #0050a4;
		/* Reset inherited light-window roles to this modal's own surface family. */
		--apple-label: var(--apple-sheet-label, var(--sheet-fallback-label));
		--apple-secondary-label: var(--apple-sheet-secondary, var(--sheet-fallback-secondary));
		--apple-label-primary: var(--apple-label);
		--apple-label-secondary: var(--apple-secondary-label);
		--apple-action-text: var(--apple-sheet-action-text, var(--sheet-action-text));
		--apple-control-fill: var(--sheet-fallback-fill);
		--apple-control-solid-fill: var(--sheet-fallback-fill);
		--apple-control-track: var(--sheet-fallback-fill);
		--apple-control-solid-track: var(--sheet-fallback-fill);
		--apple-control-edge: var(--sheet-control-edge);
		--apple-switch-track: var(--sheet-fallback-fill);
		--apple-switch-solid-track: var(--sheet-fallback-fill);
		--labels-primary: var(--apple-label);
		--labels-secondary: var(--apple-secondary-label);
		color-scheme: light dark;
		position: fixed;
		inset: 0;
		display: none;
		flex-direction: column;
		box-sizing: border-box;
		inline-size: min(40rem, calc(100% - 3rem));
		max-inline-size: none;
		max-block-size: calc(100vh - 3rem);
		max-block-size: calc(100dvh - 3rem);
		margin: auto;
		padding: 0;
		overflow: hidden;
		border: 1px solid transparent;
		border-radius: var(--apple-sheet-radius, 34px);
		background: var(--apple-bg-elevated, var(--apple-bg-primary, var(--sheet-fallback-surface)));
		color: var(--apple-label-primary, var(--sheet-fallback-label));
		box-shadow: 0 20px 80px rgb(0 0 0 / 18%);
		font-family: var(
			--apple-font-family,
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			sans-serif
		);
		font-size: 17px;
		line-height: 1.5;
		text-align: start;
		transform: translateY(var(--sheet-offset, 0px));
		opacity: var(--sheet-opacity, 1);
		overscroll-behavior: contain;
		user-select: text;
		-webkit-user-select: text;
	}

	.sheet[open] {
		display: flex;
	}

	.sheet::backdrop {
		background: rgb(0 0 0 / 20%);
		opacity: var(--sheet-opacity, 1);
	}

	header {
		position: relative;
		flex: none;
		padding: 28px 24px 20px;
	}

	header.with-handle {
		padding-block: 44px 20px;
		padding-inline: 24px 76px;
	}

	h2 {
		margin: 0;
		font-size: 22px;
		font-weight: 650;
		line-height: 1.25;
		letter-spacing: -0.4px;
		overflow-wrap: anywhere;
		outline: none;
	}

	header p {
		margin: 8px 0 0;
		color: var(--apple-label-secondary, var(--sheet-fallback-secondary));
		font-size: 15px;
		line-height: 1.45;
	}

	.sheet-handle {
		position: absolute;
		inset-block-start: 0;
		inset-inline-start: calc(50% - 60px);
		z-index: 1;
		display: flex;
		justify-content: center;
		box-sizing: border-box;
		inline-size: 120px;
		block-size: 44px;
		padding-block-start: 12px;
		cursor: grab;
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
	}

	.sheet-handle span {
		inline-size: 60px;
		block-size: 4px;
		border-radius: 100px;
		background: var(--apple-sheet-grabber, var(--sheet-fallback-grabber));
	}

	.dragging .sheet-handle {
		cursor: grabbing;
	}

	.sheet-close {
		position: absolute;
		inset-block-start: 36px;
		inset-inline-end: 16px;
		display: grid;
		place-items: center;
		box-sizing: border-box;
		inline-size: 44px;
		block-size: 44px;
		padding: 0;
		border: none;
		border-radius: 50%;
		background: var(--apple-fill-tertiary, var(--sheet-fallback-fill));
		color: var(--apple-label-secondary, var(--sheet-fallback-secondary));
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	.sheet-close:active {
		opacity: 0.6;
	}

	.sheet-close:focus-visible {
		outline: 3px solid var(--apple-accent, #007aff);
		outline-offset: 3px;
	}

	.sheet-content {
		min-block-size: 0;
		padding: 0 24px max(24px, env(safe-area-inset-bottom));
		overflow-y: auto;
		overscroll-behavior-y: contain;
	}

	.has-footer .sheet-content {
		padding-block-end: 24px;
	}

	footer {
		flex: none;
		padding: 16px 24px max(20px, env(safe-area-inset-bottom));
		border-block-start: 1px solid var(--apple-separator, var(--sheet-fallback-separator));
	}

	@media (max-width: 600px) {
		.sheet {
			inset-block-start: auto;
			inset-block-end: 6px;
			inline-size: calc(100% - 12px);
			max-block-size: calc(100vh - max(24px, env(safe-area-inset-top)) - 12px);
			max-block-size: calc(100dvh - max(24px, env(safe-area-inset-top)) - 12px);
			margin: 0 auto;
		}
	}

	@media (prefers-color-scheme: dark) {
		.sheet {
			--sheet-control-edge: #aeaeb2;
			--sheet-action-text: #66b3ff;
			--sheet-fallback-surface: #1c1c1e;
			--sheet-fallback-label: #fff;
			--sheet-fallback-secondary: #aeaeb2;
			--sheet-fallback-fill: #2c2c2e;
			--sheet-fallback-separator: rgb(84 84 88 / 65%);
			--sheet-fallback-grabber: #333;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.sheet {
			transform: none;
			opacity: 1;
		}
	}

	@media (prefers-reduced-transparency: reduce) {
		.sheet {
			background: var(--sheet-fallback-surface);
			backdrop-filter: none;
		}
	}

	@media (prefers-contrast: more) {
		.sheet {
			border-color: var(--apple-label-primary, var(--sheet-fallback-label));
			background: var(--sheet-fallback-surface);
		}

		header p,
		.sheet-close {
			color: var(--apple-label-primary, var(--sheet-fallback-label));
		}

		.sheet-handle span {
			background: var(--apple-label-primary, var(--sheet-fallback-label));
		}
	}
</style>
