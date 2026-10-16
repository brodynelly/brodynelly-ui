import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { sandbox, bundle, cli, consumer, snapshot } from './fixture.mjs';

const ui = 'src/lib/components/ui';
const read = (cwd, name) => fs.readFile(path.join(cwd, name), 'utf8');
function passed(result) {
	assert.equal(result.error, undefined);
	assert.equal(result.status, 0, result.stderr || result.stdout);
	return result;
}
function refused(result, match) {
	assert.equal(result.status, 1, result.stderr);
	if (match) assert.match(result.stderr, match);
	return result;
}
async function setup(t) {
	const root = await sandbox(t);
	return { root, product: await bundle(root), cwd: await consumer(root) };
}

test('standalone packed-layout bin from spaces: help, list, JSON, bundled registry not consumer registry', async (t) => {
	const { product, cwd } = await setup(t);
	await fs.mkdir(path.join(cwd, 'registry'));
	await fs.writeFile(path.join(cwd, 'registry/index.json'), 'not our registry');
	const before = await snapshot(cwd);
	assert.match(passed(cli(product, cwd, '--help')).stdout, /Node.js >=20.19.0/);
	assert.match(
		passed(cli(product, cwd, 'list')).stdout,
		/version-26-button\tVersion26Button\tv26\/Button.svelte/
	);
	const items = JSON.parse(passed(cli(product, cwd, 'list', '--json')).stdout);
	assert.equal(items.length, 83);
	assert.deepEqual(
		items.map((item) => item.name),
		items.map((item) => item.name).sort()
	);
	assert.equal(items[0].requirements.svelte, '>=5.20.0');
	assert.deepEqual(await snapshot(cwd), before);
	assert.deepEqual((await fs.readdir(product)).sort(), ['bin', 'cli', 'registry']);
});

test('init creates only local base/config; direct styles guidance and no app/package edits', async (t) => {
	const { product, cwd } = await setup(t);
	await fs.writeFile(path.join(cwd, 'package.json'), '{"private":true}\n');
	await fs.writeFile(path.join(cwd, '+layout.svelte'), 'consumer-owned layout');
	const result = passed(cli(product, cwd, 'init'));
	assert.deepEqual(JSON.parse(await read(cwd, '.brodynelly-ui.json')), {
		schemaVersion: 1,
		directory: ui
	});
	assert.equal(await read(cwd, `${ui}/LICENSE`), 'Synthetic MIT fixture license\n');
	assert.equal(await read(cwd, `${ui}/NOTICE.md`), 'Synthetic fixture notice\n');
	assert.match(
		result.stdout,
		/Manual, one-time LOCAL stylesheet import: import "\.\/src\/lib\/components\/ui\/styles.css"/
	);
	assert.equal(await read(cwd, 'package.json'), '{"private":true}\n');
	assert.equal(await read(cwd, '+layout.svelte'), 'consumer-owned layout');
	assert.equal(Object.keys(await snapshot(cwd)).filter((name) => !name.endsWith('/')).length, 6);
});

