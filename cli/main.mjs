import { fileURLToPath } from 'node:url';
import { parseArguments, usage } from './arguments.mjs';
import { loadRegistry } from './registry.mjs';
import { createPlan } from './plan.mjs';
import { applyPlan } from './transaction.mjs';

export async function run(args) {
	const options = parseArguments(args);
	if (options.command === 'help') {
		console.log(usage);
		return;
	}
	// Bundled assets are always relative to this installed module, not process.cwd().
	const registry = await loadRegistry(fileURLToPath(new URL('../registry/', import.meta.url)));
	if (options.command === 'list') {
		const items = [...registry.items.values()].map(({ name, exportName, entry, requirements }) => ({
			name,
			exportName,
			entry,
			requirements
		}));
		console.log(
			options.json
				? JSON.stringify(items, null, 2)
				: items.map((item) => `${item.name}\t${item.exportName}\t${item.entry}`).join('\n')
		);
		return;
	}
	const plan = await createPlan(registry, options);
	await applyPlan(plan);
	console.log(
		`${options.dryRun ? 'Dry run (zero target writes)' : 'Installed editable source'}: ${plan.directory}`
	);
	for (const action of ['create', 'replace', 'identical', 'keep']) {
		const entries = plan.entries.filter((entry) => entry.action === action);
		if (entries.length) console.log(`  ${action}: ${entries.length}`);
	}
	if (plan.entries.some((entry) => entry.action === 'keep')) {
		console.warn(
			'Warning: --keep-existing preserved customized source/helpers/CSS. Compatibility with new files and maintenance of these customizations are your responsibility.'
		);
	}
	console.log('\nDirect local imports (adjust the relative path from your importing file):');
	for (const item of plan.selected)
		console.log(
			`  import ${item.exportName} from ${JSON.stringify(`./${plan.directory}/${item.entry}`)};`
		);
	console.log(
		`Manual, one-time LOCAL stylesheet import: import ${JSON.stringify(`./${plan.directory}/styles.css`)};`
	);
	console.log(
		'No package, layout, dependency, or host-HTML changes were made. Requires Svelte >=5.20.0.'
	);
	if (plan.selected.some((item) => item.requirements.materialSymbols))
		console.log(
			'Selected components require Material Symbols font setup in your host application (not installed automatically).'
		);
	if (plan.selected.some((item) => item.requirements.svgFilter))
		console.log(
			'Selected components use optional inline SVG filters; check your host/CSP setup manually.'
		);
}
