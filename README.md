# Brodynelly UI

Editable Svelte 5 components. Copy the source into your own project, import local
files, and make them yours. No Tailwind or component-runtime package is required.

This repository contains the showcase, the deterministic source registry, and our
own Node installer. It is not an official shadcn-svelte registry format.

## Local development

Requires Node 20.19+ and npm.

```sh
npm ci
npm run sync
npm run dev
npm test
npm run test:registry
npm run registry:check
npm run lint
npm run site:build
```

Browser tests use Playwright Chromium. To use an existing browser, set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its executable. No browser is downloaded by
the project's install scripts. Installer integration and source-first onboarding
are being assembled separately; no packed/Git-install verification is claimed yet.

The 83 public components are declared in `src/lib/index.js`; shared styles live in
`src/lib/styles.css`. Generated registry files contain complete relative-import
closures, plus shared styles and license notices. Do not import this repository
as a runtime component package.

See [NOTICE.md](NOTICE.md) and [LICENSE](LICENSE) for attribution and MIT terms.
Not affiliated with Apple. No SF fonts or symbols are distributed.
