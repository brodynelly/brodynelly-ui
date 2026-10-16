import { page, userEvent } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import SplitViewFixture from './SplitView.spec.svelte';

function readRatio() {
	return Number(page.getByTestId('ratio').element().textContent);
}

// The four native gesture cases live in tests/pointer/split-view.spec.js to avoid
// Vitest runner iframe focus/scale interference. No coverage is skipped.
describe('SplitView', () => {
	it('renders the 4:5 source panes with composable content and an accessible separator', async () => {
		const { container, rerender } = render(SplitViewFixture);
		const sidebar = container.querySelector('.apple-split-view__sidebar');
		const content = container.querySelector('.apple-split-view__content');
		const separator = page.getByRole('separator', { name: 'Resize sidebar' });
		const activeColor = getComputedStyle(sidebar).backgroundColor;

		// Grid tracks are quantized to layout subpixels (1/64 CSS px).
		expect(sidebar.getBoundingClientRect().width).toBeCloseTo(320, 1);
		expect(content.getBoundingClientRect().width).toBeCloseTo(400, 1);
		expect(getComputedStyle(content).backgroundColor).toBe('rgb(255, 255, 255)');
		await expect.element(page.getByRole('button', { name: 'Sidebar action' })).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Content action' })).toBeVisible();
		await expect.element(separator).toHaveAttribute('tabindex', '0');
		await expect.element(separator).toHaveAttribute('aria-orientation', 'vertical');
		await expect.element(separator).toHaveAttribute('aria-controls', sidebar.id);
		await expect.element(separator).toHaveAttribute('aria-valuenow', '44.44');
		await expect.element(separator).toHaveAttribute('aria-valuemin', '20');
		await expect.element(separator).toHaveAttribute('aria-valuemax', '80');

		await rerender({ active: false });
		expect(getComputedStyle(sidebar).backgroundColor).not.toBe(activeColor);
	});

	it('updates bind:ratio with arrow keys, Shift, Home, and End, respecting bounds', async () => {
		render(SplitViewFixture);
		const separator = page.getByRole('separator');
		separator.element().focus();

		await userEvent.keyboard('{ArrowRight}');
		expect(readRatio()).toBeCloseTo(4 / 9 + 0.01);
		await userEvent.keyboard('{ArrowLeft}');
		expect(readRatio()).toBeCloseTo(4 / 9);
		await userEvent.keyboard('{Home}{ArrowLeft}');
		expect(readRatio()).toBe(0.2);
		await userEvent.keyboard('{End}{ArrowRight}');
		expect(readRatio()).toBe(0.8);
		await userEvent.keyboard('{Shift>}{ArrowLeft}{/Shift}');
		expect(readRatio()).toBeCloseTo(0.7);
		await expect.element(separator).toHaveAttribute('aria-valuenow', '70');
		await expect.element(separator).toHaveAttribute('aria-valuetext', '70% sidebar');
		expect(document.activeElement).toBe(separator.element());
	});

	it('clamps external and invalid ratios and removes resizing when disabled', async () => {
		const { container, rerender } = render(SplitViewFixture, {
			ratio: 0.9,
			minRatio: 0.3,
			maxRatio: 0.6
		});
		expect(readRatio()).toBe(0.6);
		await rerender({ ratio: Number.NaN });
		expect(readRatio()).toBeCloseTo(4 / 9);
		await rerender({ ratio: -2 });
		expect(readRatio()).toBe(0.3);
		await rerender({ resizable: false });
		expect(container.querySelector('[role="separator"]')).toBeNull();
		expect(container.querySelector('.apple-split-view').dataset.resizable).toBe('false');
		await expect.element(page.getByRole('button', { name: 'Sidebar action' })).toBeVisible();
	});
});
