# Brodynelly UI

- Svelte 5 editable components, distributed by our own copy-to-source CLI. This is not a runtime component npm package or an official shadcn registry.
- `src/lib/index.js` explicitly defines the 83 public components. Shared CSS belongs in `src/lib/styles.css`; the showcase imports it separately.
- `scripts/build-registry.mjs` generates `registry/`. Never hand-edit payloads. Run `npm run registry:build`, then `npm run registry:check`.
- `npm test` runs browser component tests and Node tests once. Standalone real-pointer tests use Playwright outside Vitest's browser iframe. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` for an installed Chromium browser.
- Use `site:build` for the showcase. Do not add root install/build lifecycle hooks, runtime dependencies, publishing workflows, or machine-local configuration.
- Do not commit `.checks/`, generated site output, screenshots, secrets, or private design assets. Preserve local user work. Publishing/pushing requires separate authorization.
