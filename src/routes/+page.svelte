<script>
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import SiteShell from '$lib/site/SiteShell.svelte';
	import CopyButton from '$lib/site/CopyButton.svelte';
	import {
		addCommand,
		components,
		findComponents,
		switchExample,
		uiDirectory
	} from '$lib/site/catalog.js';

	let query = $state('');
	let interactive = $state(false);
	let searchInput;
	const matches = $derived(findComponents(query));
	onMount(() => (interactive = true));

	function clearSearch() {
		query = '';
		searchInput?.focus();
	}
</script>

<svelte:head>
	<title>Brodynelly UI — Svelte components. In your source.</title>
	<meta
		name="description"
		content={`${components.length} editable Svelte components. Copy the files you need, import locally, and make them your own. No Tailwind required.`}
	/>
</svelte:head>

<SiteShell>
	<section class="hero" aria-labelledby="intro-title">
		<h1 id="intro-title">Svelte components. In your source.</h1>
		<p class="lead">
			{components.length} editable components. Copy the files you need into your project, import them
			locally, and make them your own. No Brodynelly UI runtime import. No Tailwind required.
		</p>
		<div class="command-block">
			<p>Add your first component</p>
			<code>{addCommand('switch')}</code>
			<CopyButton text={addCommand('switch')} label="Copy first Switch command" />
		</div>
		<p class="muted">
			Run in a Svelte 5.20+ project with Node 20.19+. Files go into <code>{uiDirectory}</code> by default.
			The button only copies the command; it doesn’t install anything.
		</p>
		<p class="lead"><a href={`${base}/setup`}>Set up local styles and imports</a></p>
	</section>

	<section class="site-section" aria-labelledby="local-title">
		<h2 id="local-title">Import locally. Edit freely.</h2>
		<p>
			Import the copied stylesheet once, usually in your root <code>+layout.svelte</code>. Then
			import the component directly from your own source.
		</p>
		<pre class="source-example"><code>{switchExample}</code></pre>
		<p>
			Open <code>{uiDirectory}controls/Switch.svelte</code> to change its behavior or appearance. The
			files are yours to maintain, not a runtime dependency.
		</p>
	</section>

	<section class="site-section" aria-labelledby="safety-title">
		<h2 id="safety-title">Your edits stay yours.</h2>
		<p>
			The installer refuses conflicting edited files by default, before writing anything. Identical
			files are skipped. Review your changes before choosing a different policy.
		</p>
		<dl class="safety-list">
			<div>
				<dt><code>--dry-run</code></dt>
				<dd>Preview the plan with zero target writes. Conflicts are still reported.</dd>
			</div>
			<div>
				<dt><code>--keep-existing</code></dt>
				<dd>
					Keep existing files and add missing ones. Check compatibility with your customizations.
				</dd>
			</div>
			<div>
				<dt><code>--overwrite</code></dt>
				<dd>Explicitly replace conflicting files in the plan. Save your edits first.</dd>
			</div>
		</dl>
		<p>
			<a href={`${base}/setup#edited-files`}>See safe add and update commands</a>. There are no
			silent upgrades to your customized source.
		</p>
	</section>

	<section id="components" class="site-section" aria-labelledby="catalog-title">
		<h2 id="catalog-title">Find your next component.</h2>
		<p>
			Browse all {components.length} components. Open a row for its local source path and exact add command.
		</p>
		<div class="search-controls">
			<div class="search-field">
				<label for="component-search">Find a component</label>
				<input
					id="component-search"
					type="search"
					disabled={!interactive}
					bind:value={query}
					bind:this={searchInput}
					aria-describedby="search-help"
				/>
			</div>
			{#if query}<button type="button" class="site-button" onclick={clearSearch}
					>Clear search</button
				>{/if}
		</div>
		<p id="search-help" class="muted">
			Search by CLI name, export name, or source path. Filtering runs locally in your browser.
		</p>
		<noscript
			><p>
				Search and copy buttons need JavaScript. You can still browse every row and select the
				commands below.
			</p></noscript
		>
		<p role="status" aria-live="polite" aria-label="Component search results">
			{matches.length} of {components.length} components
		</p>
		<ul class="component-list" aria-label="Component source catalog">
			{#each matches as item (item.name)}
				<li>
					<details>
						<summary><strong>{item.exportName}</strong> <code>{item.name}</code></summary>
						<div class="component-source">
							<dl>
								<dt>CLI name</dt>
								<dd><code>{item.name}</code></dd>
								<dt>Local file</dt>
								<dd><code>{uiDirectory}{item.entry}</code></dd>
							</dl>
							<code>{addCommand(item.name)}</code>
							<CopyButton text={addCommand(item.name)} label={`Copy ${item.exportName} command`} />
						</div>
					</details>
				</li>
			{:else}
				<li><p>No components match “{query}”. Try a different name or clear your search.</p></li>
			{/each}
		</ul>
	</section>
</SiteShell>
