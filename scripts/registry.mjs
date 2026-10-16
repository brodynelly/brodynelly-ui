import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, posix, resolve } from 'node:path';
import { parse as parseJavaScript } from 'acorn';
import { parse as parseSvelte } from 'svelte/compiler';

export const sha256 = (value) => createHash('sha256').update(value).digest('hex');
export const normalize = (text) => text.replace(/\r\n?/g, '\n');
export const json = (value) => JSON.stringify(value, null, 2) + '\n';
const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const hasControl = (value) =>
	[...value].some((char) => char.codePointAt(0) < 32 || char.codePointAt(0) === 127);

export function itemName(name) {
	return name
		.replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
		.replace(/([a-z])([A-Z])/g, '$1-$2')
		.replace(/([A-Za-z])([0-9])/g, '$1-$2')
		.replace(/([0-9])([A-Za-z])/g, '$1-$2')
		.toLowerCase();
}

function safePath(path) {
	if (typeof path !== 'string' || !path || path.includes('\\') || path.startsWith('/')) {
		throw new Error(`Unsafe path: ${path}`);
	}
	for (const segment of path.split('/')) {
		if (
			!segment ||
			segment === '.' ||
			segment === '..' ||
			/[<>:"|?*]/.test(segment) ||
			hasControl(segment) ||
			/[. ]$/.test(segment) ||
			/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(segment)
		)
			throw new Error(`Unsafe path: ${path}`);
	}
	return path;
}

async function regularFile(root, path) {
	safePath(path);
	let current = root;
	const rootStat = await lstat(current);
	if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) throw new Error(`Unsafe root: ${root}`);
	const segments = path.split('/');
	for (let i = 0; i < segments.length; i++) {
		current = join(current, segments[i]);
		let stat;
		try {
			stat = await lstat(current);
		} catch (error) {
			if (error.code === 'ENOENT') throw new Error(`Unresolved file: ${path}`);
			throw error;
		}
		if (stat.isSymbolicLink()) throw new Error(`Symlink rejected: ${path}`);
		if (i < segments.length - 1 ? !stat.isDirectory() : !stat.isFile()) {
			throw new Error(`Not a regular file path: ${path}`);
		}
	}
	return normalize(await readFile(current, 'utf8'));
}

function walk(node, visit) {
	if (!node || typeof node !== 'object') return;
	if (typeof node.type === 'string') visit(node);
	for (const value of Object.values(node)) {
		if (Array.isArray(value)) for (const child of value) walk(child, visit);
		else if (value && typeof value === 'object') walk(value, visit);
	}
}

export function imports(content, path) {
	const ast = path.endsWith('.svelte')
		? parseSvelte(content, { modern: true })
		: parseJavaScript(content, { ecmaVersion: 'latest', sourceType: 'module' });
	const edges = new Set();
	walk(ast, (node) => {
		if (
			[
				'ImportDeclaration',
				'ExportNamedDeclaration',
				'ExportAllDeclaration',
				'ImportExpression'
			].includes(node.type) &&
			node.source
		) {
			if (node.source.type !== 'Literal' || typeof node.source.value !== 'string') {
				throw new Error(`Nonliteral import in ${path}`);
			}
			edges.add(node.source.value);
		}
		if (
			node.type === 'CallExpression' &&
			node.callee?.type === 'Identifier' &&
			node.callee.name === 'require'
		) {
			throw new Error(`Unsupported require in ${path}`);
		}
	});
	return [...edges].sort(compare);
}

