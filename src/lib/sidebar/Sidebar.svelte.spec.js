import { page } from '@vitest/browser/context';
import { tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from 'vitest-browser-svelte';
import Sidebar from './Sidebar.svelte';

const initialViewport = { width: window.innerWidth, height: window.innerHeight };

afterEach(async () => {
	cleanup();
	vi.clearAllTimers();
	vi.useRealTimers();
	vi.restoreAllMocks();
	await page.viewport(initialViewport.width, initialViewport.height);
});

describe('Sidebar', () => {
	it('preserves mobile toggle, close-button focus, Escape, and custom props', async () => {
		await page.viewport(390, 844);
		const screen = render(Sidebar, {
			id: 'navigation-sidebar',
			style: '--sidebar-test-marker: preserved'
		});
		const aside = screen.container.querySelector('aside');
		const backdrop = screen.container.querySelector('label');
		const close = screen.container.querySelector('button');

		expect(aside.id).toBe('navigation-sidebar');
		expect(aside.style.getPropertyValue('--sidebar-test-marker')).toBe('preserved');
		expect(aside.style.height).toBe(`${window.innerHeight}px`);
		expect(aside.style.maxWidth).toBe('0px');
		expect(backdrop.style.display).toBe('none');
		expect(getComputedStyle(aside).position).toBe('fixed');

		screen.component.handlePress();
		await tick();
		expect(aside.style.maxWidth).toBe('320px');
		expect(backdrop.style.display).toBe('unset');
		expect(getComputedStyle(aside).backdropFilter).toBe('blur(50px)');

		close.focus();
		expect(document.activeElement).toBe(close);
		close.click();
		await tick();
		expect(aside.style.maxWidth).toBe('0px');
		expect(backdrop.style.display).toBe('none');
		expect(document.activeElement).not.toBe(close);

		screen.component.handlePress();
		await tick();
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
		await tick();
		expect(aside.style.maxWidth).toBe('0px');
		expect(backdrop.style.display).toBe('none');
	});

	it('preserves desktop layout and resets state when crossing the mobile breakpoint', async () => {
		await page.viewport(1024, 768);
		const screen = render(Sidebar);
		const aside = screen.container.querySelector('aside');
		const backdrop = screen.container.querySelector('label');

		expect(aside.style.maxWidth).toBe('320px');
		expect(backdrop.style.display).toBe('none');
		expect(getComputedStyle(aside).position).toBe('sticky');
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
		await tick();
		expect(aside.style.maxWidth).toBe('320px');

		await screen.rerender({ state: 'hidden' });
		expect(aside.style.maxWidth).toBe('0px');
		await screen.rerender({ state: 'default' });
		expect(aside.style.maxWidth).toBe('320px');

		await page.viewport(809, 768);
		await expect.poll(() => aside.style.maxWidth).toBe('0px');
		expect(getComputedStyle(aside).position).toBe('fixed');
		screen.component.handlePress();
		await tick();
		expect(backdrop.style.display).toBe('unset');
		await page.viewport(810, 768);
		await expect.poll(() => backdrop.style.display).toBe('none');
		expect(aside.style.maxWidth).toBe('320px');
		expect(getComputedStyle(aside).position).toBe('sticky');
	});

	it('never schedules WebKit repaint timers across toggles or unmounting an open sidebar', async () => {
		await page.viewport(390, 844);
		vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
			'Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15'
		);
		vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] });
		const screen = render(Sidebar);
		const aside = screen.container.querySelector('aside');
		await tick();
		expect(aside.classList.contains('default')).toBe(true);
		expect(aside.style.maxWidth).toBe('0px');

		for (let index = 0; index < 3; index += 1) {
			screen.component.handlePress();
			await tick();
			expect(getComputedStyle(aside).backdropFilter).toBe('blur(50px)');
			expect(vi.getTimerCount()).toBe(0);
		}
		expect(aside.style.maxWidth).toBe('320px');
		screen.unmount();
		await tick();
		expect(aside.isConnected).toBe(false);
		vi.advanceTimersByTime(100);
		expect(vi.getTimerCount()).toBe(0);
	});
});
