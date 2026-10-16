import { cdp, userEvent } from '@vitest/browser/context';
import { tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from 'vitest-browser-svelte';
import WindowChoice from './WindowChoice.svelte';

const displacement = (button) => parseFloat(button.style.getPropertyValue('--choice-y'));
const scale = (button) => Number(button.style.getPropertyValue('--choice-scale'));

afterEach(async () => {
	cleanup();
	await cdp().send('Emulation.setEmulatedMedia', { features: [] });
});

describe('WindowChoice', () => {
	it('composes every consumer pointer and blur handler with internal feedback', async () => {
		const events = [
			'pointerenter',
			'pointerdown',
			'pointerup',
			'pointercancel',
			'pointerleave',
			'blur'
		];
		const seen = [];
		const handlers = Object.fromEntries(
			events.map((type) => [
				`on${type}`,
				vi.fn((event) => seen.push({ type: event.type, target: event.currentTarget }))
			])
		);
		const screen = render(WindowChoice, { label: 'Preview', ...handlers });
		const button = screen.getByRole('button', { name: 'Select preview' }).element();
		for (const type of events) {
			button.dispatchEvent(
				type === 'blur'
					? new FocusEvent(type)
					: new PointerEvent(type, { bubbles: true, cancelable: true, button: 0, isPrimary: true })
			);
			await tick();
			if (type === 'pointerenter') await expect.poll(() => displacement(button)).toBe(-5);
			if (type === 'pointerdown') await expect.poll(() => displacement(button)).toBe(-1);
			if (type === 'pointerup') await expect.poll(() => displacement(button)).toBe(-5);
		}
		for (const handler of Object.values(handlers)) expect(handler).toHaveBeenCalledOnce();
		expect(seen).toEqual(events.map((type) => ({ type, target: button })));
		await expect.poll(() => displacement(button)).toBe(0);
		expect(button.querySelector('.apple-window').getAttribute('aria-hidden')).toBe('true');
	});

	it.each([
		['Space', '[Space>]', '[/Space]'],
		['Enter', '{Enter>}', '{/Enter}']
	])('shows the source -1px press for %s and activates natively once', async (name, down, up) => {
		const onclick = vi.fn();
		const onkeydown = vi.fn();
		const onkeyup = vi.fn();
		const screen = render(WindowChoice, { label: name, onclick, onkeydown, onkeyup });
		const button = screen.getByRole('button').element();
		button.focus();
		try {
			await userEvent.keyboard(down);
			await expect.poll(() => displacement(button)).toBe(-1);
			await expect.poll(() => scale(button)).toBe(0.995);
		} finally {
			await userEvent.keyboard(up);
		}
		await expect.poll(() => displacement(button)).toBe(0);
		await expect.poll(() => scale(button)).toBe(1);
		expect(onkeydown).toHaveBeenCalledOnce();
		expect(onkeyup).toHaveBeenCalledOnce();
		expect(onclick).toHaveBeenCalledOnce();
		expect(button.getAttribute('aria-pressed')).toBe('true');
	});

	it('clears a keyboard press on blur and honors prevented keyboard input', async () => {
		const onblur = vi.fn();
		const screen = render(WindowChoice, { onblur });
		const button = screen.getByRole('button').element();
		button.focus();
		try {
			await userEvent.keyboard('[Space>]');
			await expect.poll(() => displacement(button)).toBe(-1);
			button.blur();
			await expect.poll(() => displacement(button)).toBe(0);
			expect(onblur).toHaveBeenCalledOnce();
		} finally {
			await userEvent.keyboard('[/Space]');
		}
		const onclick = vi.fn();
		await screen.rerender({ onkeydown: (event) => event.preventDefault(), onclick });
		button.focus();
		await userEvent.keyboard('[Space]');
		expect(displacement(button)).toBe(0);
		expect(onclick).not.toHaveBeenCalled();
	});

	it('retains native disabled behavior and the static reduced-motion fallback', async () => {
		await cdp().send('Emulation.setEmulatedMedia', {
			features: [{ name: 'prefers-reduced-motion', value: 'reduce' }]
		});
		const onclick = vi.fn();
		const screen = render(WindowChoice, { disabled: true, onclick });
		const button = screen.getByRole('button').element();
		button.click();
		expect(onclick).not.toHaveBeenCalled();
		expect(button.getAttribute('aria-pressed')).toBe('false');
		await screen.rerender({ disabled: false });
		button.focus();
		try {
			await userEvent.keyboard('[Space>]');
			expect(getComputedStyle(button).transform).toBe('none');
		} finally {
			await userEvent.keyboard('[/Space]');
		}
		expect(onclick).toHaveBeenCalledOnce();
	});
});
