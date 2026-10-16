import { createHash } from 'node:crypto';
import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

export const sourceRoot = fileURLToPath(new URL('../../', import.meta.url));
export const digest = (value) => createHash('sha256').update(value).digest('hex');
export const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
export const file = (name, content, kind) => ({
	path: name,
	kind,
	sha256: digest(content),
	content
});
export const requirements = { svelte: '>=5.20.0', materialSymbols: false, svgFilter: false };

export async function sandbox(t) {
	const temporary =
		process.platform === 'win32'
			? path.join(os.homedir(), 'AppData/Local/Temp/opencode')
			: os.tmpdir();
	const root = await fs.mkdtemp(path.join(temporary, 'brodynelly cli test '));
	t.after(() => fs.rm(root, { recursive: true, force: true }));
	return root;
}

export async function catalog(root, { count = 83 } = {}) {
	const registry = path.join(root, 'registry');
	await fs.mkdir(path.join(registry, 'items'), { recursive: true });
	const helper = file('shared/value.js', 'export const value = 1;\n', 'module');
	const items = [
		{ name: 'alpha', exportName: 'Alpha', entry: 'controls/Alpha.svelte' },
		{ name: 'beta', exportName: 'Beta', entry: 'display/Beta.svelte' },
		{ name: 'version-26-button', exportName: 'Version26Button', entry: 'v26/Button.svelte' }
	];
	for (let i = items.length; i < count; i++) {
		items.push({
			name: `widget-${String(i).padStart(3, '0')}`,
			exportName: `Widget${i}`,
			entry: `widgets/Widget${i}.svelte`
		});
	}
	items.sort((a, b) => a.name.localeCompare(b.name, 'en'));
	const base = {
		schemaVersion: 1,
		type: 'base',
		name: 'base',
		version: '0.1.0',
		exportName: null,
		entry: null,
		requirements: { ...requirements },
		files: [
			file('styles.css', ':root { --example: 1; }\n', 'style'),
			file('LICENSE', 'Synthetic MIT fixture license\n', 'license'),
			file('NOTICE.md', 'Synthetic fixture notice\n', 'notice')
		]
	};
	const index = {
		schemaVersion: 1,
		name: 'brodynelly-ui',
		version: '0.1.0',
		sourceFingerprint: digest('synthetic fixture only'),
		base: { payload: 'base.json', sha256: digest(json(base)) },
		items: []
	};
	await fs.writeFile(path.join(registry, 'base.json'), json(base));
	for (const item of items) {
		const entry = file(
			item.entry,
			"<script>\n  import { value } from '../shared/value.js';\n</script>\n<span>{value}</span>\n",
			'component'
		);
		const payload = {
			schemaVersion: 1,
			type: 'component',
			...item,
			version: '0.1.0',
			requirements: { ...requirements },
			files: [entry, helper]
		};
		const relative = `items/${item.name}.json`;
		await fs.writeFile(path.join(registry, relative), json(payload));
		index.items.push({ ...item, payload: relative, sha256: digest(json(payload)) });
	}
	await fs.writeFile(path.join(registry, 'index.json'), json(index));
	return registry;
}

export async function bundle(root) {
	const product = path.join(root, 'packed product');
	await fs.mkdir(product, { recursive: true });
	for (const name of ['bin', 'cli'])
		await fs.cp(path.join(sourceRoot, name), path.join(product, name), { recursive: true });
	await catalog(product);
	return product;
}

export function cli(product, cwd, ...args) {
	return spawnSync(process.execPath, [path.join(product, 'bin/brodynelly-ui.mjs'), ...args], {
		cwd,
		encoding: 'utf8',
		timeout: 15000,
		windowsHide: true
	});
}

export async function consumer(root) {
	const cwd = path.join(root, 'consumer with spaces');
	await fs.mkdir(cwd, { recursive: true });
	return cwd;
}

export async function snapshot(root) {
	const result = {};
	async function walk(dir, prefix = '') {
		for (const name of (await fs.readdir(dir)).sort()) {
			const relative = prefix ? `${prefix}/${name}` : name;
			const full = path.join(dir, name);
			const stat = await fs.lstat(full);
			if (stat.isSymbolicLink()) result[relative] = `link:${await fs.readlink(full)}`;
			else if (stat.isDirectory()) {
				result[`${relative}/`] = 'directory';
				await walk(full, relative);
			} else result[relative] = (await fs.readFile(full)).toString('base64');
		}
	}
	await walk(root);
	return result;
}

export async function mutatePayload(registry, name, change) {
	const index = JSON.parse(await fs.readFile(path.join(registry, 'index.json'), 'utf8'));
	const descriptor = name === 'base' ? index.base : index.items.find((item) => item.name === name);
	const payload = JSON.parse(await fs.readFile(path.join(registry, descriptor.payload), 'utf8'));
	await change(payload, index);
	const bytes = json(payload);
	descriptor.sha256 = digest(bytes);
	await fs.writeFile(path.join(registry, descriptor.payload), bytes);
	await fs.writeFile(path.join(registry, 'index.json'), json(index));
}
