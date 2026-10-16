/** @type {WeakMap<Document, { count: number, values: { name: string, value: string, priority: string }[] }>} */
const locks = new WeakMap();

/**
 * Lock once per document, not once per sheet. Nested dialogs must not unlock
 * their parent, and cleanup must preserve pre-existing inline overflow rules.
 * @param {Document} document
 * @returns {() => void} An idempotent release function.
 */
export function lockScroll(document) {
	const style = document.documentElement.style;
	let lock = locks.get(document);
	if (!lock) {
		lock = {
			count: 0,
			values: ['overflow-x', 'overflow-y'].map((name) => ({
				name,
				value: style.getPropertyValue(name),
				priority: style.getPropertyPriority(name)
			}))
		};
		locks.set(document, lock);
		for (const { name } of lock.values) style.setProperty(name, 'hidden', 'important');
	}
	lock.count += 1;
	let released = false;

	return () => {
		if (released) return;
		released = true;
		lock.count -= 1;
		if (lock.count) return;
		for (const { name, value, priority } of lock.values) {
			// Do not overwrite a newer style applied by the application while open.
			if (
				style.getPropertyValue(name) !== 'hidden' ||
				style.getPropertyPriority(name) !== 'important'
			) {
				continue;
			}
			if (value) style.setProperty(name, value, priority);
			else style.removeProperty(name);
		}
		locks.delete(document);
	};
}
