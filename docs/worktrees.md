# Worktree setup and validation

Each checkout or Git worktree needs its **own `node_modules` and `.svelte-kit`**.
Git shares repository objects, not dependency installations or SvelteKit metadata.
Do not junction or symlink another checkout’s `node_modules` into your worktree.
A working build in one checkout does not provision the next one.

## Provision every checkout

Node 20.19+ is the technical floor; prefer a currently supported, patched Node
release and patched Svelte/SvelteKit. Run these from **each** checkout you intend to use:

```sh
npm ci
npm run sync
```

`npm ci` installs the checkout’s lockfile into its own `node_modules`.
`npm run sync` creates its local `.svelte-kit` metadata. Rerun provisioning as
needed after changing branches or lockfiles. Generated metadata is not committed.

If npm reports blocked install scripts, inspect the package and the specific
script before making a scoped approval. Do not blanket-approve all scripts or
copy machine-local approval settings into this repository. A successful site build
has exercised esbuild in the site worktree, but is not an advisory review or a
general approval of install scripts. Follow [security](security.md) for the separate
binary, dependency and advisory checks.

## Browser tooling is a separate layer

Browser tests use Playwright. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to a trusted,
installed Chrome/Chromium executable when you do not want a browser download.
For example, in PowerShell, use your own installed path:

```powershell
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = '<installed Chromium executable>'
npm test
```

A browser cache is host-level tooling; sharing that cache does **not** share
`node_modules`, the Playwright package, or `.svelte-kit`. Provision each checkout
even when the browser executable already exists. Do not commit executable paths,
screenshots, generated output, or local test artifacts.

## Develop and verify

```sh
npm run dev
npm run verify
```

The ordinary `verify` script runs sync, registry consistency/tests, installer
tests, component/Node tests, static OpenCode checks, verification-helper tests,
the packed source-consumer test, lint, site build, and full/production-only audits.
Audits need registry access; browser suites need a provisioned Chromium. It does
not install dependencies or browsers, regenerate the registry, commit, or publish.

For individual checks:

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

The packed consumer fixture temporarily links **this checkout's** dependencies
solely to compile copied source with Svelte/Vite. This controlled test fixture is
not a provisioning recipe or permission to share dependencies between worktrees.
The installer itself adds no framework dependency; consuming apps provide Svelte.
Temporary consumer/cache fixtures live under `os.tmpdir()/opencode`, or the
caller-selected `BRODYNELLY_TEST_TMP`. A failed distribution fixture is preserved.

After committing the reviewed package candidate, separately run:

```sh
npm run test:git-package
```

This pins `git+file://` installation to full local HEAD, uses a fresh offline cache
and consumer with spaces, checks 83 catalog entries and selected copied files,
and rejects relevant dirty/untracked package inputs. It checks that installed
packages omit `src/` and dev dependencies and that no app manifest/dependencies
are changed. It does not contact GitHub, prove public Git availability, or run
the browser consumer suite. Windows shell-metacharacter paths are refused rather
than interpolated. Reports/logs live in ignored `.checks/verification/`; its owned
temporary fixture is preserved for inspection. Only remove the specific fixture
identified by your own report. This gate is separate from pre-commit `verify`.

CI fetches full Git history because site-preservation tests read their foundation
commit. Do not weaken those tests to accommodate a shallow checkout. The hosted
job additionally provisions its own managed Chromium and checks esbuild without
blanket install-script approval. A local pass is not a hosted CI result.

Use `npm run site:build` for the showcase/documentation. Root `build`, `prepare`
and publish hooks are intentionally absent so consuming the CLI from Git does
not trigger a heavy site build. The root is private `brodynelly-ui@0.1.0`; this is
not a publication of an older project to npm. Public source comes from
[brodynelly/brodynelly-ui](https://github.com/brodynelly/brodynelly-ui).

The registry is generated from public components; never hand-edit its payloads.
When production component source changes, run `npm run registry:build` followed
by `npm run registry:check`. The private `src/lib/site/` documentation helpers are
not public components and must stay out of the public barrel and registry.

Keep changes owned by other checkouts intact. Do not reset or refresh an unrelated
dirty checkout or its index to make a report look clean. Optional project-agent
setup lives in [OpenCode setup](opencode.md), not machine-local paths in these docs.

See [handoff status](handoff-status.md) for which checks are current and which
assembled checks still need to run. Old validation is history, not evidence for
the current assembled candidate.
