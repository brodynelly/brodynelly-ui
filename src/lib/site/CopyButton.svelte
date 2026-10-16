<script>
	import { onMount } from 'svelte';

	let { text, label } = $props();
	const id = $props.id();
	let pending = $state(false);
	let message = $state('');
	let manual = $state(false);
	let interactive = $state(false);
	onMount(() => (interactive = true));

	async function copy() {
		if (pending) return;
		pending = true;
		message = 'Copying…';
		try {
			if (!globalThis.navigator?.clipboard?.writeText) {
				manual = true;
				message = 'Clipboard unavailable. Select and copy the command below.';
				return;
			}
			await navigator.clipboard.writeText(text);
			message = 'Command copied. Run it in your project to add the source files.';
			manual = false;
		} catch {
			manual = true;
			message = 'Could not copy. Select and copy the command below.';
		} finally {
			pending = false;
		}
	}
</script>

<div class="site-copy">
	<button
		type="button"
		class="site-button"
		disabled={!interactive}
		aria-label={label}
		aria-disabled={pending}
		aria-busy={pending}
		aria-describedby={`${id}-status`}
		onclick={copy}
	>
		{label}
	</button>
	<p
		id={`${id}-status`}
		class="copy-status"
		role="status"
		aria-live="polite"
		aria-label={`${label} status`}
	>
		{message}
	</p>
	{#if manual}
		<div class="manual-copy">
			<label for={`${id}-manual`}>Manual copy: {label}</label>
			<textarea id={`${id}-manual`} readonly value={text} rows="3" spellcheck="false"></textarea>
		</div>
	{/if}
</div>
