import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import {
	agent,
	configRoot,
	effect,
	existsProduct,
	expectedCommands,
	files,
	frontmatter,
	json,
	normalize,
	productRoot,
	projectSkills,
	publicRoot,
	read,
	readProduct,
	team,
	writers
} from './helpers.mjs';

// Local reads/assertions only: no process execution, provider, MCP or API calls.
test('active portable config retains exact V2 default/instructions without host bindings', () => {
	const config = json('opencode.jsonc');
	assert.deepEqual(Object.keys(config).sort(), ['$schema', 'default_agent', 'instructions']);
	assert.equal(config.$schema, 'https://opencode.ai/config.json');
	assert.equal(config.default_agent, 'luuna-orchestrator');
	assert.equal(agent(config.default_agent).mode, 'primary');
	assert.deepEqual(config.instructions, ['.opencode/instructions/luuna.md']);
	for (const entry of config.instructions)
		assert.ok(existsSync(path.join(publicRoot, entry)), entry);
});

test('eight agent files use the authored native V2 frontmatter subset and valid ordered rules', () => {
	assert.deepEqual(
		readdirSync(path.join(configRoot, 'agents')).sort(),
		team.map((id) => `${id}.md`).sort()
	);
	for (const id of team) {
		const { data, body } = frontmatter(read(`agents/${id}.md`));
		assert.deepEqual(Object.keys(data).sort(), ['description', 'mode', 'permissions']);
		assert.ok(typeof data.description === 'string' && data.description.length > 20);
		assert.equal(data.mode, id === 'luuna-orchestrator' ? 'primary' : 'subagent');
		assert.ok(body.length > 300, id);
		assert.deepEqual(data.permissions[0], { action: '*', resource: '*', effect: 'deny' });
		for (const rule of data.permissions) {
			assert.deepEqual(Object.keys(rule).sort(), ['action', 'effect', 'resource']);
			assert.ok(typeof rule.action === 'string' && typeof rule.resource === 'string');
			assert.ok(['allow', 'ask', 'deny'].includes(rule.effect));
		}
	}
});

test('authored rule model preserves read-only/writer/delegation/publication boundaries', () => {
	let probes = 0;
	for (const id of team) {
		const profile = agent(id);
		const check = (action, resource, expected) => {
			assert.equal(effect(profile, action, resource), expected, `${id}: ${action} ${resource}`);
			probes++;
		};
		check('read', 'src/lib/index.js', 'allow');
		for (const secret of [
			'.env',
			'.env.production',
			'.npmrc',
			'key.pem',
			'key.key',
			'key.p12',
			'key.pfx',
			'.ssh/id_ed25519',
			'nested/.ssh/id_ed25519',
			'.aws/credentials',
			'nested/.aws/credentials'
		]) {
			check('read', secret, 'deny');
		}
		check('read', path.join(homedir(), '.ssh/id_ed25519'), 'deny');
		check('read', path.join(homedir(), '.aws/credentials'), 'deny');
		check('read', '.env.example', 'allow');
		check('external_directory', '/unconfigured-external-reference/*', 'ask');
		check('execute', '*', 'deny');
		check('open-design_write_file', '*', 'deny');
		check('opencode_list_mcp_resources', 'open-design', 'deny');
		check('opencode_read_mcp_resource', 'open-design:example', 'deny');
		check('skill', 'opendesign', 'deny');
		check('skill', 'luuna-validation', 'allow');
		check('edit', 'src/example.js', writers.has(id) ? 'ask' : 'deny');
		check('edit', '.opencode/agents/luuna-reviewer.md', 'deny');
		check('edit', 'AGENTS.md', 'deny');
		check('edit', 'opencode.json', 'deny');
		check('edit', 'opencode.jsonc', 'deny');
		check('edit', '/external-reference/example.md', 'deny');
		check('edit', 'Q:/external-reference/example.md', 'deny');
		check('edit', '//external-host/reference/example.md', 'deny');
		check('shell', 'npm test', writers.has(id) ? 'ask' : 'deny');
		check('shell', 'npm ci', writers.has(id) ? 'ask' : 'deny');
		for (const command of [
			'git push',
			'git push origin main',
			'git -C example push origin main',
			'gh pr create',
			'gh pr merge 1',
			'npm publish',
			'npm --access public publish'
		]) {
			check('shell', command, 'deny');
		}
		check('subagent', 'general', 'deny');
		for (const child of team)
			check('subagent', child, id === 'luuna-orchestrator' && child !== id ? 'allow' : 'deny');
		check(
			'edit',
			'.opencode/runs/check.json',
			id === 'luuna-orchestrator' ? 'allow' : writers.has(id) ? 'ask' : 'deny'
		);
		if (writers.has(id))
			check('edit', path.join(homedir(), '.config/opencode/skills/x/SKILL.md'), 'deny');
	}
	assert.ok(probes >= 350, `Expected broad source-rule probes, got ${probes}`);
});

