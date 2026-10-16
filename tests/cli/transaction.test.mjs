import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { sandbox, bundle, cli, consumer, snapshot } from './fixture.mjs';
import { loadRegistry } from '../../cli/registry.mjs';
import { createPlan } from '../../cli/plan.mjs';
import { parseArguments } from '../../cli/arguments.mjs';
import { applyPlan } from '../../cli/transaction.mjs';

const ui = 'src/lib/components/ui';
const injected = () => Object.assign(new Error('injected filesystem failure'), { code: 'EIO' });
async function setup(t) {
	const root = await sandbox(t);
	const product = await bundle(root);
	const cwd = await consumer(root);
	return { root, product, cwd, registry: await loadRegistry(path.join(product, 'registry')) };
}
const planFor = (s, args) => createPlan(s.registry, parseArguments(args, s.cwd));
const recovery = async (cwd) =>
	(await fs.readdir(cwd)).filter((name) => name.startsWith('.brodynelly-ui-recovery-'));

test('injected staging write failure makes no payload changes and removes owned lock/stage', async (t) => {
	const s = await setup(t);
	const plan = await planFor(s, ['init']);
	const before = await snapshot(s.cwd);
	let writes = 0;
	const io = {
		...fs,
		writeFile: async (...args) => {
			if (++writes === 3) throw injected();
			return fs.writeFile(...args);
		}
	};
	await assert.rejects(applyPlan(plan, io), /injected filesystem failure/);
	assert.deepEqual(await snapshot(s.cwd), before);
});

test('injected new-file link failure rolls back earlier creations and owned directories', async (t) => {
	const s = await setup(t);
	const before = await snapshot(s.cwd);
	let links = 0;
	const io = {
		...fs,
		link: async (...args) => {
			if (++links === 3) throw injected();
			return fs.link(...args);
		}
	};
	await assert.rejects(applyPlan(await planFor(s, ['init']), io), /injected filesystem failure/);
	assert.deepEqual(await snapshot(s.cwd), before);
});

test('injected error after a successful no-clobber link still rolls back only our installed inode', async (t) => {
	const s = await setup(t);
	let links = 0;
	const io = {
		...fs,
		link: async (...args) => {
			await fs.link(...args);
			if (++links === 2) throw injected();
		}
	};
	await assert.rejects(
		applyPlan(await planFor(s, ['add', 'alpha']), io),
		/injected filesystem failure/
	);
	assert.deepEqual(await snapshot(s.cwd), {});
});

test('injected replacement rename failure restores original edited source/helper/CSS bytes', async (t) => {
	const s = await setup(t);
	assert.equal(cli(s.product, s.cwd, 'add', 'alpha').status, 0);
	for (const name of ['controls/Alpha.svelte', 'shared/value.js', 'styles.css'])
		await fs.writeFile(path.join(s.cwd, ui, name), `original customized ${name}`);
	const before = await snapshot(s.cwd);
	let renames = 0;
	const io = {
		...fs,
		rename: async (...args) => {
			if (++renames === 2) throw injected();
			return fs.rename(...args);
		}
	};
	await assert.rejects(
		applyPlan(await planFor(s, ['add', 'alpha', '--overwrite']), io),
		/injected filesystem failure/
	);
	assert.deepEqual(await snapshot(s.cwd), before);
});

test('whole-plan late conflict during staging causes zero partial payload/config writes', async (t) => {
	const s = await setup(t);
	let changed = false;
	const io = {
		...fs,
		writeFile: async (...args) => {
			await fs.writeFile(...args);
			if (!changed && path.basename(args[0]) === 'new-2') {
				changed = true;
				await fs.mkdir(path.join(s.cwd, ui), { recursive: true });
				await fs.writeFile(path.join(s.cwd, ui, 'styles.css'), 'late external CSS');
			}
		}
	};
	await assert.rejects(
		applyPlan(await planFor(s, ['init']), io),
		/Concurrent\/stale destination change/
	);
	assert.equal(await fs.readFile(path.join(s.cwd, ui, 'styles.css'), 'utf8'), 'late external CSS');
	const files = Object.keys(await snapshot(s.cwd)).filter((name) => !name.endsWith('/'));
	assert.deepEqual(files, [`${ui}/styles.css`]);
});

