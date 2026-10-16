import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
	appendFileSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	readdirSync,
	rmSync,
	symlinkSync,
	writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { build } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const sha = (content) => createHash('sha256').update(content).digest('hex');

function npm(args, cwd, expected = 0) {
	const windows = process.platform === 'win32';
	const command = `npm.cmd ${args.map((arg) => `"${arg.replaceAll('"', '""')}"`).join(' ')}`;
	const result = spawnSync(
		windows ? 'cmd.exe' : 'npm',
		windows ? ['/d', '/s', '/c', command] : args,
		{
			cwd,
			env: { ...process.env, npm_config_audit: 'false', npm_config_fund: 'false' },
			encoding: 'utf8',
			timeout: 180000,
			windowsVerbatimArguments: windows
		}
	);
	assert.equal(result.status, expected, `${args.join(' ')}\n${result.stderr}\n${result.stdout}`);
	return result.stdout;
}

test(
	'packed CLI installs editable source and all 83 components build without a UI runtime package',
	{ timeout: 240000 },
	async (t) => {
		const temporaryRoot = process.env.BRODYNELLY_TEST_TMP ?? join(tmpdir(), 'opencode');
		mkdirSync(temporaryRoot, { recursive: true });
		const temporary = mkdtempSync(join(temporaryRoot, 'brodynelly-consumer-'));
		let succeeded = false;
		t.after(() => {
			if (succeeded) rmSync(temporary, { recursive: true, force: true });
			else console.error(`Preserved distribution test evidence: ${temporary}`);
		});
		const consumer = join(temporary, 'consumer with spaces');
		const packages = join(temporary, 'packages');
		mkdirSync(consumer);
		mkdirSync(packages);
		const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
		assert.equal(packageJson.private, true);
		assert.deepEqual(packageJson.dependencies ?? {}, {});
		assert.deepEqual(packageJson.peerDependencies ?? {}, {});
		for (const hook of ['build', 'prepare', 'prepack', 'preinstall', 'install', 'postinstall']) {
			assert.equal(
				packageJson.scripts[hook],
				undefined,
				`Git installation must not trigger ${hook}`
			);
		}
		assert.equal(packageJson.workspaces, undefined);
		const manifest = JSON.stringify({
			name: 'copied-source-consumer',
			private: true,
			type: 'module'
		});
		writeFileSync(join(consumer, 'package.json'), manifest);
		const packed = JSON.parse(
			npm(['pack', '--ignore-scripts', '--json', '--pack-destination', packages], root)
		)[0];
		const paths = packed.files.map((file) => file.path);
		assert.ok(paths.includes('bin/brodynelly-ui.mjs'));
		assert.ok(paths.includes('registry/index.json'));
		assert.ok(
			!paths.some((path) =>
				/(?:^|\/)(?:src|node_modules|\.opencode|\.checks|tests)(?:\/|$)/.test(path)
			)
		);
		const command = [
			'exec',
			'--yes',
			'--offline',
			'--cache',
			join(temporary, 'npm cache'),
			'--package',
			join(packages, packed.filename),
			'--',
			'brodynelly-ui'
		];
		const listed = JSON.parse(npm([...command, 'list', '--json'], consumer));
		assert.equal(listed.length, 83);
		npm([...command, 'init'], consumer);
		npm([...command, 'add', 'switch'], consumer);
		const ui = join(consumer, 'src/lib/components/ui');
		const control = join(ui, 'controls/Switch.svelte');
		const styles = join(ui, 'styles.css');
		appendFileSync(control, '\n<!-- Consumer-owned customization -->\n');
		appendFileSync(styles, '\n/* Consumer-owned theme customization */\n');
		const edits = { control: sha(readFileSync(control)), styles: sha(readFileSync(styles)) };
		npm([...command, 'add', 'sheet'], consumer, 1);
		assert.equal(existsSync(join(ui, 'sheet/Sheet.svelte')), false);
		npm([...command, 'add', 'sheet', '--keep-existing'], consumer);
		assert.ok(existsSync(join(ui, 'sheet/sheet-motion.js')));
		assert.ok(existsSync(join(ui, 'sheet/scroll-lock.js')));
		npm([...command, 'add', '--all', '--keep-existing'], consumer);
		assert.equal(sha(readFileSync(control)), edits.control);
		assert.equal(sha(readFileSync(styles)), edits.styles);
		assert.equal(readFileSync(join(consumer, 'package.json'), 'utf8'), manifest);
		assert.equal(existsSync(join(ui, 'index.js')), false);
		let copied = 0;
		function count(directory) {
			for (const entry of readdirSync(directory, { withFileTypes: true })) {
				if (entry.isDirectory()) count(join(directory, entry.name));
				else copied++;
			}
		}
		count(ui);
		assert.equal(copied, 89);
		// Only the test supplies ordinary Svelte/Vite dependencies. The installer does not.
		symlinkSync(
			join(root, 'node_modules'),
			join(consumer, 'node_modules'),
			process.platform === 'win32' ? 'junction' : 'dir'
		);
		const catalog = JSON.parse(readFileSync(join(root, 'registry/index.json'), 'utf8'));
		const imports = catalog.items
			.map(
				(item) =>
					`import ${item.exportName} from ${JSON.stringify(`./src/lib/components/ui/${item.entry}`)};`
			)
			.join('\n');
		writeFileSync(
			join(consumer, 'Consumer.svelte'),
			`<script>
${imports}
import './src/lib/components/ui/styles.css';
let enabled = $state(false);
let open = $state(false);
let action = $state('');
window.copiedComponents = { ${catalog.items.map((item) => item.exportName).join(', ')} };
</script>
<main style="padding: 24px; max-width: 760px;">
<h1>Copied, editable source</h1>
<Switch label="Copied notifications" bind:checked={enabled} />
<output aria-label="Copied preference">{enabled ? 'On' : 'Off'}</output>
<Menu label="Copied actions"><MenuItem label="Use local component" onclick={() => (action = 'Local action received')} /></Menu>
<p role="status" aria-label="Copied action">{action}</p>
<button type="button" onclick={() => (open = true)}>Open copied sheet</button>
<SplitView style="height: 200px; width: 640px;">{#snippet sidebar()}<div style="padding: 12px;"><SearchField label="Copied search" /></div>{/snippet}<p>Content</p></SplitView>
</main>
<Sheet bind:open title="Copied sheet"><button type="button" onclick={() => (open = false)}>Done with copied sheet</button></Sheet>
`
		);
		writeFileSync(
			join(consumer, 'entry.js'),
			`import { mount } from 'svelte';\nimport Consumer from './Consumer.svelte';\nmount(Consumer, { target: document.body });\n`
		);
		const result = await build({
			configFile: false,
			root: consumer,
			cacheDir: join(temporary, 'vite-cache'),
			plugins: [svelte({ configFile: false })],
			build: {
				write: false,
				minify: false,
				lib: { entry: join(consumer, 'entry.js'), name: 'CopiedConsumer', formats: ['iife'] }
			}
		});
		const outputs = (Array.isArray(result) ? result : [result]).flatMap((entry) => entry.output);
		const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
		const channel = executablePath ? undefined : process.env.PLAYWRIGHT_CHANNEL;
		const browser = await chromium.launch({
			headless: true,
			...(executablePath ? { executablePath } : {}),
			...(channel ? { channel } : {})
		});
		try {
			const page = await browser.newPage({
				viewport: { width: 1100, height: 1000 },
				reducedMotion: 'reduce'
			});
			const errors = [];
			page.on('pageerror', (error) => errors.push(error.message));
			await page.setContent('<!doctype html><html><head></head><body></body></html>');
			for (const item of outputs)
				if (item.type === 'asset' && item.fileName.endsWith('.css'))
					await page.addStyleTag({ content: String(item.source) });
			for (const item of outputs)
				if (item.type === 'chunk' && item.isEntry) await page.addScriptTag({ content: item.code });
			await page.getByRole('switch', { name: 'Copied notifications' }).check();
			assert.equal(
				await page.getByRole('status', { name: 'Copied preference' }).textContent(),
				'On'
			);
			await page.getByRole('button', { name: 'Copied actions' }).click();
			await page.getByRole('menuitem', { name: 'Use local component' }).click();
			assert.equal(
				await page.getByRole('status', { name: 'Copied action' }).textContent(),
				'Local action received'
			);
			await page.getByRole('button', { name: 'Open copied sheet' }).click();
			assert.ok(await page.getByRole('dialog', { name: 'Copied sheet' }).isVisible());
			await page.getByRole('button', { name: 'Done with copied sheet' }).click();
			assert.equal(await page.locator('dialog[open]').count(), 0);
			const separator = page.getByRole('separator', { name: 'Resize sidebar' });
			await separator.scrollIntoViewIfNeeded();
			const box = await separator.boundingBox();
			const before = Number(await separator.getAttribute('aria-valuenow'));
			await page.mouse.move(box.x + box.width / 2, box.y + 20);
			await page.mouse.down();
			await page.mouse.move(box.x + box.width / 2 + 64, box.y + 230, { steps: 3 });
			await page.mouse.up();
			await page.waitForFunction(
				(expected) =>
					Number(document.querySelector('[role="separator"]').getAttribute('aria-valuenow')) ===
					expected,
				before + 10
			);
			const session = await page.context().newCDPSession(page);
			for (const appearance of ['light', 'dark']) {
				for (const preference of ['normal', 'solid', 'contrast']) {
					await session.send('Emulation.setEmulatedMedia', {
						features: [
							{ name: 'prefers-color-scheme', value: appearance },
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
					await page.getByRole('button', { name: 'Open copied sheet' }).focus();
					await page.keyboard.press('Tab');
					const measurement = await page
						.getByRole('searchbox', { name: 'Copied search' })
						.evaluate((input) => {
							const ring = getComputedStyle(input.closest('.search-control'));
							const sidebar = getComputedStyle(input.closest('.apple-split-view__sidebar'));
							const canvas = document.createElement('canvas');
							canvas.width = canvas.height = 1;
							const context = canvas.getContext('2d');
							function rgba(color) {
								context.clearRect(0, 0, 1, 1);
								context.fillStyle = color;
								context.fillRect(0, 0, 1, 1);
								return [...context.getImageData(0, 0, 1, 1).data];
							}
							function luminance(color) {
								return color.slice(0, 3).reduce((sum, channel, index) => {
									const value = channel / 255;
									return (
										sum +
										(value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4) *
											[0.2126, 0.7152, 0.0722][index]
									);
								}, 0);
							}
							const ringRgba = rgba(ring.outlineColor);
							const sidebarRgba = rgba(sidebar.backgroundColor);
							const a = luminance(ringRgba),
								b = luminance(sidebarRgba);
							return {
								ring: ring.outlineColor,
								sidebar: sidebar.backgroundColor,
								ringRgba,
								sidebarRgba,
								outlineWidth: ring.outlineWidth,
								outlineStyle: ring.outlineStyle,
								keyboardFocused:
									document.activeElement === input && input.matches(':focus-visible'),
								ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
							};
						});
					assert.equal(measurement.keyboardFocused, true);
					assert.equal(measurement.outlineStyle, 'solid');
					assert.ok(parseFloat(measurement.outlineWidth) >= 2);
					assert.equal(measurement.ringRgba[3], 255);
					assert.equal(measurement.sidebarRgba[3], 255);
					assert.ok(measurement.ratio >= 3, JSON.stringify(measurement));
					console.info(
						'focus-measurement',
						JSON.stringify({ kind: 'copied-consumer', appearance, preference, ...measurement })
					);
				}
			}
			assert.equal(await page.evaluate(() => Object.keys(window.copiedComponents).length), 83);
			assert.deepEqual(errors, []);
		} finally {
			await browser.close();
		}
		succeeded = true;
	}
);
