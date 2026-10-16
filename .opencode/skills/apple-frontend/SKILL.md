---
name: Apple Frontend
description: Coordinate separately available Apple Design Web and HIG skills for this source-first Svelte component library. Use for frontend design, tokens, component implementation, gestures, motion, materials, accessibility, and independent UI review, without imposing native-only conventions on the web.
---

# Apple frontend routing

This skill connects two independent sources; it does not merge their upstream
files or claim to be a complete design system. From the project root read current
`src/lib/styles.css`, relevant component implementations, `src/lib/index.js`,
and `.opencode/profiles/brodynelly-ui.json`. The showcase is an example, not the
component source entry or sole location for styling fixes. Consumers copy source
with this project's own CLI; there is no runtime component package dependency.

## Choose references deliberately

1. Load `apple-design-web` for UI design/implementation and interaction review.
   Its `SKILL.md` is only an introduction. From its **returned base directory**,
   explicitly read:
   - `sections/quick-reference.md`
   - `sections/17-process.md`
   - `sections/14-reduced-motion-accessibility.md`
   - Relevant gesture/spring/interruptibility, materials, typography, or
     design-foundations sections for the actual task.
2. Load `apple-design-hig` for foundations and UI/accessibility review. Read its
   routing instructions and the relevant files from its returned base directory,
   including accessibility, layout, typography, and color. Add only relevant
   component/material/motion/privacy/AI pages. Cite only files/headings actually
   read. Native platform pages can be inspected for context, not imposed on web UI.
3. If a required skill/reference is unavailable, report the missing prerequisite.
   Neither Apple skill is bundled here. Do not install, overwrite, or refresh
   global resources silently. Never claim memory of a guideline is a citation or
   that curated advice is official Apple text.

## Reconcile platform and project

- Use semantic HTML and web accessibility requirements for browser behavior;
  Apple principles inform design, not substitute for standards. Do not impose
  native menu bars, Settings windows, Dynamic Type APIs, iOS tab placement,
  point-size tables, or a ban on browser appearance preferences.
- Respect browser zoom/reflow, visible keyboard focus, accessible names,
  meaningful disabled/busy states, dialog focus management, selection/copying of
  text/diffs/logs, contrast, and non-color status cues. Test actual behavior.
- Normal web text needs 4.5:1 contrast; 3:1 applies to qualifying large text
  (at least 24 CSS px regular or about 18.67 CSS px bold), not every bold label.
  Verify actual foreground/background values and distinguish measured from estimated.
- Map roles to existing shared tokens before proposing new ones. Preserve the
  classic/Version26 families and existing API/style conventions unless change is
  approved. Do not silently migrate Svelte syntax, add a framework, or install an
  animation package. Source observations are not proof the current APIs are ideal.
- Motion should respond immediately, remain interruptible, and carry release
  velocity where relevant. Provide reduced-motion alternatives. Honor reduced
  transparency and contrast preferences with supported solid/opaque fallbacks.
- Keep glass primarily on functional/navigation chrome; readable content wins
  over blur. A CSS approximation is not native Liquid Glass implementation.
- Use licensed assets/system font stacks; do not assume SF font/symbol rights.

## Deliverables and review

For design: state the task, audience, one defining idea, token/type/spacing roles,
compact/regular structure, interaction states, motion/fallbacks, and measurable
acceptance checks. Keep controls familiar without making every product identical.

For implementation: `luuna-implementer` owns approved code/tests; the frontend
specialist advises without writing. Public additions update the export barrel,
styles belong in the library, and copied-source/CSS behavior matters as well as
the demo. Regenerate `registry/` with `npm run registry:build`, then check it with
`npm run registry:check`; never hand-edit generated payloads. Do not repair
unrelated accessibility debt during setup.

For independent review: use a **fresh** `apple-frontend-specialist` conversation
with current code/rendered evidence, approved scope, and check records—not the
implementation transcript. Report What/Why/Fix with severity, actual source
citations or explicitly labeled design judgment, what works, and limits. Screenshots
alone do not prove contrast, semantics, keyboard behavior, or native validation.
