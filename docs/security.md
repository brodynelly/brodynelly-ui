# Security and toolchain verification

## Scope and result

Checked on 2026-10-16 against base `72239201f49f631d16554226362b50c409a8f78e`.
The full npm audit decreased from **24 findings** (3 critical, 14 high, 6 moderate,
1 low) to **zero**. `npm audit --omit=dev` reports zero before and after.
These are point-in-time advisory results, not a guarantee against unknown issues.

The root remains private `brodynelly-ui@0.1.0`, with no runtime or peer
dependencies and no root build/install lifecycle hooks. The CLI, production
components, styles, explicit 83-component barrel, and all 85 registry JSON files
are byte-identical to the base. No registry payload was regenerated.

**Dev-only does not mean the showcase is unaffected.** Svelte compiles browser and
SSR output; Kit, cookie, and devalue participate in the showcase server stack.
The CLI's empty production dependency graph does not establish the security of a
deployed SvelteKit site or of projects that copy these components.

## Version choices

Official npm registry metadata was checked before choosing versions. Kit 2,
Svelte 5, Vite 7, and ESLint 9 were retained. Compatible transitive patches were
refreshed explicitly; neither `npm audit fix --force` nor broad cross-major
overrides were used. Unrelated formatter upgrades were avoided.

| Package                                       | Published patched floor for this graph                       | Locked result          |
| --------------------------------------------- | ------------------------------------------------------------ | ---------------------- |
| `@sveltejs/kit`                               | 2.70.2 for its own advisories; cookie override also required | 2.70.3                 |
| `svelte`                                      | 5.55.7                                                       | 5.57.2                 |
| `vite`                                        | 7.3.5                                                        | 7.3.7                  |
| `vitest`, `@vitest/browser`, `@vitest/mocker` | 4.1.11                                                       | 4.1.12                 |
| `playwright`                                  | 1.55.1                                                       | 1.64.1                 |
| `cookie`                                      | 0.7.0                                                        | 0.7.2, scoped override |
| `devalue`                                     | 5.9.3                                                        | 5.9.4                  |
| `@humanfs/node`                               | 0.16.8                                                       | 0.16.8                 |
| `ajv`                                         | 6.14.0                                                       | 6.15.0                 |
| `brace-expansion`                             | 1.1.21                                                       | 1.1.21                 |
| `flatted`                                     | 3.4.2                                                        | 3.4.4                  |
| `js-yaml`                                     | 4.3.2                                                        | 4.3.2                  |
| `minimatch`                                   | 3.1.4                                                        | 3.1.5                  |
| `nanoid`                                      | 3.3.18                                                       | 3.3.20                 |
| `picomatch`                                   | 4.0.4                                                        | 4.0.7                  |
| `postcss`                                     | 8.5.23                                                       | 8.5.30                 |
| `postcss-selector-parser`                     | 7.1.6                                                        | 7.1.6                  |
| `rollup`                                      | 4.59.0                                                       | 4.64.7                 |
| `source-map-js`                               | 1.2.2                                                        | 1.2.2                  |
| `tinypool`                                    | 2.1.2                                                        | Removed by Vitest 4    |
| `ws`                                          | 8.21.0                                                       | 8.22.0                 |
| `yaml`                                        | 1.10.3 on the affected 1.x branch                            | 1.10.3                 |

The table covers all 24 affected package entries. Floors are outside the audited
advisory ranges, verified as published versions; only the locked results were
tested here. ESLint and `@eslint/js` are locked to 9.39.5. npm marks this ESLint
line unsupported: a zero audit does not restore upstream maintenance. A future
ESLint-major migration is separate work.

### Why Vitest 4

