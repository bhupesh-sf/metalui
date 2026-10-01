# Contributing to MetalUI

MetalUI is an alpha, open-source React and SwiftUI component library. Issues and pull requests are welcome. For anything larger than a fix, open an issue first so we can agree on the shape before you build it.

## Set up

```sh
npm ci
npm run dev        # the docs site on http://127.0.0.1:4193
```

Node 22 or newer. SwiftUI work needs macOS and Xcode (`swift build`).

## How the repository is organised

Read [docs/PLAN.md](docs/PLAN.md) and [docs/COMPOSITION.md](docs/COMPOSITION.md) first. In short:

- `tokens/tokens.json` is the one source for colors, materials, springs and sizes. Never edit generated files (`tokens.css`, `theme.css`, `*.generated.*`, `MetalTokens.generated.swift`, `packages/metalui/public/`); change the source and run `npm run generate`.
- A component lives in `packages/metalui/src/components/<name>/` as `<name>.tsx`, `<name>.agent.md` and `meta.json`, with a SwiftUI twin in `swift/Sources/MetalUI/Components/` and a docs page in `apps/docs/src/pages/components/`. All of them ship together.
- React components wrap [Base UI](https://base-ui.com); don't reimplement focus, keyboard or ARIA behaviour a Base UI part already provides.
- Styling is Tailwind v4 utilities from the generated theme. Values come from tokens, not from numbers: `npm run check` rejects arbitrary values and any class that depends on the host app's spacing scale.

## Before you open a pull request

```sh
npm run check        # generated files are fresh, and the repository's rules hold
npm run typecheck
npm run build
swift build          # if you touched Swift or tokens
npm run test:e2e     # at least the specs for what you changed
```

- Tests are end-to-end only (Playwright feature slices in `e2e/`): they use the real page and real input, and check what a person can observe. We don't write unit tests.
- A visual change is checked in both colorways (Bone and Graphite) and with reduced motion.
- Every change someone can notice gets a line under **Unreleased** in [packages/metalui/CHANGELOG.md](packages/metalui/CHANGELOG.md).
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat(button): ...`, `fix(menu): ...`).

## Reporting a bug

Use the bug template. The most useful report has a minimal reproduction, the package version, your framework and React version, and what you expected.

## Security

Please don't open a public issue for a vulnerability; see [SECURITY.md](SECURITY.md).

## Licence

By contributing you agree that your contribution is licensed under the [MIT licence](LICENSE).
