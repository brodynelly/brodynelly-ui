import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import {
	sandbox,
	bundle,
	cli,
	consumer,
	snapshot,
	mutatePayload,
	file,
	json,
	digest
} from './fixture.mjs';
import { relativePath, parseJSON, validateInventory } from '../../cli/format.mjs';

async function setup(t) {
	const root = await sandbox(t);
	const product = await bundle(root);
	return { root, product, cwd: await consumer(root), registry: path.join(product, 'registry') };
}
function fails(result, match) {
	assert.equal(result.status, 1, result.stderr);
	if (match) assert.match(result.stderr, match);
}

test('unsafe CLI directories are rejected even with --overwrite and --dry-run', async (t) => {
	const { product, cwd } = await setup(t);
	for (const directory of [
		'/absolute',
		'C:/escape',
		'C:escape',
		'//server/share',
		'\\server\\share',
		'../escape',
		'a/../b',
		'.',
		'a/./b',
		'a//b',
		'a/',
		'a\\b',
		'a:stream',
		'CON',
		'aux.js',
		'sub/Lpt9.txt',
		'COM¹.log',
		'trailing.',
		'trailing ',
		'bad\nname',
		'.brodynelly-ui.lock/nested'
	]) {
		fails(cli(product, cwd, 'add', 'alpha', '--dir', directory, '--overwrite', '--dry-run'));
		assert.deepEqual(await snapshot(cwd), {}, directory);
	}
	assert.throws(() => relativePath('null\0byte'));
	assert.throws(() => relativePath('hidden\u202ename'));
	assert.throws(() => validateInventory(['shared/I.js', 'shared/ı.js']), /case-colliding/);
});

test('existing destination case collisions refuse without writing a partial plan', async (t) => {
	const { product, cwd } = await setup(t);
	await fs.mkdir(path.join(cwd, 'Src'));
	let before = await snapshot(cwd);
	fails(cli(product, cwd, 'add', 'alpha', '--overwrite'), /Case-colliding/);
	assert.deepEqual(await snapshot(cwd), before);
	await fs.rmdir(path.join(cwd, 'Src'));
	await fs.mkdir(path.join(cwd, 'ui/controls'), { recursive: true });
	await fs.writeFile(path.join(cwd, 'ui/controls/ALPHA.svelte'), 'external case spelling');
	before = await snapshot(cwd);
	fails(cli(product, cwd, 'add', 'alpha', '--dir', 'ui', '--overwrite'), /Case-colliding/);
	assert.deepEqual(await snapshot(cwd), before);
});

for (const location of ['src', 'ui/styles.css', '.brodynelly-ui.json', '.brodynelly-ui.lock']) {
	test(`junction/symlink destination or ancestor rejected: ${location}`, async (t) => {
		const { root, product, cwd } = await setup(t);
		const outside = path.join(root, 'outside');
		await fs.mkdir(outside);
		await fs.writeFile(path.join(outside, 'sentinel'), 'outside stays untouched');
		await fs.mkdir(path.dirname(path.join(cwd, location)), { recursive: true });
		await fs.symlink(
			outside,
			path.join(cwd, location),
			process.platform === 'win32' ? 'junction' : 'dir'
		);
		const before = await snapshot(cwd);
		const args = location.startsWith('ui/') ? ['--dir', 'ui'] : [];
		fails(cli(product, cwd, 'add', 'alpha', '--overwrite', ...args), /symlink|junction/i);
		assert.deepEqual(await snapshot(cwd), before);
		assert.equal(
			await fs.readFile(path.join(outside, 'sentinel'), 'utf8'),
			'outside stays untouched'
		);
	});
}

const badPayloads = [
	[
		'content hash mismatch',
		(p) => {
			p.files[0].content += 'tampered';
		}
	],
	[
		'unsafe traversal',
		(p) => {
			p.files.push(file('../escape.js', 'x', 'module'));
		}
	],
	[
		'absolute file',
		(p) => {
			p.files.push(file('/escape.js', 'x', 'module'));
		}
	],
	[
		'alternate data stream',
		(p) => {
			p.files.push(file('shared/value.js:evil', 'x', 'module'));
		}
	],
	[
		'reserved Windows name',
		(p) => {
			p.files.push(file('shared/NUL.js', 'x', 'module'));
		}
	],
	[
		'case-colliding leaf',
		(p) => {
			p.files.push(file('shared/Value.js', 'x', 'module'));
		}
	],
	[
		'case-colliding ancestor',
		(p) => {
			p.files.push(file('Shared/other.js', 'x', 'module'));
		}
	],
	[
		'file-directory collision',
		(p) => {
			p.files.push(file('shared/value.js/other.js', 'x', 'module'));
		}
	],
	[
		'duplicate file',
		(p) => {
			p.files.push(p.files[0]);
		}
	],
	[
		'missing entry',
		(p) => {
			p.files.shift();
		}
	],
	[
		'barrel instead of closure',
		(p) => {
			p.files.push(file('index.js', 'export {}', 'module'));
		}
	],
	[
		'wrong kind',
		(p) => {
			p.files[0].kind = 'executable';
		}
	],
	[
		'CRLF content',
		(p) => {
			p.files[0] = file(p.entry, '<span>\r\n</span>\r\n', 'component');
		}
	],
	[
		'invalid requirements',
		(p) => {
			p.requirements.svgFilter = 'false';
		}
	],
	[
		'wrong payload identity',
		(p) => {
			p.name = 'wrong';
		}
	],
	[
		'inconsistent helper across closures',
		(p) => {
			p.files[1] = file('shared/value.js', 'different helper', 'module');
		}
	]
];
for (const [name, mutate] of badPayloads) {
	test(`full registry validates before target writes: ${name}, including unselected payload`, async (t) => {
		const { product, cwd, registry } = await setup(t);
		await mutatePayload(registry, 'beta', mutate);
		fails(cli(product, cwd, 'add', 'alpha'));
		assert.deepEqual(await snapshot(cwd), {});
	});
}

