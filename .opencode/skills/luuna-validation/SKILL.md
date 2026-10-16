---
name: Luuna Validation
description: Establish meaningful testing baselines and candidate-bound execution evidence, independently review changes, detect stale or missing checks, and bound repairs. Use for testing prerequisites, validation, reviews, integration, and completion claims.
---

# Evidence, not declarations

Read the relevant recipes from `.opencode/profiles/brodynelly-ui.json` at the
project root and confirm current scripts. When the assignment depends on the
optional `luuna-spec`, consult `docs/08-validation.md` and relevant A06–A18
scenarios in `docs/11-acceptance.md` through the router. Report missing external
verification honestly; the pack is not a prerequisite for normal project checks.

## Baseline

Run only approved recipes on the recorded baseline in a capable environment.
Inspect output/test counts and meaningful assertions; an exit-zero arithmetic
test or heading smoke test does not establish relevant component coverage.
Missing tools/services, empty/skip-only suites, failing assertions, and incapable
hosts block required checks. Do not silently install dependencies/browsers,
substitute another platform, weaken checks, or include feature edits in a
baseline repair. Use a separately approved testing-setup assignment.

## Execution evidence

Use `.opencode/templates/check-result.json`; replace every template/null value
with observed data or explicitly retain a blocker. Required fields include:

- Baseline/candidate identities and exact multi-repository dependency bindings.
- Executable/arguments, working directory, approved recipe revision, tool versions,
  environment fingerprint, start/end timestamps, and exit code.
- `passed`, `failed`, `blocked`, `cancelled`, or `interrupted`; separately mark
  stale evidence. Record actual test counts/skips where relevant.
- Bounded output excerpt plus authorized full log/report paths and hashes where
  available. Redact **before** storing or passing artifacts to another agent.

A worker's “done,” process exit, matching schema, screenshot, or positive review
is not test evidence. Zero exit is necessary but not sufficient for `passed`.
Describe commands as proposed/not run when no execution record exists.

## Candidate integrity and review

Freeze the checked source tree and record dirty/untracked state. No hidden user
files or unrecorded edits may be included. A source/tree hash can identify
precommit checks, but release/publication requires actual commit-bound results.
If a repo has no commit, report that limitation; do not create one without scope.

Review in a fresh session with no implementation transcript. Check acceptance
criteria, API compatibility, behavior/regressions, security/authorization,
secrets exposure, test quality, packaging, and evidence freshness. Use
`.opencode/templates/review.md`; missing required proof means `blocked`, not an
approval with a vague caveat. Reviewers request controlled verification rather
than editing the checked candidate or running hidden mutating scripts.

Invalidate affected checks/reviews after code edits, rebases, dependency binding
changes, recipe/environment changes, or external edits. Multiple task branches
must be combined and checked as the actual integration candidate. Never reuse
evidence for a different assembled tree.

## Repairs and final report

Allow one initial attempt plus at most two repairs per task, within the approved
aggregate ceiling. Infrastructure blockers pause; scope expansion returns to
approval. Each repair repeats affected checks and fresh review.

Use `.opencode/templates/completion.md` to distinguish what passed for which
candidate/environment from failed, blocked, cancelled, interrupted, or stale
checks. Local checks are not PR-triggered CI. Publication is a separate developer
handoff; no automatic push/merge/release is enabled by this skill.
