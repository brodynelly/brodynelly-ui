# OpenCode V2 project setup

Brodynelly UI's `.opencode/` contains project-local agents, commands, skills,
instructions, templates, static checks and a repository profile. It preserves
the existing Luuna-style team while adapting recipes to **editable Svelte 5
source plus our own copy-to-source CLI**, not a runtime component npm package or
official shadcn registry. See [the team reference](../.opencode/README.md).

## Each worktree starts at its own root

Open the actual project root in OpenCode for **each** task worktree, then confirm
the session location, branch and current `AGENTS.md`/`package.json`. V2 discovers
config from the current directory and ancestors, including above the repo root;
do not assume another checkout's config, dependencies or evidence applies.

With dependency installation explicitly in scope, use Node 20.19+ and npm:

```sh
npm ci
npm run sync
```

These are per-worktree prerequisites, not commands this migration runs or an
automatic lifecycle hook. Inspect package/lock/script contents first. Do not
borrow `node_modules` or generated SvelteKit state from another worktree, install
tools silently, or choose blanket saved script approvals to suppress prompts.

Proposed operations (choose only those needed by the approved task):

| Command                                                | Purpose                                                                                        |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `npm run dev` / `npm run preview`                      | Optional owned showcase servers; preview needs a build.                                        |
| `npm run site:build`                                   | Build the showcase, not a runtime library package.                                             |
| `npm run registry:build` then `npm run registry:check` | Generate/check source registry; never hand-edit payloads.                                      |
| `npm test`                                             | Browser components and Node tests once, including real-pointer checks outside Vitest's iframe. |
| `npm run test:registry` / `npm run test:installer`     | Registry and copy-to-source CLI Node tests.                                                    |
| `npm run lint`                                         | Current Prettier/ESLint checks.                                                                |
| `node --test .opencode/checks/*.test.mjs`              | Static configuration contracts only; no dependencies/service/provider needed.                  |

Browser checks need available Playwright Chromium. To use a separately installed
Chromium, supply `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` in that process/session's
environment with your actual executable. Omit it to use Playwright's available
browser. No executable path is committed, no browser is installed automatically,
and Chromium is not WebKit/native-platform evidence.

The profile `.opencode/profiles/brodynelly-ui.json` is proposal data, not native
OpenCode config or a passed baseline. Verify its recipes against current scripts
and record actual command/args/cwd, source identity, timestamps, environment,
exit status and executed/skipped counts. Required product baseline remains
**unverified** until the approved required recipes run on this exact candidate;
another session's passes do not become this worktree's evidence.

## Portable defaults and policy

The active `.opencode/opencode.jsonc` uses the published `$schema` and only sets
`default_agent: luuna-orchestrator` and the always-loaded instruction file.
Existing sessions retain their selected agent; use a new session for a default
selection check. No provider/model, plugin, MCP server, machine path, global
override, broad script permission or active external reference is bundled.

The current source user's operating-policy wording is retained, including its
gate/repair choices; this port is not a policy reset. Role definitions preserve
read-only/writer boundaries: children cannot delegate, read-only roles cannot
execute or mutate, writers ask for bounded shell/edits, and only the orchestrator
can write run bookkeeping directly. Workers deny harness/policy edits and
publication. Writer edit rules deny canonical absolute external paths, a
portable tightening that keeps external reference files read-only without an
active machine path. This is not a restriction on arbitrary shell code.
Publication/push/merge stays a separately authorized interactive
handoff; no permission widening is needed to use the portable setup.

Native rules are not an OS sandbox, and procedures are not runtime guarantees.
Plan approval does not approve arbitrary tool prompts/scripts. Missing tools or
conflicting user edits are blockers, not excuses to rewrite policy or use shell
as a denied-edit workaround. Preserve unrelated work and nonsecret evidence.

## Optional external Luuna reference — manual opt-in only

Normal CLI/build and configuration checks do not need the private reference
pack. Only an assignment relying on a canonical pack topic needs it. Without
it, that role reports the dependent claim/assignment blocked or unverified;
unrelated project work does not enter a paused bootstrap. Do not fabricate a
citation or redistribute the pack.

1. Obtain the user-owned external directory separately and keep it **outside the
   repository**, read-only. Verify its identity and the specific required files.
2. Set `LUUNA_SPEC_DIR` in the environment of OpenCode's loading service/process
   to that verified **absolute directory**, without a trailing separator. An
   environment value in a separate shell does not necessarily reach an already
   running service. Do not dump the environment or store private paths in Git.
3. **Before any merge, ensure the variable is nonempty and the directory exists.**
   V2 substitutes unset variables with an empty string. Never activate an empty
   reference path, which could be mistaken for the current/config directory.
4. Inspect the inert
   `.opencode/templates/optional-luuna-reference.jsonc.example`. Only after the
   prerequisite is satisfied, manually merge its `references` and read-only
   `tool.use` edit-denial policy into private local project config as below.
   Do not rename/move it into an active location automatically. It grants no
   external-directory allow: access still asks under the team's existing rules.
5. Verify the actual resolved `luuna-spec` alias, effective edit-denial policy and
   relevant file reads when
   requested. Route topics with `.opencode/references/luuna.md`. Keep all
   read-only protections; do not broaden writer permissions or load the whole
   pack as privileged instructions. If the variable becomes unavailable,
   remove the local reference entry until it is verified again.

