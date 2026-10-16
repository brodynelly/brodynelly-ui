import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, stat, symlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import {
	generateRegistry,
	imports,
	itemName,
	json,
	sha256,
	syncRegistry
} from '../../scripts/registry.mjs';

const product = resolve('.');
const actual = await generateRegistry({ root: product });
const payload = (name) => JSON.parse(actual.artifacts.get(`items/${name}.json`));
const paths = (name) => payload(name).files.map((file) => file.path);

async function fixture(
	files = {},
	exports = "export { default as Example } from './Example.svelte';\n"
) {
	await mkdir('.checks/registry-tests', { recursive: true });
	const root = await mkdtemp(resolve('.checks/registry-tests/case-'));
	for (const [path, content] of Object.entries({
		'package.json': json({ name: 'brodynelly-ui', version: '0.1.0' }),
		LICENSE: 'Synthetic test license\n',
		'NOTICE.md': 'Synthetic notice\n',
		'src/lib/styles.css': ':root { color: black; }\n',
		'src/lib/index.js': exports,
		'src/lib/Example.svelte': '<p>Example</p>\n',
		...files
	})) {
		await mkdir(dirname(join(root, path)), { recursive: true });
		await writeFile(join(root, path), content);
	}
	return root;
}
const generate = (root, expectedCount = 1) => generateRegistry({ root, expectedCount });

async function snapshot(directory) {
	const result = {};
	for (const entry of await readdir(directory, { withFileTypes: true })) {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) {
			for (const [nested, record] of Object.entries(await snapshot(path)))
				result[`${entry.name}/${nested}`] = record;
		} else {
			const info = await stat(path);
			result[entry.name] = { sha256: sha256(await readFile(path)), mtimeMs: info.mtimeMs };
		}
	}
	return result;
}

test('exact 83-item parity with the explicit barrel, including all classic and Version26 exports', async () => {
	const barrel = await readFile('src/lib/index.js', 'utf8');
	const expected = [...barrel.matchAll(/^export \{ default as (\w+) \} from '\.\/(.+)';$/gm)]
		.map(([, exportName, entry]) => ({ exportName, entry }))
		.sort((a, b) => a.exportName.localeCompare(b.exportName));
	assert.equal(expected.length, 83);
	assert.equal(actual.index.items.length, 83);
	assert.deepEqual(
		actual.index.items
			.map(({ exportName, entry }) => ({ exportName, entry }))
			.sort((a, b) => a.exportName.localeCompare(b.exportName)),
		expected
	);
	assert.equal(itemName('Version26Button'), 'version-26-button');
	assert.equal(
		actual.index.items.find((item) => item.exportName === 'Version26Button').name,
		'version-26-button'
	);
	assert.deepEqual(
		actual.index.items.map((item) => item.name),
		actual.index.items.map((item) => item.name).sort()
	);
});

test('complete transitive closures preserve WindowControlPill and Sheet helper imports', () => {
	assert.deepEqual(paths('window-controls'), [
		'window/WindowControlPill.svelte',
		'window/WindowControls.svelte'
	]);
	assert.deepEqual(paths('window-resize-control'), [
		'window/WindowControlPill.svelte',
		'window/WindowResizeControl.svelte'
	]);
	assert.deepEqual(paths('sheet'), [
		'sheet/Sheet.svelte',
		'sheet/scroll-lock.js',
		'sheet/sheet-motion.js'
	]);
	assert.deepEqual(paths('window-choice'), [
		'window-choice/WindowChoice.svelte',
		'window/Window.svelte'
	]);
	assert.deepEqual(paths('switch'), ['controls/Switch.svelte']);
});

test('every delivered local edge exists in that item and all bare runtime edges are Svelte', () => {
	for (const item of actual.index.items) {
		const body = payload(item.name);
		const files = new Set(body.files.map((file) => file.path));
		for (const file of body.files) {
			for (const edge of imports(file.content, file.path)) {
				if (!edge.startsWith('.')) assert.match(edge, /^svelte(?:\/|$)/);
				else {
					const destination = join(dirname(file.path), edge).replaceAll('\\', '/');
					assert.ok(files.has(destination), `${item.name}: missing ${destination}`);
				}
			}
		}
	}
});

test('base contains only shared local styles and original attribution notices with independent digests', async () => {
	const base = JSON.parse(actual.artifacts.get('base.json'));
	assert.equal(base.type, 'base');
	assert.equal(base.entry, null);
	assert.equal(base.exportName, null);
	assert.deepEqual(
		base.files.map(({ path, kind }) => ({ path, kind })),
		[
			{ path: 'LICENSE', kind: 'license' },
			{ path: 'NOTICE.md', kind: 'notice' },
			{ path: 'styles.css', kind: 'style' }
		]
	);
	assert.match(base.files.find((file) => file.path === 'NOTICE.md').content, /Carza-104/);
	assert.equal(
		base.files.find((file) => file.path === 'styles.css').content,
		await readFile('src/lib/styles.css', 'utf8')
	);
	assert.equal(actual.index.base.sha256, sha256(actual.artifacts.get('base.json')));
});

