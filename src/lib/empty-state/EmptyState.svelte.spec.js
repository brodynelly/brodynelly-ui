import { cdp } from '@vitest/browser/context';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from 'vitest-browser-svelte';
import EmptyState from './EmptyState.svelte';
import EmptyStateFixture from './EmptyState.test.svelte';

afterEach(async () => {
	cleanup();
	await cdp().send('Emulation.setEmulatedMedia', { features: [] });
});

describe('EmptyState', () => {
	it('renders a named text-only section without inventing an icon or empty content', async () => {
		const screen = render(EmptyState, { title: 'No results' });
		await expect.element(screen.getByRole('region', { name: 'No results' })).toBeVisible();
		await expect
			.element(screen.getByRole('heading', { name: 'No results', level: 2 }))
			.toBeVisible();
		const section = screen.container.querySelector('section');
		expect(section.hasAttribute('aria-describedby')).toBe(false);
		expect(section.hasAttribute('aria-live')).toBe(false);
		expect(section.querySelector('svg, img')).toBeNull();
		expect(section.querySelector('.empty-state-description')).toBeNull();
		expect(section.querySelector('.empty-state-illustration')).toBeNull();
		expect(section.querySelector('.empty-state-details')).toBeNull();
		expect(section.querySelector('.empty-state-action')).toBeNull();
	});

	it('associates the description and updates the heading without stale references', async () => {
		const screen = render(EmptyState, {
			title: 'No downloads',
			description: 'Downloads will appear here.'
		});
		const section = screen.getByRole('region', { name: 'No downloads' });
		await expect.element(section).toHaveAccessibleDescription('Downloads will appear here.');
		const descriptionId = section.element().getAttribute('aria-describedby');
		const sectionElement = section.element();
		expect(document.getElementById(descriptionId).textContent).toBe('Downloads will appear here.');
		await screen.rerender({ title: 'Nothing to show', description: '' });
		await expect.element(screen.getByRole('region', { name: 'Nothing to show' })).toBeVisible();
		expect(sectionElement.hasAttribute('aria-describedby')).toBe(false);
		expect(document.getElementById(descriptionId)).toBeNull();
	});

	it('composes illustration, children, and interactive action snippets in reading order', async () => {
		const onaction = vi.fn();
		const screen = render(EmptyStateFixture, { onaction });
		const section = screen.getByRole('region', { name: 'No saved places' });
		await expect
			.element(section)
			.toHaveAccessibleDescription('Save a place to find it here later.');
		await expect.element(screen.getByTestId('empty-state-details')).toBeVisible();
		await expect
			.element(screen.getByRole('link', { name: 'Learn about saved places' }))
			.toBeVisible();
		await screen.getByRole('button', { name: 'Find a place' }).click();
		expect(onaction).toHaveBeenCalledTimes(1);
		const wrapper = section.element();
		expect(wrapper.classList.contains('custom-empty-state')).toBe(true);
		expect(wrapper.style.width).toBe('402px');
		expect(wrapper.querySelector('svg').getAttribute('aria-hidden')).toBe('true');
		expect(
			Array.from(
				wrapper.querySelector('.empty-state-content').children,
				(element) => element.classList[0]
			)
		).toEqual([
			'empty-state-illustration',
			'empty-state-message',
			'empty-state-details',
			'empty-state-action'
		]);
	});

	it('expands for long text in narrow containers and larger type without clipping', async () => {
		const title = 'No saved places in this collection yet';
		const description =
			'Add a place with a long name such as ExamplePlaceWithoutSpacesToExerciseWrapping and find it here later.';
		const originalFontSize = document.documentElement.style.fontSize;
		document.documentElement.style.fontSize = '32px';
		try {
			const screen = render(EmptyState, { title, description, style: 'width: 220px;' });
			await expect.element(screen.getByRole('heading', { name: title })).toBeVisible();
			const section = screen.container.querySelector('section');
			const message = section.querySelector('.empty-state-message');
			expect(section.scrollWidth).toBeLessThanOrEqual(section.clientWidth);
			expect(message.scrollWidth).toBeLessThanOrEqual(message.clientWidth);
			expect(section.getBoundingClientRect().height).toBeGreaterThan(200);
			expect(getComputedStyle(section).overflowY).toBe('visible');
		} finally {
			document.documentElement.style.fontSize = originalFontSize;
		}
	});

	it('uses solid primary text for the description when increased contrast is requested', async () => {
		await cdp().send('Emulation.setEmulatedMedia', {
			features: [{ name: 'prefers-contrast', value: 'more' }]
		});
		const screen = render(EmptyState, {
			title: 'No messages',
			description: 'Start a conversation.'
		});
		const title = screen.container.querySelector('.empty-state-title');
		const description = screen.container.querySelector('.empty-state-description');
		// Normalize CSS Color 4 and legacy rgb() serializations to sRGB pixel values.
		const context = document.createElement('canvas').getContext('2d');
		const rgba = (element) => {
			context.clearRect(0, 0, 1, 1);
			context.fillStyle = getComputedStyle(element).color;
			context.fillRect(0, 0, 1, 1);
			return Array.from(context.getImageData(0, 0, 1, 1).data);
		};
		expect(rgba(description)).toEqual(rgba(title));
		expect(rgba(description)[3]).toBe(255);
	});
});
