import { requireValue } from './format.mjs';

export const usage = `Brodynelly UI — editable local Svelte source

  brodynelly-ui list [--json]
  brodynelly-ui init [--cwd <project>] [--dir <relative-ui-dir>] [--dry-run] [--overwrite]
  brodynelly-ui add <name...> [--all] [--cwd <project>] [--dir <relative-ui-dir>]
                    [--dry-run] [--overwrite | --keep-existing]

No dependency installation, remote fetching, executable config, or layout edits.
Directories use forward-slash relative paths. Node.js >=20.19.0 is required.`;

export function parseArguments(args, cwd = process.cwd()) {
	if (args.length === 0 || (args.length === 1 && ['--help', '-h', 'help'].includes(args[0])))
		return { command: 'help' };
	const [command, ...rest] = args;
	requireValue(['list', 'init', 'add'].includes(command), `Unknown command: ${command}\n${usage}`);
	const options = {
		command,
		cwd,
		names: [],
		all: false,
		overwrite: false,
		keepExisting: false,
		dryRun: false,
		json: false
	};
	const allowed =
		command === 'list'
			? ['--json']
			: [
					'--cwd',
					'--dir',
					'--dry-run',
					'--overwrite',
					...(command === 'add' ? ['--all', '--keep-existing'] : [])
				];
	const seen = new Set();
	for (let i = 0; i < rest.length; i++) {
		const arg = rest[i];
		if (!arg.startsWith('-')) {
			requireValue(
				command === 'add' && /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(arg),
				`Unexpected argument: ${arg}`
			);
			requireValue(!options.names.includes(arg), `Duplicate component: ${arg}`);
			options.names.push(arg);
			continue;
		}
		requireValue(
			allowed.includes(arg) && !seen.has(arg),
			`Unknown or duplicate option for ${command}: ${arg}`
		);
		seen.add(arg);
		if (arg === '--cwd' || arg === '--dir') {
			const value = rest[++i];
			requireValue(
				typeof value === 'string' && value.length > 0 && !value.startsWith('-'),
				`Missing value for ${arg}`
			);
			options[arg === '--cwd' ? 'cwd' : 'directory'] = value;
		} else
			options[
				{
					'--all': 'all',
					'--overwrite': 'overwrite',
					'--keep-existing': 'keepExisting',
					'--dry-run': 'dryRun',
					'--json': 'json'
				}[arg]
			] = true;
	}
	requireValue(
		!(options.overwrite && options.keepExisting),
		'--overwrite and --keep-existing are mutually exclusive'
	);
	if (command === 'add')
		requireValue(options.all || options.names.length > 0, 'add requires component names or --all');
	return options;
}
