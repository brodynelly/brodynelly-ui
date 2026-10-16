# Source-first setup

Brodynelly UI copies editable files into your project. It is not a runtime
component package, an npm release promise, or an official shadcn registry.
The public upstream is [brodynelly/brodynelly-ui](https://github.com/brodynelly/brodynelly-ui).
Use our CLI rather than the shadcn CLI.

## Requirements and first addition

- Node 20.19+ and npm; Git/network access for the GitHub command.
- An existing Svelte application. Metadata's Svelte 5.20 minimum is a technical
  compatibility floor, not a safe-version recommendation. Use currently supported,
  patched Node, Svelte 5, and SvelteKit versions.
- Run from your application directory. Review and pin a trusted Git revision for
  reproducible use; a moving Git branch is not a fixed release.

```sh
npx --yes --package=github:brodynelly/brodynelly-ui brodynelly-ui add switch
```

Default destination: `src/lib/components/ui/`. The CLI copies the entry’s complete
local import closure plus `styles.css`, `LICENSE`, and `NOTICE.md`. It does not
edit your application layout or package manifest. No runtime dependency is added.

```sh
npx --yes --package=github:brodynelly/brodynelly-ui brodynelly-ui list
npx --yes --package=github:brodynelly/brodynelly-ui brodynelly-ui add switch slider
npx --yes --package=github:brodynelly/brodynelly-ui brodynelly-ui add --all
```

`init` is optional: it copies shared base files and saves the destination in
`.brodynelly-ui.json`. `--dir` selects a contained relative UI directory; `--cwd`
selects the consumer project. An explicit directory that disagrees with saved
configuration is refused. Only an intentional `init --overwrite` can change the
saved directory; it does not migrate your previous source.

## One-time local CSS import

In SvelteKit, import the copied stylesheet once in your root
`src/routes/+layout.svelte`, preserving your existing layout content:

```js
import '$lib/components/ui/styles.css';
```

Import components directly from your copied files in the pages that use them:

```svelte
<script>
	import Switch from '$lib/components/ui/controls/Switch.svelte';

	let notifications = $state(true);
</script>

<Switch bind:checked={notifications} label="Notifications" />
```

If you don’t use SvelteKit’s `$lib` alias, use equivalent relative paths. No
Brodynelly UI runtime import or Tailwind setup is needed. No generated global
component barrel is required. Open the copied `.svelte` file and edit it.

## Theme and base styles

The copied `styles.css` defines shared tokens and light/dark appearance preferences.
It also contains global resets, body typography, text-selection restrictions,
and `text-size-adjust` rules inherited from the legacy source. Review these before
integrating; adapt or scope them locally so they don’t override your application’s
accessibility and style requirements.

Customize tokens such as `--colors-accent`, `--labels-primary`, and `--bg-primary`
and the component styles in your own source. Test ordinary text contrast,
keyboard focus, both appearances, enlarged text, reduced motion, and reduced
transparency after changes. Copying source gives you control, not automatic
accessibility certification for every composition.

## Protect edited files

Save your source in version control or a backup before adding again. Conflicting
edited files cause the default whole plan to refuse before any writes. Identical
files are skipped. There are no silent upgrades or automatic merges.

```sh
npx --yes --package=github:brodynelly/brodynelly-ui brodynelly-ui add switch --dry-run
npx --yes --package=github:brodynelly/brodynelly-ui brodynelly-ui add switch --dry-run --keep-existing
npx --yes --package=github:brodynelly/brodynelly-ui brodynelly-ui add switch --keep-existing
```

- `--dry-run`: zero target writes; it still reports conflicts. Combine it with
  the policy you intend to use.
- `--keep-existing`: keep existing files and add missing files. You must check
  compatibility with your customizations.
- `--overwrite`: explicitly replace conflicting regular files in the plan,
  including shared CSS and notices when applicable. This can destroy edits;
  save them and review a dry run first.

`--keep-existing` and `--overwrite` are mutually exclusive. Neither merges changes
or silently upgrades your customized components.

## Optional fonts and legacy glass

Some legacy components use **Material Symbols Rounded** ligatures. Supply an
appropriately licensed font yourself or replace those icons. The installer does
not download fonts. The newer interactive controls do not require that font.
No Apple fonts or SF Symbols are distributed; CSS system font names are only
fallback references to fonts already present on the device.

Legacy glass styles can use an **optional, browser-dependent** host SVG distortion
filter. Ordinary CSS blur is the baseline. The site’s `src/app.html` has an example
filter and Blink-specific opt-in styles, but its `feImage` input is commented out.
Do not assume that snippet automatically supplies a working refraction map.

Host HTML, filter assets and font files are not copied into your app. If you opt
in, supply and test the filter inputs and IDs, browser support and solid fallbacks.
One legacy toggle embeds its own filter; review IDs when rendering repeats. These
enhancements are not prerequisites for source-first onboarding or the new site.
See the [registry format](registry.md) for per-closure requirements.

## Attribution and development

MIT licensed. Keep the copied `LICENSE` and `NOTICE.md`. Includes components adapted
from [apple-svelte by Carza-104](https://github.com/Carza-104/apple-svelte).
Independent Apple-inspired design; not affiliated with, endorsed by, or sponsored
by Apple. See [NOTICE.md](../NOTICE.md).

The site keeps the full legacy presentation at `/showcase`, the original Windows
presentation at `/windows`, and interactive examples at `/components`.

For developing this repository, follow [worktrees](worktrees.md). Optional portable
project-agent configuration is documented separately in [OpenCode setup](opencode.md).
See [security](security.md) for dependency/script review and [handoff status](handoff-status.md)
for the distinction between foundation evidence and final assembled validation.
