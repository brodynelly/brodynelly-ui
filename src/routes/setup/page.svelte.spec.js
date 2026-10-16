import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import SetupPage from './+page.svelte';

vi.mock('$app/paths', () => ({ base: '/preview' }));

describe('source-first setup', () => {
	it('explains real local integration, edited-file policies and optional legacy requirements', async () => {
		const screen = await render(SetupPage);
		await expect
			.element(page.getByRole('heading', { level: 1, name: 'Local files. A small setup.' }))
			.toBeVisible();
		for (const text of [
			'Svelte 5.20+',
			'Node 20.19+',
			'--dry-run',
			'--keep-existing',
			'--overwrite',
			'Material Symbols Rounded',
			'feImage',
			'commented out',
			'Carza-104',
			'No Apple fonts or SF Symbols are distributed'
		]) {
			expect(screen.container.textContent).toContain(text);
		}
		expect(screen.container.querySelector('pre').textContent).toContain(
			'$lib/components/ui/controls/Switch.svelte'
		);
		await expect
			.element(page.getByRole('link', { name: 'Setup', exact: true }))
			.toHaveAttribute('aria-current', 'page');
		await expect
			.element(page.getByRole('link', { name: 'Browse the complete legacy showcase' }))
			.toHaveAttribute('href', '/preview/showcase');
		await expect
			.element(page.getByRole('link', { name: 'Optional OpenCode setup' }))
			.toHaveAttribute(
				'href',
				'https://github.com/brodynelly/brodynelly-ui/blob/main/docs/opencode.md'
			);
	});
});
