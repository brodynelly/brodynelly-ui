import { page, userEvent } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from 'vitest-browser-svelte';
import { tick } from 'svelte';
import Menu from './Menu.svelte';
import Fixture from './Menu.test.svelte';

afterEach(async () => {
	await cleanup();
	vi.restoreAllMocks();
});

const trigger = () => page.getByRole('button', { name: 'Document actions' });
const menu = () => page.getByRole('menu', { name: 'Document actions' });
const item = (name) => page.getByRole('menuitem', { name, exact: true });

describe('Menu', () => {
	it('opens in the top layer with accessible relationships and toggles on click', async () => {
		await render(Fixture);
		await expect.element(trigger()).toHaveAttribute('aria-expanded', 'false');
		await expect.element(menu()).not.toBeInTheDocument();
		await trigger().click();
		await expect.element(menu()).toBeVisible();
		await expect.element(trigger()).toHaveAttribute('aria-expanded', 'true');
		await expect.element(item('Archive')).toHaveFocus();
		expect(menu().element().matches(':popover-open')).toBe(true);
		expect(trigger().element().getAttribute('aria-controls')).toBe(menu().element().id);
		await trigger().click();
		await expect.element(menu()).not.toBeInTheDocument();
		await expect.element(trigger()).toHaveFocus();
	});

	it('provides a default label, an empty-menu focus target, and open state to a trigger snippet', async () => {
		const empty = await render(Menu);
		await page.getByRole('button', { name: 'Options' }).click();
		await expect.element(page.getByRole('menu', { name: 'Options' })).toHaveFocus();
		await userEvent.keyboard('{Escape}');
		await expect.element(page.getByRole('button', { name: 'Options' })).toHaveFocus();
		await empty.unmount();
		await render(Fixture, { customTrigger: true });
		await expect.element(page.getByText('Actions closed', { exact: true })).toBeVisible();
		await trigger().click();
		await expect.element(page.getByText('Actions open', { exact: true })).toBeVisible();
	});

	it('uses roving focus with wraparound, Home/End, disabled skipping, and ArrowUp opening', async () => {
		await render(Fixture);
		trigger().element().focus();
		await userEvent.keyboard('{ArrowDown}');
		await expect.element(item('Archive')).toHaveFocus();
		await userEvent.keyboard('{ArrowDown}');
		await expect.element(item('Duplicate')).toHaveFocus();
		await expect.element(item('Blocked')).toBeDisabled();
		await expect.element(item('Blocked')).toHaveAttribute('tabindex', '-1');
		await userEvent.keyboard('{End}');
		await expect.element(item('Delete')).toHaveFocus();
		await userEvent.keyboard('{ArrowDown}');
		await expect.element(item('Archive')).toHaveFocus();
		await userEvent.keyboard('{ArrowUp}');
		await expect.element(item('Delete')).toHaveFocus();
		await userEvent.keyboard('{Home}');
		await expect.element(item('Archive')).toHaveFocus();
		expect(menu().element().querySelectorAll('[tabindex="0"]')).toHaveLength(1);
		await userEvent.keyboard('{Escape}{ArrowUp}');
		await expect.element(item('Delete')).toHaveFocus();
	});

	it('supports multi-character typeahead and cycles repeated characters', async () => {
		await render(Fixture);
		await trigger().click();
		await userEvent.keyboard('d');
		await expect.element(item('Duplicate')).toHaveFocus();
		await userEvent.keyboard('o');
		await expect.element(item('Download')).toHaveFocus();
		await userEvent.keyboard('{Escape}');
		await trigger().click();
		await userEvent.keyboard('dd');
		await expect.element(item('Download')).toHaveFocus();
		await userEvent.keyboard('d');
		await expect.element(item('Delete')).toHaveFocus();
		await userEvent.keyboard('{Escape}');
		await trigger().click();
		await userEvent.keyboard('b');
		await expect.element(item('Archive')).toHaveFocus();
	});

	it('restores trigger focus after Escape and outside pointer dismissal', async () => {
		await render(Fixture);
		await trigger().click();
		await userEvent.keyboard('{Escape}');
		await expect.element(menu()).not.toBeInTheDocument();
		await expect.element(trigger()).toHaveFocus();
		await trigger().click();
		await page.getByTestId('outside').click();
		await expect.element(menu()).not.toBeInTheDocument();
		await expect.element(trigger()).toHaveFocus();
	});

	it('does not trap Tab or steal focus from an outside button', async () => {
		await render(Fixture);
		await trigger().click();
		await userEvent.keyboard('{Tab}');
		await expect.element(menu()).not.toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: 'After menu' })).toHaveFocus();
		await trigger().click();
		await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
		await expect.element(page.getByRole('button', { name: 'Before menu' })).toHaveFocus();
		await trigger().click();
		await page.getByRole('button', { name: 'After menu' }).click();
		await expect.element(menu()).not.toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: 'After menu' })).toHaveFocus();
	});

	it('does not reclaim focus from an outside action that opens a native dialog', async () => {
		await render(Fixture);
		const dialog = document.createElement('dialog');
		dialog.innerHTML = '<button type="button">Dialog action</button>';
		document.body.append(dialog);
		const outside = page.getByRole('button', { name: 'After menu' });
		outside.element().addEventListener('click', () => dialog.showModal(), { once: true });
		try {
			await trigger().click();
			await outside.click();
			await new Promise(requestAnimationFrame);
			expect(dialog.matches(':modal')).toBe(true);
			expect(dialog.contains(document.activeElement)).toBe(true);
		} finally {
			dialog.close();
			dialog.remove();
		}
	});

	it('cancels deferred outside focus restoration on reopen and unmount', async () => {
		const screen = await render(Fixture);
		await trigger().click();
		const schedule = vi.spyOn(window, 'setTimeout');
		const cancel = vi.spyOn(window, 'clearTimeout');
		document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
		const first = schedule.mock.calls.findIndex(
			([callback]) => callback.name === 'restoreAfterPointer'
		);
		expect(first).toBeGreaterThanOrEqual(0);
		trigger().element().click();
		await tick();
		expect(cancel).toHaveBeenCalledWith(schedule.mock.results[first].value);
		await expect.element(menu()).toBeVisible();
		document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
		const last = schedule.mock.calls.findLastIndex(
			([callback]) => callback.name === 'restoreAfterPointer'
		);
		await screen.unmount();
		await tick();
		expect(cancel).toHaveBeenCalledWith(schedule.mock.results[last].value);
	});

	it('activates once by keyboard, closes on selection, and honors prevented or disabled selections', async () => {
		const onselect = vi.fn();
		const ondisabled = vi.fn();
		await render(Fixture, { onselect, ondisabled });
		await trigger().click();
		await userEvent.keyboard('{Enter}');
		expect(onselect).toHaveBeenCalledTimes(1);
		await expect.element(menu()).not.toBeInTheDocument();
		await expect.element(trigger()).toHaveFocus();
		await trigger().click();
		await item('Keep open').click();
		await expect.element(menu()).toBeVisible();
		item('Blocked')
			.element()
			.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
		expect(ondisabled).not.toHaveBeenCalled();
		await expect.element(menu()).toBeVisible();
		await item('Duplicate').click();
		expect(onselect).toHaveBeenCalledTimes(2);
		await expect.element(menu()).not.toBeInTheDocument();
	});

	it('exposes bindable checkbox semantics and honors preventDefault before toggling', async () => {
		await render(Fixture);
		await trigger().click();
		const checkbox = page.getByRole('menuitemcheckbox', { name: 'Show details', exact: true });
		await expect.element(checkbox).toHaveAttribute('aria-checked', 'false');
		await checkbox.click();
		await expect
			.element(page.getByRole('status', { name: 'Checked state' }))
			.toHaveTextContent('checked');
		await expect.element(menu()).not.toBeInTheDocument();
		await trigger().click();
		await expect.element(checkbox).toHaveAttribute('aria-checked', 'true');
		const preventedCheckbox = page.getByRole('menuitemcheckbox', {
			name: 'Keep unchecked',
			exact: true
		});
		await preventedCheckbox.click();
		await expect.element(preventedCheckbox).toHaveAttribute('aria-checked', 'false');
		await expect.element(menu()).toBeVisible();
		checkbox.element().focus();
		await userEvent.keyboard(' ');
		await expect
			.element(page.getByRole('status', { name: 'Checked state' }))
			.toHaveTextContent('unchecked');
	});

	it('synchronizes bound state and keeps independent instances uniquely labelled', async () => {
		await render(Fixture, { secondMenu: true });
		const firstTrigger = trigger().element();
		const otherTrigger = page.getByRole('button', { name: 'Other actions' }).element();
		expect(firstTrigger.id).not.toBe(otherTrigger.id);
		expect(firstTrigger.getAttribute('aria-controls')).not.toBe(
			otherTrigger.getAttribute('aria-controls')
		);
		await page.getByRole('button', { name: 'Toggle bound state' }).click();
		await expect.element(menu()).toBeVisible();
		await expect
			.element(page.getByRole('status', { name: 'Menu state' }))
			.toHaveTextContent('open');
		await page.getByRole('button', { name: 'Other actions' }).click();
		await expect.element(menu()).not.toBeInTheDocument();
		await expect.element(page.getByRole('menu', { name: 'Other actions' })).toBeVisible();
		await userEvent.keyboard('{Escape}');
		await expect.element(page.getByRole('button', { name: 'Other actions' })).toHaveFocus();
	});

	it('removes open-menu document handlers, observers, and timers on unmount', async () => {
		await render(Fixture);
		const add = vi.spyOn(document, 'addEventListener');
		const remove = vi.spyOn(document, 'removeEventListener');
		await trigger().click();
		await userEvent.keyboard('d');
		const registrations = add.mock.calls.filter(([, handler]) =>
			['handleOutsidePointer', 'handleOutsideFocus', 'handleEscape'].includes(handler.name)
		);
		expect(registrations).toHaveLength(3);
		await cleanup();
		await tick();
		for (const [type, handler, options] of registrations) {
			expect(
				remove.mock.calls.some(
					([removedType, removedHandler, removedOptions]) =>
						removedType === type && removedHandler === handler && removedOptions === options
				)
			).toBe(true);
		}
		expect(document.querySelector('[role="menu"]')).toBeNull();
		const outside = document.createElement('button');
		document.body.append(outside);
		outside.focus();
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		expect(document.activeElement).toBe(outside);
		outside.remove();
	});

	it('portals and cleans up a keyboard-operable fallback without native popover support', async () => {
		vi.spyOn(HTMLElement.prototype, 'showPopover');
		Object.defineProperty(HTMLElement.prototype, 'showPopover', {
			configurable: true,
			value: undefined,
			writable: true
		});
		await render(Fixture);
		await trigger().click();
		await expect.element(menu()).toBeVisible();
		expect(menu().element().parentElement).toBe(document.body);
		await userEvent.keyboard('{ArrowDown}');
		await expect.element(item('Duplicate')).toHaveFocus();
		await userEvent.keyboard('{Escape}');
		await expect.element(trigger()).toHaveFocus();
		await cleanup();
		await tick();
		expect(document.querySelector('[role="menu"]')).toBeNull();
	});
});
