import { cdp, page, userEvent } from '@vitest/browser/context';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

vi.mock('$app/paths', () => ({ base: '/preview' }));

afterEach(async () => {
	await cdp().send('Emulation.setEmulatedMedia', { features: [] });
});

describe('/+page.svelte', () => {
	it('should render h1', async () => {
		render(Page);

		const heading = page
			.getByRole('main')
			.getByRole('heading', { level: 1, name: 'Brodynelly UI', exact: true });
		await expect.element(heading).toBeInTheDocument();
	});

	it('keeps both new previews under a configured base path', async () => {
		render(Page);
		await expect
			.element(page.getByRole('link', { name: 'Windows — Figma reference' }))
			.toHaveAttribute('href', '/preview/windows');
		await expect
			.element(page.getByRole('link', { name: 'Interactive components', exact: true }))
			.toHaveAttribute('href', '/preview/components');
	});

	it('preserves the 3px glass keyboard focus ring in increased contrast', async () => {
		await cdp().send('Emulation.setEmulatedMedia', {
			features: [{ name: 'prefers-contrast', value: 'more' }]
		});
		const screen = render(Page);
		const button = screen.container.querySelector('button.liquid-glass');
		await userEvent.keyboard('{Tab}');
		button.focus();
		expect(button.matches(':focus-visible')).toBe(true);
		expect(getComputedStyle(button).outlineWidth).toBe('3px');
		expect(getComputedStyle(button).outlineStyle).toBe('solid');
	});
});
