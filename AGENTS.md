# MetalUI agent rules

MetalUI is an open-source React and SwiftUI component library in the "Soft Hardware" style. Read `docs/PLAN.md` before you change structure. Production is `https://metalui.dev`. On npm it is `@unlocalhosted/metalui`, and on GitHub it is `vijayksingh/metalui`.

## Layout

```
apps/docs/                 metalui.dev: Vite + React Router + Tailwind v4 + DialKit
  src/app/                 shell, navigation, colorway
  src/pages/               one file per route (foundations/*, components/*, icons)
  src/ui/                  docs-only building blocks (PageHeader, Section, Bench, Rules, Code)
packages/metalui/          the published package, @unlocalhosted/metalui
  src/components/<name>/   <name>.tsx, <name>.css, <name>.agent.md, meta.json
  src/components/tokens.css, theme.css   generated (--mu-* variables; Tailwind @theme)
  src/icons/               Icon runtime + generated catalog, CSS and components
  icons/src/               icon geometry and motion source (icons.mjs, tuned16.mjs)
  public/                  generated registry (r/), icon SVGs, AI.md, llms.txt, manifests
tokens/tokens.json         the one source for materials, colorways, springs and foundations
swift/ + Package.swift     MetalUI for SwiftUI (tokens generated from tokens.json)
scripts/                   generators: tokens, icons (product + life), SF Symbols, registry, agent docs
e2e/                       Playwright feature slices; captures land in docs/captures/
```

## Load-bearing rules

- **One source per fact.** Tokens live in `tokens/tokens.json` and icons in `packages/metalui/icons/src/icons.mjs`. Never hand-edit generated files (`tokens.css`, `theme.css`, `*.generated.*`, `MetalTokens.generated.swift`, `public/`); run `npm run generate`.
- **Six layers** (`docs/COMPOSITION.md`): Foundations → Parts → Components → Objects → Instruments → Places. Parts are pieces with a look and no job (well, plate, label, glyph, LED, keycap). Components are controls you operate (button, select, tabs). Objects are things with a body that stand for a person's stuff (folder, card, connector). Instruments exist only while you act (selection frame, lasso, cursor). Places have area and hold objects (region, lens, the past). Everything is Soft Hardware, so "it looks physical" never decides the layer; what it is to the person does. Place every new thing with the tests in that document before building it, and never call anything a "primitive".
- **Foundations first, then one component at a time.** Follow the owner's global rules: atomic layered changes, every state and transition of a component thought through before the next one starts.
- **Every component ships three things together:** React (`.tsx` + `.css`), SwiftUI (`swift/Sources/MetalUI/Components/Metal<Name>.swift`) and the agent guide (`<name>.agent.md`), plus `meta.json` and a docs page under `apps/docs/src/pages/components/`.
- **React components wrap Base UI.** Don't reimplement focus management, keyboard handling or ARIA that a Base UI part already provides. The component layer moves to Tailwind v4 utilities from `theme.css`.
- **Swift types are prefixed `Metal`.** Target platforms are macOS 14 and iOS 17; today only macOS builds (AppKit is used in eight files, see `docs/BACKLOG.md`, "SwiftUI on iOS"). Don't claim iOS until it builds.
- **Material recipes are shared.** CSS and SwiftUI render the same fill and shadow stack; never tune one platform alone.
- **Performance rules live in `docs/PERFORMANCE.md`.** Nothing runs at rest, only transform and opacity animate, one low-power switch, one import ships one component. `npm run check` lints transitions; `npm run bench:gate` and `npm run bench:bundle:gate` hold the numbers.
- **Tests are integration or e2e only** (Playwright feature slices). No unit tests.
- **X-ray cards are handled, not slid.** Every x-ray card holds a specimen: the real component, changed by handling it, never sliders. Follow `docs/EDITING_LAYER.md` (the Button x-ray is the reference) and build on `apps/docs/src/ui/edit`.
- **Every docs page is real documentation.** No throwaway demo pages. Tunable values go in a DialKit panel on the page.

## Commands

```bash
npm ci               # with install scripts: the docs' surface-field dependency builds in them
npm run dev          # docs on http://127.0.0.1:4193
npm run generate     # tokens, icons, registry, agent docs
npm run check        # generated files are fresh
npm run symbols      # SF Symbols for both icon sets (macOS, Xcode toolchain); symbols:check to verify
npm run test:e2e     # Playwright feature slices against the docs site
npm run typecheck
npm run build        # check + package (packages/metalui/dist) + docs (apps/docs/dist)
swift build
```

