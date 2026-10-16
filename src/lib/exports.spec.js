import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import * as library from './index.js';

const additions = {
	Window: {},
	WindowChoice: { label: 'Preview' },
	WindowControls: {},
	WindowResizeControl: {},
	SplitView: {},
	Menu: { label: 'Actions' },
	MenuItem: { label: 'Duplicate' },
	Sheet: { title: 'Preferences' },
	Switch: { label: 'Notifications' },
	Slider: { label: 'Volume' },
	Stepper: { label: 'Copies' },
	SearchField: { label: 'Search' },
	ProgressBar: { label: 'Progress', value: 40 },
	EmptyState: { title: 'No items yet' }
};

describe('public component exports', () => {
	it('keeps the original APIs alongside the new families', () => {
		expect(Object.keys(library)).toEqual(
			expect.arrayContaining([
				'Button',
				'Version26Button',
				'Alert',
				'ActionSheet',
				'Sidebar',
				...Object.keys(additions)
			])
		);
	});

	for (const [name, props] of Object.entries(additions)) {
		it(`${name} can render without browser globals`, () => {
			expect(() => render(library[name], { props })).not.toThrow();
		});
	}
});