test('no-clobber creation preserves a file introduced immediately before link and retains recovery', async (t) => {
	const s = await setup(t);
	let destination;
	const io = {
		...fs,
		link: async (source, target) => {
			if (!destination) {
				destination = target;
				await fs.writeFile(target, 'external winner', { flag: 'wx' });
			}
			return fs.link(source, target);
		}
	};
	await assert.rejects(
		applyPlan(await planFor(s, ['add', 'alpha']), io),
		/Recovery data preserved/
	);
	assert.equal(await fs.readFile(destination, 'utf8'), 'external winner');
	assert.equal((await recovery(s.cwd)).length, 1);
	assert.equal((await fs.lstat(path.join(s.cwd, '.brodynelly-ui.lock'))).isFile(), true);
});

test('rollback never overwrites an external edit to a newly installed replacement; backups retained', async (t) => {
	const s = await setup(t);
	assert.equal(cli(s.product, s.cwd, 'add', 'alpha').status, 0);
	for (const name of ['controls/Alpha.svelte', 'shared/value.js'])
		await fs.writeFile(path.join(s.cwd, ui, name), `old ${name}`);
	let first;
	let renames = 0;
	const io = {
		...fs,
		rename: async (source, target) => {
			if (++renames === 2) {
				await fs.writeFile(first, 'external edit AFTER install');
				throw injected();
			}
			first = target;
			return fs.rename(source, target);
		}
	};
	await assert.rejects(
		applyPlan(await planFor(s, ['add', 'alpha', '--overwrite']), io),
		/External change preserved.*controls\/Alpha.svelte/s
	);
	assert.equal(await fs.readFile(first, 'utf8'), 'external edit AFTER install');
	const [name] = await recovery(s.cwd);
	assert.ok(name);
	const manifest = JSON.parse(await fs.readFile(path.join(s.cwd, name, 'manifest.json'), 'utf8'));
	const record = manifest.files.find((entry) => entry.path.endsWith('controls/Alpha.svelte'));
	assert.equal(
		await fs.readFile(path.join(s.cwd, name, record.backup), 'utf8'),
		'old controls/Alpha.svelte'
	);
	const second = cli(s.product, s.cwd, 'add', 'beta');
	assert.equal(second.status, 1);
	assert.match(second.stderr, /Another installer may be running/);
});

test('rollback rename failure preserves recovery backups and explicit manual-recovery warning', async (t) => {
	const s = await setup(t);
	assert.equal(cli(s.product, s.cwd, 'add', 'alpha').status, 0);
	for (const name of ['controls/Alpha.svelte', 'shared/value.js'])
		await fs.writeFile(path.join(s.cwd, ui, name), `old ${name}`);
	let renames = 0;
	const io = {
		...fs,
		rename: async (...args) => {
			if (++renames >= 2) throw injected();
			return fs.rename(...args);
		}
	};
	await assert.rejects(
		applyPlan(await planFor(s, ['add', 'alpha', '--overwrite']), io),
		/Rollback incomplete.*Recovery data preserved/s
	);
	const [name] = await recovery(s.cwd);
	assert.ok(name);
	assert.equal(
		await fs.readFile(path.join(s.cwd, name, 'old-0'), 'utf8'),
		'old controls/Alpha.svelte'
	);
});

test('actual spawned bin refuses while another native transaction owns the cooperative lock', async (t) => {
	const s = await setup(t);
	let competing;
	const io = {
		...fs,
		writeFile: async (...args) => {
			if (!competing) {
				competing = cli(s.product, s.cwd, 'add', 'beta');
				assert.equal(competing.status, 1);
				assert.match(competing.stderr, /Another installer may be running/);
			}
			return fs.writeFile(...args);
		}
	};
	await applyPlan(await planFor(s, ['add', 'alpha']), io);
	assert.ok(competing);
	assert.equal(
		await fs.readFile(path.join(s.cwd, ui, 'shared/value.js'), 'utf8'),
		'export const value = 1;\n'
	);
	assert.equal((await snapshot(s.cwd))[`${ui}/display/Beta.svelte`], undefined);
	assert.deepEqual(await recovery(s.cwd), []);
	assert.equal(cli(s.product, s.cwd, 'add', 'beta').status, 0);
});

