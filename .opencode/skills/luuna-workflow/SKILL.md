---
name: Luuna Workflow
description: Coordinate substantial project development using Luuna's discovery, bounded plans, explicit approval, delegation, checks, fresh independent review, and repair limits. Use before planning or executing work in this project.
---

# Luuna workflow

Read `.opencode/instructions/luuna.md`, `.opencode/references/luuna.md`, and the
current repository profile from the project root. For an unfamiliar orchestration
decision that needs the optional `luuna-spec`, read `docs/04-orchestration.md` and
`docs/08-validation.md` from its verified external root. If unavailable, report
that reference-dependent decision as unverified; ordinary CLI/build work can
continue without it. These references do not authorize building Luuna.

## Discover and plan

1. Confirm goal, acceptance criteria, repositories, current instructions, work
   preservation, host capabilities, and source/base identities. Distinguish
   observed facts from assumptions. No Git commit means no commit-bound proof.
2. Ask a repository lead for local constraints and bounded read-only explorers
   for independent questions. The orchestrator launches all children; at most
   four active sessions including itself. Do not duplicate a child's active work.
3. Identify meaningful testing readiness. Script names/framework presence alone
   do not qualify. Missing/failing/empty/skip-only baselines create a **separate
   prerequisite plan**; do not smuggle a feature into test repairs.
4. Use `.opencode/templates/plan.md`: define a task DAG, scoped operations/paths,
   contracts, recipes, candidate strategy, required environments, acceptance
   criteria, security implications, and aggregate repair/time budgets. Never
   assume arbitrary provider pricing or budget values.
5. Present one revision and obtain explicit developer approval. Approval is for
   that content, not any future plan with the same title. Store confirmation
   separately from a plan file if recording a real byte digest. This convention
   does not provide transactional approval/hash enforcement.

## Execute and review

1. Load `luuna-handoffs` and `luuna-context`; issue one bounded assignment per
   task. Check dependencies and baseline evidence first. Assign isolated task
   worktrees/branches with one writer each, without modifying unrelated checkouts.
   Open each worktree at its own project root. Before project checks, explicitly
   scope `npm ci` and `npm run sync` for that worktree; another worktree's
   dependencies or generated SvelteKit state are not its setup evidence.
2. Source writers are `luuna-implementer` and `luuna-testing-setup`. A testing
   worker can run approved checks without a feature assignment, but must not
   edit source during a validation-only assignment. Tool permissions still apply.
3. Freeze exact candidates. Load `luuna-validation`; retain actual command/tool
   evidence, not merely a worker's claimed success.
4. Launch a new `luuna-reviewer` session, without the implementation transcript.
   Supply scope, acceptance criteria, current code/diff, candidate identities,
   and actual check artifacts. For UI changes also request a fresh
   `apple-frontend-specialist` review. A different model is optional.
5. If multiple repositories/packages participate, use an exact CandidateSet and
   explicit dependency overrides/artifacts/endpoints. Request
   `luuna-integration-reviewer`; do not test one combination and publish another.
6. Repairs stay within scope and preserve aggregate usage history. Initial
   attempt plus at most two repairs per task; missing infrastructure pauses
   immediately. Revised scope/security/required checks need renewed approval.
7. Any candidate/dependency/recipe/environment change invalidates affected
   evidence. Repeat relevant checks and fresh review before final handoff.

## State and finish

Use the pack's vocabulary when it matches observed state:
`discovered → exploring → plan_ready → approved → implementing → validating →
reviewing → integrating`. Use `testing_blocked`, `paused`, or `cancelled` honestly.
Do not infer authoritative state transitions from a worker's narration.

Publication is disabled in these agents. End with a candidate-specific completion
report and a separately authorized publication proposal when ready. Never call
the task `integrated` merely because code exists or a review is positive.
No automatic push, release, merge, installation, or destructive cleanup.

Configuration-only bootstrap/maintenance explicitly requested by the user may be
verified without a source commit. Do not extrapolate that exception to feature
writes or release evidence. In Plan mode, discuss the plan without file writes
or writer execution, subject to that mode's own rules.
