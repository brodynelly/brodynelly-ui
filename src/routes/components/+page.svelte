<script>
	import '$lib/styles.css';
	import { base } from '$app/paths';
	import {
		EmptyState,
		Menu,
		MenuItem,
		ProgressBar,
		SearchField,
		Sheet,
		Slider,
		SplitView,
		Stepper,
		Switch
	} from '$lib';

	let notifications = $state(true);
	let volume = $state(60);
	let copies = $state(1);
	let search = $state('');
	let ratio = $state(4 / 9);
	let selectedNote = $state('A little room to think');
	let pinned = $state(false);
	let sheetOpen = $state(false);
	let status = $state('');
	const notes = [
		{ title: 'A little room to think', detail: 'Keep the important things in view.' },
		{ title: 'Made for the moment', detail: 'Small interactions. Immediate feedback.' },
		{ title: 'Make yourself at home', detail: 'Familiar controls, ready for your app.' }
	];
	const filteredNotes = $derived(
		notes.filter((note) => note.title.toLowerCase().includes(search.toLowerCase()))
	);
	const currentNote = $derived(notes.find((note) => note.title === selectedNote) ?? notes[0]);
</script>

<svelte:head>
	<title>Interactive components — Brodynelly UI</title>
	<meta
		name="description"
		content="Try accessible Svelte windows, split views, menus, sheets, switches, sliders, steppers, and search fields."
	/>
</svelte:head>

