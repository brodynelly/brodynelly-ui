import { mount } from 'svelte';
import Fixture from './SplitViewPointer.svelte';

mount(Fixture, {
	target: document.body,
	props: { dir: document.documentElement.dir || 'ltr' }
});