Vitest 3.2.7 still depends on affected `@vitest/mocker` and tinypool versions.
[GHSA-82fw-gwwq-j7x9](https://github.com/advisories/GHSA-82fw-gwwq-j7x9) requires
Vitest/mocker 4.1.11 or newer. Vitest 4 removes tinypool rather than forcing its
incompatible major into the old runner. Browser-runner file access, exposed test
APIs, WebSocket handling, and worker options are development/test attack
surfaces, not dependencies of the shipped CLI. Keep test and dev servers local
and do not execute untrusted tests or projects.

The migration follows the [official Vitest 4 guide](https://v4.vitest.dev/guide/migration):

- Replace the direct `@vitest/browser` dependency with
  `@vitest/browser-playwright`, keeping the provider and runner versions aligned.
- Configure `provider: playwright({ launchOptions })`; do not use the old string
  provider or `environment: 'browser'`. `browser.enabled` selects Browser Mode.
- Import `page`, `userEvent`, and `cdp` from `vitest/browser` rather than
  `@vitest/browser/context`.
- Use `vitest-browser-svelte` 2.2.1 and await component render/unmount operations.
  The existing rerender, locator, assertion, and component-prop contracts remain.
  All 13 browser-test files were migrated mechanically; no cases or assertions
  were dropped. The four standalone native-pointer cases are unchanged.

### Narrow Kit 2 cookie override

Kit 2.70.3 still declares `cookie ^0.6.0`, below the patched 0.7.0 release for
[GHSA-pxg6-pf52-xh8x](https://github.com/advisories/GHSA-pxg6-pf52-xh8x).
`package.json` overrides only Kit's cookie edge to `^0.7.2`. This intentionally
crosses that dependency's pre-1.0 minor boundary instead of migrating the site
to Kit 3. Remove the override once a compatible Kit release declares a patched
cookie dependency itself, after repeating the compatibility checks and audit.

The resolved cookie module was tested through its parse/serialize API and Kit's
actual cookie implementation: encoded input, valid attributes, path matching,
forwarded request cookies, Set-Cookie headers, and deletion. Invalid cookie
names, paths, and domains containing attribute injection are rejected. This
stricter validation is intentional; it is not a component API change. It does
not install a runtime dependency in CLI consumers or update their Svelte stacks.

The remaining findings came through build/lint/configuration dependencies:
filesystem copying, schema/YAML/cache parsing, glob/brace expansion, CSS/source
map processing, Rollup output paths, and ID generation. Their dev classification
is not permission to process hostile input without isolation. The exact advisory
URLs, old dependency paths, and new versions are recorded locally in
`.checks/security/advisory-disposition.json`.

## Install scripts and esbuild

The pre-update esbuild API and native executable both reported **0.25.8** and
successfully transformed TypeScript with `transformSync`. The old blocked-script
warning therefore did not mean that its binary was missing.

After the update and a fresh `npm ci --ignore-scripts`, the API and native
executable both reported **0.28.2**, and the same transform succeeded without
warnings. No blanket script approval, rebuild, or trusted repair was needed.
CI now explicitly checks the esbuild API and runs both full and production-only
audits without adding root install hooks.

## Validation and remaining gate

Validation used Windows, Node 26.10.0, npm 11.19.1, Playwright 1.64.1, and installed
Chrome 155.0.8059.79 via `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. No managed browser
was downloaded for local validation. Minimum-Node, other-browser, and hosted CI
results are not claimed.

| Check                                                 | Observed result                                       |
| ----------------------------------------------------- | ----------------------------------------------------- |
| Clean `npm ci --ignore-scripts` and explicit Kit sync | Pass                                                  |
| Full component/Node suite                             | 126 passed, 17 files, zero skipped                    |
| Standalone native-pointer cases, included above       | 4 passed, unchanged                                   |
| Public-export suite (barrel + 14 SSR renders)         | 15 passed                                             |
| Registry tests                                        | 36 passed, zero skipped                               |
| Installer/CLI tests                                   | 63 passed, zero skipped                               |
| Registry byte/fingerprint check                       | Pass, 83 components                                   |
| Showcase client/server build                          | Pass                                                  |
| Built Kit Server smoke requests                       | 3 passed: `/`, `/windows`, `/components`              |
| Full audit and `--omit=dev` audit                     | Zero findings                                         |
| ESLint alone                                          | Pass                                                  |
| `npm run lint`                                        | Fails: one test-call formatting issue, detailed below |
| `npm pack --dry-run --ignore-scripts`                 | Pass; no publication performed                        |

The two bounded repair rounds were used: an explicit refresh of eight affected
transitive package names, then the Vitest environment-option correction and
test formatting. One further formatting-only change is still needed at
`src/lib/controls/controls.svelte.spec.js`, in the `onSearchInput`/`onSearchChange`
render call. The exact unapplied follow-up is saved in
`.checks/security/parent-format.patch`; no third source-repair round was taken.
**The candidate is not all-green or publication-ready while this lint gate fails.**

Local `.checks/security/` records include command timestamps, exit codes, full
logs, official metadata, before/after versions and lock hashes, esbuild proofs,
preservation manifests, test counts, and the frozen candidate identity. These
ignored artifacts are not release contents. Production-source and registry
hashes remain unchanged; the registry source fingerprint is
`135b4b38f6a5daa7b5a4c8c80c9824e772a94cf3000c0bf2d64e2dadeecd7d21`.

Adapter-auto's deployment-target notice remains; no deployment platform was
validated. Repeat the affected checks after integrating other worktrees and
before any separately authorized release. No stage, commit, push, publication,
original-checkout write, or production-component change was performed here.