<main class="component-page">
	<nav class="page-nav" aria-label="Component previews">
		<a href={`${base}/windows`}>Windows <span aria-hidden="true">↗</span></a>
		<a href={`${base}/showcase`}>Full showcase <span aria-hidden="true">↗</span></a>
		<a href={`${base}/`}>Brodynelly UI — source catalog</a>
	</nav>

	<header class="intro">
		<p class="eyebrow">BRODYNELLY UI / INTERACTIVE COMPONENTS</p>
		<h1>Familiar by design.</h1>
		<p class="lede">
			Real Svelte components. Native keyboard behavior. Motion that follows your lead.
		</p>
	</header>

	<section aria-labelledby="split-title">
		<div class="section-heading">
			<div>
				<h2 id="split-title">A view with room for more.</h2>
				<p class="regular-instruction">Drag the divider, or focus it and use the arrow keys.</p>
				<p class="compact-instruction">Search and choose a note, then read it below.</p>
			</div>
			<span class="readout split-readout">Sidebar {Math.round(ratio * 100)}%</span>
		</div>
		<SplitView
			bind:ratio
			minRatio={0.4}
			maxRatio={0.6}
			class="notes-view"
			style="min-height: 390px;"
		>
			{#snippet sidebar()}
				<div class="note-sidebar">
					<h3>Notes</h3>
					<SearchField bind:value={search} label="Search notes" placeholder="Search" />
					<nav aria-label="Notes" class="note-links">
						{#each filteredNotes as note (note.title)}
							<button
								type="button"
								class:chosen={selectedNote === note.title}
								aria-pressed={selectedNote === note.title}
								onclick={() => (selectedNote = note.title)}
							>
								{note.title}
							</button>
						{:else}
							<EmptyState title="No matching notes" description="Try another search." />
						{/each}
					</nav>
				</div>
			{/snippet}
			<div class="note-content">
				<p class="note-meta">YOUR SPACE, YOUR PACE</p>
				<h3>{currentNote.title}</h3>
				<p>{currentNote.detail}</p>
				<p class="note-body">
					A quiet surface for what matters. Resize the sidebar without losing your place, or search
					for a note to make the space your own.
				</p>
			</div>
		</SplitView>
	</section>

	<div class="example-grid">
		<section class="example" aria-labelledby="controls-title">
			<h2 id="controls-title">The everyday essentials.</h2>
			<p>Bindable values. Built-in labels. No extra icon fonts.</p>
			<div class="settings">
				<Switch bind:checked={notifications} label="Notifications" />
				<Slider bind:value={volume} label="Volume" />
				<Stepper bind:value={copies} min={1} max={10} label="Copies" />
				<ProgressBar value={72} label="Example progress" />
			</div>
			<p class="readout settings-summary">
				Notifications {notifications ? 'on' : 'off'} · Volume {volume}% · {copies}
				{copies === 1 ? 'copy' : 'copies'}
			</p>
		</section>

		<section class="example" aria-labelledby="overlays-title">
			<h2 id="overlays-title">Just enough, right here.</h2>
			<p>Contextual actions and a focused space for the next step.</p>
			<div class="action-row">
				<Menu label="Note actions">
					<MenuItem label="Duplicate note" onclick={() => (status = 'Note duplicated.')} />
					<MenuItem
						label="Pin note"
						bind:checked={pinned}
						onclick={() => {
							status = pinned ? 'Note unpinned.' : 'Note pinned.';
						}}
					/>
					<MenuItem label="Share note" disabled />
					<MenuItem
						label="Delete note"
						destructive
						onclick={() => (status = 'Example note deleted. Your source design is unchanged.')}
					/>
				</Menu>
				<button type="button" class="primary" onclick={() => (sheetOpen = true)}>
					Open sheet
				</button>
			</div>
			<p class="status" role="status" aria-label="Note action">
				{status || 'Choose an action to try it.'}
			</p>
			<p class="hint">Menus: ↑ ↓ to move, Escape to dismiss. Sheets: drag the handle to dismiss.</p>
		</section>
	</div>

	<footer>
		<p>Built from the imported Figma reference. Existing components remain available.</p>
		<a href={`${base}/windows`}
			>Return to the original window sheet <span aria-hidden="true">→</span></a
		>
	</footer>
</main>

<Sheet
	bind:open={sheetOpen}
	title="A space to focus."
	description="A sheet keeps a short task close to the place you started."
>
	<p class="sheet-copy">
		This is a real modal dialog with contained keyboard focus. Press Escape, choose Done, or drag
		the handle down to return to the components.
	</p>
	{#snippet footer()}
		<button
			type="button"
			class="primary"
			onclick={() => {
				sheetOpen = false;
				status = 'Back where you left off.';
			}}
		>
			Done
		</button>
	{/snippet}
</Sheet>

<style>
	.component-page {
		--labels-secondary: #59595f;
		--colors-accent: #0066cc;
		box-sizing: border-box;
		width: min(100% - 48px, 1160px);
		margin-inline: auto;
		padding-block: 24px 80px;
		font-family: var(--apple-font-body);
		line-height: 1.47;
	}

	.page-nav {
		display: flex;
		flex-wrap: wrap;
		gap: 24px;
		font-size: 14px;
	}

	.page-nav a,
	footer a {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-height: 44px;
	}

	.intro {
		margin-block: 64px 80px;
	}

	.eyebrow {
		color: var(--labels-secondary);
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.12em;
	}

	h1 {
		margin-top: 16px;
		font-family: var(--apple-font-display);
		font-size: clamp(40px, 5.6vw, 68px);
		font-weight: 700;
		line-height: 1.04;
		letter-spacing: -0.035em;
	}

	.lede {
		max-width: 600px;
		margin-top: 24px;
		color: var(--labels-secondary);
		font-size: 21px;
		line-height: 1.4;
	}

	.section-heading {
		display: flex;
		flex-wrap: wrap;
		align-items: end;
		justify-content: space-between;
		gap: 16px;
		margin-bottom: 24px;
	}

	h2 {
		font-size: 24px;
		font-weight: 600;
		letter-spacing: -0.02em;
		line-height: 1.2;
	}

	.section-heading p,
	.example > p {
		margin-top: 10px;
		color: var(--labels-secondary);
		font-size: 15px;
	}

	.readout {
		color: var(--labels-secondary);
		font-size: 13px;
		font-variant-numeric: tabular-nums;
	}

	.compact-instruction {
		display: none;
	}

	.note-sidebar {
		box-sizing: border-box;
		min-width: 0;
		padding: 28px 16px;
		color: #1d1d1f;
	}

	.note-sidebar h3 {
		margin: 0 12px 20px;
		font-size: 24px;
		font-weight: 700;
		line-height: 1.15;
		letter-spacing: -0.02em;
	}

	.note-links {
		display: grid;
		gap: 6px;
		margin-top: 16px;
	}

	.note-links button {
		min-height: 44px;
		padding: 10px 12px;
		border-radius: 12px;
		color: inherit;
		font: inherit;
		font-size: 14px;
		overflow-wrap: anywhere;
	}

	.note-links button:hover {
		background: rgb(255 255 255 / 35%);
	}

	.note-links button.chosen {
		background: #fff;
		box-shadow: 0 1px 4px rgb(0 0 0 / 4%);
	}

	.note-links button:active {
		background: rgb(255 255 255 / 70%);
	}

	.note-content {
		padding: 48px 36px;
		color: #1d1d1f;
	}

	.note-meta {
		color: #6e6e73;
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.1em;
	}

	.note-content h3 {
		max-width: 380px;
		margin-block: 18px 16px;
		font-size: clamp(24px, 3vw, 36px);
		font-weight: 600;
		letter-spacing: -0.03em;
		line-height: 1.12;
	}

	.note-content > p:not(.note-meta) {
		font-size: 15px;
		line-height: 1.6;
	}

	.note-body {
		max-width: 400px;
		margin-top: 20px;
		color: #6e6e73;
	}

	.example-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 64px;
		margin-top: 80px;
	}

	.example {
		min-width: 0;
		padding-top: 28px;
		border-top: 1px solid var(--separators-opaque);
	}

	.settings {
		display: grid;
		gap: 20px;
		margin-block: 32px 24px;
	}

	.example > .settings-summary {
		font-size: 12px;
	}

	.action-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 16px;
		margin-top: 32px;
	}

	.primary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
		min-height: 44px;
		padding: 10px 22px;
		border: 0;
		border-radius: 999px;
		background: #0071e3;
		color: #fff;
		font: inherit;
		font-size: 15px;
		font-weight: 500;
		cursor: pointer;
		touch-action: manipulation;
	}

	.primary:hover {
		background: #0066cc;
	}

	.primary:active {
		background: #005bb5;
	}

	.example > .status {
		min-height: 44px;
		margin-top: 28px;
		color: var(--labels-primary);
	}

	.example > .hint {
		font-size: 13px;
	}

	.sheet-copy {
		font-size: 17px;
		line-height: 1.6;
	}

	footer {
		margin-top: 80px;
		color: var(--labels-secondary);
		font-size: 13px;
	}

	@media (prefers-color-scheme: dark) {
		.component-page {
			--labels-secondary: #aeaeb2;
			--colors-accent: #66b3ff;
		}
	}

	@media (max-width: 760px) {
		.regular-instruction,
		.split-readout {
			display: none;
		}

		.compact-instruction {
			display: block;
		}

		.component-page :global(.notes-view) {
			display: flex;
			flex-direction: column;
		}

		.component-page :global(.notes-view > .apple-split-view__separator) {
			display: none;
		}

		.component-page :global(.notes-view[data-resizable='true'] > .apple-split-view__sidebar),
		.component-page :global(.notes-view[data-resizable='true'] > .apple-split-view__content) {
			padding-inline: 0;
		}

		.component-page {
			width: calc(100% - 36px);
		}

		.intro {
			margin-block: 48px 60px;
		}

		.example-grid {
			grid-template-columns: 1fr;
			gap: 48px;
			margin-top: 60px;
		}

		.note-sidebar {
			padding: 24px 8px;
		}

		.note-sidebar h3 {
			margin-inline: 8px;
		}

		.note-links button {
			padding-inline: 8px;
			font-size: 13px;
		}

		.note-content {
			padding: 32px 16px;
		}
	}
</style>
