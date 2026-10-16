import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { sandbox, catalog, digest, snapshot } from './fixture.mjs';

test('native fixture baseline: exact payload/content hashes and complete 83-item catalog', async (t) => {
	const root = await sandbox(t);
	const registry = await catalog(root);
	const index = JSON.parse(await fs.readFile(path.join(registry, 'index.json'), 'utf8'));
	assert.equal(index.items.length, 83);
	for (const descriptor of [index.base, ...index.items]) {
		const bytes = await fs.readFile(path.join(registry, descriptor.payload));
		assert.equal(digest(bytes), descriptor.sha256);
		for (const file of JSON.parse(bytes).files) assert.equal(digest(file.content), file.sha256);
	}
});

test('native filesystem baseline: hardlink no-clobber and atomic regular-file replacement', async (t) => {
	const root = await sandbox(t);
	const stage = path.join(root, 'stage');
	const target = path.join(root, 'target');
	await fs.writeFile(stage, 'new', { flag: 'wx' });
	await fs.writeFile(target, 'old', { flag: 'wx' });
	await assert.rejects(fs.link(stage, target), { code: 'EEXIST' });
	assert.equal(await fs.readFile(target, 'utf8'), 'old');
	await fs.rename(stage, target);
	assert.equal(await fs.readFile(target, 'utf8'), 'new');
});

test('native filesystem baseline: junction is detectable and snapshots do not traverse it', async (t) => {
	const root = await sandbox(t);
	const outside = path.join(root, 'outside');
	const target = path.join(root, 'consumer');
	await fs.mkdir(outside);
	await fs.mkdir(target);
	await fs.writeFile(path.join(outside, 'sentinel'), 'do not modify');
	await fs.symlink(
		outside,
		path.join(target, 'linked'),
		process.platform === 'win32' ? 'junction' : 'dir'
	);
	assert.equal((await fs.lstat(path.join(target, 'linked'))).isSymbolicLink(), true);
	assert.deepEqual(Object.keys(await snapshot(target)), ['linked']);
	assert.equal(await fs.readFile(path.join(outside, 'sentinel'), 'utf8'), 'do not modify');
});
