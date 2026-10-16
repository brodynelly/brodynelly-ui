<script>
	import { onDestroy } from 'svelte';
	import { on } from 'svelte/events';

	/**
	 * @typedef {Object} Props
	 * @property {string} [label='Options'] Trigger text and accessible name.
	 * @property {boolean} [open=false] Bindable visibility of the menu.
	 * @property {import('svelte').Snippet} [children] MenuItem and MenuSeparator components.
	 * @property {import('svelte').Snippet<[boolean]>} [trigger] Noninteractive trigger content; receives the open state.
	 * @property {string} [id] Panel ID; otherwise generated per instance, including during SSR.
	 * @property {string} [class] Additional panel classes.
	 * @property {string} [style] Inline panel styles.
	 */

	/** @type {Props} */
	let {
		label = 'Options',
		open = $bindable(false),
		children,
		trigger,
		id,
		class: className = '',
		style
	} = $props();

	const instanceId = $props.id();
	const panelId = $derived(id ?? `${instanceId}-menu`);
	const triggerId = `${instanceId}-trigger`;
	const itemSelector = '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]';
	/** @type {HTMLButtonElement | undefined} */
	let triggerElement = $state();
	/** @type {HTMLDivElement | undefined} */
	let panel = $state();
	let position = $state({ left: 0, top: 0, maxHeight: 0, above: false });
	let focusLast = false;
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let focusReturnTimer;
	let focusGeneration = 0;

	function cancelFocusReturn() {
		clearTimeout(focusReturnTimer);
		focusReturnTimer = undefined;
		focusGeneration += 1;
	}

	$effect(() => {
		if (open) cancelFocusReturn();
	});
	onDestroy(cancelFocusReturn);

	/** @returns {HTMLElement[]} */
	function items() {
		return Array.from(panel?.querySelectorAll(itemSelector) ?? []).filter(
			/** @returns {item is HTMLElement} */
			(item) => item instanceof HTMLElement && item.closest('[role="menu"]') === panel
		);
	}

	function enabledItems() {
		return items().filter(
			(item) =>
				!item.matches(':disabled, [aria-disabled="true"]') && item.getClientRects().length > 0
		);
	}

	/** @param {HTMLElement | undefined} item */
	function setTabStop(item) {
		for (const candidate of items()) candidate.tabIndex = candidate === item ? 0 : -1;
	}

	/** @param {HTMLElement | undefined} item */
	function focusItem(item) {
		setTabStop(item);
		if (item) {
			item.focus({ preventScroll: true });
			item.scrollIntoView({ block: 'nearest', inline: 'nearest' });
		} else {
			panel?.focus({ preventScroll: true });
		}
	}

	function close(restoreFocus = true) {
		open = false;
		if (restoreFocus && triggerElement?.isConnected) {
			triggerElement.focus({ preventScroll: true });
		}
	}

	/** @param {KeyboardEvent} event */
	function handleTriggerKeydown(event) {
		if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
		event.preventDefault();
		focusLast = event.key === 'ArrowUp';
		if (open) {
			const enabled = enabledItems();
			focusItem(focusLast ? enabled.at(-1) : enabled[0]);
		} else {
			open = true;
		}
	}

	function toggle() {
		if (open) close();
		else {
			focusLast = false;
			open = true;
		}
	}

	// Escape clipping/transformed ancestors in browsers without the native top layer.
	$effect(() => {
		const node = panel;
		if (!node || typeof node.showPopover === 'function') return;
		node.removeAttribute('popover');
		node.ownerDocument.body.append(node);
		return () => node.remove();
	});

	$effect(() => {
		const node = panel;
		const button = triggerElement;
		if (!open || !node || !button) return;

		const doc = node.ownerDocument;
		const win = doc.defaultView;
		if (!win) return;
		const nativePopover = typeof node.showPopover === 'function';
		if (nativePopover) node.showPopover();

		function updatePosition() {
			const rect = button.getBoundingClientRect();
			const viewport = win.visualViewport;
			const width = viewport?.width ?? doc.documentElement.clientWidth;
			const height = viewport?.height ?? doc.documentElement.clientHeight;
			const offsetLeft = viewport?.offsetLeft ?? 0;
			const offsetTop = viewport?.offsetTop ?? 0;
			const gutter = 8;
			const gap = 8;
			const below = height + offsetTop - rect.bottom - gap - gutter;
			const above = rect.top - offsetTop - gap - gutter;
			const naturalHeight = node.scrollHeight + 2;
			const placeAbove = naturalHeight > below && above > below;
			const maxHeight = Math.max(
				0,
				Math.min(height - gutter * 2, Math.max(44, placeAbove ? above : below))
			);
			const panelHeight = Math.min(naturalHeight, maxHeight);
			const panelWidth = node.getBoundingClientRect().width;
			const start =
				win.getComputedStyle(button).direction === 'rtl' ? rect.right - panelWidth : rect.left;
			position = {
				left: Math.max(
					offsetLeft + gutter,
					Math.min(start, offsetLeft + width - panelWidth - gutter)
				),
				top: Math.max(
					offsetTop + gutter,
					Math.min(
						placeAbove ? rect.top - gap - panelHeight : rect.bottom + gap,
						offsetTop + height - panelHeight - gutter
					)
				),
				maxHeight,
				above: placeAbove
			};
		}

		/** @param {EventTarget | null} target */
		function targetItem(target) {
			if (!(target instanceof Element)) return;
			const item = target.closest(itemSelector);
			return item instanceof HTMLElement && item.closest('[role="menu"]') === node
				? item
				: undefined;
		}

		/** @param {PointerEvent} event */
		function handleOutsidePointer(event) {
			const path = event.composedPath();
			if (path.includes(node) || path.includes(button)) return;
			const ownedFocus = node.contains(doc.activeElement) || doc.activeElement === button;
			close(false);
			cancelFocusReturn();
			const generation = focusGeneration;
			// Pointer default focus runs after pointerdown listeners/microtasks. Only
			// fill the BODY fallback on the next task; never steal a control/modal's focus.
			focusReturnTimer = setTimeout(function restoreAfterPointer() {
				focusReturnTimer = undefined;
				if (
					generation === focusGeneration &&
					ownedFocus &&
					!open &&
					button.isConnected &&
					doc.activeElement === doc.body &&
					!doc.querySelector(':modal')
				) {
					button.focus({ preventScroll: true });
				}
			}, 0);
		}

		/** @param {FocusEvent} event */
		function handleOutsideFocus(event) {
			const path = event.composedPath();
			if (!path.includes(node) && !path.includes(button)) close(false);
		}

		/** @param {KeyboardEvent} event */
		function handleEscape(event) {
			if (
				event.key === 'Escape' &&
				!event.defaultPrevented &&
				(node.contains(doc.activeElement) || doc.activeElement === button)
			) {
				event.preventDefault();
				close();
			}
		}

		/** @param {MouseEvent} event */
		function handleSelection(event) {
			const item = targetItem(event.target);
			if (!item || item.matches(':disabled, [aria-disabled="true"]')) return;
			if (node.isConnected && open && !event.defaultPrevented) {
				// Do not steal focus if the action deliberately moved it, e.g. into a dialog.
				close(node.contains(doc.activeElement));
			}
		}

		/** @param {FocusEvent} event */
		function handleItemFocus(event) {
			const item = targetItem(event.target);
			if (item) setTabStop(item);
		}

		let search = '';
		/** @type {ReturnType<typeof setTimeout> | undefined} */
		let searchTimeout;

		/** @param {KeyboardEvent} event */
		function handleMenuKeydown(event) {
			if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
			const enabled = enabledItems();
			const index = enabled.indexOf(/** @type {HTMLElement} */ (doc.activeElement));
			let next;
			switch (event.key) {
				case 'ArrowDown':
					next = enabled[(index + 1) % enabled.length];
					break;
				case 'ArrowUp':
					next =
						enabled[(index < 0 ? enabled.length - 1 : index - 1 + enabled.length) % enabled.length];
					break;
				case 'Home':
					next = enabled[0];
					break;
				case 'End':
					next = enabled.at(-1);
					break;
				case 'Tab':
					// The browser performs normal tab navigation after focus returns to the trigger.
					close();
					return;
				default: {
					if (event.key.length !== 1 || event.key === ' ') return;
					search += event.key.toLocaleLowerCase();
					clearTimeout(searchTimeout);
					searchTimeout = setTimeout(() => (search = ''), 600);
					const query = [...search].every((letter) => letter === search[0]) ? search[0] : search;
					const start = query.length === 1 ? index + 1 : Math.max(index, 0);
					const ordered = [...enabled.slice(start), ...enabled.slice(0, start)];
					next = ordered.find((item) =>
						(item.dataset.menuLabel ?? item.textContent ?? '')
							.trim()
							.toLocaleLowerCase()
							.startsWith(query)
					);
					if (!next) return;
				}
			}
			event.preventDefault();
			focusItem(next);
		}

		updatePosition();
		const enabled = enabledItems();
		focusItem(focusLast ? enabled.at(-1) : enabled[0]);
		doc.addEventListener('pointerdown', handleOutsidePointer, true);
		doc.addEventListener('focusin', handleOutsideFocus);
		doc.addEventListener('keydown', handleEscape);
		// Svelte's listener runs delegated item callbacks before selection/dismissal.
		const removeSelection = on(node, 'click', handleSelection);
		node.addEventListener('focusin', handleItemFocus);
		node.addEventListener('keydown', handleMenuKeydown);
		win.addEventListener('resize', updatePosition);
		win.addEventListener('scroll', updatePosition, true);
		win.visualViewport?.addEventListener('resize', updatePosition);
		win.visualViewport?.addEventListener('scroll', updatePosition);
		const resizeObserver = new ResizeObserver(updatePosition);
		resizeObserver.observe(button);
		resizeObserver.observe(node);
		const itemObserver = new MutationObserver(() => {
			const enabled = enabledItems();
			setTabStop(
				enabled.find((item) => item === doc.activeElement) ??
					enabled.find((item) => item.tabIndex === 0) ??
					enabled[0]
			);
		});
		itemObserver.observe(node, {
			subtree: true,
			childList: true,
			attributes: true,
			attributeFilter: ['disabled', 'aria-disabled', 'hidden']
		});

		return () => {
			clearTimeout(searchTimeout);
			resizeObserver.disconnect();
			itemObserver.disconnect();
			doc.removeEventListener('pointerdown', handleOutsidePointer, true);
			doc.removeEventListener('focusin', handleOutsideFocus);
			doc.removeEventListener('keydown', handleEscape);
			removeSelection();
			node.removeEventListener('focusin', handleItemFocus);
			node.removeEventListener('keydown', handleMenuKeydown);
			win.removeEventListener('resize', updatePosition);
			win.removeEventListener('scroll', updatePosition, true);
			win.visualViewport?.removeEventListener('resize', updatePosition);
			win.visualViewport?.removeEventListener('scroll', updatePosition);
			if (node.contains(doc.activeElement) && button.isConnected) {
				button.focus({ preventScroll: true });
			}
			if (nativePopover && node.matches(':popover-open')) node.hidePopover();
			for (const item of node.querySelectorAll(itemSelector)) {
				if (item instanceof HTMLElement) item.tabIndex = -1;
			}
		};
	});