test('add multiple copies full deduplicated closures, base, no global barrel, no implicit config', async (t) => {
	const { product, cwd } = await setup(t);
	const result = passed(cli(product, cwd, 'add', 'alpha', 'beta'));
	assert.match(await read(cwd, `${ui}/controls/Alpha.svelte`), /\.\.\/shared\/value.js/);
	assert.match(await read(cwd, `${ui}/display/Beta.svelte`), /\.\.\/shared\/value.js/);
	assert.equal(await read(cwd, `${ui}/shared/value.js`), 'export const value = 1;\n');
	const files = await snapshot(cwd);
	assert.equal(Object.keys(files).filter((name) => !name.endsWith('/')).length, 6);
	assert.equal(files['.brodynelly-ui.json'], undefined);
	assert.equal(files[`${ui}/index.js`], undefined);
	assert.match(
		result.stdout,
		/import Alpha from "\.\/src\/lib\/components\/ui\/controls\/Alpha.svelte"/
	);
	assert.doesNotMatch(result.stdout, /from ['"]brodynelly-ui/);
});

test('--all installs all 83 entries with one helper and complete base', async (t) => {
	const { product, cwd } = await setup(t);
	passed(cli(product, cwd, 'add', '--all'));
	const files = Object.keys(await snapshot(cwd)).filter((name) => !name.endsWith('/'));
	assert.equal(files.filter((name) => name.endsWith('.svelte')).length, 83);
	assert.equal(files.length, 87);
	assert.equal(files.filter((name) => name.endsWith('/shared/value.js')).length, 1);
});

test('--cwd and --dir with spaces affect only chosen consumer; saved directory is respected', async (t) => {
	const { root, product, cwd } = await setup(t);
	const caller = path.join(root, 'different caller');
	await fs.mkdir(caller);
	passed(cli(product, caller, 'init', '--cwd', cwd, '--dir', 'local source/ui'));
	passed(cli(product, caller, 'add', 'version-26-button', '--cwd', cwd));
	assert.match(await read(cwd, 'local source/ui/v26/Button.svelte'), /<span>/);
	assert.deepEqual(await snapshot(caller), {});
	assert.equal(JSON.parse(await read(cwd, '.brodynelly-ui.json')).directory, 'local source/ui');
});

test('directory/config disagreement is refused; only init --overwrite may change it', async (t) => {
	const { product, cwd } = await setup(t);
	passed(cli(product, cwd, 'init', '--dir', 'first/ui'));
	const before = await snapshot(cwd);
	for (const args of [
		['init'],
		['add', 'alpha'],
		['add', 'alpha', '--overwrite'],
		['add', 'alpha', '--keep-existing']
	]) {
		refused(cli(product, cwd, ...args, '--dir', 'second/ui'), /Directory disagrees/);
		assert.deepEqual(await snapshot(cwd), before);
	}
	passed(cli(product, cwd, 'init', '--dir', 'second/ui', '--overwrite'));
	assert.equal(JSON.parse(await read(cwd, '.brodynelly-ui.json')).directory, 'second/ui');
	assert.equal(await read(cwd, 'first/ui/styles.css'), ':root { --example: 1; }\n');
	passed(cli(product, cwd, 'add', 'alpha'));
	assert.match(await read(cwd, 'second/ui/controls/Alpha.svelte'), /<span>/);
});

test('identical init/add skip every target without rewriting inode/mtime', async (t) => {
	const { product, cwd } = await setup(t);
	passed(cli(product, cwd, 'init'));
	passed(cli(product, cwd, 'add', 'alpha'));
	const names = Object.keys(await snapshot(cwd)).filter((name) => !name.endsWith('/'));
	const before = await Promise.all(
		names.map((name) => fs.stat(path.join(cwd, name), { bigint: true }))
	);
	assert.match(passed(cli(product, cwd, 'init')).stdout, /identical: 4/);
	assert.match(passed(cli(product, cwd, 'add', 'alpha')).stdout, /identical: 5/);
	const after = await Promise.all(
		names.map((name) => fs.stat(path.join(cwd, name), { bigint: true }))
	);
	for (let i = 0; i < before.length; i++) {
		assert.equal(after[i].ino, before[i].ino);
		assert.equal(after[i].mtimeNs, before[i].mtimeNs);
	}
});

for (const edited of ['controls/Alpha.svelte', 'shared/value.js', 'styles.css']) {
	test(`whole-plan default refusal preserves edited ${edited} and adds no beta`, async (t) => {
		const { product, cwd } = await setup(t);
		passed(cli(product, cwd, 'add', 'alpha'));
		await fs.writeFile(path.join(cwd, ui, edited), `customized ${edited}\n`);
		const before = await snapshot(cwd);
		refused(
			cli(product, cwd, 'add', 'alpha', 'beta'),
			/Conflicting edited files; no files written/
		);
		assert.deepEqual(await snapshot(cwd), before);
	});
}

test('--keep-existing preserves all customized source/helper/CSS and warns, but adds missing files', async (t) => {
	const { product, cwd } = await setup(t);
	passed(cli(product, cwd, 'add', 'alpha'));
	for (const name of [
		'controls/Alpha.svelte',
		'shared/value.js',
		'styles.css',
		'LICENSE',
		'NOTICE.md'
	])
		await fs.writeFile(path.join(cwd, ui, name), `custom ${name}`);
	const result = passed(cli(product, cwd, 'add', 'alpha', 'beta', '--keep-existing'));
	for (const name of [
		'controls/Alpha.svelte',
		'shared/value.js',
		'styles.css',
		'LICENSE',
		'NOTICE.md'
	])
		assert.equal(await read(cwd, `${ui}/${name}`), `custom ${name}`);
	assert.match(await read(cwd, `${ui}/display/Beta.svelte`), /<span>/);
	assert.match(result.stderr, /Compatibility.*customizations are your responsibility/);
});

test('--overwrite changes only planned regular files, leaving unrelated consumer files', async (t) => {
	const { product, cwd } = await setup(t);
	passed(cli(product, cwd, 'add', 'alpha'));
	for (const name of ['controls/Alpha.svelte', 'shared/value.js', 'styles.css'])
		await fs.writeFile(path.join(cwd, ui, name), 'edited');
	await fs.writeFile(path.join(cwd, ui, 'mine.js'), 'do not touch');
	assert.match(
		passed(cli(product, cwd, 'add', 'alpha', 'beta', '--overwrite')).stdout,
		/replace: 3/
	);
	assert.equal(await read(cwd, `${ui}/shared/value.js`), 'export const value = 1;\n');
	assert.equal(await read(cwd, `${ui}/styles.css`), ':root { --example: 1; }\n');
	assert.equal(await read(cwd, `${ui}/mine.js`), 'do not touch');
});

test('dry-run init/add/overwrite/keep-existing performs zero target writes, including no lock/dirs', async (t) => {
	const { product, cwd } = await setup(t);
	for (const args of [['init'], ['add', 'alpha', 'beta'], ['add', '--all']]) {
		assert.match(passed(cli(product, cwd, ...args, '--dry-run')).stdout, /zero target writes/);
		assert.deepEqual(await snapshot(cwd), {});
	}
	passed(cli(product, cwd, 'add', 'alpha'));
	await fs.writeFile(path.join(cwd, ui, 'styles.css'), 'custom CSS');
	const before = await snapshot(cwd);
	refused(cli(product, cwd, 'add', 'alpha', 'beta', '--dry-run'), /Conflicting edited/);
	for (const flag of ['--overwrite', '--keep-existing']) {
		passed(cli(product, cwd, 'add', 'alpha', 'beta', '--dry-run', flag));
		assert.deepEqual(await snapshot(cwd), before);
	}
});

test('unknown commands/items/options, contradictory flags and missing values fail without writes', async (t) => {
	const { product, cwd } = await setup(t);
	for (const args of [
		['run'],
		['list', '--cwd', cwd],
		['list', 'alpha'],
		['list', '--json', '--json'],
		['init', '--keep-existing'],
		['init', 'alpha'],
		['init', '--cwd'],
		['init', '--dir', '--dry-run'],
		['add'],
		['add', 'no-such-item'],
		['add', '--all', 'no-such-item'],
		['add', 'alpha', 'alpha'],
		['add', 'alpha', '--overwrite', '--keep-existing'],
		['add', 'alpha', '--execute'],
		['add', 'alpha', '--json']
	]) {
		refused(cli(product, cwd, ...args));
		assert.deepEqual(await snapshot(cwd), {});
	}
});

test('JSON config is data only: malformed/ambiguous/invalid config refuses without executing JS', async (t) => {
	const { product, cwd } = await setup(t);
	await fs.writeFile(
		path.join(cwd, 'brodynelly.config.mjs'),
		'throw new Error("MUST NOT EXECUTE");'
	);
	for (const contents of [
		'export default {}',
		'{"schemaVersion":1,"schemaVersion":1,"directory":"ui"}',
		'{"schemaVersion":2,"directory":"ui"}',
		'{"schemaVersion":1,"directory":"../escape"}',
		'{"schemaVersion":1,"directory":"ui","execute":"something"}'
	]) {
		await fs.writeFile(path.join(cwd, '.brodynelly-ui.json'), contents);
		const before = await snapshot(cwd);
		refused(cli(product, cwd, 'add', 'alpha'));
		assert.deepEqual(await snapshot(cwd), before);
	}
	await fs.unlink(path.join(cwd, '.brodynelly-ui.json'));
	passed(cli(product, cwd, 'add', 'alpha'));
	assert.equal(await read(cwd, 'brodynelly.config.mjs'), 'throw new Error("MUST NOT EXECUTE");');
});
