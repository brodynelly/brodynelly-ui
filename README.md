# Brodynelly UI

**Svelte components. In your source.**

83 editable components. Copy the files you need into your project, import them
locally, and make them your own. No Brodynelly UI runtime import. No Tailwind required.

Public upstream: [brodynelly/brodynelly-ui](https://github.com/brodynelly/brodynelly-ui).
This repository contains the source-first site, complete showcase, generated
source registry, and our own copy-to-source CLI. It is not a runtime component
package or an official shadcn registry; use our CLI, not the shadcn CLI.

## Add source to your project

Requires Node 20.19+, npm, and an existing Svelte application. Component metadata
declares Svelte 5.20 as the technical minimum, **not** a security recommendation.
Use currently supported, patched Node, Svelte 5, and SvelteKit versions. Run from your project:

```sh
npx --yes --package=github:brodynelly/brodynelly-ui brodynelly-ui add switch
```

The CLI copies into `src/lib/components/ui/` by default, including local component
dependencies, shared CSS, `LICENSE`, and `NOTICE.md`. It does not edit your app
layout or add a component-runtime dependency. Review and pin a trusted Git revision
for reproducible use. Git access and network availability are required.

Import the copied stylesheet **once**, usually in SvelteKit’s root `+layout.svelte`:

```js
import '$lib/components/ui/styles.css';
```

Then use your local component:

```svelte
<script>
	import Switch from '$lib/components/ui/controls/Switch.svelte';

	let notifications = $state(true);
</script>

<Switch bind:checked={notifications} label="Notifications" />
```

Open and edit the copied `.svelte` file. If your app does not use SvelteKit’s `$lib`
alias, use equivalent relative paths. The shared CSS includes global base styles;
review and customize them for your application.

### Your edited files are protected

Default behavior refuses conflicting edited files before writing anything;
identical files are skipped. There are no silent upgrades or automatic merges.

```sh
npx --yes --package=github:brodynelly/brodynelly-ui brodynelly-ui add switch --dry-run
npx --yes --package=github:brodynelly/brodynelly-ui brodynelly-ui add switch --keep-existing
```

`--dry-run` previews with zero target writes and still reports conflicts.
`--keep-existing` preserves existing files and adds missing ones; compatibility
with your edits is your responsibility. `--overwrite` explicitly replaces
conflicting files in the plan, including shared CSS when applicable: back up your
changes and inspect a dry run first. The two policies are mutually exclusive.

Use `list` to see CLI names, `add switch slider` for multiple components, or
`add --all` for every entry. Optional `init` copies shared base files and saves
the destination in `.brodynelly-ui.json`. See [setup](docs/setup.md) for details.

## Site and examples

- `/` — source-first onboarding and searchable catalog, rendered on the server.
- `/setup` — local imports, themes, edited-file safety, and optional enhancements.
- `/showcase` — complete legacy component showcase, relocated without removing examples.
- `/windows` — original black-canvas Windows presentation.
- `/components` — interactive component examples.

The site’s copy buttons only copy commands. They never install files in a visitor’s project.

## Local development

Every checkout or worktree needs its **own** `node_modules` and `.svelte-kit`.
Run both provisioning commands in each checkout, even if another worktree builds:

```sh
npm ci
npm run sync
npm run dev
```

Run the assembled local gates (including browser/consumer tests and networked audits):

```sh
npm run verify
```

Individual gates are also available:

```sh
npm test
npm run test:registry
npm run test:installer
npm run registry:check
npm run test:opencode
npm run test:verification
npm run test:distribution
npm run lint
npm run site:build
npm audit
npm audit --omit=dev
```

`test:distribution` packs the current working tree, executes the CLI offline in a
temporary project, protects customized files, and compiles all 83 copied local
components with Svelte/Vite. Browser checks exercise Switch, Menu, Sheet, and a
real-pointer SplitView resize. Svelte remains a dependency of the consuming app;
there is no Brodynelly UI runtime dependency. `test:opencode` checks authored
configuration statically, not native discovery, permissions, MCP, or generation.

After committing the reviewed candidate, run the separate commit-bound gate:

```sh
npm run test:git-package
```

It uses only the local repository's full HEAD commit, a fresh offline npm cache,
and a consumer directory with spaces. It refuses relevant staged, unstaged, or
untracked package changes rather than testing a stale commit. It checks the
installed layout and actual selected source copies without framework/dev
dependencies; it does not contact GitHub or publish. `verify` deliberately does
not include this post-commit gate. Local evidence stays in ignored `.checks/`;
see [handoff status](docs/handoff-status.md) for still-pending gates.

Use `npm run site:build` for the site. There is intentionally no root `build`,
`prepare`, or publishing lifecycle hook: installing the Git CLI should not build
the entire site. The package manifest is `private: true`; this is not an npm release claim.

Browser tests use Playwright Chromium. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`
to an installed Chrome/Chromium executable to avoid a browser download. A host
browser cache is separate from project dependencies and generated metadata.
Review blocked install scripts individually; do not blanket-approve them. See
[worktree setup](docs/worktrees.md), [security](docs/security.md), and optional
[OpenCode setup](docs/opencode.md).

The 83 public components are declared in `src/lib/index.js`; shared styles live in
`src/lib/styles.css`. Generated registry files contain complete relative-import
closures, plus shared styles and license notices. Do not import this repository
as a runtime component package.

See [handoff status](docs/handoff-status.md) for evidence and remaining validation,
not historical pass counts presented as current certification.

MIT: retain [NOTICE.md](NOTICE.md) and [LICENSE](LICENSE), including attribution to
[Carza-104’s apple-svelte](https://github.com/Carza-104/apple-svelte). Independent,
Apple-inspired work, not affiliated with Apple. No Apple fonts or SF Symbols are
distributed. Legacy Material Symbols fonts and host SVG glass enhancements are
optional; see [setup](docs/setup.md).