test('all payload/content digests match exact UTF-8 and duplicate closure paths have identical bytes', () => {
	const unique = new Map();
	for (const item of actual.index.items) {
		const raw = actual.artifacts.get(item.payload);
		assert.equal(item.sha256, createHash('sha256').update(raw, 'utf8').digest('hex'));
		assert.equal(raw, json(JSON.parse(raw)));
		for (const file of payload(item.name).files) {
			assert.equal(file.sha256, sha256(file.content));
			assert.ok(!file.content.includes('\r'));
			if (unique.has(file.path)) assert.equal(unique.get(file.path), file.content);
			unique.set(file.path, file.content);
		}
	}
	assert.equal(unique.size, 86); // 83 exports + pill and two Sheet helpers.
});

test('excludes global barrel, test-only MenuSeparator, fixtures, screenshots, demo and private files', () => {
	for (const item of actual.index.items) {
		for (const file of payload(item.name).files) {
			assert.doesNotMatch(
				file.path,
				/index\.js|MenuSeparator|fixtures|__screenshots__|\.(spec|test)\.|routes|private/i
			);
			assert.ok(file.path.endsWith('.svelte') || file.path.endsWith('.js'));
		}
	}
});

test('truthful icon and optional SVG-enhancement flags follow each complete closure', () => {
	assert.equal(payload('button').requirements.materialSymbols, true);
	assert.equal(payload('switch').requirements.materialSymbols, false);
	assert.equal(payload('sheet').requirements.materialSymbols, false);
	assert.equal(payload('version-26-button').requirements.svgFilter, true);
	assert.equal(payload('switch').requirements.svgFilter, false);
	assert.equal(payload('version-26-list-row-toggle-trailing').requirements.svgFilter, true);
	assert.equal(payload('window-choice').requirements.svelte, '>=5.20.0');
});

test('generation is repeatable and cannot mutate production inputs or existing registry', async () => {
	const root = await fixture();
	const first = await generate(root);
	const before = await snapshot(root);
	const second = await generate(root);
	assert.deepEqual(first, second);
	assert.deepEqual(await snapshot(root), before);
});

test('fingerprints and payloads are independent of absolute paths, Git state, mtimes and line endings', async () => {
	const first = await fixture({ 'src/lib/Example.svelte': '<p>Example</p>\r\n' });
	const second = await fixture({ '.git/HEAD': 'different synthetic Git state\n' });
	assert.deepEqual(await generate(first), await generate(second));
});

test('production/base changes change the source fingerprint, unrelated files do not', async () => {
	const root = await fixture();
	const first = await generate(root);
	await writeFile(join(root, 'unrelated.txt'), 'not a registry input');
	assert.equal((await generate(root)).index.sourceFingerprint, first.index.sourceFingerprint);
	await writeFile(join(root, 'src/lib/Example.svelte'), '<p>Changed</p>\n');
	const changed = await generate(root);
	assert.notEqual(changed.index.sourceFingerprint, first.index.sourceFingerprint);
	await writeFile(join(root, 'NOTICE.md'), 'Changed notice\n');
	assert.notEqual((await generate(root)).index.sourceFingerprint, changed.index.sourceFingerprint);
});

test('--check compares all bytes without writes, including stale extra item JSON', async () => {
	const root = await fixture();
	await syncRegistry({ root, expectedCount: 1 });
	const before = await snapshot(root);
	await syncRegistry({ root, expectedCount: 1, check: true });
	assert.deepEqual(await snapshot(root), before);
	await writeFile(join(root, 'registry/items/stale.json'), '{}\n');
	const stale = await snapshot(root);
	await assert.rejects(syncRegistry({ root, expectedCount: 1, check: true }), /stale\.json/);
	assert.deepEqual(await snapshot(root), stale);
});

test('--check refuses missing or edited payloads without touching their bytes/mtime', async () => {
	const root = await fixture();
	await assert.rejects(syncRegistry({ root, expectedCount: 1, check: true }), /out of date/);
	await syncRegistry({ root, expectedCount: 1 });
	await writeFile(join(root, 'registry/items/example.json'), 'edited\r\n');
	const before = await snapshot(root);
	await assert.rejects(syncRegistry({ root, expectedCount: 1, check: true }), /example\.json/);
	assert.deepEqual(await snapshot(root), before);
});

test('normal generation preserves unexpected registry files and refuses before writing', async () => {
	const root = await fixture({ 'registry/keep.txt': 'external work\n' });
	const before = await snapshot(root);
	await assert.rejects(syncRegistry({ root, expectedCount: 1 }), /Unexpected registry file/);
	assert.deepEqual(await snapshot(root), before);
});

test('parses actual imports, not strings/comments/JSDoc, without executing component modules', async () => {
	const root = await fixture({
		'src/lib/Example.svelte': `<script>import './helper.js'; const fake = "import './missing.js'"; /* import './also-missing.js'; */</script><p>{fake}</p>`,
		'src/lib/helper.js': `throw new Error('MUST NOT EXECUTE'); export const value = 1;`
	});
	const result = await generate(root);
	assert.deepEqual(
		JSON.parse(result.artifacts.get('items/example.json')).files.map((file) => file.path),
		['Example.svelte', 'helper.js']
	);
});

