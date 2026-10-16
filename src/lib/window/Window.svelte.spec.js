import { page, userEvent } from '@vitest/browser/context';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Window from './Window.svelte';
import WindowControls from './WindowControls.svelte';
import WindowResizeControl from './WindowResizeControl.svelte';

describe('Window', () => {
	it('renders the neutral 720 × 400 source surface without interactive chrome', () => {
		const { container } = render(Window, { style: 'width: 720px', 'data-testid': 'window' });
		const surface = container.querySelector('.apple-window');
		const styles = getComputedStyle(surface);

		expect(surface.tagName).toBe('SPAN');
		expect(surface.hasAttribute('tabindex')).toBe(false);
		expect(surface.hasAttribute('role')).toBe(false);
		expect(surface.querySelector('button')).toBeNull();
		expect(surface.dataset.kind).toBe('plain');
		expect(surface.dataset.state).toBe('active');
		expect(styles.aspectRatio).toBe('9 / 5');
		expect(styles.borderRadius).toBe('34px');
		expect(styles.backgroundColor).toBe('rgb(255, 255, 255)');
		expect(surface.getBoundingClientRect().height).toBe(400);
	});

	it('preserves the 4:5 split, both snippets, and reactive active/selected appearances', async () => {
		const sidebar = createRawSnippet(() => ({ render: () => '<span>Sidebar content</span>' }));
		const children = createRawSnippet(() => ({ render: () => '<button>Content action</button>' }));
		const { container, rerender } = render(Window, {
			split: true,
			sidebar,
			children,
			style: 'width: 720px'
		});
		const surface = container.querySelector('.apple-window');
		const sidebarPane = container.querySelector('.apple-window__sidebar');
		const contentPane = container.querySelector('.apple-window__content');
		const activeColor = getComputedStyle(sidebarPane).backgroundColor;

		expect(sidebarPane.getBoundingClientRect().width).toBe(320);
		expect(contentPane.getBoundingClientRect().width).toBe(400);
		await expect.element(page.getByText('Sidebar content')).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Content action' })).toBeVisible();

		await rerender({ active: false, selected: true });
		expect(surface.dataset.state).toBe('inactive');
		expect(getComputedStyle(sidebarPane).backgroundColor).not.toBe(activeColor);
		expect(surface.dataset.selected).toBe('true');
		expect(getComputedStyle(surface).boxShadow).toContain('rgb(0, 136, 255)');
		expect(surface.querySelectorAll('button')).toHaveLength(1);
	});

	it('forwards class, style, and attributes without requiring shared styles', () => {
		const { container } = render(Window, {
			class: 'custom-window',
			style: '--apple-window-radius: 12px; --apple-window-surface: #f00; width: 360px',
			id: 'custom-window',
			'aria-label': 'Preview'
		});
		const surface = container.querySelector('#custom-window');

		expect(surface.classList.contains('custom-window')).toBe(true);
		expect(surface.getAttribute('aria-label')).toBe('Preview');
		expect(getComputedStyle(surface).borderRadius).toBe('12px');
		expect(getComputedStyle(surface).backgroundColor).toBe('rgb(255, 0, 0)');
	});
});

describe('WindowControls', () => {
	it('renders one 44px pill with three monochrome source dots and a controlled callback', async () => {
		const onclick = vi.fn();
		const { container, rerender } = render(WindowControls, {
			onclick,
			class: 'custom-control',
			style:
				'--apple-window-dot-active: #fff; --apple-window-dot-inactive: oklch(70% 0 0); --apple-window-control-color: #fff; --apple-window-control-background: #0f0f0f; --apple-window-control-selected-background: #262626;'
		});
		const button = page.getByRole('button', { name: 'Active', exact: true });
		const dots = container.querySelectorAll('.apple-window-traffic > span');

		expect(container.querySelectorAll('button')).toHaveLength(1);
		expect(button.element().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
		expect(getComputedStyle(button.element()).borderRadius).toBe('980px');
		expect(button.element().classList.contains('custom-control')).toBe(true);
		expect(dots).toHaveLength(3);
		for (const dot of dots) {
			expect(dot.getBoundingClientRect().width).toBe(8);
			expect(dot.getBoundingClientRect().height).toBe(8);
			expect(getComputedStyle(dot).backgroundColor).toBe('rgb(255, 255, 255)');
		}
		await button.click();
		expect(onclick).toHaveBeenCalledOnce();
		expect(onclick.mock.calls[0][0]).toBeInstanceOf(MouseEvent);
		await expect.element(button).toHaveAttribute('aria-pressed', 'false');

		await rerender({ active: false, selected: true });
		await expect
			.element(page.getByRole('button', { name: 'Inactive' }))
			.toHaveAttribute('aria-pressed', 'true');
		expect(getComputedStyle(dots[0]).backgroundColor).toBe('oklch(0.7 0 0)');
	});

	it('supports custom labels, keyboard activation, and native disabled behavior', async () => {
		const onclick = vi.fn();
		const { rerender } = render(WindowControls, { label: 'Use active appearance', onclick });
		const button = page.getByRole('button', { name: 'Use active appearance' });
		button.element().focus();
		await userEvent.keyboard('{Enter}');
		await userEvent.keyboard(' ');
		expect(onclick).toHaveBeenCalledTimes(2);

		await rerender({ disabled: true });
		await expect.element(button).toBeDisabled();
		button.element().click();
		expect(onclick).toHaveBeenCalledTimes(2);
	});
});

describe('WindowResizeControl', () => {
	it('keeps the source 18px nested-corner glyph and forwards selection callbacks', async () => {
		const onclick = vi.fn();
		const { container, rerender } = render(WindowResizeControl, { onclick });
		const button = page.getByRole('button', { name: 'Floating' });
		const glyph = container.querySelector('.apple-window-resize-glyph');

		expect(button.element().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
		expect(glyph.getBoundingClientRect().width).toBe(18);
		expect(glyph.getAttribute('aria-hidden')).toBe('true');
		expect(getComputedStyle(glyph, '::before').width).toBe('16px');
		expect(getComputedStyle(glyph, '::after').width).toBe('9px');
		await button.click();
		expect(onclick).toHaveBeenCalledOnce();
		await expect.element(button).toHaveAttribute('aria-pressed', 'false');

		await rerender({ mode: 'full-screen', selected: true });
		const fullScreen = page.getByRole('button', { name: 'Full screen' });
		await expect.element(fullScreen).toHaveAttribute('aria-pressed', 'true');
		await expect.element(fullScreen).toHaveAttribute('data-resize-state', 'full-screen');
	});

	it('does not activate a disabled resize selector', async () => {
		const onclick = vi.fn();
		render(WindowResizeControl, { disabled: true, label: 'Resize appearance', onclick });
		const button = page.getByRole('button', { name: 'Resize appearance' });

		await expect.element(button).toBeDisabled();
		button.element().click();
		expect(onclick).not.toHaveBeenCalled();
	});
});