test('exact payload bytes are hashed; tampered payload rejected for list/init/add', async (t) => {
	const { product, cwd, registry } = await setup(t);
	await fs.appendFile(path.join(registry, 'items/beta.json'), '\n');
	for (const args of [['list', '--json'], ['init'], ['add', 'alpha']]) {
		fails(cli(product, cwd, ...args), /payload hash mismatch/);
		assert.deepEqual(await snapshot(cwd), {});
	}
});

test('base inventory/hash and fixed index descriptor/schema/fingerprint are required', async (t) => {
	const { product, cwd, registry } = await setup(t);
	const indexPath = path.join(registry, 'index.json');
	const original = await fs.readFile(indexPath, 'utf8');
	for (const change of [
		(i) => {
			i.schemaVersion = 2;
		},
		(i) => {
			delete i.sourceFingerprint;
		},
		(i) => {
			i.items.pop();
		},
		(i) => {
			i.base.payload = '../other.json';
		},
		(i) => {
			i.items[0].payload = 'https://invalid/payload';
		},
		(i) => {
			i.items[0].sha256 = '0'.repeat(64);
		},
		(i) => {
			i.items.reverse();
		}
	]) {
		const index = JSON.parse(original);
		change(index);
		await fs.writeFile(indexPath, json(index));
		fails(cli(product, cwd, 'init'));
		assert.deepEqual(await snapshot(cwd), {});
	}
	await fs.writeFile(indexPath, original);
	await mutatePayload(registry, 'base', (p) => {
		p.files.pop();
	});
	fails(cli(product, cwd, 'add', 'alpha'), /expected styles.css/);
	assert.deepEqual(await snapshot(cwd), {});
});

test('strict JSON rejects duplicate keys, invalid UTF-8, BOM and excessive nesting', async (t) => {
	const { product, cwd, registry } = await setup(t);
	const indexPath = path.join(registry, 'index.json');
	const original = await fs.readFile(indexPath, 'utf8');
	for (const content of [
		original.replace('"schemaVersion": 1,', '"schemaVersion": 1, "schemaVersion": 1,'),
		Buffer.from([0xff, 0xfe]),
		'\ufeff' + original
	]) {
		await fs.writeFile(indexPath, content);
		fails(cli(product, cwd, 'add', 'alpha'));
		assert.deepEqual(await snapshot(cwd), {});
	}
	assert.throws(() => parseJSON(Buffer.from('{"a":1,"\\u0061":2}'), 'duplicate'), /duplicate/);
	assert.throws(
		() => parseJSON(Buffer.from('['.repeat(102) + '0' + ']'.repeat(102)), 'deep'),
		/nesting/
	);
});

test('bundled symlink/junction payload directories are not followed', async (t) => {
	const { product, cwd, registry } = await setup(t);
	const originalItems = path.join(registry, 'real-items');
	await fs.rename(path.join(registry, 'items'), originalItems);
	await fs.symlink(
		originalItems,
		path.join(registry, 'items'),
		process.platform === 'win32' ? 'junction' : 'dir'
	);
	fails(cli(product, cwd, 'add', 'alpha'), /symlinks\/junctions/);
	assert.deepEqual(await snapshot(cwd), {});
});

test('valid JSON with matching payload hash but unpaired Unicode content is rejected', async (t) => {
	const { product, cwd, registry } = await setup(t);
	await mutatePayload(registry, 'alpha', (p) => {
		p.files[0].content = '\ud800';
		p.files[0].sha256 = digest(p.files[0].content);
	});
	fails(cli(product, cwd, 'add', 'alpha'), /invalid content/);
	assert.deepEqual(await snapshot(cwd), {});
});
