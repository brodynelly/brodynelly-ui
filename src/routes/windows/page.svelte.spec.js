import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import WindowsPage from './+page.svelte';

vi.mock('$app/paths', () => ({ base: '/preview' }));

describe('Figma window component sheet', () => {
	it('preserves the source content and independent selection groups', async () => {
		await render(WindowsPage);
		await expect.element(page.getByRole('heading', { name: 'Windows', exact: true })).toBeVisible();
		const plain = page.getByRole('button', { name: 'Select window', exact: true });
		const active = page.getByRole('button', { name: 'Select active split view' });
		const inactive = page.getByRole('button', { name: 'Select inactive split view' });
		await expect.element(plain).toHaveAttribute('aria-pressed', 'false');
		await active.click();
		await expect.element(active).toHaveAttribute('aria-pressed', 'true');
		await inactive.click();
		await expect.element(active).toHaveAttribute('aria-pressed', 'false');
		await expect.element(inactive).toHaveAttribute('aria-pressed', 'true');

		await page.getByRole('button', { name: 'Inactive', exact: true }).click();
		await expect
			.element(page.getByRole('button', { name: 'Inactive', exact: true }))
			.toHaveAttribute('aria-pressed', 'true');
		await expect
			.element(page.getByRole('button', { name: 'Active', exact: true }))
			.toHaveAttribute('aria-pressed', 'false');
		await page.getByRole('button', { name: 'Full screen', exact: true }).click();
		await expect
			.element(page.getByRole('button', { name: 'Full screen', exact: true }))
			.toHaveAttribute('aria-pressed', 'true');
		await expect
			.element(page.getByRole('button', { name: 'Floating', exact: true }))
			.toHaveAttribute('aria-pressed', 'false');
		await expect.element(inactive).toHaveAttribute('aria-pressed', 'true');
	});

	it('preserves the imported palette and base-aware footer destinations', async () => {
		const screen = await render(WindowsPage);
		const canvas = screen.container.querySelector('.canvas');
		expect(getComputedStyle(canvas).backgroundColor).toBe('rgb(0, 0, 0)');
		expect(getComputedStyle(canvas).color).toBe('rgb(255, 255, 255)');
		await expect
			.element(page.getByRole('link', { name: 'Try the interactive components' }))
			.toHaveAttribute('href', '/preview/components');
		await expect
			.element(page.getByRole('link', { name: 'Browse the full showcase' }))
			.toHaveAttribute('href', '/preview/showcase');
		await expect
			.element(page.getByRole('link', { name: 'Brodynelly UI — source catalog' }))
			.toHaveAttribute('href', '/preview/');
	});
});
