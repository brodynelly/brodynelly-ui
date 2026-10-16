import { page, userEvent } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import '$lib/styles.css';
import './site.css';
import CopyButton from './CopyButton.svelte';

const original = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
const command = 'npx --yes --package=github:brodynelly/brodynelly-ui brodynelly-ui add switch';
const button = () => page.getByRole('button', { name: 'Copy test command', exact: true });
const status = () => page.getByRole('status', { name: 'Copy test command status', exact: true });

function clipboard(value) {
	Object.defineProperty(navigator, 'clipboard', { configurable: true, value });
}

async function setup() {
	const screen = await render(CopyButton, { text: command, label: 'Copy test command' });
	screen.container.classList.add('source-site');
	return screen;
}

afterEach(() => {
	if (original) Object.defineProperty(navigator, 'clipboard', original);
	else delete navigator.clipboard;
});

describe('private native command copy', () => {
	it('does not touch the clipboard on render, keeps focus pending, and only confirms resolution', async () => {
		let resolve;
		const writeText = vi.fn(() => new Promise((done) => (resolve = done)));
		clipboard({ writeText });
		await setup();
		expect(writeText).not.toHaveBeenCalled();
		await expect.element(button()).toHaveTextContent('Copy test command');
		await expect.element(button()).toHaveAccessibleName(button().element().textContent.trim());
		await expect.element(button()).toHaveAttribute('aria-busy', 'false');
		button().element().focus();
		await userEvent.keyboard('{Enter}');
		await expect.element(status()).toHaveTextContent('Copying…');
		await expect.element(button()).toHaveAttribute('aria-disabled', 'true');
		await expect.element(button()).toHaveAttribute('aria-busy', 'true');
		await expect.element(button()).toHaveTextContent('Copy test command');
		await expect.element(button()).toHaveAccessibleName(button().element().textContent.trim());
		expect(button().element().disabled).toBe(false);
		expect(document.activeElement).toBe(button().element());
		button().element().click();
		expect(writeText).toHaveBeenCalledExactlyOnceWith(command);
		expect(status().element().textContent).not.toContain('Command copied');
		resolve();
		await expect.element(status()).toHaveTextContent('Command copied. Run it in your project');
		await expect.element(button()).toHaveAttribute('aria-disabled', 'false');
		await expect.element(button()).toHaveAttribute('aria-busy', 'false');
		expect(document.activeElement).toBe(button().element());
	});

	it('retains denied-copy feedback and offers a labeled readonly manual copy without stealing focus', async () => {
		clipboard({ writeText: vi.fn().mockRejectedValue(new Error('denied')) });
		await setup();
		await button().click();
		await expect
			.element(status())
			.toHaveTextContent('Could not copy. Select and copy the command below.');
		const fallback = page.getByRole('textbox', { name: 'Manual copy: Copy test command' });
		await expect.element(fallback).toHaveValue(command);
		await expect.element(fallback).toHaveAttribute('readonly');
		expect(document.activeElement).toBe(button().element());
		await userEvent.keyboard('{Tab}');
		expect(document.activeElement).toBe(fallback.element());
		fallback.element().select();
		expect(fallback.element().selectionEnd).toBe(command.length);
		await expect.element(status()).toHaveTextContent('Could not copy.');
		expect(status().element().getAttribute('aria-live')).toBe('polite');
	});

	it('handles an unavailable API and permits a deliberate retry', async () => {
		clipboard(undefined);
		await setup();
		await button().click();
		await expect.element(status()).toHaveTextContent('Clipboard unavailable.');
		await expect
			.element(page.getByRole('textbox', { name: 'Manual copy: Copy test command' }))
			.toBeVisible();
		const writeText = vi.fn().mockResolvedValue(undefined);
		clipboard({ writeText });
		await button().click();
		await expect.element(status()).toHaveTextContent('Command copied.');
		expect(writeText).toHaveBeenCalledExactlyOnceWith(command);
		await expect.element(page.getByRole('textbox')).not.toBeInTheDocument();
	});

	it('uses unique named polite statuses and manual field IDs for repeated actions', async () => {
		clipboard(undefined);
		await setup();
		await render(CopyButton, { text: 'other command', label: 'Copy other command' });
		await button().click();
		await page.getByRole('button', { name: 'Copy other command', exact: true }).click();
		const statuses = document.querySelectorAll('[role="status"]');
		expect(new Set([...statuses].map((element) => element.id)).size).toBe(2);
		expect(
			new Set([...document.querySelectorAll('textarea')].map((element) => element.id)).size
		).toBe(2);
		await expect
			.element(page.getByRole('status', { name: 'Copy other command status' }))
			.toHaveTextContent('Clipboard unavailable.');
	});
});