test('cycles, re-exports, dynamic literal imports, and shared transitive dependencies deduplicate finitely', async () => {
	const root = await fixture({
		'src/lib/Example.svelte': `<script>import './one.js'; import('./two.js');</script><p>Cycle</p>`,
		'src/lib/one.js': `export { value } from './two.js';`,
		'src/lib/two.js': `import './one.js'; export const value = 1;`
	});
	const result = await generate(root);
	assert.deepEqual(
		JSON.parse(result.artifacts.get('items/example.json')).files.map((file) => file.path),
		['Example.svelte', 'one.js', 'two.js']
	);
});

for (const [description, source, message] of [
	['escaping source root', `import '../../outside.js';`, /Unsafe path/],
	['unresolved edge', `import './missing.js';`, /Unresolved/],
	['npm runtime edge', `import 'not-svelte';`, /Non-Svelte/],
	['absolute edge', `import '/outside.js';`, /Non-Svelte/],
	['Windows drive edge', `import 'C:/outside.js';`, /Non-Svelte/],
	['query-bearing edge', `import './helper.js?raw';`, /Unsafe import/],
	['test fixture edge', `import './fixtures/Hidden.svelte';`, /Excluded/],
	['private edge', `import './private/Hidden.svelte';`, /Excluded/],
	['secret edge', `import './secrets/token.js';`, /Excluded/],
	['key-bearing filename', `import './helper.key.js';`, /Excluded/],
	['alternate stream', `import './helper.js:stream';`, /Unsafe import/],
	['reserved Windows filename', `import './CON.js';`, /Unsafe path/],
	['control-bearing path', `import './bad\\u0001.js';`, /Unsafe import/],
	['global barrel edge', `import './index.js';`, /Excluded/],
	['nonliteral import', `const name = './helper.js'; import(name);`, /Nonliteral/],
	['CommonJS require', `require('./helper.js');`, /Unsupported require/]
]) {
	test(`rejects ${description}`, async () => {
		const root = await fixture({
			'src/lib/Example.svelte': `<script>${source}</script><p>Invalid</p>`
		});
		await assert.rejects(generate(root), message);
	});
}

test('rejects generated kebab-name collisions and malformed/partial barrels', async () => {
	const root = await fixture(
		{},
		`export { default as FooBar } from './Example.svelte';\nexport { default as FooBAR } from './Example.svelte';\n`
	);
	await assert.rejects(generate(root, 2), /collision/);
	await writeFile(join(root, 'src/lib/index.js'), `export * from './Example.svelte';\n`);
	await assert.rejects(generate(root), /explicit/);
	await writeFile(
		join(root, 'src/lib/index.js'),
		`export { default as Example } from './Example.svelte';\n`
	);
	await assert.rejects(generateRegistry({ root }), /Expected 83/);
});

test('rejects case-colliding source destinations even on case-insensitive hosts', async () => {
	const root = await fixture({
		'src/lib/Example.svelte': `<script>import './shared.js'; import './SHARED.js';</script><p>Case</p>`,
		'src/lib/SHARED.js': 'export const value = 1;'
	});
	await assert.rejects(generate(root), /Case-colliding/);
});

test('rejects case-colliding directory prefixes with different leaf names', async () => {
	const root = await fixture({
		'src/lib/Example.svelte': `<script>import './Shared/one.js'; import './shared/two.js';</script>`,
		'src/lib/Shared/one.js': 'export const one = 1;',
		'src/lib/shared/two.js': 'export const two = 2;'
	});
	await assert.rejects(generate(root), /Case-colliding/);
});

test('rejects a real source directory symlink/junction and generated registry symlinks', async () => {
	const root = await fixture({
		'outside/helper.js': 'export const value = 1;',
		'src/lib/Example.svelte': `<script>import './linked/helper.js';</script><p>Link</p>`
	});
	await symlink(
		join(root, 'outside'),
		join(root, 'src/lib/linked'),
		process.platform === 'win32' ? 'junction' : 'dir'
	);
	await assert.rejects(generate(root), /Symlink/);
	const outputRoot = await fixture({ 'outside/keep.txt': 'external' });
	await symlink(
		join(outputRoot, 'outside'),
		join(outputRoot, 'registry'),
		process.platform === 'win32' ? 'junction' : 'dir'
	);
	await assert.rejects(syncRegistry({ root: outputRoot, expectedCount: 1 }), /Unsafe registry/);
});

test('a bad dependency cannot partially write registry output', async () => {
	const root = await fixture({
		'src/lib/Example.svelte': `<script>import './missing.js';</script>`
	});
	const before = await snapshot(root);
	await assert.rejects(syncRegistry({ root, expectedCount: 1 }), /Unresolved/);
	assert.deepEqual(await snapshot(root), before);
});
