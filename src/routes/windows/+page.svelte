<script>
	import '$lib/styles.css';
	import { base } from '$app/paths';
	import WindowChoice from '$lib/window-choice/WindowChoice.svelte';
	import WindowControls from '$lib/window/WindowControls.svelte';
	import WindowResizeControl from '$lib/window/WindowResizeControl.svelte';

	let selection = $state('');
	let controlState = $state('active');
	let resizeState = $state('floating');
	const windows = [
		{ id: 'single', label: 'Window', active: true, split: false },
		{ id: 'split-active', label: 'Active split view', active: true, split: true },
		{ id: 'split-inactive', label: 'Inactive split view', active: false, split: true }
	];
</script>

<svelte:head>
	<title>Windows — Brodynelly UI</title>
	<meta
		name="description"
		content="Active and inactive windows, split views, and window controls from the imported Figma design, implemented in Svelte."
	/>
</svelte:head>

<div class="canvas">
	<main class="page">
		<header class="intro">
			<h1>Windows</h1>
			<p>Explore the active and inactive window states and the controls that support them.</p>
			<a href="https://developer.apple.com/design/">
				Human Interface Guidelines <span aria-hidden="true">↗</span>
			</a>
		</header>

		<section class="gallery" aria-label="Window examples">
			{#each windows as window (window.id)}
				<WindowChoice
					label={window.label}
					active={window.active}
					split={window.split}
					selected={selection === window.id}
					onclick={() => (selection = window.id)}
				/>
			{/each}
		</section>

		<section class="details" aria-label="Window controls and resize states">
			<div class="detail-group">
				<h2>Window controls</h2>
				<p>Controls have active and inactive appearances.</p>
				<div class="swatches" role="group" aria-label="Window control appearance">
					<WindowControls
						active
						selected={controlState === 'active'}
						onclick={() => (controlState = 'active')}
					/>
					<WindowControls
						active={false}
						selected={controlState === 'inactive'}
						onclick={() => (controlState = 'inactive')}
					/>
				</div>
			</div>
			<div class="detail-group">
				<h2>Window resize</h2>
				<p>Resize controls for floating and full-screen windows.</p>
				<div class="swatches" role="group" aria-label="Window resize appearance">
					<WindowResizeControl
						mode="floating"
						selected={resizeState === 'floating'}
						onclick={() => (resizeState = 'floating')}
					/>
					<WindowResizeControl
						mode="full-screen"
						selected={resizeState === 'full-screen'}
						onclick={() => (resizeState = 'full-screen')}
					/>
				</div>
			</div>
		</section>

		<footer>
			<a href={`${base}/components`}
				>Try the interactive components <span aria-hidden="true">→</span></a
			>
			<a href={`${base}/showcase`}>Browse the full showcase</a>
			<a href={`${base}/`}>Brodynelly UI — source catalog</a>
		</footer>
	</main>
</div>

<style>
	.canvas {
		/* The imported source presentation is explicit; reusable controls stay adaptive. */
		--apple-window-choice-label: #e6e6e6;
		--apple-window-control-color: #fff;
		--apple-window-control-border: oklch(100% 0 0 / 0.28);
		--apple-window-control-background: oklch(100% 0 0 / 0.06);
		--apple-window-control-hover-border: oklch(100% 0 0 / 0.5);
		--apple-window-control-hover-background: oklch(100% 0 0 / 0.15);
		--apple-window-control-selected-border: #fff;
		--apple-window-control-selected-background: oklch(100% 0 0 / 0.15);
		--apple-window-control-pressed-background: oklch(100% 0 0 / 0.22);
		--apple-window-control-solid-background: #0f0f0f;
		--apple-window-control-solid-selected-background: #262626;
		--apple-window-control-solid-pressed-background: #383838;
		--apple-window-dot-active: #fff;
		--apple-window-dot-inactive: oklch(70% 0 0);
		min-height: 100svh;
		background: var(--apple-canvas);
		color: #fff;
		color-scheme: dark;
		font-family: var(--apple-font-body);
		font-size: 16px;
		line-height: normal;
		-webkit-font-smoothing: antialiased;
	}

	.page {
		box-sizing: border-box;
		width: min(100% - 48px, 1320px);
		margin-inline: auto;
		padding-block: clamp(48px, 6vw, 88px) 120px;
	}

	.intro {
		max-width: 740px;
	}

	h1 {
		font-family: var(--apple-font-display);
		font-size: clamp(48px, 5vw, 72px);
		font-weight: 700;
		letter-spacing: -0.015em;
		line-height: 1.03;
	}

	.intro p {
		max-width: 610px;
		margin-top: 20px;
		font-size: clamp(18px, 1.65vw, 23px);
		font-weight: 400;
		line-height: 1.38;
		text-wrap: pretty;
	}

	a {
		color: var(--apple-accent);
		text-underline-offset: 4px;
	}

	a:hover {
		opacity: 1;
	}

	.intro a {
		display: inline-block;
		margin-top: 17px;
		padding-block: 7px;
		font-size: 18px;
		font-weight: 500;
		line-height: normal;
	}

	.gallery {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: clamp(16px, 3.2vw, 40px);
		align-items: start;
		margin-top: clamp(115px, 15vw, 230px);
	}

	.details {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 64px;
		margin-top: 96px;
		padding-top: 32px;
		border-top: 1px solid rgb(255 255 255 / 26%);
	}

	h2 {
		font-family: var(--apple-font-display);
		font-size: 26px;
		font-weight: 600;
		letter-spacing: -0.015em;
		line-height: 1.15;
	}

	.detail-group p {
		margin-top: 10px;
		color: var(--apple-separator);
		font-size: 15px;
		line-height: 1.5;
	}

	.swatches {
		display: flex;
		flex-wrap: wrap;
		gap: 16px;
		margin-top: 28px;
	}

	footer {
		display: flex;
		flex-wrap: wrap;
		gap: 8px 28px;
		margin-top: 96px;
		font-size: 14px;
	}

	footer a {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-height: 44px;
	}

	@media (max-width: 760px) {
		.page {
			width: min(100% - 36px, 560px);
			padding-bottom: 72px;
		}

		.gallery {
			grid-template-columns: 1fr;
			gap: 44px;
			margin-top: 95px;
		}

		.details {
			grid-template-columns: 1fr;
			gap: 60px;
			margin-top: 80px;
		}
	}
</style>
