# Plan template

Format: `opencode-luuna.plan/v1`. **Template, not approval or execution evidence.**
Use a new revision for material changes. These fields adapt Luuna's process;
they are not its unfinished official PlanRevision schema.

## Identity and intent

- Ticket/goal:
- Plan ID and revision:
- Acceptance criteria and relevant requirement IDs:
- Repository IDs, confirmed relationships, and current instructions:
- Observed base commits/tree identities (unknown means blocked):
- Manifest/profile/prompt/skill versions or actual source references:
- Facts, assumptions, unresolved questions:

## Executable scope

- Allowed repositories, paths, worktrees, and operation classes:
- Explicit exclusions and preserved user work:
- Interface contracts and exact dependency bindings:
- Task DAG (task ID, role, dependencies, paths, result requirements):
- Baseline/testing prerequisites and separate approval if needed:
- Required recipes (executable, arguments, cwd, timeout, environment, artifacts):
- Required host capabilities/services and installation needs:
- Source/candidate freeze and integration strategy:
- Model/resource profiles and tool permissions:
- Concurrency (default four sessions including parent; one writer/worktree):
- Attempts (initial plus two repairs/task), aggregate repair/time ceilings:
- User-confirmed spending ceiling if appropriate and pricing available:
- Security/privacy/API/package/release risks:
- Intended publication destinations/order (proposal only; publication disabled):

## Approval record — keep separate from a hashed plan file

- Exact plan revision and optional observed plan-file SHA256:
- Explicit user confirmation/reference and timestamp:
- Approved operations, exclusions, budgets, and required checks:
- Reapproval triggers: new repos/paths/operations, security policy, contracts,
  required checks, or other material changes:

Do not fill unknown identities/digests with realistic-looking examples. A byte
digest must come from actual tool execution and is not a transactional approval
mechanism. Configuration-only bootstrap may use file-level evidence without a
commit; feature/release gates still require their real prerequisites.