### Private local configuration uses real V2 locations

V2 documents project `opencode.json(c)` and `.opencode/opencode.json(c)`, not an
auto-loaded `opencode.local.jsonc`. This repository tracks the portable
`.opencode/opencode.jsonc`. For an explicitly requested machine-local overlay,
the user may merge into an **existing root `opencode.json` or `opencode.jsonc`**,
or create one there if neither exists. Keep `$schema` as
`https://opencode.ai/config.json` and preserve unrelated entries. Do not copy an
old root config wholesale, create competing root files, edit global/user config,
or overwrite the tracked portable file with a machine binding.

Before placing private settings there, the user should exclude that root file
locally with Git's `.git/info/exclude` (for linked worktrees, ask Git for the
actual path with `git rev-parse --git-path info/exclude`). Example exclusion
patterns, added manually for the chosen file only:

```gitignore
/opencode.json
/opencode.jsonc
```

Check `git status`/`git check-ignore` and never stage secrets or machine bindings.
`.opencode/local/` is ignored storage, **not** an automatic config loader; no
config file there takes effect merely by existing. There is no need to change
global config or invent another local filename.

V2 merges direct configs from farthest ancestor to nearest, then `.opencode`
configs in the same order; every discovered `.opencode` config wins over direct
configs for conflicting values. The portable file deliberately leaves
`references`/`mcp` unset so it does not replace unrelated local entries. Broader
global/system/managed settings may also affect actual behavior; static checks
cannot inspect or guarantee the user's effective runtime configuration.

## Separately available skills and OpenDesign

- UI work needs `apple-design-web` and `apple-design-hig`, available separately
  as global/built-in skills. They are not bundled, installed or proven available
  by this port. Load them and read required supporting sections from the base
  directory returned by the skill tool. Missing resources block only dependent
  UI work. `apple-frontend` is the project router, not a copy of those skills.
- OpenCode configuration work needs the global/built-in `opencode` skill and
  current official V2 docs; no provider/model is pinned by project config.
- `/opendesign` selects interactive Build in the current session. It supplies
  optional integration guidance, **not a connection or generation proof**.
  No MCP binding from an old project is copied. If the user already has a working
  local `open-design` connection, preserve it manually at its existing local
  scope with the same target; do not create another server/alias, plugin install,
  daemon, machine binding in public Git or widened team permissions.
- Local MCP configs can start servers automatically when loaded; this migration
  does not load an integration config or run `opencode mcp add`, service/API
  commands, CLI fallback, provider calls or generated samples. A requested
  runtime check is separate: use `/mcps`, discover actual tools/schemas, and
  distinguish configured, connected, read-only checked and generation verified.
  Authentication, paid generation, exports or other side effects require their
  own explicit bounded request. Do not guess a pipe/port/HTTP route or bypass
  denied MCP through CLI/HTTP. See the OpenDesign skill's supporting reference.

## Static validation, including an inactive staged tree

After the reviewed files are activated, from the project root:

```sh
node --test .opencode/checks/*.test.mjs
```

The checks locate their own `.opencode` source tree from `import.meta.url`.
`PRODUCT_ROOT` optionally points to the real product checkout whose
`package.json`, barrel and source paths should be checked. It defaults to the
parent of that `.opencode` tree. This explicit separation lets an inactive
staged tree validate against a real worktree **without** activating its config:

```powershell
$env:PRODUCT_ROOT = (Get-Location).Path
node --test .checks/opencode-port/public-files/.opencode/checks/setup.test.mjs .checks/opencode-port/public-files/.opencode/checks/opendesign.test.mjs
Remove-Item Env:PRODUCT_ROOT
```

Only set/remove the variable if it is yours; restore a pre-existing value rather
than discarding it. POSIX callers can prefix the command with `PRODUCT_ROOT="$PWD"`.
No `OPENCODE_CLI`, installed service, credentials or external packs are needed.

The tests check a documented V2 field subset/frontmatter, routing/file existence,
source-rule semantics, optional-reference inertness, profile/scripts and the
83 explicit components/shared CSS/source-first package contract. They perform
local reads only; no spawn, network, fixture writes or provider/MCP calls.
This is not full native schema/parser validation, runtime discovery, effective
permissions, new-session default behavior, live denial enforcement, product
regression evidence, external-reference resolution or generation verification.
Those remain separate explicitly scoped validation needs after review/activation.

## Official V2 sources

[Config](https://opencode.ai/v2/docs/config) ·
[Agents](https://opencode.ai/v2/docs/agents) ·
[Commands](https://opencode.ai/v2/docs/commands) ·
[Skills](https://opencode.ai/v2/docs/skills) ·
[Instructions](https://opencode.ai/v2/docs/instructions) ·
[Permissions](https://opencode.ai/v2/docs/permissions) ·
[References](https://opencode.ai/v2/docs/references) ·
[Policies](https://opencode.ai/v2/docs/policies) ·
[MCP](https://opencode.ai/v2/docs/mcp-servers) ·
[Migration](https://opencode.ai/v2/docs/migrate-v1).

The published schema URL is retained for editors; deprecated/V1 fields are not
used as native V2 configuration. Consult current official V2 topic docs before
changing configuration or claiming runtime support.