test('six commands route to existing agents and never run shell expansion', () => {
	assert.deepEqual(
		readdirSync(path.join(configRoot, 'commands')).sort(),
		Object.keys(expectedCommands)
			.map((id) => `${id}.md`)
			.sort()
	);
	for (const [id, [selected, child]] of Object.entries(expectedCommands)) {
		const document = read(`commands/${id}.md`);
		const { data, body } = frontmatter(document);
		assert.deepEqual(Object.keys(data).sort(), ['agent', 'description', 'subagent']);
		assert.equal(data.agent, selected);
		assert.equal(data.subagent, child);
		assert.ok(team.includes(selected) || ['plan', 'build'].includes(selected));
		assert.ok(typeof data.description === 'string' && data.description.length > 10);
		assert.equal((body.match(/\$ARGUMENTS/g) || []).length, 1);
		assert.ok(!document.includes('!`'), 'Shell interpolation bypasses tool permission prompts');
	}
});

test('six skills have valid names/descriptions and project-local source references resolve', () => {
	assert.deepEqual(readdirSync(path.join(configRoot, 'skills')).sort(), [...projectSkills].sort());
	for (const id of projectSkills) {
		assert.match(id, /^[a-z0-9]+(-[a-z0-9]+)*$/);
		const { data, body } = frontmatter(read(`skills/${id}/SKILL.md`));
		assert.deepEqual(Object.keys(data).sort(), ['description', 'name']);
		assert.ok(typeof data.name === 'string' && data.name.length > 0);
		assert.ok(typeof data.description === 'string' && data.description.length > 30);
		assert.ok(body.length > 300);
	}
	for (const file of files(configRoot).filter((file) => file.endsWith('.md'))) {
		const document = readFileSync(file, 'utf8');
		assert.equal((document.match(/^```/gm) || []).length % 2, 0, `Unclosed fence: ${file}`);
		for (const match of document.matchAll(/`(\.opencode\/[A-Za-z0-9_./-]+)`/g)) {
			if (['.opencode/runs/', '.opencode/local/'].some((prefix) => match[1].startsWith(prefix)))
				continue;
			assert.ok(existsSync(path.join(publicRoot, match[1])), `${file}: ${match[1]}`);
		}
	}
	for (const template of [
		'assignment.md',
		'context.md',
		'plan.md',
		'candidate.json',
		'check-result.json',
		'review.md',
		'completion.md'
	]) {
		assert.ok(existsSync(path.join(configRoot, 'templates', template)), template);
	}
	assert.ok(existsSync(path.join(publicRoot, 'docs/opencode.md')));
});

test('optional reference example is inert, env-based and read-only without access grants', () => {
	const example = json('templates/optional-luuna-reference.jsonc.example');
	assert.deepEqual(Object.keys(example).sort(), ['$schema', 'policies', 'references']);
	assert.equal(example.$schema, 'https://opencode.ai/config.json');
	assert.deepEqual(Object.keys(example.references), ['luuna-spec']);
	assert.equal(example.references['luuna-spec'].path, '{env:LUUNA_SPEC_DIR}');
	assert.equal(typeof example.references['luuna-spec'].description, 'string');
	assert.deepEqual(example.policies, [
		{ action: 'tool.use', resource: 'edit:{env:LUUNA_SPEC_DIR}/*', effect: 'deny' }
	]);
	assert.ok(!Object.hasOwn(json('opencode.jsonc'), 'references'));
	const guide = readFileSync(path.join(publicRoot, 'docs/opencode.md'), 'utf8');
	assert.match(guide, /unset variables with an empty string/);
	assert.match(guide, /nonempty and the directory exists/);
	assert.match(guide, /not an\s+auto-loaded/);
	assert.match(read('references/luuna.md'), /Normal CLI\/build work|normal project checks/);
});

test('Brodynelly source-first profile matches actual scripts, source paths and package contract', () => {
	assert.ok(
		existsProduct('package.json'),
		`Set PRODUCT_ROOT to a real product checkout: ${productRoot}`
	);
	const profile = json('profiles/brodynelly-ui.json');
	const pkg = JSON.parse(readProduct('package.json'));
	assert.equal(profile.schema_version, 'opencode-luuna.repository-profile/v1');
	assert.equal(profile.repository_id, 'brodynelly-ui');
	assert.equal(profile.kind, 'svelte-source-first-component-library');
	assert.equal(profile.working_directory, '.');
	assert.equal(profile.baseline.status, 'unverified');
	assert.match(profile.baseline.note, /not run evidence/);
	assert.equal(pkg.name, profile.repository_id);
	assert.equal(pkg.private, true);
	assert.equal(Object.keys(pkg.dependencies || {}).length, 0);
	assert.equal(Object.keys(pkg.peerDependencies || {}).length, 0);
	for (const hook of ['prepare', 'preinstall', 'install', 'postinstall', 'pre' + 'pack', 'build']) {
		assert.ok(!Object.hasOwn(pkg.scripts, hook), `Unexpected root lifecycle/build script: ${hook}`);
	}
	assert.equal(pkg.bin['brodynelly-ui'], profile.installer_entry);
	assert.equal(profile.public_entry, 'src/lib/index.js');
	assert.equal(profile.shared_styles, 'src/lib/styles.css');
	assert.equal(profile.registry_generator, 'scripts/build-registry.mjs');
	for (const file of [...profile.sources, profile.shared_styles, profile.showcase])
		assert.ok(existsProduct(file), file);
	assert.ok(profile.generated_paths.includes('registry'));
	const barrel = readProduct(profile.public_entry);
	const exports = [
		...barrel.matchAll(/^export \{ default as ([A-Za-z0-9_]+) \} from '([^']+)';$/gm)
	];
	assert.equal(profile.public_component_count, 83);
	assert.equal(exports.length, profile.public_component_count);
	assert.equal(new Set(exports.map((entry) => entry[1])).size, 83);
	for (const entry of exports) assert.ok(existsProduct(path.join('src/lib', entry[2])), entry[2]);
	const expected = [
		'dev',
		'preview',
		'sync',
		'site:build',
		'registry:build',
		'registry:check',
		'test',
		'test:registry',
		'test:installer',
		'lint'
	];
	const recipes = new Map(profile.recipes.map((recipe) => [recipe.id, recipe]));
	assert.equal(recipes.size, profile.recipes.length);
	assert.deepEqual([...recipes.keys()].sort(), ['dependencies', ...expected].sort());
	for (const recipe of profile.recipes) {
		assert.equal(recipe.executable, 'npm');
		assert.equal(recipe.working_directory, '.');
		assert.ok(Number.isInteger(recipe.timeout_ms) && recipe.timeout_ms > 0);
		assert.ok(recipe.capabilities.length > 0 && recipe.expected_artifacts.length > 0);
		assert.ok(recipe.note.length > 20);
		if (recipe.id === 'dependencies') assert.deepEqual(recipe.arguments, ['ci']);
		else if (recipe.id === 'test') assert.deepEqual(recipe.arguments, ['test']);
		else {
			assert.deepEqual(recipe.arguments, ['run', recipe.id]);
			assert.ok(Object.hasOwn(pkg.scripts, recipe.id), recipe.id);
		}
	}
	assert.equal(pkg.scripts.test, 'vitest run');
	assert.equal(pkg.scripts['site:build'], 'vite build');
	assert.equal(pkg.scripts['registry:build'], 'node scripts/build-registry.mjs');
	assert.equal(pkg.scripts['registry:check'], 'node scripts/build-registry.mjs --check');
	assert.match(readProduct('vite.config.js'), /PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH/);
	assert.match(readProduct('vite.config.js'), /tests\/pointer/);
	assert.match(JSON.stringify(recipes.get('test')), /PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH/);
});

test('templates are unexecuted adaptations, not fabricated candidates or passes', () => {
	for (const name of ['candidate.json', 'check-result.json']) {
		const record = json(`templates/${name}`);
		assert.equal(record.template, true);
		assert.ok(record.schema_version.startsWith('opencode-luuna.'));
		assert.notEqual(record.status, 'passed');
		assert.equal(record.approved_plan_revision, null);
	}
	assert.equal(json('templates/check-result.json').status, 'blocked');
	assert.equal(json('templates/check-result.json').tests.executed, null);
	assert.deepEqual(json('templates/candidate.json').repositories, []);
});

test('public source contains no host bindings, stale profile names, secret payloads or run identities', () => {
	const oldName = ['apple', 'svelte'].join('-');
	const prohibited = [
		/[A-Za-z]:[\\/](?:Users|Program Files|Windows)[\\/]/i,
		/\/Users\/[^/\s]+\//,
		/\/home\/[^/\s]+\//,
		/\\\\\.\\pipe\\/,
		/\b(?:ses|msg|call|run)_[a-zA-Z0-9]{12,}\b/,
		/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
		/\b(?:ghp_|github_pat_)[A-Za-z0-9_]{20,}/,
		/\bsk-[A-Za-z0-9_-]{24,}/
	];
	for (const file of files(configRoot).concat(path.join(publicRoot, 'docs/opencode.md'))) {
		const relative = normalize(path.relative(publicRoot, file));
		assert.ok(!relative.startsWith('.opencode/runs/'));
		assert.ok(!relative.startsWith('.opencode/references/docs/'));
		assert.ok(!/\.(png|jpe?g|pdf|log|env|key|pem|p12|pfx)$/i.test(relative));
		const document = readFileSync(file, 'utf8');
		assert.ok(!document.includes(oldName), `Stale project identity: ${relative}`);
		for (const pattern of prohibited)
			assert.ok(!pattern.test(document), `Nonportable/private payload: ${relative}: ${pattern}`);
	}
	assert.match(read('.gitignore'), /^\/runs\/$/m);
	assert.match(read('.gitignore'), /^\/local\/$/m);
});

test('current operating policy retains source gate/repair choices without restoring removed gates', () => {
	const policy = read('instructions/luuna.md');
	// Ordered-list formatting may renumber steps; verify the actual policy choices.
	assert.match(
		policy,
		/^\d+\. Delegate dependency-ready assignments\. Give only the context they need\.\n\d+\. Freeze the candidate/m
	);
	assert.ok(!policy.includes('Obtain approval. Missing/failing/empty tests require'));
	assert.ok(!policy.includes('Before any feature write, confirm repository identities'));
	assert.ok(!policy.includes('One initial attempt plus at most two repairs per failing task'));
	assert.ok(policy.includes('Include an aggregate repair/time ceiling in the approved plan'));
	assert.ok(policy.includes('.opencode/profiles/brodynelly-ui.json'));
	assert.ok(policy.includes('optional external `luuna-spec`'));
});