## Working style

- Make atomic, layered changes: one foundation or one component at a time, finished and reviewed before the next. Run targeted checks, then one full `npm run build` plus `swift build`.
- Commit each coherent chunk with a conventional commit message. Don't push unless asked.
- Visual changes: verify them in the running site in both colorways and with reduced motion before calling them done.
- Don't publish to npm, tag, or deploy without an explicit request.

## Learned the hard way

Rules that hold for every change. Facts about one component belong in its agent guide, not here.

- **Gate every commit on `npm run check`.** It fails on raw numbers in SwiftUI padding, opacity or duration (put them in the recipe's props), on a component importing another that its `meta.json` `uses` doesn't list, and on a block that paints (blocks lay out; the host page paints type and ink).
- **Captures are evidence, not source.** Tests rewrite `docs/captures/`; restore it (`git checkout -- docs/captures`) before committing, and commit a capture only when the change is the capture (a docs page shows it, a new spec's baseline).
- **Reuse before adding.** Look for the part that already does the job: `IconButton` for any glyph key, `SwapText` (the drum) for changing words and numbers, `Button` `state` for an action that waits, `useRowMotion` (`motion/rows.ts`) for rows that arrive, leave and close the gap, `Row` `selected`/`opened`, `MorphIcon` for a glyph whose meaning changes, `useReducedMotion`/`motionReduced` for Reduce Motion.
- **Blocks size by their own width**: container queries on `@container/block`, never viewport breakpoints (`docs/DOCS_ARCHITECTURE.md` §3.2).
- **Plan variations as jobs, in our materials.** Other libraries (ReUI, shadcn) are a checklist of situations, not a spec: restate each variation as the job it does, then give it our form, mark it covered, or drop it with the reason. Tier each item Must, Should or Later. Sizes are named large 44 / regular 32 / compact 28 (the field ladder), never xs–xl.
- **LED colours have fixed meanings**: green live, amber waiting or urgent, red failed, blue a link's kind. Never invent another; never let colour carry a state alone (a word, a glyph or a gesture goes with it).
- **Icons**: draw them in the act format (`icons/src/acts/<name>.mjs`, `docs/ICON-MOTION.md`, `docs/ICON-GRAMMAR.md`), then `node scripts/icon-lint.mjs --only <name>`, `node scripts/morph-strain.mjs --matrix` (at or under the family median), look at `node scripts/icon-film.mjs <name>` at 96, 24 and 16 px in both colorways, and `npm run symbols:check`.
- **React traps**: the docs run in StrictMode, so effects run twice (cancel what you start in cleanup); spreading `tabIndex={undefined}` onto a Base UI composite part breaks its roving focus (spread it only when set).
- **Tests**: a slice that fails in a full parallel run but passes alone is a race in the test; fix the test (sample with rAF, poll), don't retry it. Set `METALUI_TEST_PORT` to run beside another server.
- **`CLAUDE.md` is a symlink to this file**: edit `AGENTS.md`; writing to `CLAUDE.md` writes here.
- **The backlog's "Owner:" is Vijay Singh**, the library's owner; other people's words are attributed by name.

## Working a backlog entry

How one agent takes one entry of `docs/BACKLOG.md` (or one variation sheet) to done:

1. Read the entry, its sheet if it has one, the component's agent guide, `meta.json`, React and SwiftUI files and docs page. Place anything new with `docs/COMPOSITION.md`.
2. Decide what the entry leaves open (its "Decide" lines) on the jobs it serves, and write the decision and its reason in your report.
3. Build every item in tier order: React, SwiftUI, tokens (the recipe's props), the agent guide, the page (with its DialKit panel) and a Playwright slice. Run `npm run generate` after token or icon changes.
4. Before reporting: `npm run check`, `npm run typecheck`, your slices in both colorways and under Reduce Motion, `swift build`, and look at your own captures.
5. Commit each coherent chunk. Don't tick the backlog, don't push, and stay inside your component's files plus its own section of `tokens/tokens.json`.
6. Report: what shipped, what you decided and why, what is left, and anything another component must change.
