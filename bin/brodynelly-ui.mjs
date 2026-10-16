#!/usr/bin/env node
import { run } from '../cli/main.mjs';

const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 20 || (major === 20 && minor < 19)) {
	console.error('Brodynelly UI requires Node.js 20.19.0 or newer.');
	process.exitCode = 1;
} else {
	try {
		await run(process.argv.slice(2));
	} catch (error) {
		console.error(`Brodynelly UI: ${error.message}`);
		process.exitCode = 1;
	}
}
