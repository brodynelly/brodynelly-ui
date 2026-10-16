import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { agent, effect, frontmatter, json, publicRoot, read, team } from './helpers.mjs';

// Source contracts only. No OpenCode CLI/API, MCP, provider, shell or file writes.
test('OpenDesign skill has an explicit local supporting reference and honest optional capability levels', () => {
	const { data, body } = frontmatter(read('skills/opendesign/SKILL.md'));
	assert.equal(data.name, 'OpenDesign');
	assert.ok(data.description.includes('OpenDesign integrations'));
	assert.ok(body.includes('references/integrations.md'));
	const reference = read('skills/opendesign/references/integrations.md');
	assert.ok(reference.includes('user-supplied Integrations'));
	assert.ok(reference.includes('docs/skills-protocol.md'));
	assert.ok(reference.includes('docs/agent-adapters.md'));
	assert.ok(reference.includes('https://opencode.ai/v2/docs/mcp-servers'));
	assert.ok(reference.includes('No MCP command, executable, endpoint'));
	for (const level of ['configured', 'connected', 'read-only checked', 'generation verified']) {
		assert.ok(reference.includes(`\`${level}\``), level);
	}
	assert.ok(reference.includes('do not connect to MCP, call a provider, generate designs'));
});

test('OpenDesign command selects current-session Build without shell expansion or implied generation', () => {
	const document = read('commands/opendesign.md');
	const { data, body } = frontmatter(document);
	assert.deepEqual(Object.keys(data).sort(), ['agent', 'description', 'subagent']);
	assert.equal(data.agent, 'build');
	assert.equal(data.subagent, false);
	assert.equal((body.match(/\$ARGUMENTS/g) || []).length, 1);
	assert.ok(!document.includes('!`'));
	assert.ok(body.includes('Explicitly load the `opendesign` skill'));
	assert.ok(body.includes('No connection is bundled'));
	assert.ok(body.includes('Do not infer\nsuccessful generation'));
});

test('team source profiles still deny OpenDesign skill, Code Mode and MCP transports', () => {
	for (const id of team) {
		const profile = agent(id);
		for (const [action, resource] of [
			['skill', 'opendesign'],
			['execute', '*'],
			['open-design_write_file', '*'],
			['opencode_list_mcp_resources', 'open-design'],
			['opencode_read_mcp_resource', 'open-design:example']
		])
			assert.equal(effect(profile, action, resource), 'deny', `${id}: ${action}`);
	}
	// Build's inherited/effective runtime capabilities are deliberately not claimed.
});

test('public config has no MCP binding and docs require manual local setup without a second server', () => {
	const config = json('opencode.jsonc');
	assert.ok(!Object.hasOwn(config, 'mcp'));
	assert.ok(!Object.hasOwn(config, 'providers'));
	assert.ok(!Object.hasOwn(config, 'plugins'));
	const guide = readFileSync(path.join(publicRoot, 'docs/opencode.md'), 'utf8');
	assert.ok(guide.includes('No MCP binding from an old project is copied'));
	assert.ok(guide.includes('do not create another server/alias'));
	assert.ok(guide.includes('Local MCP configs can start servers automatically'));
	assert.ok(guide.includes('generation verified'));
	assert.ok(guide.includes('paid generation, exports or other side effects'));
});
