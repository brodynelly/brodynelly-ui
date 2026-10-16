import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Static source checks only. PRODUCT_ROOT separates product files from an inert
// staged .opencode tree; no OpenCode executable, service or external pack is used.
export const configRoot = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
export const publicRoot = path.dirname(configRoot);
export const productRoot = path.resolve(process.env.PRODUCT_ROOT || publicRoot);
export const team = [
	'luuna-orchestrator',
	'luuna-repository-lead',
	'luuna-explorer',
	'luuna-testing-setup',
	'luuna-implementer',
	'luuna-reviewer',
	'luuna-integration-reviewer',
	'apple-frontend-specialist'
];
export const writers = new Set(['luuna-implementer', 'luuna-testing-setup']);
export const projectSkills = [
	'luuna-workflow',
	'luuna-handoffs',
	'luuna-validation',
	'luuna-context',
	'apple-frontend',
	'opendesign'
];
export const expectedCommands = {
	'luuna-plan': ['plan', false],
	'luuna-run': ['luuna-orchestrator', false],
	'luuna-review': ['luuna-reviewer', true],
	'luuna-ui-review': ['apple-frontend-specialist', true],
	'luuna-status': ['luuna-orchestrator', false],
	opendesign: ['build', false]
};

export const read = (relative) => readFileSync(path.join(configRoot, relative), 'utf8');
export const readProduct = (relative) => readFileSync(path.join(productRoot, relative), 'utf8');
export const json = (relative) => JSON.parse(read(relative));
export const normalize = (value) => value.replaceAll('\\', '/');
export const existsProduct = (relative) => existsSync(path.join(productRoot, relative));

export function files(directory) {
	return readdirSync(directory, { withFileTypes: true })
		.flatMap((entry) => {
			// These are local/private runtime stores, not public source inputs. Never
			// recursively inspect them just because a later workflow creates them.
			if (['runs', 'local', 'node_modules', '.cache', 'cache', 'logs'].includes(entry.name))
				return [];
			if (
				normalize(path.relative(configRoot, path.join(directory, entry.name))) === 'references/docs'
			)
				return [];
			assert.ok(!entry.isSymbolicLink(), `Public source must not use symlinks: ${entry.name}`);
			const target = path.join(directory, entry.name);
			return entry.isDirectory() ? files(target) : [target];
		})
		.sort();
}

function scalar(value) {
	const trimmed = value.trim();
	assert.ok(trimmed, 'Empty frontmatter scalar');
	if (trimmed === 'true') return true;
	if (trimmed === 'false') return false;
	if (trimmed.startsWith('"')) return JSON.parse(trimmed);
	if (trimmed.startsWith("'")) {
		assert.ok(trimmed.endsWith("'"), 'Unclosed single-quoted scalar');
		return trimmed.slice(1, -1).replaceAll("''", "'");
	}
	assert.ok(!/[[\]{}\r\n]|:\s/.test(trimmed), `Unsupported plain YAML scalar: ${trimmed}`);
	return trimmed;
}

function put(object, key, value) {
	assert.ok(!Object.hasOwn(object, key), `Duplicate frontmatter key: ${key}`);
	object[key] = scalar(value);
}

// This deliberately validates the small YAML subset authored in this tree,
// not arbitrary YAML, the complete native schema or OpenCode's runtime parser.
export function frontmatter(document) {
	const match = document.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
	assert.ok(match, 'Required Markdown frontmatter missing');
	const data = {};
	let permission;
	for (const line of match[1].split(/\r?\n/)) {
		const top = line.match(/^([a-z][a-z_-]*):(?: (.*))?$/);
		if (top) {
			permission = undefined;
			if (top[1] === 'permissions') {
				assert.equal(top[2], undefined);
				assert.ok(!Object.hasOwn(data, 'permissions'));
				data.permissions = [];
			} else put(data, top[1], top[2] || '');
			continue;
		}
		const inline = line.match(/^ {2}- \{ (.*) \}$/);
		if (inline) {
			assert.ok(Array.isArray(data.permissions));
			permission = {};
			for (const member of inline[1].split(', ')) {
				const field = member.match(/^(action|resource|effect): (.+)$/);
				assert.ok(field, `Invalid permission member: ${member}`);
				put(permission, field[1], field[2]);
			}
			data.permissions.push(permission);
			continue;
		}
		const first = line.match(/^ {2}- action: (.+)$/);
		if (first) {
			assert.ok(Array.isArray(data.permissions));
			permission = { action: scalar(first[1]) };
			data.permissions.push(permission);
			continue;
		}
		const continuation = line.match(/^ {4}(resource|effect): (.+)$/);
		assert.ok(continuation && permission, `Unsupported frontmatter syntax: ${line}`);
		put(permission, continuation[1], continuation[2]);
	}
	return { data, body: document.slice(match[0].length).trim() };
}

export const agent = (id) => frontmatter(read(`agents/${id}.md`)).data;

function expandHome(value) {
	return value.replace(/^(?:~|\$HOME)(?=\/|$)/, normalize(homedir()));
}

export function matches(pattern, value) {
	const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const source = normalize(pattern)
		.split('*')
		.map((part) => part.split('?').map(escape).join('.'))
		.join('.*');
	return new RegExp(`^${source}$`, process.platform === 'win32' ? 'i' : '').test(normalize(value));
}

// Documented whole-value/last-match semantics over authored rules ONLY. This
// does not include inherited config, saved approvals, policies or scanner output.
export function effect(profile, action, resource) {
	return profile.permissions.reduce((result, rule) => {
		const pattern = ['read', 'edit', 'external_directory'].includes(action)
			? expandHome(rule.resource)
			: rule.resource;
		const withoutArgs =
			action === 'shell' && pattern.endsWith(' *') && matches(pattern.slice(0, -2), resource);
		return matches(rule.action, action) && (matches(pattern, resource) || withoutArgs)
			? rule.effect
			: result;
	}, 'ask');
}