</script>

<span class="menu-root">
	<button
		bind:this={triggerElement}
		id={triggerId}
		class="menu-trigger"
		type="button"
		aria-label={label}
		aria-haspopup="menu"
		aria-expanded={open}
		aria-controls={panelId}
		onclick={toggle}
		onkeydown={handleTriggerKeydown}
	>
		{#if trigger}
			{@render trigger(open)}
		{:else}
			<svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor" aria-hidden="true">
				<circle cx="4" cy="10" r="1.5" />
				<circle cx="10" cy="10" r="1.5" />
				<circle cx="16" cy="10" r="1.5" />
			</svg>
			<span>{label}</span>
		{/if}
	</button>
	<div
		bind:this={panel}
		id={panelId}
		class={`menu-panel ${className}`}
		{style}
		style:left={`${position.left}px`}
		style:top={`${position.top}px`}
		style:max-height={position.maxHeight ? `${position.maxHeight}px` : 'calc(100dvh - 16px)'}
		style:transform-origin={position.above ? 'bottom left' : 'top left'}
		role="menu"
		aria-labelledby={triggerId}
		tabindex="-1"
		popover="manual"
		hidden={!open}
		data-open={open}
	>
		{@render children?.()}
	</div>
</span>

<style>
	.menu-root {
		display: inline-flex;
		vertical-align: middle;
	}

	.menu-trigger,
	.menu-panel {
		box-sizing: border-box;
		font-family: var(--sans-serif-font-family, ui-sans-serif, system-ui, sans-serif);
		-webkit-tap-highlight-color: transparent;
	}

	.menu-trigger {
		--menu-action: #0050a4;
		align-items: center;
		background: var(--fills-tertiary, rgb(118 118 128 / 12%));
		border: 1px solid transparent;
		border-radius: 999px;
		color: var(--apple-action-text, var(--menu-action));
		cursor: pointer;
		display: inline-flex;
		font-size: 15px;
		font-weight: 600;
		gap: 6px;
		justify-content: center;
		line-height: 20px;
		margin: 0;
		min-height: 44px;
		padding: 10px 16px;
		touch-action: manipulation;
	}

	.menu-trigger:focus-visible {
		outline: 3px solid var(--colors-accent, #007aff);
		outline-offset: 3px;
	}

	.menu-trigger:active {
		background: var(--fills-primary, rgb(120 120 120 / 20%));
		transform: scale(0.97);
	}

	.menu-panel {
		/* Overlay roles belong to the overlay's surface, not its light parent window. */
		--menu-label: #1c1c1e;
		--menu-secondary: #59595f;
		--menu-control-fill: #e5e5ea;
		--menu-control-edge: #59595f;
		--menu-action-text: #0050a4;
		--apple-action-text: var(--apple-menu-action-text, var(--menu-action-text));
		--apple-label: var(--apple-menu-label, var(--menu-label));
		--apple-secondary-label: var(--apple-menu-secondary, var(--menu-secondary));
		--apple-control-fill: var(--menu-control-fill);
		--apple-control-solid-fill: var(--menu-control-fill);
		--apple-control-track: var(--menu-control-fill);
		--apple-control-solid-track: var(--menu-control-fill);
		--apple-control-edge: var(--menu-control-edge);
		--labels-primary: var(--apple-label);
		--labels-secondary: var(--apple-secondary-label);
		color-scheme: light;
		--menu-solid: #f5f5f5;
		--menu-glass: rgb(245 245 245 / 88%);
		--menu-edge: rgb(255 255 255 / 72%);
		background: var(--menu-solid);
		border: 1px solid var(--menu-edge);
		border-radius: 26px;
		box-shadow:
			0 12px 36px rgb(0 0 0 / 16%),
			0 2px 8px rgb(0 0 0 / 8%);
		color: var(--apple-label);
		display: flex;
		flex-direction: column;
		inset: auto;
		isolation: isolate;
		margin: 0;
		max-width: calc(100vw - 16px);
		overflow-x: hidden;
		overflow-y: auto;
		overscroll-behavior: contain;
		padding: 10px 8px;
		position: fixed;
		width: 238px;
		z-index: 1000;
	}

	.menu-panel[hidden] {
		display: none;
	}

	.menu-panel[popover]:not(:popover-open) {
		display: none;
	}

	.menu-panel::backdrop {
		background: transparent;
		pointer-events: none;
	}

	.menu-panel[data-open='true'] {
		animation: menu-materialize 160ms cubic-bezier(0.2, 0.8, 0.2, 1);
	}

	.menu-panel:focus-visible {
		outline: 3px solid var(--colors-accent, #007aff);
		outline-offset: 2px;
	}

	@keyframes menu-materialize {
		from {
			opacity: 0;
			transform: scale(0.97);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
		.menu-panel {
			background: var(--menu-glass);
			backdrop-filter: blur(28px) saturate(140%);
			-webkit-backdrop-filter: blur(28px) saturate(140%);
		}
	}

	@media (prefers-color-scheme: dark) {
		.menu-trigger {
			--menu-action: #66b3ff;
		}

		.menu-panel {
			--menu-label: #f5f5f5;
			--menu-secondary: #aeaeb2;
			--menu-control-fill: #3a3a3c;
			--menu-control-edge: #aeaeb2;
			--menu-action-text: #66b3ff;
			color-scheme: dark;
			--menu-solid: #262626;
			--menu-glass: rgb(38 38 38 / 90%);
			--menu-edge: rgb(255 255 255 / 16%);
			color: var(--labels-primary, #f5f5f5);
			box-shadow:
				0 12px 36px rgb(0 0 0 / 36%),
				0 2px 8px rgb(0 0 0 / 20%);
		}
	}

	@media (prefers-reduced-transparency: reduce), (prefers-contrast: more) {
		.menu-panel {
			background: var(--menu-solid);
			backdrop-filter: none;
			-webkit-backdrop-filter: none;
		}
	}

	@media (prefers-contrast: more) {
		.menu-panel,
		.menu-trigger {
			border-color: currentColor;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.menu-panel[data-open='true'] {
			animation: none;
		}
		.menu-trigger:active {
			transform: none;
		}
	}

	@media (forced-colors: active) {
		.menu-panel,
		.menu-trigger {
			background: Canvas;
			border-color: ButtonText;
			box-shadow: none;
			color: ButtonText;
			backdrop-filter: none;
			-webkit-backdrop-filter: none;
		}
	}
</style>
