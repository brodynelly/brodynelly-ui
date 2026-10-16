import { spawn, execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { stripVTControlCharacters } from 'node:util';
import { chromium } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import registry from '../../registry/index.json';

let server;
let browser;
let origin;
let output = '';

beforeAll(async () => {
	const reservation = createServer();
	await new Promise((done) => reservation.listen(0, '127.0.0.1', done));
	const port = reservation.address().port;
	await new Promise((done) => reservation.close(done));
	origin = `http://127.0.0.1:${port}`;
	server = spawn(
		process.execPath,
		[
			resolve('node_modules/vite/bin/vite.js'),
			'--host',
			'127.0.0.1',
			'--port',
			String(port),
			'--strictPort'
		],
		{
			cwd: process.cwd(),
			stdio: ['ignore', 'pipe', 'pipe']
		}
	);
	await new Promise((done, fail) => {
		const timeout = setTimeout(
			() => fail(new Error(`Site server did not start: ${output}`)),
			30000
		);
		server.once('error', fail);
		server.once('exit', (code) => {
			clearTimeout(timeout);
			fail(new Error(`Site server exited (${code}): ${output}`));
		});
		server.stderr.on('data', (chunk) => (output += chunk));
		server.stdout.on('data', (chunk) => {
			output += chunk;
			if (stripVTControlCharacters(output).includes(origin)) {
				clearTimeout(timeout);
				done();
			}
		});
	});
	browser = await chromium.launch({
		headless: true,
		...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
			? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
			: {})
	});
}, 60000);

afterAll(async () => {
	await browser?.close();
	server?.kill();
});

describe('source-first routes outside the component runner', () => {
	it('server-renders every catalog entry and supports native browse, selection and navigation with JavaScript off', async () => {
		const context = await browser.newContext({
			javaScriptEnabled: false,
			viewport: { width: 320, height: 900 }
		});
		try {
			const page = await context.newPage();
			await page.goto(origin);
			expect(await page.locator('details').count()).toBe(registry.items.length);
			const sourceNames = await page.locator('summary strong').allTextContents();
			expect(sourceNames.sort()).toEqual(registry.items.map((item) => item.exportName).sort());
			const summary = page.locator('summary').filter({ hasText: /^Switch switch$/ });
			await summary.focus();
			await page.keyboard.press('Enter');
			const details = summary.locator('..');
			expect(await details.getAttribute('open')).not.toBeNull();
			expect(await details.textContent()).toContain('src/lib/components/ui/controls/Switch.svelte');
			const command = details.locator('.component-source > code');
			expect(await command.textContent()).toBe(
				'npx --yes --package=github:brodynelly/brodynelly-ui brodynelly-ui add switch'
			);
			expect(await command.evaluate((node) => getComputedStyle(node).userSelect)).toBe('text');
			await page.getByRole('link', { name: 'Setup', exact: true }).click();
			expect(new URL(page.url()).pathname).toBe('/setup');
			expect(await page.getByRole('heading', { level: 1 }).textContent()).toBe(
				'Local files. A small setup.'
			);
			await page.getByRole('link', { name: 'Windows', exact: true }).click();
			expect(
				await page.locator('.canvas').evaluate((node) => getComputedStyle(node).backgroundColor)
			).toBe('rgb(0, 0, 0)');
		} finally {
			await context.close();
		}
	}, 60000);

	it('keeps real client navigation, clipboard denial, search clear and 200% text reflow usable', async () => {
		const context = await browser.newContext({
			viewport: { width: 320, height: 900 },
			reducedMotion: 'reduce'
		});
		try {
			await context.addInitScript(() => {
				Object.defineProperty(navigator, 'clipboard', {
					configurable: true,
					value: { writeText: () => Promise.reject(new Error('denied')) }
				});
			});
			const page = await context.newPage();
			const errors = [];
			page.on('pageerror', (error) => errors.push(error.message));
			await page.goto(origin);
			const search = page.getByRole('searchbox', { name: 'Find a component' });
			await search.fill('controls/Switch.svelte');
			await expect.poll(() => page.locator('details').count(), { timeout: 10000 }).toBe(1);
			await page.locator('summary').click();
			await page.getByRole('button', { name: 'Copy Switch command', exact: true }).click();
			const manual = page.getByRole('textbox', { name: 'Manual copy: Copy Switch command' });
			await manual.waitFor({ state: 'visible' });
			expect(await manual.inputValue()).toContain('brodynelly-ui add switch');
			await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
			const dimensions = await page
				.locator('.source-site')
				.evaluate((node) => ({ width: node.scrollWidth, viewport: window.innerWidth }));
			expect(dimensions.width).toBeLessThanOrEqual(dimensions.viewport);
			const textareas = await manual.evaluate((node) => ({
				width: node.scrollWidth,
				client: node.clientWidth,
				readonly: node.readOnly
			}));
			expect(textareas.width).toBeLessThanOrEqual(textareas.client + 1);
			expect(textareas.readonly).toBe(true);
			await page.getByRole('button', { name: 'Clear search' }).click();
			expect(await search.evaluate((node) => document.activeElement === node)).toBe(true);
			await page.getByRole('link', { name: 'Setup', exact: true }).click();
			await page.getByRole('heading', { name: 'Local files. A small setup.' }).waitFor();
			await page.getByRole('link', { name: 'Full showcase', exact: true }).click();
			await page
				.getByRole('main')
				.getByRole('heading', { level: 1, name: 'Brodynelly UI', exact: true })
				.waitFor();
			expect(await page.locator('#buttons').count()).toBe(1);
			await page.getByRole('link', { name: 'Interactive components', exact: true }).click();
			await page.getByRole('switch', { name: 'Notifications' }).click();
			expect(await page.getByRole('switch', { name: 'Notifications' }).isChecked()).toBe(false);
			expect(errors).toEqual([]);
		} finally {
			await context.close();
		}
	}, 60000);

	it('preserves every legacy showcase artifact and the Windows layout byte-for-byte outside navigation', async () => {
		const base = '72239201f49f631d16554226362b50c409a8f78e';
		const oldRoot = execFileSync('git', ['show', `${base}:src/routes/+page.svelte`], {
			encoding: 'utf8'
		}).replaceAll('\r\n', '\n');
		const showcase = (await readFile('src/routes/showcase/+page.svelte', 'utf8')).replaceAll(
			'\r\n',
			'\n'
		);
		expect(
			showcase.replace(
				'\t\t<a href={`${base}/`}>Brodynelly UI — source catalog</a>\n\t\t<a href={`${base}/setup`}>Setup</a>\n',
				''
			)
		).toBe(oldRoot);
		const oldWindows = execFileSync('git', ['show', `${base}:src/routes/windows/+page.svelte`], {
			encoding: 'utf8'
		}).replaceAll('\r\n', '\n');
		const windows = (await readFile('src/routes/windows/+page.svelte', 'utf8')).replaceAll(
			'\r\n',
			'\n'
		);
		expect(windows.slice(0, windows.indexOf('<footer>'))).toBe(
			oldWindows.slice(0, oldWindows.indexOf('<footer>'))
		);
		expect(windows.slice(windows.indexOf('</footer>'))).toBe(
			oldWindows.slice(oldWindows.indexOf('</footer>'))
		);
	});
});
