import { createHash } from 'node:crypto';

export const sha256 = (value) => createHash('sha256').update(value).digest('hex');
// Conservative cross-platform comparison, also covering dotless-i/final-sigma
// aliases that plain toLowerCase() misses on case-insensitive filesystems.
export const caseKey = (value) => value.normalize('NFC').toUpperCase().toLowerCase();
export const isObject = (value) =>
	value !== null && typeof value === 'object' && !Array.isArray(value);
export function requireValue(condition, message) {
	if (!condition) throw new Error(message);
}

// JSON.parse alone silently accepts duplicate keys. This second, non-executing
// pass rejects ambiguous objects (including escaped spellings of the same key).
export function parseJSON(bytes, label, limit = 32 * 1024 * 1024) {
	requireValue(bytes.length <= limit, `${label}: JSON exceeds the size limit`);
	let text;
	let value;
	try {
		text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
		requireValue(
			!Buffer.from(bytes)
				.subarray(0, 3)
				.equals(Buffer.from([0xef, 0xbb, 0xbf])),
			'BOM'
		);
		value = JSON.parse(text);
	} catch {
		throw new Error(`${label}: expected strict UTF-8 JSON without a BOM`);
	}
	let at = 0;
	let nodes = 0;
	const space = () => {
		while (/\s/.test(text[at] ?? '') && at < text.length) at++;
	};
	function string() {
		const start = at++;
		while (at < text.length) {
			if (text[at++] === '"') return JSON.parse(text.slice(start, at));
			if (text[at - 1] === '\\') at++;
		}
	}
	function scan(depth) {
		requireValue(
			depth <= 100 && ++nodes <= 200000,
			`${label}: JSON nesting/inventory limit exceeded`
		);
		space();
		if (text[at] === '{') {
			at++;
			space();
			const keys = new Set();
			if (text[at] !== '}') {
				while (true) {
					space();
					const key = string();
					requireValue(!keys.has(key), `${label}: duplicate JSON key`);
					keys.add(key);
					space();
					at++;
					scan(depth + 1);
					space();
					if (text[at] !== ',') break;
					at++;
				}
			}
			at++;
		} else if (text[at] === '[') {
			at++;
			space();
			if (text[at] !== ']') {
				while (true) {
					scan(depth + 1);
					space();
					if (text[at] !== ',') break;
					at++;
				}
			}
			at++;
		} else if (text[at] === '"') string();
		else while (at < text.length && !/[\s,\]}]/.test(text[at])) at++;
	}
	scan(0);
	return value;
}

export function relativePath(value, label = 'path') {
	requireValue(
		typeof value === 'string' && value.length > 0 && value.length <= 1024,
		`${label}: expected a nonempty relative path`
	);
	requireValue(!/[\\:<>"|?*\p{Cc}\p{Cf}]/u.test(value), `${label}: unsafe path characters`);
	const segments = value.split('/');
	for (const segment of segments) {
		requireValue(
			segment.length > 0 && segment.length <= 255 && segment !== '.' && segment !== '..',
			`${label}: absolute, empty or dot path segment`
		);
		requireValue(!/[. ]$/.test(segment), `${label}: trailing dot or space`);
		requireValue(
			!/^(?:con|prn|aux|nul|clock\$|conin\$|conout\$|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/iu.test(
				segment
			),
			`${label}: reserved Windows name`
		);
		requireValue(
			Buffer.from(segment, 'utf8').toString('utf8') === segment,
			`${label}: invalid Unicode`
		);
	}
	return value;
}

// All prefixes participate: Foo/a.js and foo/b.js collide even when their leaf
// names differ. A file cannot also be another file's directory.
export function validateInventory(paths, label = 'inventory') {
	const names = new Map();
	const files = new Set();
	const directories = new Set();
	for (const name of paths) {
		relativePath(name, label);
		const parts = name.split('/');
		for (let i = 1; i <= parts.length; i++) {
			const prefix = parts.slice(0, i).join('/');
			const key = caseKey(prefix);
			requireValue(!names.has(key) || names.get(key) === prefix, `${label}: case-colliding paths`);
			names.set(key, prefix);
			if (i < parts.length) directories.add(key);
		}
		files.add(caseKey(name));
	}
	for (const name of files)
		requireValue(!directories.has(name), `${label}: file/directory collision`);
}
