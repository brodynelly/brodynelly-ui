# OpenDesign integration reference

## Provenance and freshness

- The capability outline comes from the source setup's user-supplied Integrations
  / Skills & headless / CLI excerpt, dated 16 October 2026. No canonical
  OpenDesign web URL or source checkout was supplied. This is a limited routing
  summary, not the protocol specification or evidence any operation ran here.
- Host version, executable discovery, connection state, health and generation
  results do not transfer between projects or machines. All remain unverified
  for this checkout until separately observed with explicit scope.
- For OpenCode setup, load `opencode` and fetch the relevant official V2 page:
  [configuration](https://opencode.ai/v2/docs/config),
  [MCP servers](https://opencode.ai/v2/docs/mcp-servers),
  [permissions](https://opencode.ai/v2/docs/permissions),
  [skills](https://opencode.ai/v2/docs/skills), or
  [commands](https://opencode.ai/v2/docs/commands).

## Route the task

| Need                     | Reference / discovery                                       | Boundary                                                                                             |
| ------------------------ | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Tools in the agent loop  | An existing `open-design` MCP server; live catalogue        | Discover exact names/schemas; never infer tools from CLI subcommands.                                |
| Local CLI                | User's installed matching-version help                      | Verify executable, existing target and side effects; do not start a daemon as a health check.        |
| HTTP automation          | Matching-version HTTP documentation or user-provided source | No route, authentication scheme or request shape is supplied here; do not invent or probe endpoints. |
| OpenDesign-native skills | Upstream `docs/skills-protocol.md`                          | Obtain matching source/URL from the user when full details are needed.                               |
| External agent adapters  | Upstream `docs/agent-adapters.md`                           | Discovery does not prove executable compatibility.                                                   |
| Connectors / plugins     | Live schemas, matching help and scoped inventory            | Discovery does not authorize execution, installation, trust or publication.                          |
| Svelte UI work           | `apple-frontend`, repository instructions/profile           | Keep copied component source and shared CSS authoritative, not generated HTML.                       |

The upstream `docs/...` paths belong to OpenDesign, not this repository. They
have not been bundled or read merely because this summary names them. Do not
search unrelated local directories or copy private reference packs into Git.

## Optional local connection — manual only

No MCP command, executable, endpoint, port, pipe, credential or daemon binding is
shipped in this project's public configuration. See `docs/opencode.md` from the
project root for documented V2 config locations and local Git exclusion.

If the user already has a working `open-design` connection, keep that exact
local connection and its data target. Do not add a second alias/server, move it
to global configuration, reinstall a plugin, rewrite its environment, or copy an
old root config over the project. Do not claim it is available here until checked.
Opening or loading a config with MCP entries may start its local servers, so
manual connection setup is a separate user action, not an automatic migration.

Use `/mcps` to inspect an existing connection when requested. If CLI inspection
is authorized, resolve the user's installed OpenCode executable without storing
its absolute path in shared files. Do not change PATH or install a CLI silently.
Do not derive and run packaged app commands, launch bare CLI entrypoints, guess
a daemon URL or start a second instance as fallback. Missing setup is a blocker
for OpenDesign-dependent work only; core CLI/build tasks do not need OpenDesign.

## Skill compatibility and capability limits

The supplied outline describes Claude-compatible OpenDesign skills containing
`SKILL.md`, YAML frontmatter, Markdown, and optional `od:` metadata for surfaces,
previews, design systems and inputs. This is not OpenCode's native config schema.
OpenCode discovers `.opencode/skills/opendesign/SKILL.md`; that does not install
anything into OpenDesign, execute `od:` metadata or provide a design system.

Project creation, run/generation, media output, plugin installation/application,
connector side effects, exports and remote data submission can mutate state or
incur cost. Require an explicit bounded request with inputs, destination,
overwrite policy and relevant provider/cost constraints. Do not include example
generation commands in an execution queue or use another transport to bypass a
denied tool. Generated artifacts are references, not automatic Svelte edits.

## Evidence

- `configured`: an actual local config entry exists.
- `connected`: a current status result confirms connection.
- `read-only checked`: a scoped read actually succeeded.
- `generation verified`: an explicitly authorized generation completed with
  inspected output and actual evidence. None of the earlier levels proves this.

Static Node checks validate only the public files and routing/boundaries. They
do not connect to MCP, call a provider, generate designs or verify these levels.
Record real runtime evidence separately, redact secrets first, and preserve
unrelated projects, processes, existing connection settings and user artifacts.
