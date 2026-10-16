import { cdp, page, userEvent } from '@vitest/browser/context';
import { tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from 'vitest-browser-svelte';
import Sheet from './Sheet.svelte';
import SheetFixture from './Sheet.test.svelte';

/** @param {HTMLElement} element @param {string} type @param {number} y */
function pointer(element, type, y) {
	element.dispatchEvent(
		new PointerEvent(type, {
			bubbles: true,
			pointerId: 7,
			isPrimary: true,
			button: 0,
			clientX: 100,
			clientY: y
		})
	);
}

/** @param {HTMLDialogElement} dialog */
function offset(dialog) {
	return parseFloat(dialog.style.getPropertyValue('--sheet-offset')) || 0;
}

/** @param {HTMLDialogElement} dialog */
async function settled(dialog) {
	await expect.poll(() => offset(dialog)).toBe(0);
}

afterEach(async () => {
	cleanup();
	vi.restoreAllMocks();
	await cdp().send('Emulation.setEmulatedMedia', { features: [] });
});

describe('Sheet', () => {
	it('opens a named native modal, contains focus, and restores it after Escape', async () => {
		const onclose = vi.fn();
		const screen = render(SheetFixture, { onclose });
		const dialog = screen.container.querySelector('dialog');
		expect(dialog.open).toBe(false);
		await screen.getByRole('button', { name: 'Open sheet', exact: true }).click();
		await expect.element(screen.getByRole('dialog', { name: 'Travel details' })).toBeVisible();
		expect(dialog.matches(':modal')).toBe(true);
		expect(dialog.getAttribute('aria-describedby')).toBeTruthy();
		expect(dialog.contains(document.activeElement)).toBe(true);
		screen.getByTestId('background-action').element().focus();
		expect(dialog.contains(document.activeElement)).toBe(true);
		await userEvent.tab();
		expect(dialog.contains(document.activeElement)).toBe(true);
		await userEvent.keyboard('{Escape}');
		await expect.poll(() => dialog.open).toBe(false);
		expect(screen.getByTestId('open-state').element().textContent).toBe('closed');
		expect(document.activeElement).toBe(
			screen.getByRole('button', { name: 'Open sheet', exact: true }).element()
		);
		expect(onclose).toHaveBeenCalledTimes(1);
	});

	it('closes through the built-in close button and a bound footer action', async () => {
		const onclose = vi.fn();
		const screen = render(SheetFixture, { open: true, onclose });
		const dialog = screen.container.querySelector('dialog');
		await screen.getByRole('button', { name: 'Close sheet' }).click();
		await expect.poll(() => dialog.open).toBe(false);
		await screen.getByRole('button', { name: 'Open sheet', exact: true }).click();
		await screen.getByRole('button', { name: 'Done' }).click();
		await expect.poll(() => dialog.open).toBe(false);
		expect(onclose).toHaveBeenCalledTimes(2);
	});

	it('only light-dismisses when the pointer starts and ends outside the surface', async () => {
		await page.viewport(900, 700);
		const screen = render(SheetFixture, { open: true });
		const dialog = screen.container.querySelector('dialog');
		await settled(dialog);
		await userEvent.click(dialog, { position: { x: 12, y: 12 } });
		expect(dialog.open).toBe(true);
		await userEvent.click(dialog, { position: { x: -10, y: -10 }, force: true });
		await expect.poll(() => dialog.open).toBe(false);
	});

	it('keeps nondismissible sheets open until the bound value changes', async () => {
		const screen = render(SheetFixture, { open: true, dismissible: false });
		const dialog = screen.container.querySelector('dialog');
		await settled(dialog);
		expect(dialog.querySelector('.sheet-close')).toBeNull();
		expect(dialog.querySelector('.sheet-handle')).toBeNull();
		await userEvent.keyboard('{Escape}');
		expect(dialog.open).toBe(true);
		await screen.rerender({ open: false });
		await expect.poll(() => dialog.open).toBe(false);
	});

	it('tracks only the handle 1:1 and springs back from a canceled drag', async () => {
		const screen = render(SheetFixture, { open: true, longContent: true });
		const dialog = screen.container.querySelector('dialog');
		const handle = dialog.querySelector('.sheet-handle');
		const body = dialog.querySelector('.sheet-content');
		await settled(dialog);
		expect(getComputedStyle(dialog).userSelect).toBe('text');
		expect(getComputedStyle(body).touchAction).toBe('auto');
		expect(getComputedStyle(body).overflowY).toBe('auto');
		pointer(body, 'pointerdown', 100);
		pointer(body, 'pointermove', 180);
		await tick();
		expect(offset(dialog)).toBe(0);
		const capture = vi.spyOn(handle, 'setPointerCapture');
		pointer(handle, 'pointerdown', 100);
		pointer(handle, 'pointermove', 160);
		await tick();
		expect(offset(dialog)).toBe(60);
		expect(capture).toHaveBeenCalledWith(7);
		pointer(handle, 'pointercancel', 160);
		await tick();
		expect(offset(dialog)).toBeGreaterThan(0);
		await settled(dialog);
		expect(dialog.open).toBe(true);
	});

	it('can grab a spring mid-snapback without jumping to its target', async () => {
		const screen = render(SheetFixture, { open: true });
		const dialog = screen.container.querySelector('dialog');
		const handle = dialog.querySelector('.sheet-handle');
		await settled(dialog);
		pointer(handle, 'pointerdown', 100);
		pointer(handle, 'pointermove', 160);
		pointer(handle, 'pointercancel', 160);
		await new Promise(requestAnimationFrame);
		await tick();
		const current = offset(dialog);
		pointer(handle, 'pointerdown', 200);
		pointer(handle, 'pointermove', 210);
		await tick();
		expect(offset(dialog)).toBeCloseTo(current + 10, 3);
		pointer(handle, 'lostpointercapture', 210);
		await settled(dialog);
		expect(dialog.open).toBe(true);
	});

	it('dismisses a sufficiently projected drag and does not duplicate close callbacks', async () => {
		const onclose = vi.fn();
		const screen = render(SheetFixture, { open: true, onclose });
		const dialog = screen.container.querySelector('dialog');
		const handle = dialog.querySelector('.sheet-handle');
		await settled(dialog);
		pointer(handle, 'pointerdown', 100);
		pointer(handle, 'pointermove', 310);
		pointer(handle, 'pointerup', 310);
		await expect.poll(() => dialog.open).toBe(false);
		expect(onclose).toHaveBeenCalledTimes(1);
		expect(screen.getByTestId('open-state').element().textContent).toBe('closed');
	});

	it('captures a real pointer so dragging continues outside the grabber', async () => {
		const screen = render(SheetFixture, { open: true, longContent: true });
		const dialog = screen.container.querySelector('dialog');
		const handle = dialog.querySelector('.sheet-handle');
		const body = dialog.querySelector('.sheet-content');
		await settled(dialog);
		const capture = vi.spyOn(handle, 'setPointerCapture');
		await userEvent.dragAndDrop(handle, body, {
			sourcePosition: { x: 60, y: 20 },
			targetPosition: { x: 100, y: 240 }
		});
		expect(capture).toHaveBeenCalledTimes(1);
		expect(capture.mock.results[0].type).toBe('return');
		await expect.poll(() => dialog.open).toBe(false);
	});

	it('uses static transitions and no displacement when reduced motion is requested', async () => {
		await cdp().send('Emulation.setEmulatedMedia', {
			features: [{ name: 'prefers-reduced-motion', value: 'reduce' }]
		});
		const screen = render(SheetFixture, { open: true });
		const dialog = screen.container.querySelector('dialog');
		const handle = dialog.querySelector('.sheet-handle');
		await tick();
		expect(getComputedStyle(dialog).transform).toBe('none');
		pointer(handle, 'pointerdown', 100);
		pointer(handle, 'pointermove', 310);
		await tick();
		expect(offset(dialog)).toBe(0);
		pointer(handle, 'pointerup', 310);
		await tick();
		expect(dialog.open).toBe(false);
	});

	it('preserves native modal stacking and keeps scroll locked until the last sheet closes', async () => {
		const original = document.documentElement.style.overflowY;
		const screen = render(SheetFixture, { open: true, showNested: true });
		await screen.getByRole('button', { name: 'Open nested sheet' }).click();
		const dialogs = screen.container.querySelectorAll('dialog');
		await expect.poll(() => dialogs[1].matches(':modal')).toBe(true);
		await userEvent.keyboard('{Escape}');
		await expect.poll(() => dialogs[1].open).toBe(false);
		expect(dialogs[0].matches(':modal')).toBe(true);
		expect(document.documentElement.style.overflowY).toBe('hidden');
		expect(dialogs[0].contains(document.activeElement)).toBe(true);
		await userEvent.keyboard('{Escape}');
		await expect.poll(() => dialogs[0].open).toBe(false);
		expect(document.documentElement.style.overflowY).toBe(original);
	});

	it('synchronizes a native close with the binding and releases its scroll lock', async () => {
		const original = document.documentElement.style.overflowY;
		const onclose = vi.fn();
		const screen = render(SheetFixture, { open: true, onclose });
		const dialog = screen.container.querySelector('dialog');
		await tick();
		dialog.close();
		await expect.poll(() => onclose.mock.calls.length).toBe(1);
		expect(screen.getByTestId('open-state').element().textContent).toBe('closed');
		expect(document.documentElement.style.overflowY).toBe(original);
	});

	it('uses source grabber geometry, a mobile bottom inset and a centered desktop layout', async () => {
		await page.viewport(390, 844);
		const screen = render(SheetFixture, { open: true });
		const dialog = screen.container.querySelector('dialog');
		await settled(dialog);
		const mobile = dialog.getBoundingClientRect();
		const grabber = dialog.querySelector('.sheet-handle span').getBoundingClientRect();
		expect(mobile.left).toBeCloseTo(6, 0);
		expect(mobile.right).toBeCloseTo(384, 0);
		expect(mobile.bottom).toBeCloseTo(838, 0);
		expect(grabber.width).toBe(60);
		expect(grabber.height).toBe(4);
		expect(getComputedStyle(dialog).borderTopLeftRadius).toBe('34px');
		await page.viewport(1000, 800);
		const desktop = dialog.getBoundingClientRect();
		expect(desktop.left + desktop.width / 2).toBeCloseTo(500, 0);
		expect(desktop.top + desktop.height / 2).toBeCloseTo(400, 0);
	});

	it('restores inline overflow and external focus on unmount without firing onclose', async () => {
		const style = document.documentElement.style;
		const original = style.cssText;
		style.setProperty('overflow-x', 'clip', 'important');
		style.setProperty('overflow-y', 'scroll');
		const opener = document.createElement('button');
		document.body.append(opener);
		opener.focus();
		const onclose = vi.fn();
		try {
			const screen = render(Sheet, { open: true, title: 'Unmount test', onclose });
			await tick();
			expect(style.overflowY).toBe('hidden');
			screen.unmount();
			await tick();
			expect(style.overflowX).toBe('clip');
			expect(style.getPropertyPriority('overflow-x')).toBe('important');
			expect(style.overflowY).toBe('scroll');
			expect(document.activeElement).toBe(opener);
			expect(onclose).not.toHaveBeenCalled();
		} finally {
			cleanup();
			opener.remove();
			style.cssText = original;
		}
	});

	it('can reverse an in-flight bound close without leaving the dialog or scroll lock stale', async () => {
		const onclose = vi.fn();
		const screen = render(SheetFixture, { open: true, onclose });
		const dialog = screen.container.querySelector('dialog');
		await settled(dialog);
		await screen.rerender({ open: false });
		await new Promise(requestAnimationFrame);
		await screen.rerender({ open: true });
		await settled(dialog);
		expect(dialog.matches(':modal')).toBe(true);
		expect(onclose).not.toHaveBeenCalled();
		await screen.rerender({ open: false });
		await expect.poll(() => dialog.open).toBe(false);
		expect(onclose).toHaveBeenCalledTimes(1);
	});
});
