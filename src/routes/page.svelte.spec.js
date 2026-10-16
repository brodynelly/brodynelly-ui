import { cdp, page, userEvent } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';
import { components, findComponents, addCommand } from '$lib/site/catalog.js';

vi.mock('$app/paths', () => ({ base: '/preview' }));

afterEach(async () => {
	document.documentElement.style.removeProperty('font-size');
	await cdp().send('Emulation.setEmulatedMedia', { features: [] });
	await page.viewport(1280, 900);
});

function contrast(a, b) {
	const luminance = (color) => {
		const channels = color
			.match(/[\d.]+/g)
			.slice(0, 3)
			.map(Number);
		return channels.reduce((sum, channel, index) => {
			const value = channel / 255;
			return (
				sum +
				(value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4) *
					[0.2126, 0.7152, 0.0722][index]
			);
		}, 0);
	};
	const first = luminance(a);
	const second = luminance(b);
	return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

describe('source-first home', () => {
	it('renders the actual catalog count, real command and local imports', async () => {
		const screen = await render(Page);
		await expect
			.element(page.getByRole('heading', { level: 1, name: 'Svelte components. In your source.' }))
			.toBeVisible();
		expect(screen.container.querySelectorAll('details')).toHaveLength(components.length);
		await expect
			.element(page.getByRole('status', { name: 'Component search results' }))
			.toHaveTextContent(`${components.length} of ${components.length} components`);
		expect(screen.container.querySelector('.command-block > code').textContent).toBe(
			addCommand('switch')
		);
		const example = screen.container.querySelector('pre').textContent;
		expect(example).toContain("import '$lib/components/ui/styles.css'");
		expect(example).toContain("import Switch from '$lib/components/ui/controls/Switch.svelte'");
		expect(example).toContain('bind:checked={notifications}');
	});

	it.each(['switch', 'Version26Button', 'controls/Switch.svelte', '  SWITCH  '])(
		'filters canonical metadata for %s',
		async (query) => {
			const screen = await render(Page);
			await page.getByRole('searchbox', { name: 'Find a component' }).fill(query);
			const expected = findComponents(query);
			expect(expected.length).toBeGreaterThan(0);
			await expect
				.poll(() => screen.container.querySelectorAll('details').length)
				.toBe(expected.length);
			expect(
				[...screen.container.querySelectorAll('summary strong')].map(
					(element) => element.textContent
				)
			).toEqual(expected.map((item) => item.exportName));
		}
	);

	it('offers an empty state, keyboard clear-to-input focus, and native keyboard disclosure', async () => {
		const screen = await render(Page);
		const input = page.getByRole('searchbox', { name: 'Find a component' });
		await input.fill('no-such-component');
		await expect
			.element(
				page.getByText(
					'No components match “no-such-component”. Try a different name or clear your search.'
				)
			)
			.toBeVisible();
		await userEvent.keyboard('{Tab}{Enter}');
		await expect.element(input).toHaveValue('');
		expect(document.activeElement).toBe(input.element());
		await input.fill('controls/Switch.svelte');
		await userEvent.keyboard('{Tab}{Tab}{Enter}');
		const details = screen.container.querySelector('details');
		expect(details.open).toBe(true);
		expect(details.textContent).toContain('src/lib/components/ui/controls/Switch.svelte');
		await expect
			.element(page.getByRole('button', { name: 'Copy Switch command', exact: true }))
			.toBeVisible();
	});

	it('uses base-aware navigation to setup and all preserved previews', async () => {
		await render(Page);
		for (const [name, href] of [
			['Brodynelly UI', '/preview/'],
			['Components', '/preview/#components'],
			['Setup', '/preview/setup'],
			['Full showcase', '/preview/showcase'],
			['Interactive components', '/preview/components'],
			['Windows', '/preview/windows']
		]) {
			await expect
				.element(page.getByRole('link', { name, exact: true }))
				.toHaveAttribute('href', href);
		}
		await expect
			.element(page.getByRole('link', { name: 'GitHub', exact: true }))
			.toHaveAttribute('href', 'https://github.com/brodynelly/brodynelly-ui');
	});

	it.each([
		['light', 'normal'],
		['dark', 'normal'],
		['light', 'contrast'],
		['dark', 'contrast']
	])(
		'keeps ordinary text, controls and focus legible in %s appearance (%s)',
		async (appearance, preference) => {
			await cdp().send('Emulation.setEmulatedMedia', {
				features: [
					{ name: 'prefers-color-scheme', value: appearance },
					{ name: 'prefers-contrast', value: preference === 'contrast' ? 'more' : 'no-preference' }
				]
			});
			const screen = await render(Page);
			const surface = getComputedStyle(
				screen.container.querySelector('.source-site')
			).backgroundColor;
			for (const element of screen.container.querySelectorAll(
				'.lead, .muted, .site-brand, .site-footer, .site-header a'
			)) {
				expect(contrast(getComputedStyle(element).color, surface)).toBeGreaterThanOrEqual(4.5);
			}
			const button = page
				.getByRole('button', { name: 'Copy first Switch command', exact: true })
				.element();
			button.focus();
			await userEvent.keyboard('{Shift>}{Tab}{/Shift}{Tab}');
			const style = getComputedStyle(button);
			expect(document.activeElement).toBe(button);
			expect(button.matches(':focus-visible')).toBe(true);
			expect(contrast(style.color, style.backgroundColor)).toBeGreaterThanOrEqual(4.5);
			expect(contrast(style.borderTopColor, style.backgroundColor)).toBeGreaterThanOrEqual(3);
			expect(contrast(style.outlineColor, style.backgroundColor)).toBeGreaterThanOrEqual(3);
			expect(style.outlineWidth).toBe('3px');
			console.info(
				'focus-measurement',
				JSON.stringify({
					kind: 'root-copy',
					appearance,
					preference,
					ring: style.outlineColor,
					surface: style.backgroundColor,
					ratio: contrast(style.outlineColor, style.backgroundColor),
					keyboardFocused: true
				})
			);
		}
	);

	it.each([
		[1440, 2],
		[320, 1]
	])('uses the available catalog width at %s CSS pixels (%s columns)', async (width, columns) => {
		await page.viewport(width, 1000);
		const screen = await render(Page);
		const grid = screen.container.querySelector('.component-list');
		const tracks = getComputedStyle(grid).gridTemplateColumns.split(' ');
		expect(tracks).toHaveLength(columns);
		expect(tracks.every((track) => parseFloat(track) > 0)).toBe(true);
		const rows = [...grid.children];
		const first = rows[0].getBoundingClientRect();
		const second = rows[1].getBoundingClientRect();
		if (columns === 2) {
			expect(second.top).toBe(first.top);
			expect(second.left).toBeGreaterThanOrEqual(first.right);
		} else {
			expect(second.top).toBeGreaterThanOrEqual(first.bottom);
			expect(second.left).toBe(first.left);
		}
	});

	it('reflows at 320 CSS pixels with 200% text and keeps source selectable without truncation', async () => {
		await page.viewport(320, 900);
		document.documentElement.style.fontSize = '200%';
		const screen = await render(Page);
		await page.getByRole('searchbox', { name: 'Find a component' }).fill('controls/Switch.svelte');
		const summary = screen.container.querySelector('summary');
		summary.click();
		const wrapper = screen.container.querySelector('.source-site');
		expect(wrapper.scrollWidth).toBeLessThanOrEqual(320);
		for (const element of screen.container.querySelectorAll(
			'pre, .command-block > code, .component-source > code, summary'
		)) {
			expect(element.scrollWidth).toBeLessThanOrEqual(element.clientWidth + 1);
			const style = getComputedStyle(element);
			expect(style.userSelect).toBe('text');
			expect(style.textOverflow).not.toBe('ellipsis');
			expect(style.textSizeAdjust).toBe('auto');
		}
		expect(getComputedStyle(wrapper).fontSize).toBe('32px');
		const code = screen.container.querySelector('.command-block > code');
		const range = document.createRange();
		range.selectNodeContents(code);
		window.getSelection().removeAllRanges();
		window.getSelection().addRange(range);
		expect(window.getSelection().toString()).toBe(addCommand('switch'));
	});
});
