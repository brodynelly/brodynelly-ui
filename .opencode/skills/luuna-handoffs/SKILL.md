---
name: Luuna Handoffs
description: Construct bounded Luuna-style assignments and structured results for OpenCode agents, including scope, task dependencies, approval, candidate identities, context, and evidence. Use before delegation or returning worker results.
---

# Bounded assignments and results

Read `.opencode/templates/assignment.md` and `context.md` in the same project
templates directory. Use `plan.md`, `candidate.json`, `check-result.json`, and
`review.md` as needed. Their versioned `opencode-luuna/*` formats are local
adaptations, not official Luuna runtime schemas.

## Before launch

- Validate task/repository IDs, dependency references, approved scope, and
  available host. Unknown IDs and DAG cycles are blockers. Relationship cycles
  in an architecture are not automatically executable task dependency cycles.
- Include the objective, acceptance criteria, allowed repository/worktree,
  paths, operation classes, prohibited changes, approved commands, baseline and
  candidate references, dependencies/bindings, attempt index, and remaining budget.
- Include only relevant instructions, files, contracts, and evidence. Use
  `luuna-context` for provenance and privacy. Pass file paths and concise facts,
  not the parent's full conversation or unrelated repository contents.
- Identify whether the assignment is investigation, prerequisite setup,
  implementation, controlled validation, design planning, or independent review.
  A role name alone does not authorize writes or checks.
- Require a structured result. Child sessions cannot delegate, approve their own
  scope, publish, merge, edit policy, or reset attempts. Follow-up work is a
  proposal back to the orchestrator.

## Result contract

Return task/assignment ID, role, candidate/source identity, status, observed
findings, changed paths (if any), actual checks and artifact references,
uncertainties, blockers, and proposed next action. Separate advisory judgments
from verified execution. Missing fields/evidence require clarification or a
bounded retry, never silent advancement to a gate.

For repairs, retain the original task's initial-plus-two limit and ticket-wide
usage. Do not hide additional attempts behind new session/task IDs.

## Reviewer context

Use a brand-new conversation, not a continued/forked implementer session. Supply
only approved scope/requirements, base and candidate identities, the diff,
relevant current files, dependency bindings, and execution evidence. Do not
include implementation chat, internal deliberation, or the implementer's
self-assessment as proof. Repaired candidates receive fresh check/review inputs.
