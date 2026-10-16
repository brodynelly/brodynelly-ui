import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	readdirSync,
	writeFileSync
} from 'node:fs';
import { devNull, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
export const guardedPaths = [
	'bin',
	'cli',
	'registry',
	'package.json',
	'package-lock.json',
	'README.md',
	'LICENSE',
	'NOTICE.md',
	'scripts/verify-git-package.mjs',
	'tests/verification'
];

export function assertClean(status) {
	if (status.length) {
		const error = new Error(
			'Commit the reviewed package candidate first: relevant staged, unstaged or untracked files differ from HEAD.'
		);
		error.code = 'DIRTY_PACKAGE';
		throw error;
	}
}

export function assertLightweight(manifest) {
	assert.equal(manifest.name, 'brodynelly-ui');
	assert.equal(manifest.version, '0.1.0');
	assert.equal(manifest.private, true);
	assert.deepEqual(manifest.dependencies ?? {}, {});
	assert.deepEqual(manifest.peerDependencies ?? {}, {});
	assert.deepEqual(manifest.optionalDependencies ?? {}, {});
	assert.equal(manifest.workspaces, undefined);
	assert.deepEqual(manifest.bin, { 'brodynelly-ui': 'bin/brodynelly-ui.mjs' });
	for (const hook of [
		'build',
		'prepare',
		'prepublish',
		'prepublishOnly',
		'prepack',
		'postpack',
		'preinstall',
		'install',
		'postinstall'
	]) {
		assert.equal(manifest.scripts?.[hook], undefined, `Unexpected Git/install hook: ${hook}`);
	}
}

export function npmInvocation(args, platform = process.platform) {
	if (platform !== 'win32') return { executable: 'npm', args, windowsVerbatimArguments: false };
	// cmd expands percent/! even within quotes. Refuse shell syntax rather than
	// interpolating untrusted arguments or relying on batch-file escaping rules.
	for (const arg of args) assert.ok(!/["\r\n\0%!&|<>^]/.test(arg), 'Unsafe Windows npm argument');
	return {
		executable: 'cmd.exe',
		args: ['/d', '/s', '/c', `npm.cmd ${args.map((arg) => `"${arg}"`).join(' ')}`],
		windowsVerbatimArguments: true
	};
}

export function localGitSpec(repository, head) {
	assert.match(head, /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/);
	// Literal spaces are safe in the quoted argv below; avoid cmd percent expansion.
	return `git+${pathToFileURL(repository).href.replaceAll('%20', ' ')}#${head}`;
}

function files(directory, prefix = '') {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const relative = `${prefix}${entry.name}`;
		return entry.isDirectory() ? files(join(directory, entry.name), `${relative}/`) : [relative];
	});
}

export function verifyGitPackage() {
	const reportDirectory = join(root, '.checks/verification');
	mkdirSync(reportDirectory, { recursive: true });
	const report = {
		status: 'blocked',
		started_at: new Date().toISOString(),
		environment: { node: process.version, platform: process.platform, architecture: process.arch },
		commands: []
	};
	let environment = { ...process.env };
	function run(executable, args, cwd = root, windowsVerbatimArguments = false) {
		const started_at = new Date().toISOString();
		const result = spawnSync(executable, args, {
			cwd,
			env: environment,
			encoding: 'utf8',
			timeout: 180000,
			maxBuffer: 8 * 1024 * 1024,
			windowsVerbatimArguments
		});
		const index = report.commands.length;
		const stdout = result.stdout ?? '';
		const stderr = result.stderr ?? '';
		const logs = ['stdout', 'stderr'].map((kind) => {
			const content = kind === 'stdout' ? stdout : stderr;
			const path = `git-package-${index}.${kind}.log`;
			writeFileSync(join(reportDirectory, path), content);
			return { path: `.checks/verification/${path}`, sha256: sha256(content) };
		});
		report.commands.push({
			executable,
			arguments: args,
			cwd,
			started_at,
			finished_at: new Date().toISOString(),
			exit_code: result.status,
			logs
		});
		assert.equal(result.status, 0, `${executable} failed: ${result.error?.message ?? stderr}`);
		return stdout;
	}
	const git = (args) => run('git', args);
	const status = () =>
		git(['status', '--porcelain=v1', '-z', '--untracked-files=all', '--', ...guardedPaths]);
	try {
		report.head = git(['rev-parse', '--verify', 'HEAD^{commit}']).trim();
		report.tree = git(['rev-parse', `${report.head}^{tree}`]).trim();
		report.dirty = status().split('\0').filter(Boolean);
		assertClean(report.dirty);
		const manifest = JSON.parse(git(['show', `${report.head}:package.json`]));
		assertLightweight(manifest);
		const temporaryRoot = process.env.BRODYNELLY_TEST_TMP ?? join(tmpdir(), 'opencode');
		mkdirSync(temporaryRoot, { recursive: true });
		const temporary = mkdtempSync(join(temporaryRoot, 'brodynelly-git-package-'));
		const consumer = join(temporary, 'source consumer with spaces');
		const cache = join(temporary, 'fresh npm cache');
		mkdirSync(consumer);
		report.temporary = temporary; // Preserved: only the caller may remove this owned fixture.
		environment = {
			...environment,
			npm_config_ignore_scripts: 'false',
			npm_config_audit: 'false',
			npm_config_fund: 'false',
			npm_config_update_notifier: 'false',
			npm_config_registry: 'http://127.0.0.1:9',
			npm_config_git: 'git',
			GIT_CONFIG_NOSYSTEM: '1',
			GIT_CONFIG_SYSTEM: devNull,
			GIT_CONFIG_GLOBAL: devNull,
			GIT_CONFIG_COUNT: '0',
			GIT_CONFIG_PARAMETERS: '',
			GIT_ALLOW_PROTOCOL: 'file',
			GIT_TERMINAL_PROMPT: '0'
		};
		const npm = (args, cwd = consumer) => {
			const command = npmInvocation(args);
			return run(command.executable, command.args, cwd, command.windowsVerbatimArguments);
		};
		report.environment.npm = npm(['--version']).trim();
		report.environment.git = git(['--version']).trim();
		report.environment.network =
			'npm offline; registry loopback; Git file protocol only; global/system Git config disabled';
		report.package_spec = localGitSpec(root, report.head);
		const consumerManifest = JSON.stringify({ name: 'git-source-consumer', private: true });
		writeFileSync(join(consumer, 'package.json'), consumerManifest);
		const command = [
			'exec',
			'--yes',
			'--offline',
			'--cache',
			cache,
			'--package',
			report.package_spec,
			'--',
			'brodynelly-ui'
		];
		const listed = JSON.parse(npm([...command, 'list', '--json']));
		assert.equal(listed.length, 83);
		assert.equal(new Set(listed.map((item) => item.name)).size, 83);
		const installations = readdirSync(join(cache, '_npx'))
			.map((entry) => join(cache, '_npx', entry, 'node_modules', 'brodynelly-ui'))
			.filter((path) => existsSync(join(path, 'package.json')));
		assert.equal(installations.length, 1);
		const installed = installations[0];
		assertLightweight(JSON.parse(readFileSync(join(installed, 'package.json'), 'utf8')));
		assert.equal(existsSync(join(installed, 'src')), false);
		assert.equal(existsSync(join(installed, 'node_modules')), false);
		assert.deepEqual(
			readdirSync(dirname(installed)).filter((name) => !name.startsWith('.')),
			['brodynelly-ui']
		);
		const expectedPaths = git([
			'ls-tree',
			'-r',
			'--name-only',
			report.head,
			'--',
			'bin',
			'cli',
			'registry',
			'README.md',
			'LICENSE',
			'NOTICE.md',
			'package.json'
		])
			.trim()
			.split('\n')
			.sort();
		assert.deepEqual(files(installed).sort(), expectedPaths);
		for (const path of expectedPaths.filter((path) => path !== 'package.json')) {
			assert.equal(
				sha256(readFileSync(join(installed, path))),
				sha256(git(['show', `${report.head}:${path}`])),
				`Installed bytes differ: ${path}`
			);
		}
		const catalog = JSON.parse(readFileSync(join(installed, 'registry/index.json'), 'utf8'));
		assert.deepEqual(
			listed.map((item) => item.name),
			catalog.items.map((item) => item.name)
		);
		const selected = ['switch', 'menu', 'sheet', 'split-view'];
		npm([...command, 'add', ...selected]);
		const ui = join(consumer, 'src/lib/components/ui');
		const payloads = [
			'base.json',
			...catalog.items.filter((item) => selected.includes(item.name)).map((item) => item.payload)
		];
		const copied = new Set();
		for (const payload of payloads) {
			for (const file of JSON.parse(readFileSync(join(installed, 'registry', payload), 'utf8'))
				.files) {
				assert.equal(
					sha256(readFileSync(join(ui, file.path))),
					file.sha256,
					`Copied bytes differ: ${file.path}`
				);
				copied.add(file.path);
			}
		}
		assert.equal(files(ui).length, copied.size);
		assert.equal(readFileSync(join(consumer, 'package.json'), 'utf8'), consumerManifest);
		assert.equal(existsSync(join(consumer, 'node_modules')), false);
		assert.equal(existsSync(join(consumer, 'package-lock.json')), false);
		assertClean(status());
		assert.equal(
			git(['rev-parse', 'HEAD']).trim(),
			report.head,
			'HEAD changed during verification'
		);
		report.counts = {
			catalog: listed.length,
			package_files: expectedPaths.length,
			selected_components: selected.length,
			copied_files: copied.size
		};
		report.source_fingerprint = catalog.sourceFingerprint;
		report.status = 'passed';
	} catch (error) {
		report.status = error.code === 'DIRTY_PACKAGE' ? 'blocked' : 'failed';
		report.reason = error.message;
	} finally {
		report.finished_at = new Date().toISOString();
		writeFileSync(
			join(reportDirectory, 'git-package-result.json'),
			`${JSON.stringify(report, null, 2)}\n`
		);
	}
	console.log(JSON.stringify(report, null, 2));
	return report.status === 'passed' ? 0 : report.status === 'blocked' ? 2 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	process.exitCode = verifyGitPackage();
}
