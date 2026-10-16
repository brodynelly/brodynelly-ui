<script>
	import '$lib/styles.css';
	import './site.css';
	import { base } from '$app/paths';
	import { upstream } from './catalog.js';

	let { children, currentPage = 'components' } = $props();
</script>

<div class="source-site">
	<a class="skip-link" href="#site-content">Skip to content</a>
	<header class="site-header">
		<a class="site-brand" href={`${base}/`}>Brodynelly UI</a>
		<nav aria-label="Main navigation">
			<a
				href={`${base}/#components`}
				aria-current={currentPage === 'components' ? 'page' : undefined}>Components</a
			>
			<a href={`${base}/setup`} aria-current={currentPage === 'setup' ? 'page' : undefined}>Setup</a
			>
			<a href={upstream}>GitHub <span aria-hidden="true">↗</span></a>
		</nav>
	</header>
	<main class="site-content" id="site-content" tabindex="-1">
		{@render children()}
	</main>
	<footer class="site-footer">
		<nav aria-label="Component previews">
			<a href={`${base}/showcase`}>Full showcase</a>
			<a href={`${base}/components`}>Interactive components</a>
			<a href={`${base}/windows`}>Windows</a>
		</nav>
		<p>Independent, Apple-inspired design. Not affiliated with Apple.</p>
		<p>
			MIT · Includes source adapted from <a href="https://github.com/Carza-104/apple-svelte"
				>Carza-104</a
			>. <a href={`${upstream}/blob/main/NOTICE.md`}>Attribution and notices</a>.
		</p>
	</footer>
</div>
