# Source registry v1

This format belongs to the Brodynelly UI CLI. It is **not** the official
shadcn-svelte format, and it does not require Tailwind.

`registry/index.json` lists exactly the 83 explicit component exports. Each
`registry/items/<name>.json` embeds its entry and full local `.svelte` / `.js`
import closure. The installer copies these paths relative to your UI directory;
there is deliberately no generated global barrel pulling in unrelated components.
Shared styles, LICENSE, and NOTICE.md live in `registry/base.json` and accompany
every addition. Overlapping closures contain identical bytes and can be deduplicated.

Names are kebab case (`Version26Button` → `version-26-button`). Files have a path,
kind, normalized-LF content, and SHA-256. The catalog hashes exact UTF-8 payload
JSON. JSON is two-space indented with a terminal LF. `sourceFingerprint` hashes a
sorted manifest of normalized production/base inputs and package name/version;
timestamps, absolute paths, and Git state are excluded. Hashes detect corruption,
not publisher authenticity.

## Host requirements

Svelte 5.20+ is required by the copied source. Import the copied `styles.css` once
from your application. No component-runtime dependency is installed.

- `requirements.materialSymbols: true` means the closure can render `.symbol`
  ligatures using **Material Symbols Rounded**. Supply an appropriately licensed
  font yourself or customize those icons; the installer never downloads fonts.
- `requirements.svgFilter: true` announces an **optional** SVG distortion
  enhancement used by legacy glass styles. Ordinary CSS blur remains available
  without host changes. The showcase's `src/app.html` defines an inline
  `displacementDistortionFilter` and opt-in Blink styles; these are not silently
  inserted into your application. One legacy toggle embeds its own filter.
  Review/customize filter IDs when composing repeated toggles. No extra asset,
  font, or host-HTML file is automatically copied.

## Maintenance

```sh
npm run registry:build
npm run registry:check
npm run test:registry
```

The builder parses JavaScript and Svelte without executing component code. It
allows only Svelte bare imports and contained local `.svelte` / `.js` dependencies.
It rejects escaping, unresolved, excluded, case-colliding, and symlink paths.
Cycles are traversed once. Tests, fixtures, screenshots, private files, unrelated
components, and the global source barrel are never embedded in item payloads.

`--check` generates in memory and compares every byte and path, including stale
extra files, without writing registry artifacts. Normal generation may remove
obsolete item JSON that it owns, but refuses unexpected files for reconciliation.
