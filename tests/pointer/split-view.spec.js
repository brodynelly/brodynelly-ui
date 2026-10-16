import { resolve } from 'node:path';
import { build } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { chromium } from 'playwright';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

// The same real component is bundled as a client, with no runner iframe, viewport
// scaling, mocked capture, synthetic PointerEvents, or production-code hooks.
let browser;
let context;
let page;
let outputs;
const ratio = () => page.getByTestId('ratio').evaluate((node) => Number(node.textContent));
const captured = () =>
	page.evaluate(() => window.pointerTarget.hasPointerCapture(window.primaryPointer));
const dragging = () => page.locator('.apple-split-view').getAttribute('data-dragging');

async function ready(dir = 'ltr') {
	await page.setContent(`<!doctype html><html dir="${dir}"><body></body></html>`);
	for (const output of outputs) {
		if (output.type === 'asset' && output.fileName.endsWith('.css')) {
			await page.addStyleTag({ content: String(output.source) });
		}
	}
	for (const output of outputs) {
		if (output.type === 'chunk' && output.isEntry) {
			await page.addScriptTag({ content: output.code });
		}
	}
	await page.getByRole('separator').waitFor();
	await page.evaluate(() => {
		window.pointerTarget = document.querySelector('[role="separator"]');
		window.pointerEvents = [];
		for (const type of [
			'pointerdown',
			'pointermove',
			'pointercancel',
			'gotpointercapture',
			'lostpointercapture'
		]) {
			document.addEventListener(type, (event) => {
				if (type === 'pointerdown' && event.isPrimary) window.primaryPointer = event.pointerId;
				window.pointerEvents.push({
					type,
					trusted: event.isTrusted,
					id: event.pointerId,
					primary: event.isPrimary
				});
			});
		}
	});
}

async function start(offset = 0) {
	const box = await page.getByRole('separator').boundingBox();
	const point = { x: box.x + box.width / 2 + offset, y: box.y + 20 };
	await page.mouse.move(point.x, point.y);
	await page.mouse.down();
	await expect.poll(dragging).toBe('true');
	await expect.poll(captured).toBe(true);
	return point;
}

beforeAll(async () => {
	const bundle = await build({
		configFile: false,
		root: process.cwd(),
		plugins: [svelte()],
		logLevel: 'error',
		build: {
			write: false,
			minify: false,
			lib: { entry: resolve('tests/pointer/entry.js'), name: 'SplitViewPointer', formats: ['iife'] }
		}
	});
	outputs = (Array.isArray(bundle) ? bundle : [bundle]).flatMap((result) => result.output);
	browser = await chromium.launch({
		headless: true,
		...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
			? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
			: {})
	});
});

beforeEach(async () => {
	context = await browser.newContext({ viewport: { width: 1100, height: 900 }, hasTouch: true });
	page = await context.newPage();
});
afterEach(async () => {
	await context?.close();
});
afterAll(async () => {
	await browser?.close();
});

describe('SplitView standalone native pointer regressions', () => {
	it('tracks a captured pointer outside the root 1:1, preserves grab offset, and stops without inertia', async () => {
		await ready();
		const point = await start(12);
		expect(await ratio()).toBeCloseTo(4 / 9, 8);
		const end = { x: point.x + 72, y: point.y + 410 };
		const root = await page.locator('.apple-split-view').boundingBox();
		expect(end.y).toBeGreaterThan(root.y + root.height);
		await page.mouse.move(end.x, end.y, { steps: 3 });
		await expect.poll(ratio).toBeCloseTo(4 / 9 + 0.1, 8);
		expect(await captured()).toBe(true);
		await page.mouse.up();
		await expect.poll(dragging).toBe('false');
		await expect.poll(captured).toBe(false);
		await page.mouse.move(end.x + 100, end.y);
		await page.waitForTimeout(150);
		expect(await ratio()).toBeCloseTo(4 / 9 + 0.1, 8);
		expect(await page.evaluate(() => window.pointerEvents.every((event) => event.trusted))).toBe(
			true
		);
	});

	it('cancels with real Escape and native touch pointercancel, ignoring a second native pointer', async () => {
		await ready();
		const point = await start();
		await page.mouse.move(point.x + 72, point.y);
		await expect.poll(ratio).toBeCloseTo(4 / 9 + 0.1, 8);
		await page.keyboard.press('Escape');
		await expect.poll(ratio).toBeCloseTo(4 / 9, 8);
		expect(await dragging()).toBe('false');
		await page.mouse.up();
		expect(await captured()).toBe(false);
		const cdp = await context.newCDPSession(page);
		const primary = { x: point.x, y: point.y, id: 0 };
		await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [primary] });
		await expect.poll(dragging).toBe('true');
		primary.x += 72;
		await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [primary] });
		await expect.poll(ratio).toBeCloseTo(4 / 9 + 0.1, 8);
		expect(await captured()).toBe(true);
		const secondary = { x: primary.x + 8, y: primary.y + 20, id: 1 };
		await cdp.send('Input.dispatchTouchEvent', {
			type: 'touchStart',
			touchPoints: [primary, secondary]
		});
		secondary.x += 100;
		await cdp.send('Input.dispatchTouchEvent', {
			type: 'touchMove',
			touchPoints: [primary, secondary]
		});
		// Observe native delivery before asserting the secondary move left the ratio unchanged.
		await expect
			.poll(() =>
				page.evaluate(() =>
					window.pointerEvents.some(
						(event) => event.type === 'pointermove' && !event.primary && event.trusted
					)
				)
			)
			.toBe(true);
		expect(await ratio()).toBeCloseTo(4 / 9 + 0.1, 8);
		await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
		await expect.poll(ratio).toBeCloseTo(4 / 9, 8);
		expect(await dragging()).toBe('false');
		expect(await captured()).toBe(false);
		expect(
			await page.evaluate(() =>
				window.pointerEvents.some((event) => event.type === 'pointercancel' && event.trusted)
			)
		).toBe(true);
	});

	it('releases capture on actual Svelte unmount and leaves the bound ratio immutable after further moves', async () => {
		await ready();
		const point = await start();
		await page.mouse.move(point.x + 72, point.y);
		await expect.poll(ratio).toBeCloseTo(4 / 9 + 0.1, 8);
		const lastRatio = await ratio();
		await page.getByRole('button', { name: 'Hide split view' }).focus();
		await page.keyboard.press('Space');
		await page.getByRole('button', { name: 'Show split view' }).waitFor();
		expect(await page.evaluate(() => window.pointerTarget.isConnected)).toBe(false);
		expect(await captured()).toBe(false);
		await page.mouse.move(point.x + 144, point.y);
		await page.mouse.up();
		await page.mouse.move(point.x + 180, point.y);
		await page.waitForTimeout(150);
		expect(await ratio()).toBe(lastRatio);
		expect(await page.locator('.apple-split-view').count()).toBe(0);
	});

	it('keeps RTL keyboard direction, physical pane order, and native pointer movement', async () => {
		await ready('rtl');
		await page.getByRole('separator').focus();
		await page.keyboard.press('ArrowLeft');
		await expect.poll(ratio).toBeCloseTo(4 / 9 + 0.01, 8);
		const sidebar = await page.locator('.apple-split-view__sidebar').boundingBox();
		const content = await page.locator('.apple-split-view__content').boundingBox();
		expect(sidebar.x).toBeGreaterThan(content.x);
		const point = await start();
		await page.mouse.move(point.x - 72, point.y);
		await expect.poll(ratio).toBeCloseTo(4 / 9 + 0.11, 8);
		await page.mouse.up();
		expect(await captured()).toBe(false);
	});
});
