import { cdp, page, userEvent } from 'vitest/browser';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from 'vitest-browser-svelte';
import Fixture from './Surfaces.test.svelte';

function rgba(color) {
	const context = document.createElement('canvas').getContext('2d');
	context.fillStyle = color;
	context.fillRect(0, 0, 1, 1);
	return Array.from(context.getImageData(0, 0, 1, 1).data);
}

function paint(color, background) {
	const foreground = typeof color === 'string' ? rgba(color) : color;
	return foreground
		.slice(0, 3)
		.map(
			(value, index) =>
				(value * foreground[3]) / 255 + background[index] * (1 - foreground[3] / 255)
		);
}

function background(element) {
	const colors = [];
	for (let node = element; node instanceof Element; node = node.parentElement)
		colors.unshift(getComputedStyle(node).backgroundColor);
	return colors.reduce((surface, color) => paint(color, surface), [255, 255, 255]);
}

function contrast(first, second) {
	const luminance = (color) =>
		color.reduce((sum, value, index) => {
			const srgb = value / 255;
			return (
				sum +
				(srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4) *
					[0.2126, 0.7152, 0.0722][index]
			);
		}, 0);
	const a = luminance(first);
	const b = luminance(second);
	return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function textContrast(element, pseudo) {
	const surface = background(element);
	return contrast(paint(getComputedStyle(element, pseudo).color, surface), surface);
}

async function keyboardFocus(element) {
	element.focus();
	await userEvent.keyboard('{Shift>}{Tab}{/Shift}{Tab}');
	expect(document.activeElement).toBe(element);
	expect(element.matches(':focus-visible')).toBe(true);
}

function focusContrast(ring, surface) {
	const style = getComputedStyle(ring);
	expect(parseFloat(style.outlineWidth)).toBeGreaterThanOrEqual(2);
	expect(style.outlineStyle).toBe('solid');
	return contrast(paint(style.outlineColor, surface), surface);
}

afterEach(async () => {
	await cleanup();
	await cdp().send('Emulation.setEmulatedMedia', { features: [] });
});

describe('library surface roles and normal-state contrast', () => {
	for (const kind of ['window', 'split']) {
		for (const mode of ['light', 'dark']) {
			it.each([false, true])(
				`${kind} composes readable defaults in ${mode} (solid: %s)`,
				async (solid) => {
					await page.viewport(1000, 1000);
					await cdp().send('Emulation.setEmulatedMedia', {
						features: [
							{ name: 'prefers-color-scheme', value: mode },
							{ name: 'prefers-reduced-transparency', value: solid ? 'reduce' : 'no-preference' }
						]
					});
					const screen = await render(Fixture, { kind });
					for (const name of ['Default search', 'Surface search']) {
						const input = page.getByRole('searchbox', { name }).element();
						expect(textContrast(input)).toBeGreaterThanOrEqual(4.5);
						expect(textContrast(input, '::placeholder')).toBeGreaterThanOrEqual(4.5);
					}
					for (const selector of [
						'.window-label',
						'.apple-window-control',
						'.empty-state-title',
						'.empty-state-description',
						'.menu-trigger'
					]) {
						for (const element of screen.container.querySelectorAll(selector))
							expect(textContrast(element)).toBeGreaterThanOrEqual(4.5);
					}
					if (kind === 'split') {
						const separator = page.getByRole('separator').element();
						const grip = rgba(getComputedStyle(separator, '::before').backgroundColor).slice(0, 3);
						for (const pane of screen.container.querySelectorAll(
							'.apple-split-view__sidebar, .apple-split-view__content'
						))
							expect(contrast(grip, background(pane))).toBeGreaterThanOrEqual(3);
					}
					for (const label of ['Default actions', 'Surface actions']) {
						await page.getByRole('button', { name: label }).click();
						const menu = page.getByRole('menu', { name: label }).element();
						const item = menu.querySelector('[role="menuitem"]');
						// Test the near-opaque overlay against both extreme underlying colors.
						for (const beneath of [
							[0, 0, 0],
							[255, 255, 255]
						]) {
							const surface = paint(getComputedStyle(menu).backgroundColor, beneath);
							expect(
								contrast(paint(getComputedStyle(item).color, surface), surface)
							).toBeGreaterThanOrEqual(4.5);
						}
						await userEvent.keyboard('{Escape}');
					}
					await page.getByRole('button', { name: 'Open surface sheet' }).click();
					const dialog = page.getByRole('dialog', { name: 'Surface sheet' }).element();
					await expect.element(dialog).toBeVisible();
					expect(textContrast(dialog.querySelector('header p'))).toBeGreaterThanOrEqual(4.5);
					const overlaySearch = page.getByRole('searchbox', { name: 'Overlay search' }).element();
					expect(textContrast(overlaySearch)).toBeGreaterThanOrEqual(4.5);
					expect(textContrast(overlaySearch, '::placeholder')).toBeGreaterThanOrEqual(4.5);
					expect(
						textContrast(dialog.querySelector('.empty-state-description'))
					).toBeGreaterThanOrEqual(4.5);
					await userEvent.keyboard('{Escape}');
					await expect.poll(() => dialog.open).toBe(false);

					for (const checked of [false, true]) {
						await screen.rerender({ checked, level: checked ? 100 : 0 });
						for (const input of screen.container.querySelectorAll('[role="switch"]')) {
							const track = input.nextElementSibling;
							const thumb = track.firstElementChild;
							const outside = background(track.parentElement);
							const fill = paint(getComputedStyle(track).backgroundColor, outside);
							const edge = rgba(getComputedStyle(track).getPropertyValue('--switch-edge')).slice(
								0,
								3
							);
							expect(contrast(edge, outside)).toBeGreaterThanOrEqual(3);
							expect(
								Math.max(
									contrast(rgba(getComputedStyle(thumb).backgroundColor).slice(0, 3), fill),
									contrast(
										rgba(getComputedStyle(thumb).getPropertyValue('--switch-thumb-edge')).slice(
											0,
											3
										),
										fill
									)
								)
							).toBeGreaterThanOrEqual(3);
							expect(track.getBoundingClientRect().height).toBe(28);
							expect(thumb.getBoundingClientRect().width).toBe(38);
						}
						for (const input of screen.container.querySelectorAll('input[type="range"]')) {
							const styles = getComputedStyle(input);
							const outside = background(input);
							const track = paint(
								styles.getPropertyValue(checked ? '--slider-fill' : '--slider-track'),
								outside
							);
							const edge = rgba(styles.getPropertyValue('--slider-thumb-edge')).slice(0, 3);
							expect(
								Math.max(contrast(edge, track), contrast([255, 255, 255], track))
							).toBeGreaterThanOrEqual(3);
							expect(input.getBoundingClientRect().height).toBe(44);
						}
					}
				}
			);
		}
	}
});

describe('keyboard focus belongs to the actual library surface', () => {
	for (const kind of ['window', 'split']) {
		for (const mode of ['light', 'dark']) {
			it.each(['normal', 'solid', 'contrast'])(
				`${kind} pairs keyboard focus and overlay surfaces in ${mode} (%s)`,
				async (preference) => {
					await page.viewport(1000, 1000);
					await cdp().send('Emulation.setEmulatedMedia', {
						features: [
							{ name: 'prefers-color-scheme', value: mode },
							{ name: 'prefers-reduced-motion', value: 'reduce' },
							{
								name: 'prefers-reduced-transparency',
								value: preference === 'solid' ? 'reduce' : 'no-preference'
							},
							{
								name: 'prefers-contrast',
								value: preference === 'contrast' ? 'more' : 'no-preference'
							}
						]
					});
					const screen = await render(Fixture, { kind });
					const input = page.getByRole('searchbox', { name: 'Surface search' }).element();
					const sidebar = input.closest('.apple-window__sidebar, .apple-split-view__sidebar');
					const surface = background(sidebar);
					await keyboardFocus(input);
					const ring = input.closest('.search-control');
					const ratio = focusContrast(ring, surface);
					expect(ratio).toBeGreaterThanOrEqual(3);
					console.info(
						'focus-measurement',
						JSON.stringify({
							kind,
							mode,
							preference,
							ring: getComputedStyle(ring).outlineColor,
							sidebar: getComputedStyle(sidebar).backgroundColor,
							sidebarRgb: surface,
							ratio,
							keyboardFocused: input.matches(':focus-visible')
						})
					);
					const clear = page.getByRole('button', { name: 'Clear Surface search' }).element();
					await userEvent.keyboard('{Tab}');
					expect(document.activeElement).toBe(clear);
					expect(clear.matches(':focus-visible')).toBe(true);
					expect(focusContrast(clear, background(ring))).toBeGreaterThanOrEqual(3);

					for (const [role, name] of [
						['switch', 'Sidebar switch'],
						['slider', 'Sidebar slider'],
						['button', 'Decrease Sidebar count'],
						['button', 'Increase Sidebar count'],
						['button', 'Sidebar actions']
					]) {
						const control = page.getByRole(role, { name, exact: true }).element();
						await keyboardFocus(control);
						const indicator = role === 'switch' ? control.nextElementSibling : control;
						await expect
							.poll(() => parseFloat(getComputedStyle(indicator).outlineWidth))
							.toBeGreaterThanOrEqual(2);
						expect(focusContrast(indicator, surface)).toBeGreaterThanOrEqual(3);
					}
					await userEvent.keyboard('{Enter}');
					const menu = page.getByRole('menu', { name: 'Sidebar actions' }).element();
					const item = page.getByRole('menuitem', { name: 'Sidebar item' }).element();
					await expect.element(item).toHaveFocus();
					expect(item.matches(':focus-visible')).toBe(true);
					for (const beneath of [
						[0, 0, 0],
						[255, 255, 255]
					]) {
						const menuSurface = paint(getComputedStyle(menu).backgroundColor, beneath);
						const itemSurface = paint(getComputedStyle(item).backgroundColor, menuSurface);
						expect(focusContrast(item, menuSurface)).toBeGreaterThanOrEqual(3);
						expect(focusContrast(item, itemSurface)).toBeGreaterThanOrEqual(3);
					}
					await userEvent.keyboard('{Escape}');

					if (kind === 'split') {
						const separator = page.getByRole('separator').element();
						await keyboardFocus(separator);
						for (const pane of screen.container.querySelectorAll(
							'.apple-split-view__sidebar, .apple-split-view__content'
						))
							expect(focusContrast(separator, background(pane))).toBeGreaterThanOrEqual(3);
					}
					await keyboardFocus(page.getByRole('button', { name: 'Open surface sheet' }).element());
					await userEvent.keyboard('{Enter}');
					const dialog = page.getByRole('dialog', { name: 'Surface sheet' }).element();
					await expect.element(dialog).toBeVisible();
					const overlayInput = page.getByRole('searchbox', { name: 'Overlay search' }).element();
					await keyboardFocus(overlayInput);
					expect(
						focusContrast(overlayInput.closest('.search-control'), background(dialog))
					).toBeGreaterThanOrEqual(3);
					const close = page.getByRole('button', { name: 'Close sheet' }).element();
					await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
					expect(document.activeElement).toBe(close);
					expect(close.matches(':focus-visible')).toBe(true);
					expect(focusContrast(close, background(dialog))).toBeGreaterThanOrEqual(3);
					await userEvent.keyboard('{Escape}');
					await expect.poll(() => dialog.open).toBe(false);
				}
			);
		}
	}
});
