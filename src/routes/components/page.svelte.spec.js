import { cdp, page, userEvent } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ComponentsPage from './+page.svelte';

vi.mock('$app/paths', () => ({ base: '/preview' }));

const actionStatus = () => page.getByRole('status', { name: 'Note action', exact: true });

afterEach(async () => {
	await cdp().send('Emulation.setEmulatedMedia', { features: [] });
});

function rgba(color) {
	const context = document.createElement('canvas').getContext('2d');
	context.fillStyle = color;
	context.fillRect(0, 0, 1, 1);
	return Array.from(context.getImageData(0, 0, 1, 1).data);
}

function contrast(foreground, background) {
	const text = rgba(foreground);
	const surface = rgba(background);
	const luminance = (channels) =>
		channels.slice(0, 3).reduce((sum, value, index) => {
			const srgb = value / 255;
			const linear = srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
			return sum + linear * [0.2126, 0.7152, 0.0722][index];
		}, 0);
	const painted = text
		.slice(0, 3)
		.map((value, index) => value * (text[3] / 255) + surface[index] * (1 - text[3] / 255));
	const first = luminance(painted);
	const second = luminance(surface);
	return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

describe('interactive component gallery', () => {
	it('filters the split view content and opens a real modal sheet', async () => {
		const screen = await render(ComponentsPage);
		const dialog = screen.container.querySelector('dialog');
		expect(dialog.open).toBe(false);
		await expect
			.element(page.getByRole('heading', { level: 1, name: 'Familiar by design.' }))
			.toBeVisible();
		await page.getByRole('searchbox', { name: 'Search notes' }).fill('moment');
		await expect
			.element(page.getByRole('button', { name: 'A little room to think', exact: true }))
			.not.toBeInTheDocument();
		await page.getByRole('button', { name: 'Made for the moment', exact: true }).click();
		await expect
			.element(page.getByRole('heading', { name: 'Made for the moment', exact: true }))
			.toBeVisible();
		await page.getByRole('button', { name: 'Open sheet', exact: true }).click();
		await expect.element(page.getByRole('dialog', { name: 'A space to focus.' })).toBeVisible();
		expect(dialog.matches(':modal')).toBe(true);
		await page.getByRole('button', { name: 'Done', exact: true }).click();
		await expect.poll(() => dialog.open).toBe(false);
		await expect.element(actionStatus()).toHaveTextContent('Back where you left off.');
	});

	it('keeps the menu checkbox and action status synchronized across reopening', async () => {
		await render(ComponentsPage);
		const trigger = page.getByRole('button', { name: 'Note actions' });
		const pin = page.getByRole('menuitemcheckbox', { name: 'Pin note', exact: true });
		await trigger.click();
		await expect.element(pin).toHaveAttribute('aria-checked', 'false');
		await pin.click();
		await expect.element(actionStatus()).toHaveTextContent('Note pinned.');
		await trigger.click();
		await expect.element(pin).toHaveAttribute('aria-checked', 'true');
		await pin.click();
		await expect.element(actionStatus()).toHaveTextContent('Note unpinned.');
		await trigger.click();
		await expect.element(pin).toHaveAttribute('aria-checked', 'false');
		await expect.element(page.getByRole('status', { name: 'Copies' })).toHaveTextContent('1');
	});

	it('keeps search, clear, selection and settings usable at 320 CSS pixels', async () => {
		await page.viewport(320, 900);
		const screen = await render(ComponentsPage);
		await expect
			.element(page.getByText('Search and choose a note, then read it below.'))
			.toBeVisible();
		await expect.element(page.getByRole('separator')).not.toBeInTheDocument();
		const input = page.getByRole('searchbox', { name: 'Search notes' });
		await input.fill('moment');
		const clear = page.getByRole('button', { name: 'Clear Search notes' });
		const bounds = clear.element().getBoundingClientRect();
		expect(bounds.width).toBeGreaterThanOrEqual(44);
		expect(input.element().getBoundingClientRect().width).toBeGreaterThanOrEqual(120);
		expect(
			clear
				.element()
				.contains(
					document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2)
				)
		).toBe(true);
		await clear.click();
		await expect.element(input).toHaveValue('');
		await page.getByRole('button', { name: 'Made for the moment', exact: true }).click();
		await expect
			.element(page.getByRole('heading', { name: 'Made for the moment', exact: true }))
			.toBeVisible();
		await page.getByRole('switch', { name: 'Notifications' }).click();
		await expect.element(page.getByRole('switch', { name: 'Notifications' })).not.toBeChecked();
		const sidebar = screen.container
			.querySelector('.apple-split-view__sidebar')
			.getBoundingClientRect();
		const content = screen.container
			.querySelector('.apple-split-view__content')
			.getBoundingClientRect();
		expect(content.top).toBeGreaterThanOrEqual(sidebar.bottom);
		await page.viewport(834, 1000);
		const separator = page.getByRole('separator');
		separator.element().focus();
		await userEvent.keyboard('{Home}');
		await expect.element(separator).toHaveAttribute('aria-valuenow', '40');
		await input.fill('moment');
		const regularClear = page.getByRole('button', { name: 'Clear Search notes' });
		const edge = regularClear.element().getBoundingClientRect();
		expect(
			regularClear
				.element()
				.contains(document.elementFromPoint(edge.left + edge.width / 2, edge.top + edge.height / 2))
		).toBe(true);
		await regularClear.click();
		separator.element().focus();
		await userEvent.keyboard('{End}');
		await expect.element(separator).toHaveAttribute('aria-valuenow', '60');
	});

	it('keeps primary button hover text at ordinary text contrast', async () => {
		await cdp().send('Emulation.setEmulatedMedia', {
			features: [{ name: 'prefers-color-scheme', value: 'light' }]
		});
		await render(ComponentsPage);
		const button = page.getByRole('button', { name: 'Open sheet', exact: true });
		await userEvent.hover(button);
		const styles = getComputedStyle(button.element());
		expect(contrast(styles.color, styles.backgroundColor)).toBeGreaterThanOrEqual(4.5);
	});

	it.each([false, true])(
		'keeps the light search pane legible in dark OS mode (solid fallback: %s)',
		async (solid) => {
			await cdp().send('Emulation.setEmulatedMedia', {
				features: [
					{ name: 'prefers-color-scheme', value: 'dark' },
					{ name: 'prefers-reduced-transparency', value: solid ? 'reduce' : 'no-preference' }
				]
			});
			await render(ComponentsPage);
			const input = page.getByRole('searchbox', { name: 'Search notes' }).element();
			const fill = getComputedStyle(input.closest('.search-control')).backgroundColor;
			expect(rgba(fill)[3]).toBe(255);
			expect(contrast(getComputedStyle(input).color, fill)).toBeGreaterThanOrEqual(4.5);
			expect(contrast(getComputedStyle(input, '::placeholder').color, fill)).toBeGreaterThanOrEqual(
				4.5
			);
			await page.getByRole('searchbox', { name: 'Search notes' }).fill('no such note');
			await expect.element(page.getByRole('region', { name: 'No matching notes' })).toBeVisible();
		}
	);

	it('uses readable light-mode secondary text and base-aware navigation', async () => {
		await cdp().send('Emulation.setEmulatedMedia', {
			features: [{ name: 'prefers-color-scheme', value: 'light' }]
		});
		const screen = await render(ComponentsPage);
		const background = getComputedStyle(document.body).backgroundColor;
		expect(rgba(background)).toEqual([242, 242, 247, 255]);
		for (const element of screen.container.querySelectorAll(
			'.eyebrow, .lede, .readout, .hint, footer p'
		)) {
			expect(contrast(getComputedStyle(element).color, background)).toBeGreaterThanOrEqual(4.5);
		}
		await expect
			.element(page.getByRole('link', { name: 'Windows', exact: true }))
			.toHaveAttribute('href', '/preview/windows');
		await expect
			.element(page.getByRole('link', { name: 'Full showcase' }))
			.toHaveAttribute('href', '/preview/showcase');
		await expect
			.element(page.getByRole('link', { name: 'Brodynelly UI — source catalog' }))
			.toHaveAttribute('href', '/preview/');
	});
});
