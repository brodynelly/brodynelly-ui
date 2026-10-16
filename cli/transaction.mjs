import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { requireValue, sha256 } from './format.mjs';
import {
	assertUnchanged,
	checkDirectory,
	inspect,
	inode,
	nativeIO,
	sameLeaf
} from './filesystem.mjs';
import { configName, lockName } from './plan.mjs';

// This is cooperative locking and best-effort race detection, not an OS-enforced
// sandbox or a filesystem-wide atomic transaction. Replacements are atomic per file.
export async function applyPlan(plan, io = nativeIO) {
	if (plan.options.dryRun) return;
	const { root } = plan;
	const token = randomUUID();
	const recoveryName = `.brodynelly-ui-recovery-${token}`;
	const stage = path.join(root, recoveryName);
	const lockPath = path.join(root, lockName);
	const lockBytes = Buffer.from(
		`${JSON.stringify({ schemaVersion: 1, token, pid: process.pid, recovery: recoveryName })}\n`
	);
	const changes = plan.entries.filter((entry) => ['create', 'replace'].includes(entry.action));
	const stageFiles = [];
	const directories = [];
	const attempted = [];
	let lock;
	let lockIdentity;
	let stageIdentity;
	let preserve = false;
	let failure;
	let committed = false;
	const rootIdentity = plan.entries[0].before.parents[0].inode;
	const configEntry = plan.entries.find((entry) => entry.relative === configName);
	const directoryBindings = new Map(
		[...plan.entries.flatMap((entry) => entry.before.parents), ...plan.config.parents].map(
			(parent) => [parent.path, parent.inode]
		)
	);

	async function rootSafe() {
		const stat = await io.lstat(root, { bigint: true });
		requireValue(
			stat.isDirectory() && !stat.isSymbolicLink() && inode(stat) === rootIdentity,
			'Target project root changed; refusing unsafe access'
		);
	}
	async function configSafe() {
		await rootSafe();
		if (configEntry && attempted.includes(configEntry)) {
			const actual = await inspect(root, configName, io);
			requireValue(
				actual.kind === 'file' &&
					actual.inode === configEntry.staged.inode &&
					actual.hash === configEntry.hash &&
					actual.content.equals(configEntry.content),
				'Installed config changed concurrently'
			);
		} else await assertUnchanged(root, configName, plan.config, io);
	}
	async function lineageSafe(relative, includeDirectory = false) {
		await rootSafe();
		for (const [name, identity] of directoryBindings) {
			if (!name || relative.startsWith(`${name}/`) || (includeDirectory && relative === name)) {
				if (name) await checkDirectory(root, name, io);
				const stat = await io.lstat(name ? path.join(root, name) : root, { bigint: true });
				requireValue(
					stat.isDirectory() && !stat.isSymbolicLink() && inode(stat) === identity,
					`Destination ancestor changed concurrently: ${name || '.'}`
				);
			}
		}
	}
	async function controlSafe() {
		await configSafe();
		const actual = await inspect(root, lockName, io);
		requireValue(
			actual.kind === 'file' && actual.inode === lockIdentity && actual.content.equals(lockBytes),
			'Installer lock changed concurrently; refusing further writes'
		);
	}

	async function stageSafe() {
		await rootSafe();
		const stat = await io.lstat(stage, { bigint: true });
		requireValue(
			stat.isDirectory() && !stat.isSymbolicLink() && inode(stat) === stageIdentity,
			'Recovery directory changed; refusing unsafe access'
		);
		await checkDirectory(root, recoveryName, io);
	}
	async function stageWrite(name, bytes, mode = 0o600) {
		await stageSafe();
		const full = path.join(stage, name);
		await io.writeFile(full, bytes, { flag: 'wx', mode, flush: true });
		const stat = await io.lstat(full, { bigint: true });
		requireValue(stat.isFile() && !stat.isSymbolicLink(), 'Unsafe recovery file');
		const record = { name, inode: inode(stat), hash: sha256(bytes), bytes };
		stageFiles.push(record);
		return record;
	}
	async function stageFileSafe(record) {
		await stageSafe();
		const actual = await inspect(root, `${recoveryName}/${record.name}`, io);
		requireValue(
			actual.kind === 'file' &&
				actual.inode === record.inode &&
				actual.hash === record.hash &&
				actual.content.equals(record.bytes),
			'Staged file changed; refusing to use it'
		);
	}
	async function parents(relative) {
		await lineageSafe(relative);
		const segments = relative.split('/').slice(0, -1);
		for (let i = 1; i <= segments.length; i++) {
			const name = segments.slice(0, i).join('/');
			await checkDirectory(root, name, io);
			let created = false;
			try {
				await io.mkdir(path.join(root, name));
				created = true;
			} catch (error) {
				if (error.code !== 'EEXIST') throw error;
			}
			await checkDirectory(root, name, io);
			const identity = inode(await io.lstat(path.join(root, name), { bigint: true }));
			requireValue(
				!directoryBindings.has(name) || directoryBindings.get(name) === identity,
				`Destination ancestor changed concurrently: ${name}`
			);
			directoryBindings.set(name, identity);
			if (created) directories.push({ relative: name, inode: identity });
		}
	}
	async function cleanStage() {
		if (!stageIdentity) return;
		await stageSafe();
		const known = new Set(stageFiles.map((record) => record.name));
		requireValue(
			(await io.readdir(stage)).every((name) => known.has(name)),
			'Unexpected recovery data; preserving it'
		);
		const removable = [];
		for (const record of [...stageFiles].reverse()) {
			const actual = await inspect(root, `${recoveryName}/${record.name}`, io);
			if (actual.kind === 'missing') continue; // A successful rename moved this file.
			requireValue(
				actual.inode === record.inode &&
					actual.hash === record.hash &&
					actual.content.equals(record.bytes),
				'Recovery file changed; preserving recovery data'
			);
			removable.push({ record, actual });
		}
		for (const { record, actual } of removable) {
			await stageSafe();
			await assertUnchanged(root, `${recoveryName}/${record.name}`, actual, io);
			await io.unlink(path.join(stage, record.name));
		}
		requireValue((await io.readdir(stage)).length === 0, 'Unexpected recovery data; preserving it');
		await io.rmdir(stage);
	}
	async function rollback() {
		const problems = [];
		for (const entry of [...attempted].reverse()) {
			try {
				await lineageSafe(entry.relative);
				const actual = await inspect(root, entry.relative, io);
				if (
					sameLeaf(actual, entry.before) ||
					(actual.kind === 'missing' && entry.before.kind === 'missing')
				)
					continue;
				requireValue(
					actual.kind === 'file' &&
						actual.inode === entry.staged.inode &&
						actual.hash === entry.hash &&
						actual.content.equals(entry.content),
					`External change preserved: ${entry.relative}`
				);
				await assertUnchanged(root, entry.relative, actual, io);
				if (entry.before.kind === 'missing') await io.unlink(path.join(root, entry.relative));
				else {
					await stageFileSafe(entry.backup);
					await assertUnchanged(root, entry.relative, actual, io);
					await io.rename(path.join(stage, entry.backup.name), path.join(root, entry.relative));
				}
			} catch (error) {
				problems.push(error.message);
			}
		}
		for (const directory of [...directories].reverse()) {
			try {
				await lineageSafe(directory.relative, true);
				await checkDirectory(root, directory.relative, io);
				const full = path.join(root, directory.relative);
				requireValue(
					inode(await io.lstat(full, { bigint: true })) === directory.inode,
					'Created directory changed'
				);
				if ((await io.readdir(full)).length === 0) await io.rmdir(full);
			} catch (error) {
				problems.push(error.message);
			}
		}
		return problems;
	}

	try {
		// Preflight has already inspected all planned destinations, including skips.
		await configSafe();
		for (const entry of plan.entries) await assertUnchanged(root, entry.relative, entry.before, io);
		const lockBefore = await inspect(root, lockName, io);
		requireValue(
			lockBefore.kind === 'missing',
			'Another installer may be running: .brodynelly-ui.lock exists'
		);
		try {
			lock = await io.open(
				lockPath,
				constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW ?? 0),
				0o600
			);
		} catch (error) {
			if (error.code === 'EEXIST')
				throw new Error('Another installer may be running: .brodynelly-ui.lock exists');
			throw error;
		}
		lockIdentity = inode(await lock.stat({ bigint: true }));
		await lock.writeFile(lockBytes);
		await lock.sync();
		await controlSafe();
		for (const entry of plan.entries) await assertUnchanged(root, entry.relative, entry.before, io);
		await io.mkdir(stage, { mode: 0o700 });
		stageIdentity = inode(await io.lstat(stage, { bigint: true }));
		await stageSafe();
		await stageWrite(
			'manifest.json',
			Buffer.from(
				`${JSON.stringify({ schemaVersion: 1, files: changes.map((entry, i) => ({ path: entry.relative, action: entry.action, sha256: entry.hash, previousSha256: entry.before.hash ?? null, staged: `new-${i}`, backup: entry.before.kind === 'file' ? `old-${i}` : null })) }, null, 2)}\n`
			)
		);
		for (const [i, entry] of changes.entries()) {
			entry.staged = await stageWrite(
				`new-${i}`,
				entry.content,
				entry.before.kind === 'file' ? entry.before.mode : 0o644
			);
			if (entry.before.kind === 'file')
				entry.backup = await stageWrite(`old-${i}`, entry.before.content, entry.before.mode);
		}
		// A late conflict discovered during staging still causes zero payload changes.
		await controlSafe();
		for (const entry of plan.entries) await assertUnchanged(root, entry.relative, entry.before, io);
		for (const entry of changes) {
			await controlSafe();
			await assertUnchanged(root, entry.relative, entry.before, io);
			await parents(entry.relative);
			await stageFileSafe(entry.staged);
			await lineageSafe(entry.relative);
			await assertUnchanged(root, entry.relative, entry.before, io);
			attempted.push(entry); // Also covers an operation that succeeded before throwing.
			if (entry.action === 'create')
				await io.link(path.join(stage, entry.staged.name), path.join(root, entry.relative));
			else await io.rename(path.join(stage, entry.staged.name), path.join(root, entry.relative));
			const installed = await inspect(root, entry.relative, io);
			requireValue(
				installed.kind === 'file' &&
					installed.inode === entry.staged.inode &&
					installed.hash === entry.hash &&
					installed.content.equals(entry.content),
				`Destination changed during install: ${entry.relative}`
			);
		}
		await controlSafe();
		for (const entry of plan.entries) {
			await lineageSafe(entry.relative);
			if (!['create', 'replace'].includes(entry.action))
				await assertUnchanged(root, entry.relative, entry.before, io);
			else {
				const actual = await inspect(root, entry.relative, io);
				requireValue(
					actual.kind === 'file' &&
						actual.inode === entry.staged.inode &&
						actual.hash === entry.hash &&
						actual.content.equals(entry.content),
					`Destination changed before completion: ${entry.relative}`
				);
			}
		}
		committed = true;
	} catch (error) {
		failure = error;
		const problems = await rollback();
		if (problems.length) {
			preserve = true;
			failure = new Error(
				`${error.message}\nRollback incomplete; ${problems.join('; ')}\nRecovery data preserved at ${recoveryName}; lock retained. Inspect the manifest/backups and resolve manually before removing the lock.`
			);
		}
	} finally {
		if (!preserve) {
			try {
				await cleanStage();
			} catch (error) {
				preserve = true;
				failure = new Error(
					`${failure ? `${failure.message}\n` : ''}${committed ? 'Files installed, but cleanup could not safely finish. ' : ''}${error.message}\nRecovery data preserved at ${recoveryName}; lock retained.`
				);
			}
		}
		if (lock) await lock.close();
		if (lockIdentity && !preserve) {
			try {
				await rootSafe();
				const actual = await inspect(root, lockName, io);
				requireValue(
					actual.kind === 'file' &&
						actual.inode === lockIdentity &&
						actual.content.equals(lockBytes),
					'Installer lock changed; preserved for manual inspection'
				);
				await io.unlink(lockPath);
			} catch (error) {
				failure = new Error(`${failure ? `${failure.message}\n` : ''}${error.message}`);
			}
		}
	}
	if (failure) throw failure;
}
