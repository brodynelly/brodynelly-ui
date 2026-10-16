import * as fs from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { caseKey, relativePath, requireValue, sha256 } from './format.mjs';

export const nativeIO = fs;
export const inode = (stat) => `${stat.dev}:${stat.ino}`;
const signature = (stat) =>
	[stat.dev, stat.ino, stat.mode, stat.size, stat.mtimeNs, stat.ctimeNs, stat.nlink]
		.map(String)
		.join(':');
export const sameLeaf = (a, b) =>
	a.kind === b.kind && (a.kind === 'missing' || (a.signature === b.signature && a.hash === b.hash));

export async function projectRoot(cwd, io = fs) {
	const root = await io.realpath(path.resolve(cwd));
	const stat = await io.lstat(root);
	requireValue(
		stat.isDirectory() && !stat.isSymbolicLink(),
		'The target cwd must be an existing project directory'
	);
	return root;
}

async function childStat(parent, name, io) {
	const matches = (await io.readdir(parent)).filter((entry) => caseKey(entry) === caseKey(name));
	requireValue(
		matches.length === 0 || (matches.length === 1 && matches[0] === name),
		`Case-colliding destination: ${name}`
	);
	try {
		return await io.lstat(path.join(parent, name), { bigint: true });
	} catch (error) {
		if (error.code === 'ENOENT') return null;
		throw error;
	}
}

export async function inspect(root, relative, io = fs) {
	relativePath(relative, 'destination');
	const rootStat = await io.lstat(root, { bigint: true });
	requireValue(
		rootStat.isDirectory() && !rootStat.isSymbolicLink(),
		'Target project root changed or became a link'
	);
	const parents = [{ path: '', inode: inode(rootStat) }];
	let current = root;
	const segments = relative.split('/');
	for (let i = 0; i < segments.length; i++) {
		const stat = await childStat(current, segments[i], io);
		if (!stat) return { kind: 'missing', parents };
		requireValue(
			!stat.isSymbolicLink(),
			`Symlink/junction destination or ancestor rejected: ${relative}`
		);
		current = path.join(current, segments[i]);
		if (i < segments.length - 1) {
			requireValue(stat.isDirectory(), `Destination ancestor is not a directory: ${relative}`);
			parents.push({ path: segments.slice(0, i + 1).join('/'), inode: inode(stat) });
		} else {
			requireValue(stat.isFile(), `Destination must be a regular file: ${relative}`);
			const handle = await io.open(current, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
			try {
				const before = await handle.stat({ bigint: true });
				requireValue(
					before.isFile() && signature(before) === signature(stat),
					`Destination changed while reading: ${relative}`
				);
				const content = await handle.readFile();
				const after = await handle.stat({ bigint: true });
				requireValue(
					signature(before) === signature(after),
					`Destination changed while reading: ${relative}`
				);
				return {
					kind: 'file',
					signature: signature(after),
					inode: inode(after),
					hash: sha256(content),
					content,
					mode: Number(after.mode & 0o777n),
					parents
				};
			} finally {
				await handle.close();
			}
		}
	}
}

export async function assertUnchanged(root, relative, expected, io = fs) {
	const actual = await inspect(root, relative, io);
	requireValue(sameLeaf(actual, expected), `Concurrent/stale destination change: ${relative}`);
	for (const parent of expected.parents) {
		requireValue(
			actual.parents.some((item) => item.path === parent.path && item.inode === parent.inode),
			`Concurrent destination ancestor change: ${relative}`
		);
	}
	return actual;
}

export async function checkDirectory(root, relative, io = fs) {
	relativePath(relative, 'directory');
	let current = root;
	for (const segment of relative.split('/')) {
		const stat = await childStat(current, segment, io);
		if (!stat) return;
		requireValue(
			stat.isDirectory() && !stat.isSymbolicLink(),
			'UI directory or ancestor is not a regular directory (symlink/junction rejected)'
		);
		current = path.join(current, segment);
	}
}
