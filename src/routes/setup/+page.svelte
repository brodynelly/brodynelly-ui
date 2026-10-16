<script>
	import { base } from '$app/paths';
	import SiteShell from '$lib/site/SiteShell.svelte';
	import CopyButton from '$lib/site/CopyButton.svelte';
	import { addCommand, installer, switchExample, upstream } from '$lib/site/catalog.js';

	const dryRun = `${addCommand('switch')} --dry-run`;
</script>

<svelte:head>
	<title>Setup — Brodynelly UI</title>
	<meta
		name="description"
		content="Copy editable Svelte components into your project, import local styles, and preserve your source changes."
	/>
</svelte:head>

<SiteShell currentPage="setup">
	<div class="prose">
		<h1>Local files. A small setup.</h1>
		<p class="lead">
			Start in an existing Svelte 5.20+ project with Node 20.19+ and npm. Brodynelly UI copies
			editable source; it is not a component-runtime package.
		</p>
		<section class="site-section" aria-labelledby="add-title">
			<h2 id="add-title">Add only what you need.</h2>
			<div class="command-block">
				<p>Run from your project directory</p>
				<code>{addCommand('switch')}</code>
				<CopyButton text={addCommand('switch')} label="Copy add Switch command" />
			</div>
			<p>
				The public GitHub upstream is <a href={upstream}>brodynelly/brodynelly-ui</a>. This runs our
				own CLI, not the shadcn CLI or an npm runtime install. Review and pin a trusted Git revision
				for reproducible use; Git access and network availability are required.
			</p>
			<p>
				The default destination is <code>src/lib/components/ui/</code>. Each addition includes the
				component’s local dependencies, <code>styles.css</code>, <code>LICENSE</code>, and
				<code>NOTICE.md</code>. Your package manifest and application layout are not edited.
			</p>
			<p>
				<code>{installer} list</code> lists the catalog. Use <code>add switch slider</code> for
				multiple components or <code>add --all</code> for all entries. <code>init</code> is
				optional: it copies the shared base and saves the destination in
				<code>.brodynelly-ui.json</code>. Choose a contained relative directory with
				<code>--dir</code>, or a project with <code>--cwd</code>.
			</p>
		</section>

		<section class="site-section" aria-labelledby="import-title">
			<h2 id="import-title">Import your local CSS once.</h2>
			<p>
				In SvelteKit, put the stylesheet import in your root <code>src/routes/+layout.svelte</code>,
				keeping the component import in the page that uses it. This combined example shows both
				imports:
			</p>
			<pre class="source-example"><code>{switchExample}</code></pre>
			<p>
				If your app does not define SvelteKit’s <code>$lib</code> alias, use the equivalent relative
				paths. No Tailwind configuration or Brodynelly UI runtime import is needed.
			</p>
			<p>
				The copied stylesheet includes shared tokens, light/dark preferences, and global base
				styles. Review it before integrating into an existing app: it includes element resets, body
				typography, text-selection and text-size-adjust rules. Edit or scope these locally for your
				application’s accessibility and styling needs.
			</p>
			<p>
				Theme your local <code>styles.css</code> and component styles. Tokens such as
				<code>--colors-accent</code>, <code>--labels-primary</code>, and <code>--bg-primary</code> can
				be customized. Test both appearances, keyboard focus, contrast, reduced motion, and enlarged
				text after changes.
			</p>
		</section>

		<section id="edited-files" class="site-section" aria-labelledby="edits-title">
			<h2 id="edits-title">Keep control of edited files.</h2>
			<p>
				Commit or back up your source before adding again. By default, a conflicting existing file
				stops the whole plan before any writes. Identical files are skipped; your components are
				never silently upgraded.
			</p>
			<div class="command-block">
				<p>Inspect the plan first</p>
				<code>{dryRun}</code>
				<CopyButton text={dryRun} label="Copy dry-run Switch command" />
			</div>
			<ul>
				<li>
					<code>--dry-run</code> performs zero target writes and still reports conflicts. Combine it
					with the policy you intend to use.
				</li>
				<li>
					<code>--keep-existing</code> keeps existing files and adds missing files. You are responsible
					for compatibility with your customizations.
				</li>
				<li>
					<code>--overwrite</code> replaces conflicting regular files in the plan, including shared styles
					when applicable. It can destroy your edits; review the dry run and save them first.
				</li>
			</ul>
			<p>
				<code>--keep-existing</code> and <code>--overwrite</code> are mutually exclusive. Neither is
				an automatic merge or upgrade service.
			</p>
		</section>

		<section class="site-section" aria-labelledby="legacy-title">
			<h2 id="legacy-title">Optional legacy enhancements.</h2>
			<p>
				Some legacy components render icon ligatures using Material Symbols Rounded. Supply an
				appropriately licensed font yourself, or replace the icons. The installer does not download
				a font. The newer interactive controls do not require this font.
			</p>
			<p>
				Legacy glass styles can use an optional, browser-dependent SVG distortion filter supplied by
				the host application. Ordinary CSS blur is the baseline. The showcase’s <code
					>src/app.html</code
				>
				contains an example filter, but its <code>feImage</code> input is commented out: that snippet
				does not automatically provide a working refraction map.
			</p>
			<p>
				Host HTML and filter assets are not copied. If you choose the enhancement, provide and test
				the filter inputs and IDs yourself, including repeated legacy toggles, browser support, and
				reduced-transparency fallbacks. No glass treatment is needed for this documentation site.
			</p>
			<p>
				<a href={`${base}/showcase`}>Browse the complete legacy showcase</a>,
				<a href={`${base}/components`}>try the interactive components</a>, or
				<a href={`${base}/windows`}>view the original Windows presentation</a>.
			</p>
		</section>

		<section class="site-section" aria-labelledby="license-title">
			<h2 id="license-title">Source comes with its history.</h2>
			<p>
				MIT licensed. Includes components adapted from <a
					href="https://github.com/Carza-104/apple-svelte">apple-svelte by Carza-104</a
				>. Retain the copied <code>LICENSE</code> and <code>NOTICE.md</code> with the source.
			</p>
			<p>
				Independent, Apple-inspired work, not affiliated with, endorsed by, or sponsored by Apple.
				No Apple fonts or SF Symbols are distributed; system font names are fallback references
				only. This is our own source registry, not an official shadcn registry or a claim of shadcn
				CLI interoperability.
			</p>
			<p>
				<a href={`${upstream}/blob/main/docs/setup.md`}>Repository setup guide</a> ·
				<a href={`${upstream}/blob/main/docs/worktrees.md`}>Worktree development</a>
				· <a href={`${upstream}/blob/main/docs/opencode.md`}>Optional OpenCode setup</a>
			</p>
		</section>
	</div>
</SiteShell>
