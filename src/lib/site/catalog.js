import registry from '../../../registry/index.json';

export const upstream = 'https://github.com/brodynelly/brodynelly-ui';
export const installer = 'npx --yes --package=github:brodynelly/brodynelly-ui brodynelly-ui';
export const uiDirectory = 'src/lib/components/ui/';
export const components = [...registry.items].sort((a, b) => a.name.localeCompare(b.name));
export const addCommand = (name) => `${installer} add ${name}`;

export function findComponents(query) {
	const term = query.trim().toLowerCase();
	return components.filter((item) =>
		[item.name, item.exportName, item.entry].some((value) => value.toLowerCase().includes(term))
	);
}

export const switchExample = `<script>
  import '$lib/components/ui/styles.css'; // once, usually in +layout.svelte
  import Switch from '$lib/components/ui/controls/Switch.svelte';

  let notifications = $state(true);
</script>

<Switch bind:checked={notifications} label="Notifications" />`;
