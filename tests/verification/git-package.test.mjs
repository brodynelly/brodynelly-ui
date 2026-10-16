import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { test } from 'node:test';
import { join, resolve } from 'node:path';
import {
	assertClean,
	assertLightweight,
	guardedPaths,
	isolatedGitEnvironment,
	localGitSpec,
	npmInvocation
} from '../../scripts/verify-git-package.mjs';

const manifest = () => ({
	name: 'brodynelly-ui',
	version: '0.1.0',
	private: true,
	bin: { 'brodynelly-ui': 'bin/brodynelly-ui.mjs' },
	scripts: { verify: 'npm test' }
});

test('dirty guard refuses staged, unstaged, deleted and untracked package changes', () => {
	assert.doesNotThrow(() => assertClean(''));
	for (const entry of [
		'M  package.json\0',
		' M cli/main.mjs\0',
		' D LICENSE\0',
		'?? registry/extra.json\0'
	]) {
		assert.throws(() => assertClean(entry), { code: 'DIRTY_PACKAGE' });
	}
	for (const path of [
		'bin',
		'cli',
		'registry',
		'package.json',
		'package-lock.json',
		'README.md',
		'LICENSE',
		'NOTICE.md',
		'scripts/verify-git-package.mjs'
	]) {
		assert.ok(guardedPaths.includes(path), path);
	}
});

test('Git package cannot acquire runtime dependencies, workspaces or heavy lifecycle hooks', () => {
	assert.doesNotThrow(() => assertLightweight(manifest()));
	for (const key of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
		assert.throws(() => assertLightweight({ ...manifest(), [key]: { surprise: '*' } }));
	}
	assert.throws(() => assertLightweight({ ...manifest(), workspaces: [] }));
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
		assert.throws(() => assertLightweight({ ...manifest(), scripts: { [hook]: 'unexpected' } }));
	}
});

test('POSIX npm uses argv without a shell; Windows quotes spaces and refuses shell expansion', () => {
	const args = [
		'exec',
		'--cache',
		'/consumer with spaces/cache',
		'--package',
		'git+file:///repo#' + 'a'.repeat(40)
	];
	assert.deepEqual(npmInvocation(args, 'linux'), {
		executable: 'npm',
		args,
		windowsVerbatimArguments: false
	});
	const windows = npmInvocation(args, 'win32');
	assert.equal(windows.executable, 'cmd.exe');
	assert.deepEqual(windows.args.slice(0, 3), ['/d', '/s', '/c']);
	assert.equal(windows.windowsVerbatimArguments, true);
	assert.ok(windows.args[3].includes('"/consumer with spaces/cache"'));
	for (const unsafe of [
		'"',
		'\n',
		'\r',
		'\0',
		'%PATH%',
		'!PATH!',
		'& command',
		'|',
		'<',
		'>',
		'^'
	]) {
		assert.throws(() => npmInvocation(['exec', unsafe], 'win32'), /Unsafe Windows/);
	}
});

test('Git spec is strictly local and pins a full commit, not a moving ref or short hash', () => {
	const head = 'a'.repeat(40);
	const spec = localGitSpec(resolve('fixture repository with spaces'), head);
	assert.ok(spec.startsWith('git+file:///'));
	assert.ok(spec.includes('fixture repository with spaces'));
	assert.ok(spec.endsWith(`#${head}`));
	for (const ref of ['HEAD', 'main', '7223920', 'a'.repeat(41), 'a'.repeat(40) + ';exit']) {
		assert.throws(() => localGitSpec(resolve('.'), ref));
	}
});

test('real Git runs and reads an empty config file with global/system isolation', (t) => {
	const temporaryRoot = process.env.BRODYNELLY_TEST_TMP ?? join(tmpdir(), 'opencode');
	mkdirSync(temporaryRoot, { recursive: true });
	const temporary = mkdtempSync(join(temporaryRoot, 'brodynelly-git-environment-'));
	let succeeded = false;
	t.after(() => {
		if (succeeded) rmSync(temporary, { recursive: true, force: true });
		else console.error(`Preserved Git environment test evidence: ${temporary}`);
	});
	const configFile = join(temporary, 'empty git config');
	writeFileSync(configFile, '', { flag: 'wx' });
	const environment = isolatedGitEnvironment(configFile);
	assert.equal(environment.GIT_CONFIG_SYSTEM, configFile);
	assert.equal(environment.GIT_CONFIG_GLOBAL, configFile);
	assert.equal(environment.GIT_CONFIG_NOSYSTEM, '1');
	assert.equal(environment.GIT_CONFIG_COUNT, '0');
	assert.equal(environment.GIT_CONFIG_PARAMETERS, '');
	assert.equal(environment.GIT_ALLOW_PROTOCOL, 'file');
	assert.equal(environment.GIT_TERMINAL_PROMPT, '0');
	for (const args of [
		['--version'],
		['config', '--global', '--list'],
		['config', '--system', '--list']
	]) {
		const startedAt = new Date().toISOString();
		const result = spawnSync('git', args, {
			cwd: temporary,
			env: environment,
			encoding: 'utf8',
			timeout: 10000
		});
		t.diagnostic(
			JSON.stringify({
				executable: 'git',
				arguments: args,
				cwd: temporary,
				started_at: startedAt,
				finished_at: new Date().toISOString(),
				exit_code: result.status,
				stdout_bytes: Buffer.byteLength(result.stdout ?? ''),
				...(args[0] === '--version' ? { git_version: result.stdout?.trim() } : {})
			})
		);
		assert.equal(
			result.status,
			0,
			`git ${args.join(' ')}: ${result.error?.message ?? result.stderr}`
		);
		if (args[0] === '--version') assert.match(result.stdout, /^git version /);
		else assert.equal(result.stdout, '', 'Git must read only the controlled empty config');
	}
	assert.equal(readFileSync(configFile, 'utf8'), '');
	succeeded = true;
});
