import { syncRegistry } from './registry.mjs';

const args = process.argv.slice(2);
if (args.some((arg) => arg !== '--check') || args.length > 1) {
	console.error('Usage: node scripts/build-registry.mjs [--check]');
	process.exitCode = 1;
} else {
	try {
		const result = await syncRegistry({ check: args.includes('--check') });
		console.log(
			`Registry ${args.includes('--check') ? 'verified' : 'built'}: ${result.index.items.length} components; ${result.index.sourceFingerprint}`
		);
	} catch (error) {
		console.error(error.message);
		process.exitCode = 1;
	}
}
