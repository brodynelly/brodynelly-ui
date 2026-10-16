import * as fs from 'node:fs/promises';
import path from 'node:path';
import {
	caseKey,
	isObject,
	parseJSON,
	relativePath,
	requireValue,
	sha256,
	validateInventory
} from './format.mjs';

const hash = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const version = (value) =>
	typeof value === 'string' && /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(value);
const componentName = (value) =>
	typeof value === 'string' && /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value);
const exportName = (value) => typeof value === 'string' && /^[A-Z][A-Za-z0-9]*$/.test(value);

async function readBundled(root, relative) {
	// No catalog-provided arbitrary paths: callers use only the fixed v1 layout.
	let current = root;
	for (const segment of relative.split('/')) {
		current = path.join(current, segment);
		const stat = await fs.lstat(current);
		requireValue(!stat.isSymbolicLink(), 'Bundled registry must not contain symlinks/junctions');
		if (current !== path.join(root, relative))
			requireValue(stat.isDirectory(), 'Invalid registry directory');
		else
			requireValue(stat.isFile() && stat.size <= 32 * 1024 * 1024, 'Invalid registry payload file');
	}
	return fs.readFile(current);
}

function validateRequirements(value, label) {
	requireValue(
		isObject(value) &&
			value.svelte === '>=5.20.0' &&
			typeof value.materialSymbols === 'boolean' &&
			typeof value.svgFilter === 'boolean',
		`${label}: invalid requirements metadata`
	);
}

function validatePayload(payload, descriptor, index, base) {
	const label = base ? 'base' : descriptor.name;
	requireValue(
		isObject(payload) &&
			payload.schemaVersion === 1 &&
			payload.type === (base ? 'base' : 'component') &&
			payload.name === label &&
			payload.version === index.version,
		`${label}: invalid payload identity/schema`
	);
	requireValue(
		payload.exportName === (base ? null : descriptor.exportName) &&
			payload.entry === (base ? null : descriptor.entry),
		`${label}: payload entry/export mismatch`
	);
	validateRequirements(payload.requirements, label);
	requireValue(
		Array.isArray(payload.files) && payload.files.length > 0 && payload.files.length <= 10000,
		`${label}: invalid file inventory`
	);
	const files = new Map();
	const baseKinds = new Map([
		['styles.css', 'style'],
		['LICENSE', 'license'],
		['NOTICE.md', 'notice']
	]);
	for (const file of payload.files) {
		requireValue(isObject(file), `${label}: invalid file record`);
		relativePath(file.path, `${label} file`);
		requireValue(!files.has(file.path), `${label}: duplicate file path`);
		requireValue(
			typeof file.content === 'string' &&
				!file.content.includes('\r') &&
				Buffer.from(file.content, 'utf8').toString('utf8') === file.content &&
				hash(file.sha256) &&
				sha256(Buffer.from(file.content, 'utf8')) === file.sha256,
			`${label}: invalid content/hash`
		);
		if (base)
			requireValue(
				baseKinds.get(file.path) === file.kind,
				`${label}: invalid fixed base file inventory`
			);
		else
			requireValue(
				(file.path.endsWith('.svelte') && file.kind === 'component') ||
					(file.path.endsWith('.js') && file.path !== 'index.js' && file.kind === 'module'),
				`${label}: invalid component/module inventory`
			);
		files.set(file.path, {
			path: file.path,
			kind: file.kind,
			content: file.content,
			sha256: file.sha256
		});
	}
	validateInventory(files.keys(), label);
	if (base) requireValue(files.size === 3, 'base: expected styles.css, LICENSE and NOTICE.md');
	else
		requireValue(
			files.has(descriptor.entry) && files.get(descriptor.entry).kind === 'component',
			`${label}: missing component entry`
		);
	return {
		...descriptor,
		requirements: {
			svelte: payload.requirements.svelte,
			materialSymbols: payload.requirements.materialSymbols,
			svgFilter: payload.requirements.svgFilter
		},
		files
	};
}

export async function loadRegistry(directory) {
	const root = await fs.realpath(directory);
	const index = parseJSON(await readBundled(root, 'index.json'), 'registry index', 4 * 1024 * 1024);
	requireValue(
		isObject(index) &&
			index.schemaVersion === 1 &&
			index.name === 'brodynelly-ui' &&
			version(index.version),
		'Invalid registry index identity/schema'
	);
	requireValue(hash(index.sourceFingerprint), 'Invalid source fingerprint metadata');
	requireValue(
		isObject(index.base) && index.base.payload === 'base.json' && hash(index.base.sha256),
		'Invalid fixed base payload descriptor'
	);
	requireValue(
		Array.isArray(index.items) && index.items.length === 83,
		'Invalid v1 registry item inventory: expected 83 components'
	);
	const names = new Set();
	const exports = new Set();
	const entries = new Set();
	let previous = '';
	for (const item of index.items) {
		requireValue(
			isObject(item) && componentName(item.name) && exportName(item.exportName),
			'Invalid component identity'
		);
		relativePath(item.entry, 'component entry');
		requireValue(
			item.entry.endsWith('.svelte') &&
				item.payload === `items/${item.name}.json` &&
				hash(item.sha256),
			'Invalid component payload/entry descriptor'
		);
		requireValue(
			!names.has(item.name) &&
				!exports.has(caseKey(item.exportName)) &&
				!entries.has(caseKey(item.entry)) &&
				previous < item.name,
			'Duplicate, unsorted or colliding catalog inventory'
		);
		names.add(item.name);
		exports.add(caseKey(item.exportName));
		entries.add(caseKey(item.entry));
		previous = item.name;
	}
	async function payload(descriptor, base) {
		const bytes = await readBundled(root, descriptor.payload);
		requireValue(
			sha256(bytes) === descriptor.sha256,
			`Registry payload hash mismatch: ${base ? 'base' : descriptor.name}`
		);
		return validatePayload(parseJSON(bytes, 'registry payload'), descriptor, index, base);
	}
	const base = await payload(index.base, true);
	const items = new Map();
	const allFiles = new Map(base.files);
	for (const item of index.items) {
		const loaded = await payload(item, false);
		items.set(item.name, loaded);
		for (const [name, file] of loaded.files) {
			const existing = allFiles.get(name);
			requireValue(
				!existing ||
					(existing.sha256 === file.sha256 &&
						existing.content === file.content &&
						existing.kind === file.kind),
				'Inconsistent shared registry file contents'
			);
			allFiles.set(name, file);
		}
	}
	validateInventory(allFiles.keys(), 'complete registry');
	return { version: index.version, sourceFingerprint: index.sourceFingerprint, base, items };
}