function relativeImport(importer, specifier) {
	if (/^svelte(?:\/[A-Za-z0-9_-]+)*$/.test(specifier)) return null;
	if (!specifier.startsWith('./') && !specifier.startsWith('../')) {
		throw new Error(`Non-Svelte runtime import in ${importer}: ${specifier}`);
	}
	if (/[\\?#:]/.test(specifier) || hasControl(specifier))
		throw new Error(`Unsafe import: ${specifier}`);
	const path = posix.normalize(posix.join(posix.dirname(importer), specifier));
	safePath(path);
	if (
		!/\.(svelte|js)$/.test(path) ||
		/(?:^|\/)(?:fixtures|__screenshots__|private|secrets?|credentials?)(?:\/|$)|\.(?:test|spec|key|pem)\.|(?:^|\/)[._]/i.test(
			path
		) ||
		path === 'index.js'
	) {
		throw new Error(`Excluded dependency: ${path}`);
	}
	return path;
}

function exportsFrom(content) {
	const ast = parseJavaScript(content, { ecmaVersion: 'latest', sourceType: 'module' });
	const names = new Set();
	return ast.body
		.map((node) => {
			if (
				node.type !== 'ExportNamedDeclaration' ||
				!node.source ||
				node.specifiers.length !== 1 ||
				node.specifiers[0].local.name !== 'default'
			) {
				throw new Error('Barrel must contain explicit default component re-exports only');
			}
			const exportName = node.specifiers[0].exported.name;
			if (!/^[A-Z][A-Za-z0-9]*$/.test(exportName)) throw new Error(`Invalid export: ${exportName}`);
			const name = itemName(exportName);
			if (names.has(name)) throw new Error(`Registry name collision: ${name}`);
			names.add(name);
			const entry = relativeImport('index.js', node.source.value);
			if (!entry?.endsWith('.svelte')) throw new Error(`Invalid component entry: ${entry}`);
			return { name, exportName, entry };
		})
		.sort((a, b) => compare(a.name, b.name));
}

function requirements(files, base = false) {
	const content = files.map((file) => file.content).join('\n');
	return {
		svelte: '>=5.20.0',
		materialSymbols: !base && /\bclass\s*=\s*["'][^"']*\bsymbol\b/.test(content),
		svgFilter: !base && /liquid-glass|url\(\s*#/.test(content)
	};
}

export async function generateRegistry({ root = process.cwd(), expectedCount = 83 } = {}) {
	root = resolve(root);
	const pkg = JSON.parse(await regularFile(root, 'package.json'));
	if (
		pkg.name !== 'brodynelly-ui' ||
		typeof pkg.version !== 'string' ||
		!/^\d+\.\d+\.\d+$/.test(pkg.version)
	) {
		throw new Error('Expected Brodynelly UI package identity and semver version');
	}
	const barrel = await regularFile(root, 'src/lib/index.js');
	const entries = exportsFrom(barrel);
	if (entries.length !== expectedCount)
		throw new Error(`Expected ${expectedCount} public components, found ${entries.length}`);
	const input = new Map([
		['src/lib/index.js', barrel],
		['package.identity.json', json({ name: pkg.name, version: pkg.version })]
	]);
	const cache = new Map();
	const paths = new Map();
	async function load(path) {
		const segments = path.split('/');
		for (let i = 1; i <= segments.length; i++) {
			const prefix = segments.slice(0, i).join('/');
			const folded = prefix.toLowerCase();
			if (paths.has(folded) && paths.get(folded) !== prefix)
				throw new Error(`Case-colliding source paths: ${path}`);
			paths.set(folded, prefix);
		}
		if (!cache.has(path)) {
			const content = await regularFile(root, `src/lib/${path}`);
			const file = {
				path,
				kind: path.endsWith('.svelte') ? 'component' : 'module',
				sha256: sha256(content),
				content
			};
			cache.set(path, {
				file,
				edges: imports(content, path)
					.map((edge) => relativeImport(path, edge))
					.filter(Boolean)
			});
			input.set(`src/lib/${path}`, content);
		}
		return cache.get(path);
	}
	async function closure(entry) {
		const visited = new Set();
		async function visit(path) {
			if (visited.has(path)) return;
			visited.add(path);
			const { edges } = await load(path);
			for (const edge of edges) await visit(edge);
		}
		await visit(entry);
		return [...visited].sort(compare).map((path) => cache.get(path).file);
	}
	const baseFiles = [];
	for (const [path, kind, source] of [
		['styles.css', 'style', 'src/lib/styles.css'],
		['LICENSE', 'license', 'LICENSE'],
		['NOTICE.md', 'notice', 'NOTICE.md']
	]) {
		const content = await regularFile(root, source);
		input.set(source, content);
		baseFiles.push({ path, kind, sha256: sha256(content), content });
	}
	baseFiles.sort((a, b) => compare(a.path, b.path));
	const base = {
		schemaVersion: 1,
		type: 'base',
		name: 'base',
		version: pkg.version,
		exportName: null,
		entry: null,
		requirements: requirements(baseFiles, true),
		files: baseFiles
	};
	const artifacts = new Map([['base.json', json(base)]]);
	const items = [];
	for (const entry of entries) {
		const files = await closure(entry.entry);
		const payload = `items/${entry.name}.json`;
		const content = json({
			schemaVersion: 1,
			type: 'component',
			name: entry.name,
			version: pkg.version,
			exportName: entry.exportName,
			entry: entry.entry,
			requirements: requirements(files),
			files
		});
		artifacts.set(payload, content);
		items.push({ ...entry, payload, sha256: sha256(content) });
	}
	const manifest = [...input]
		.sort(([a], [b]) => compare(a, b))
		.map(([path, content]) => ({ path, sha256: sha256(content) }));
	const sourceFingerprint = sha256(json(manifest));
	const index = {
		schemaVersion: 1,
		name: pkg.name,
		version: pkg.version,
		sourceFingerprint,
		base: { payload: 'base.json', sha256: sha256(artifacts.get('base.json')) },
		items
	};
	artifacts.set('index.json', json(index));
	return { artifacts, index, manifest };
}

async function existingArtifacts(directory) {
	const result = new Map();
	async function visit(path = '') {
		let entries;
		try {
			entries = await readdir(join(directory, path), { withFileTypes: true });
		} catch (error) {
			if (error.code === 'ENOENT' && !path) return;
			throw error;
		}
		for (const entry of entries.sort((a, b) => compare(a.name, b.name))) {
			const name = path ? `${path}/${entry.name}` : entry.name;
			safePath(name);
			const stat = await lstat(join(directory, name));
			if (stat.isSymbolicLink()) throw new Error(`Symlink in registry: ${name}`);
			if (stat.isDirectory()) await visit(name);
			else if (stat.isFile()) result.set(name, await readFile(join(directory, name)));
			else throw new Error(`Nonregular registry artifact: ${name}`);
		}
	}
	try {
		const stat = await lstat(directory);
		if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error('Unsafe registry directory');
	} catch (error) {
		if (error.code !== 'ENOENT') throw error;
	}
	await visit();
	return result;
}

export async function syncRegistry({
	root = process.cwd(),
	check = false,
	expectedCount = 83
} = {}) {
	root = resolve(root);
	const generated = await generateRegistry({ root, expectedCount });
	const directory = join(root, 'registry');
	const existing = await existingArtifacts(directory);
	const differences = [];
	for (const [path, content] of generated.artifacts) {
		if (!existing.get(path)?.equals(Buffer.from(content, 'utf8'))) differences.push(path);
	}
	for (const path of existing.keys()) if (!generated.artifacts.has(path)) differences.push(path);
	if (check) {
		if (differences.length)
			throw new Error(`Registry out of date: ${differences.sort(compare).join(', ')}`);
		return generated;
	}
	// Generation completes and validates all input before any artifact is written.
	// Only obsolete JSON item payloads are owned cleanup; refuse unexpected files.
	for (const path of existing.keys()) {
		if (!generated.artifacts.has(path) && !/^items\/[a-z0-9]+(?:-[a-z0-9]+)*\.json$/.test(path)) {
			throw new Error(`Unexpected registry file; preserve and reconcile: ${path}`);
		}
	}
	for (const [path, content] of generated.artifacts) {
		await mkdir(dirname(join(directory, path)), { recursive: true });
		if (!existing.get(path)?.equals(Buffer.from(content, 'utf8')))
			await writeFile(join(directory, path), content, 'utf8');
	}
	for (const path of existing.keys())
		if (!generated.artifacts.has(path)) await unlink(join(directory, path));
	return generated;
}
