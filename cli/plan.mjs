import {
	isObject,
	parseJSON,
	relativePath,
	requireValue,
	sha256,
	validateInventory
} from './format.mjs';
import { checkDirectory, inspect, nativeIO, projectRoot } from './filesystem.mjs';

export const configName = '.brodynelly-ui.json';
export const lockName = '.brodynelly-ui.lock';
export const defaultDirectory = 'src/lib/components/ui';

function directoryPath(value) {
	relativePath(value, 'UI directory');
	requireValue(
		!value.split('/')[0].toLowerCase().startsWith('.brodynelly-ui'),
		'UI directory conflicts with installer state paths'
	);
	return value;
}

export async function createPlan(registry, options, io = nativeIO) {
	const root = await projectRoot(options.cwd, io);
	const lock = await inspect(root, lockName, io);
	requireValue(
		lock.kind === 'missing',
		'Another installer may be running: .brodynelly-ui.lock exists. Do not remove an active or unverified lock.'
	);
	const config = await inspect(root, configName, io);
	let saved;
	if (config.kind === 'file') {
		saved = parseJSON(config.content, configName, 65536);
		requireValue(
			isObject(saved) &&
				saved.schemaVersion === 1 &&
				typeof saved.directory === 'string' &&
				Object.keys(saved).every((key) => key === 'schemaVersion' || key === 'directory'),
			'Invalid .brodynelly-ui.json schema'
		);
		directoryPath(saved.directory);
	}
	const directory = directoryPath(options.directory ?? saved?.directory ?? defaultDirectory);
	if (saved && saved.directory !== directory) {
		requireValue(
			options.command === 'init' && options.overwrite,
			'Directory disagrees with retained config; use init --dir <directory> --overwrite to change it'
		);
	}
	await checkDirectory(root, directory, io);
	for (const name of options.names ?? [])
		requireValue(registry.items.has(name), `Unknown component: ${name}`);
	const selected =
		options.command === 'init'
			? []
			: options.all
				? [...registry.items.values()]
				: options.names.map((name) => {
						requireValue(registry.items.has(name), `Unknown component: ${name}`);
						return registry.items.get(name);
					});
	const files = new Map(registry.base.files);
	for (const item of selected) for (const [name, file] of item.files) files.set(name, file);
	const targets = new Map(
		[...files].map(([name, file]) => [
			`${directory}/${name}`,
			{ content: Buffer.from(file.content, 'utf8'), hash: file.sha256 }
		])
	);
	if (options.command === 'init') {
		const content = Buffer.from(
			`${JSON.stringify({ schemaVersion: 1, directory }, null, 2)}\n`,
			'utf8'
		);
		targets.set(configName, { content, hash: sha256(content) });
	}
	validateInventory(targets.keys(), 'installation plan');
	const entries = [];
	const conflicts = [];
	for (const [relative, file] of [...targets].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
		const before = relative === configName ? config : await inspect(root, relative, io);
		let action = 'create';
		if (before.kind === 'file') {
			if (before.hash === file.hash && before.content.equals(file.content)) action = 'identical';
			else if (options.overwrite) action = 'replace';
			else if (options.keepExisting) action = 'keep';
			else {
				action = 'conflict';
				conflicts.push(relative);
			}
		}
		entries.push({ relative, ...file, before, action });
	}
	requireValue(
		conflicts.length === 0,
		`Conflicting edited files; no files written:\n${conflicts.map((name) => `  ${name}`).join('\n')}\nUse --keep-existing to preserve edits, or --overwrite to replace planned regular files.`
	);
	return { root, directory, selected, entries, config, options, registryVersion: registry.version };
}
