import { cdp } from '@vitest/browser/context';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from 'vitest-browser-svelte';
import ProgressBar from './ProgressBar.svelte';

afterEach(async () => {
	cleanup();
	await cdp().send('Emulation.setEmulatedMedia', { features: [] });
});

describe('ProgressBar', () => {
	it('defaults to a named native, determinate progress indicator at zero', async () => {
		const screen = render(ProgressBar, { label: 'Importing files' });
		const progress = screen.getByRole('progressbar', { name: 'Importing files' });
		await expect.element(progress).toBeVisible();
		expect(progress.element().tagName).toBe('PROGRESS');
		expect(progress.element().value).toBe(0);
		expect(progress.element().max).toBe(100);
		expect(progress.element().position).toBe(0);
		await expect.element(progress).toHaveAttribute('aria-valuetext', '0%');
		expect(screen.container.querySelector('.progress-value').textContent).toBe('0%');
	});

	it.each([
		{ value: 0, max: 80, expected: 0, text: '0%' },
		{ value: 20, max: 80, expected: 20, text: '25%' },
		{ value: 80, max: 80, expected: 80, text: '100%' },
		{ value: -20, max: 80, expected: 0, text: '0%' },
		{ value: 120, max: 80, expected: 80, text: '100%' },
		{ value: 0.5, max: 2, expected: 0.5, text: '25%' },
		{ value: Number.NaN, max: 80, expected: 0, text: '0%' },
		{ value: Number.POSITIVE_INFINITY, max: 80, expected: 0, text: '0%' },
		{ value: Number.NEGATIVE_INFINITY, max: 80, expected: 0, text: '0%' }
	])('normalizes value $value within max $max', async ({ value, max, expected, text }) => {
		const screen = render(ProgressBar, { label: 'Download', value, max });
		const progress = screen.getByRole('progressbar', { name: 'Download' });
		expect(progress.element().value).toBe(expected);
		expect(progress.element().max).toBe(max);
		expect(progress.element().position).toBe(expected / max);
		await expect.element(progress).toHaveAttribute('aria-valuetext', text);
		expect(screen.container.querySelector('.progress-value').textContent).toBe(text);
	});

	it.each([0, -10, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
		'guards invalid maximum %s without becoming indeterminate',
		async (max) => {
			const screen = render(ProgressBar, { label: 'Syncing', value: 30, max });
			const progress = screen.getByRole('progressbar', { name: 'Syncing' });
			expect(progress.element().max).toBe(100);
			expect(progress.element().value).toBe(30);
			expect(progress.element().position).toBe(0.3);
			await expect.element(progress).toHaveAttribute('aria-valuetext', '30%');
		}
	);

	it('updates values and keeps the accessible value when the visual percentage is hidden', async () => {
		const screen = render(ProgressBar, {
			label: 'Preparing',
			value: 10,
			class: 'custom-progress',
			style: 'width: 402px;'
		});
		await screen.rerender({ value: 60, max: 120, showValue: false });
		const progress = screen.getByRole('progressbar', { name: 'Preparing' });
		expect(progress.element().value).toBe(60);
		expect(progress.element().max).toBe(120);
		await expect.element(progress).toHaveAttribute('aria-valuetext', '50%');
		expect(screen.container.querySelector('.progress-value')).toBeNull();
		const wrapper = screen.container.querySelector('.apple-progress-bar');
		expect(wrapper.classList.contains('custom-progress')).toBe(true);
		expect(wrapper.style.width).toBe('402px');
		const track = screen.container.querySelector('.progress-track');
		expect(track.getBoundingClientRect().height).toBe(44);
		expect(progress.element().getBoundingClientRect().height).toBe(4);
		expect(progress.element().getBoundingClientRect().width).toBe(370);
	});

	it('keeps updates static with reduced motion and defines the track in increased contrast', async () => {
		await cdp().send('Emulation.setEmulatedMedia', {
			features: [
				{ name: 'prefers-reduced-motion', value: 'reduce' },
				{ name: 'prefers-contrast', value: 'more' }
			]
		});
		const screen = render(ProgressBar, { label: 'Uploading', value: 25 });
		const progress = screen.getByRole('progressbar', { name: 'Uploading' });
		await screen.rerender({ value: 75 });
		expect(progress.element().value).toBe(75);
		const styles = getComputedStyle(progress.element());
		expect(styles.animationName).toBe('none');
		expect(styles.transitionDuration).toBe('0s');
		expect(styles.outlineStyle).toBe('solid');
		expect(styles.outlineWidth).toBe('1px');
	});
});
