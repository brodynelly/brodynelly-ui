# Source-first handoff status

This is a point-in-time readiness map, not a release, hosted-CI, or independent
review claim. New source belongs to
[brodynelly/brodynelly-ui](https://github.com/brodynelly/brodynelly-ui).
The package and lockfile remain `brodynelly-ui@0.1.0`, with the root package private. There is no npm
publication, runtime component package, or official shadcn compatibility claim.
The older Carza package/version was not published by this work.

## Current assembled candidate

Local validation on 2026-10-16 uses the patched Svelte 5.57 / Kit 2.70 / Vite 7.3 /
Vitest 4.1 / Playwright 1.64 toolchain with installed Chromium. See
[worktrees](worktrees.md) for repeatable commands and environment requirements.
Evidence is specific to the checked tree, lockfile, and host; edits invalidate
affected checks. Scoped independent precommit code and UI reviews passed. A final
commit-bound rerun, Git-consumption gate, and integration review are still required
before publication.

UI repair R1 adds surface-owned keyboard focus, stable visible copy labels, and
regular-width catalog columns. Its component/Node suite passes **160/160**, and
the packed copied-source consumer measures sidebar search focus at **5.687:1**
in both OS appearances with normal, reduced-transparency, and increased-contrast
preferences. The subsequent full verification chain passes **278 tests**, with
zero failures or skips, plus lint, build, registry consistency, and both audits.
The earlier formatting stop is historical: generated private run records and
failure attachments are explicitly excluded from lint and publication, not product
source or test coverage.

| Track                                         | Current evidence / readiness                                                                                                                                                                                                                                                 | Limits and next gate                                                                                                                                                                                                                                                                                                               |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T1 — source foundation                        | Assembled component/Node suite: **160/160 passed**, including all three source-site route/no-JavaScript/client-navigation and legacy-preservation cases. Registry: **36/36 passed**, consistency check passes, 83 explicit public components.                                | Local Chromium only; not minimum-version or cross-browser certification.                                                                                                                                                                                                                                                           |
| T2 — source-copy installer                    | **63/63 installer tests passed**. Packed consumer verification executes the real CLI offline, preserves customized source/CSS, copies 89 files, compiles all 83 local components, and exercises Switch, Menu, Sheet, and real-pointer SplitView behavior.                    | Packed working-tree proof is not Git commit proof. The new local `test:git-package` gate is guarded/pending until the reviewed candidate is committed.                                                                                                                                                                             |
| T3 — source-first site and docs               | Root catalog plus `/setup`, full `/showcase`, `/windows`, and `/components` are live source-first routes. Current full suite resolves the historical client-navigation failure without removing tests. Site build, full lint, and scoped precommit UI review pass.           | Hosted CI remains a separate observation. Original checkout, private source assets, original README/index, and screenshots are untouched.                                                                                                                                                                                          |
| T4 — worktrees and metadata                   | This assembled checkout has its own installed dependencies and explicit Kit sync. Private package/lock identity remains 0.1.0. No root build/install lifecycle hooks, runtime/peer dependencies, or workspaces were added.                                                   | Every worktree still requires its own provisioning. Svelte 5.20 metadata is a technical floor; recommend supported, patched framework/Node versions, not that old floor.                                                                                                                                                           |
| T5 — security, tooling and final verification | Full and production-only npm audits: **zero findings**. esbuild **0.28.2** works without blanket script approval. Static OpenCode checks: **14/14 passed**. Ordinary `verify`, packed distribution, helper tests, and guarded commit-bound Git-package scripts are provided. | Zero audit is not full vendor support: ESLint 9 is marked unsupported; see [security](security.md). Native OpenCode discovery, effective permissions, MCP/model access, and generation were not validated. Precommit code review passed; final Git-consumption, integration review, public push, and hosted CI are separate gates. |

The public barrel, CLI, and original showcase/Windows artifacts retain their
pre-repair bytes. UI repair R1 changes library focus/surface CSS and regenerates
the registry using the approved generator; no payload is hand-edited. Presentation
accent, window shapes, surfaces, and public component names remain unchanged.
Components are copied into the consuming app, which still supplies Svelte;
“no Brodynelly UI runtime” does not mean “no Svelte dependency.”

## Historical evidence — not current failures or certification

- The original **21 server passes / 84 client passes / 8 failures** describe the
  old checkout, not the new assembled candidate.
- Foundation-only **126 component / 36 registry / 63 installer** results precede
  the assembled site/toolchain. The site's earlier **27/27 scoped** and
  **143/144 full** results were on the base toolchain. The client-navigation and
  cleanup failure in that 143/144 run is historical and resolved in the current
  pre-repair 144/144 suite; no test was skipped to obtain that result.
- An earlier packed consumer and local-Git probe validated only the foundation
  commit. They cannot certify the final assembled Git package. Run
  `npm run test:git-package` after committing the reviewed final tree; its dirty
  guard intentionally blocks before then. A guard block is not a package pass.
- Security-stage logs/tables describe that stage. The assembled results above
  supersede its earlier full-lint/test-count limitations, not its maintenance or
  advisory caveats. Audits remain time-sensitive, not a security guarantee.

## Remaining handoff

Run `npm run verify` on the frozen assembled candidate, obtain fresh independent
review, and have the authorized parent create the final commit. Then run the
full-HEAD local Git-package gate and obtain any affected fresh review before
separately authorized push. Public GitHub accessibility and hosted CI are separate
observations; neither is claimed here. No staging, commit, push, merge, release,
or publication was performed by the verification worker.

Exact source hashes, command arguments/cwd, versions, timestamps, exit codes,
counts, and log/report hashes stay in ignored `.checks/verification/` and the
other local check records. Do not copy machine paths, private run IDs, raw logs,
screenshots, or unrelated user work into public documentation or commits.
