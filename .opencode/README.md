# Brodynelly UI workflow for OpenCode V2

Portable project-local agents, commands, skills, instructions, recipes and
templates adapted from the existing user-owned Luuna workflow. This is assisted
development guidance, not a Luuna runtime, a scheduler or an OpenDesign installer.

See [the project setup guide](../docs/opencode.md) for per-worktree setup,
optional references, private local config, and verification limits.

## Start and commands

Open each checkout/worktree at its **own project root**. A new session defaults
to `luuna-orchestrator`; existing sessions keep their selected agent. Built-in
Plan/Build remain available and have their own boundaries.

- `/luuna-plan <goal>`: read-only Plan-mode investigation/proposal.
- `/luuna-run <approved plan or goal>`: coordinate a bounded approved task;
  missing prerequisites/approval produce planning or blockers, not source writes.
- `/luuna-review <candidate and evidence>`: fresh read-only correctness review.
- `/luuna-ui-review <scope and evidence>`: fresh Apple/web accessibility review.
- `/luuna-status <run>`: inspect actual local state, evidence and blockers.
- `/opendesign <status or scoped task>`: interactive Build with optional existing
  integration guidance; no connection, generation or permission grant is bundled.
  Select `luuna-orchestrator` again when returning to team coordination.

Commands are prompt templates with no shell interpolation. Review commands use
new child sessions; invoke them only for explicitly requested review/delegation.
Skills such as `@luuna-workflow`, `@apple-frontend` and `@opendesign` can also be
loaded explicitly; skills do not switch agents or grant permissions.

## Team and resources

The orchestrator is the sole child launcher **within this custom team**.
Repository leads propose tasks, not descendants. All children deny delegation.

| Agent                        | Responsibility                                          |
| ---------------------------- | ------------------------------------------------------- |
| `luuna-orchestrator`         | Primary coordinator; only local run bookkeeping writes. |
| `luuna-repository-lead`      | Read-only repository planning and task proposals.       |
| `luuna-explorer`             | Read-only bounded investigation.                        |
| `luuna-testing-setup`        | Permission-controlled approved prerequisites/checks.    |
| `luuna-implementer`          | Permission-controlled approved source/tests.            |
| `luuna-reviewer`             | Fresh read-only correctness/security/test review.       |
| `luuna-integration-reviewer` | Exact candidate/dependency-binding review.              |
| `apple-frontend-specialist`  | Read-only design planning or fresh UI review.           |

- `instructions/luuna.md`: always-loaded operating policy. The source user's
  current gate/repair wording is preserved, not replaced with an older policy.
- `profiles/brodynelly-ui.json`: proposed recipes for editable Svelte 5 source,
  shared CSS, generated registry and this project's own copy-to-source CLI.
  **Not proof that any recipe ran.** It is adaptation data, not native OpenCode
  config. The root package remains the authority for script names/contents.
- `skills/`: workflow, handoffs, validation, context, Apple routing and optional
  OpenDesign integration routing. Bodies/supporting files require actual reads.
- `templates/`: versioned local adaptations, not official Luuna schemas. The
  optional reference example is inert and must not be loaded unconfigured.
- `references/luuna.md`: router only; no private pack content is distributed.
- `checks/`: two dependency-free, static Node test files plus their local helper.
- `runs/`: ignored nonsecret local evidence created only when needed. No previous
  runs/logs/check outputs are carried over. Ignored does not mean encrypted.
- `local/`: ignored storage only, **not** a V2 automatic config location.

The active `.opencode/opencode.jsonc` retains the published `$schema`, default
agent and instruction entry only. It configures no provider/model, external
reference, MCP server, plugin, global permission override or machine binding.

## Prerequisites and boundaries

Core CLI/build work needs Node/npm and this worktree's scoped dependencies/sync,
not the optional Luuna pack, Apple skills or OpenDesign. UI tasks require the
separately available `apple-design-web` and `apple-design-hig` skills; neither is
bundled or installed here. OpenCode configuration work uses the global/built-in
`opencode` skill and official V2 docs. Report missing prerequisites honestly.

Read-only roles deny shell, edits, Code Mode and MCP tools. Only implementer and
testing-setup ask for source edits/shell; they cannot rewrite the operative
harness, shared `AGENTS.md`, root OpenCode config or global skills. Plan approval
and tool permission are distinct. Writer rules also deny canonical absolute
external edit paths instead of retaining a machine-specific pack exception.
Do not save broad approvals for script names,
use shell to bypass denied edits, or infer safety from `test`/`build` labels.

The existing user policy's four-active-session convention, one writer/worktree,
initial-plus-two repairs, context isolation and evidence freshness are procedures,
not transactional runtime guarantees. No provider/model or spending cap is
invented. Native permissions are **not an OS sandbox**; shell has host authority.
Search tools must also exclude secret paths and cannot bypass denied reads.

Publishing/pushing/release/merge are disabled in these workers. After exact
candidate checks and fresh review, hand off a proposal for separate interactive
authorization. Preserve user work and pause on conflicting external changes.

## Static verification

After activation, from the project root:

```sh
node --test .opencode/checks/*.test.mjs
```

Checks validate the public file layout, frontmatter/V2 field subset, command/skill
routing, modeled source-rule boundaries, optional-reference example, source-first
profile against `package.json`, explicit 83-component barrel and shared CSS.
They do **not** call OpenCode, start a service, use a model/provider, inspect
credentials, contact MCP, run product recipes or prove runtime enforcement.

Profiles keep the baseline `unverified` until approved required recipes actually
run on the exact worktree/candidate. Product/browser, native discovery/default
selection/effective permissions, and any integration generation need separate
explicit validation; static passes cannot stand in for them. The setup guide
documents staged-tree validation without activating configuration.