test('ancestor replaced by a junction after planning is rejected without outside writes', async (t) => {
	const s = await setup(t);
	const outside = path.join(s.root, 'outside');
	await fs.mkdir(outside);
	const plan = await planFor(s, ['add', 'alpha']);
	await fs.symlink(
		outside,
		path.join(s.cwd, 'src'),
		process.platform === 'win32' ? 'junction' : 'dir'
	);
	await assert.rejects(applyPlan(plan), /Symlink\/junction/);
	assert.deepEqual(await snapshot(outside), {});
	assert.deepEqual(Object.keys(await snapshot(s.cwd)), ['src']);
});

test('retained config changed after planning refuses add --keep-existing in the old directory', async (t) => {
	const s = await setup(t);
	assert.equal(cli(s.product, s.cwd, 'init', '--dir', 'old/ui').status, 0);
	const plan = await planFor(s, ['add', 'alpha', '--keep-existing']);
	await fs.writeFile(
		path.join(s.cwd, '.brodynelly-ui.json'),
		JSON.stringify({ schemaVersion: 1, directory: 'new/ui' })
	);
	const before = await snapshot(s.cwd);
	await assert.rejects(applyPlan(plan), /Concurrent\/stale destination change/);
	assert.deepEqual(await snapshot(s.cwd), before);
});

test('retained config changed during staging refuses add before any payload writes', async (t) => {
	const s = await setup(t);
	assert.equal(cli(s.product, s.cwd, 'init', '--dir', 'old/ui').status, 0);
	const plan = await planFor(s, ['add', 'alpha', '--keep-existing']);
	let changed = false;
	const io = {
		...fs,
		writeFile: async (...args) => {
			await fs.writeFile(...args);
			if (!changed) {
				changed = true;
				await fs.writeFile(
					path.join(s.cwd, '.brodynelly-ui.json'),
					JSON.stringify({ schemaVersion: 1, directory: 'new/ui' })
				);
			}
		}
	};
	await assert.rejects(applyPlan(plan, io), /Concurrent\/stale destination change/);
	const files = Object.keys(await snapshot(s.cwd)).filter((name) => !name.endsWith('/'));
	assert.deepEqual(files, [
		'.brodynelly-ui.json',
		'old/ui/LICENSE',
		'old/ui/NOTICE.md',
		'old/ui/styles.css'
	]);
	assert.equal(
		JSON.parse(await fs.readFile(path.join(s.cwd, '.brodynelly-ui.json'), 'utf8')).directory,
		'new/ui'
	);
});

test('init rollback preserves an external config edit immediately after its creation', async (t) => {
	const s = await setup(t);
	let edited = false;
	const io = {
		...fs,
		link: async (...args) => {
			await fs.link(...args);
			if (!edited) {
				edited = true;
				await fs.writeFile(
					path.join(s.cwd, '.brodynelly-ui.json'),
					'{"schemaVersion":1,"directory":"external/ui"}'
				);
			}
		}
	};
	await assert.rejects(
		applyPlan(await planFor(s, ['init']), io),
		/External change preserved.*brodynelly-ui.json/s
	);
	assert.equal(
		JSON.parse(await fs.readFile(path.join(s.cwd, '.brodynelly-ui.json'), 'utf8')).directory,
		'external/ui'
	);
	assert.equal((await snapshot(s.cwd))[`${ui}/styles.css`], undefined);
	assert.equal((await recovery(s.cwd)).length, 1);
});

test('installer lock tampering during staging stops before payload changes and preserves foreign lock', async (t) => {
	const s = await setup(t);
	let changed = false;
	const io = {
		...fs,
		writeFile: async (...args) => {
			await fs.writeFile(...args);
			if (!changed) {
				changed = true;
				await fs.writeFile(path.join(s.cwd, '.brodynelly-ui.lock'), 'foreign lock edit');
			}
		}
	};
	await assert.rejects(applyPlan(await planFor(s, ['add', 'alpha']), io), /Installer lock changed/);
	assert.deepEqual(await snapshot(s.cwd), {
		'.brodynelly-ui.lock': Buffer.from('foreign lock edit').toString('base64')
	});
});

test('newly created ancestor replacement is detected; rollback does not touch the foreign directory', async (t) => {
	const s = await setup(t);
	let moved = false;
	const io = {
		...fs,
		link: async (...args) => {
			await fs.link(...args);
			if (!moved) {
				moved = true;
				await fs.rename(path.join(s.cwd, 'src'), path.join(s.cwd, 'moved-src'));
				await fs.mkdir(path.join(s.cwd, 'src'));
				await fs.writeFile(path.join(s.cwd, 'src/sentinel'), 'foreign directory content');
			}
		}
	};
	await assert.rejects(
		applyPlan(await planFor(s, ['add', 'alpha']), io),
		/Rollback incomplete.*ancestor changed concurrently/s
	);
	assert.deepEqual(await snapshot(path.join(s.cwd, 'src')), {
		sentinel: Buffer.from('foreign directory content').toString('base64')
	});
	assert.equal(
		await fs.readFile(path.join(s.cwd, 'moved-src/lib/components/ui/LICENSE'), 'utf8'),
		'Synthetic MIT fixture license\n'
	);
	assert.equal((await recovery(s.cwd)).length, 1);
});

test('existing ancestor replacement preserves an external hardlink to our bytes rather than restoring into it', async (t) => {
	const s = await setup(t);
	assert.equal(cli(s.product, s.cwd, 'add', 'alpha').status, 0);
	await fs.writeFile(path.join(s.cwd, ui, 'controls/Alpha.svelte'), 'old customized component');
	let moved = false;
	const io = {
		...fs,
		rename: async (source, target) => {
			await fs.rename(source, target);
			if (!moved && target.endsWith('Alpha.svelte')) {
				moved = true;
				await fs.rename(path.join(s.cwd, ui, 'controls'), path.join(s.cwd, ui, 'moved-controls'));
				await fs.mkdir(path.join(s.cwd, ui, 'controls'));
				await fs.link(
					path.join(s.cwd, ui, 'moved-controls/Alpha.svelte'),
					path.join(s.cwd, ui, 'controls/Alpha.svelte')
				);
				await fs.writeFile(path.join(s.cwd, ui, 'controls/sentinel'), 'foreign content');
			}
		}
	};
	await assert.rejects(
		applyPlan(await planFor(s, ['add', 'alpha', '--overwrite']), io),
		/ancestor changed concurrently/
	);
	assert.match(await fs.readFile(path.join(s.cwd, ui, 'controls/Alpha.svelte'), 'utf8'), /<span>/);
	assert.equal(
		await fs.readFile(path.join(s.cwd, ui, 'controls/sentinel'), 'utf8'),
		'foreign content'
	);
	const [name] = await recovery(s.cwd);
	assert.equal(
		await fs.readFile(path.join(s.cwd, name, 'old-0'), 'utf8'),
		'old customized component'
	);
});

test('partial staging write failure retains unknown partial data, manifest and lock without payload changes', async (t) => {
	const s = await setup(t);
	let writes = 0;
	const io = {
		...fs,
		writeFile: async (name, bytes, options) => {
			if (++writes === 3) {
				await fs.writeFile(name, bytes.subarray(0, 5), options);
				throw injected();
			}
			return fs.writeFile(name, bytes, options);
		}
	};
	await assert.rejects(
		applyPlan(await planFor(s, ['add', 'alpha']), io),
		/Recovery data preserved/
	);
	const [name] = await recovery(s.cwd);
	assert.ok(name);
	assert.equal((await fs.readFile(path.join(s.cwd, name, 'new-1'))).length, 5);
	assert.equal(
		JSON.parse(await fs.readFile(path.join(s.cwd, name, 'manifest.json'), 'utf8')).schemaVersion,
		1
	);
	assert.equal((await snapshot(s.cwd))[`${ui}/LICENSE`], undefined);
	assert.equal((await fs.lstat(path.join(s.cwd, '.brodynelly-ui.lock'))).isFile(), true);
});

test('error after a successful replacement rename restores original bytes', async (t) => {
	const s = await setup(t);
	assert.equal(cli(s.product, s.cwd, 'add', 'alpha').status, 0);
	await fs.writeFile(path.join(s.cwd, ui, 'controls/Alpha.svelte'), 'old customized component');
	const before = await snapshot(s.cwd);
	let failed = false;
	const io = {
		...fs,
		rename: async (...args) => {
			await fs.rename(...args);
			if (!failed) {
				failed = true;
				throw injected();
			}
		}
	};
	await assert.rejects(
		applyPlan(await planFor(s, ['add', 'alpha', '--overwrite']), io),
		/injected filesystem failure/
	);
	assert.deepEqual(await snapshot(s.cwd), before);
});
