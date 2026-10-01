# Launch checklist

Nothing here is optional. Every item has a way to prove it, and "it worked on my machine" is not proof: the consumer checks run in an empty directory, on a clean install, from the public URL. Tick an item only after you have seen the proof, and write the date and the version beside anything you re-run.

Current state when this was written (2026-10-01): `@unlocalhosted/metalui@0.2.1` is on npm, tags `v0.1.0`–`v0.2.1` exist, `https://metalui.dev` is on Cloudflare Pages. The docs say "alpha", so "launch" means telling people, not first publishing. Release mechanics are in `docs/RELEASING.md` and site deployment in `docs/DEPLOYMENT.md`; this file is the gate before and the watch after.

**Legend.** 🧑 = you (owner, needs your accounts or judgment). 🤖 = an agent can run it and report. 👤 = a stranger's first-hour experience; do it exactly as they would, in a fresh folder, with no access to this repo.

---

## Gaps found while writing this (fix before launch)

These are facts about the repo today, not guesses.

- [ ] No `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, issue templates, PR template or `CODEOWNERS`. `.github/` holds only `workflows/`. The README tells people to "open an issue" with no template to guide them.
- [ ] CI (`ci.yml`) runs build, typecheck and `verify:package`. It does **not** run Playwright e2e or any Swift test, only `swift build`. `RELEASING.md` says e2e is "not a release gate"; decide for launch whether that is still true, and write the decision down.
- [ ] No GitHub Releases (only tags). Add a release per version with the changelog text.
- [ ] `verify:package` renders only `Button` and `Surface` in a consumer. Nothing proves the other ~90 components import, render or style from the published tarball. Add a consumer smoke that imports every export (see section 2).
- [ ] The shadcn registry is verified only by `verify:registry` reading the npm package. Nothing installs a component with the real `shadcn` CLI into a real app. Section 3 is the whole answer to your first question.

## Run log

**Section 3, shadcn CLI, 2026-10-01 (clean VM, shadcn 4.21.0, Vite 8 + Tailwind 4.3 + TS 6, no repo access).** First run failed; fixed in `scripts/build-registry.mjs` and re-run against the rebuilt registry served locally:

- [x] **Not styled after install.** Fixed: the `tokens` item now ships `tokens.css` and `theme.css` and adds both `@import` lines to the user's CSS. Built CSS went from 0 to 1836 `--mu-` variables and the button recipe is present.
- [x] **71 type errors after adding everything.** Fixed: files land mirroring `src/` (`components/metalui/{components,blocks,motion,icons}/…`) so every relative import resolves; `motion`, `icons` and `icon-components` are registry items; each item's `registryDependencies` come from its real import graph, and the build fails if an import has no owner. Result: 92 of 92 items install, 0 type errors.
- [x] Six unused `React` imports removed. Two stale items whose source was removed (`lens-bar`, `memory-scrubber`) were still served; the generator now prunes them.
- [x] Re-run against production after deploy, 2026-10-01: 92 of 92 items install from `metalui.dev`, 0 type errors, 1836 `--mu-` variables in the built CSS.
- [x] **Blocks as registry items**, 2026-10-01: the six docs blocks are `block-<name>` items (install to `components/metalui/screens/<name>/`). 0.3.0 is on npm (latest, provenance attested, `verify:registry` passes); on a clean VM all six install from `metalui.dev` with the real npm package 0.3.0, 0 type errors, and a build rendering `Settings` succeeds.
- [ ] Optional after launch: list `@metalui` in shadcn's public registry directory so `npx shadcn add @metalui/button` works; the files stay hosted at `metalui.dev/r`.
- [x] **CSS import path (Next.js), 2026-10-01.** The CLI wrote `@import "./components/metalui/components/tokens.css"` into the user's CSS; relative to `app/globals.css` that fails the Next.js build (`Can't resolve`), and the `@/` alias fails too. Fixed: the `tokens` item installs `@unlocalhosted/metalui` and imports `@unlocalhosted/metalui/tokens.css` and `theme.css` from the package, which resolves in every layout. Proven in Next 16.3 (`src/app` and `app` layouts) and Vite: 0 manual edits, 1836 `--mu-` variables. All 98 items installed in the Next app: `next build` exit 0, and the server-rendered HTML contains the Button and Settings with their recipe classes.
- [x] `'use client'` was missing on `Icon.tsx` and the six blocks, so they crashed as Next.js server components; added.
- [x] **Production re-run after deploy, 2026-10-01:** button install from `metalui.dev` builds in Next 16 (`src/app` and `app`) and Vite with 1836 `--mu-` variables and no edits; all 98 items (components, shared, 6 blocks) install into the Next app and `next build` exits 0.
- [x] **Host safety, 2026-10-01.** Importing `theme.css` redefined three variables a host Tailwind already owns: `--spacing` (so a host's `p-4` became 4px, not 16px), `--font-sans` and `--font-mono`. Removed from the theme (the docs site sets them for itself); the only classes that read the scale were three gaps, now named tokens (`gap-attachment-body-gap`, `gap-drop-zone-words-gap`, `gap-table-sort-gap`); zero classes (`m-0`) are unaffected. Proven: a 344,331-element before/after layout comparison across all 101 docs routes at desktop and phone width shows no layout change (the only differences are source-code listings and sub-pixel animation jitter), and in a Next.js app the published 0.3.0 gives `--spacing:1px` while the fixed build gives `.25rem`, the same as no MetalUI. New guard `npm run check:host-safe` (part of `check`) fails if the theme redefines a host variable or a component writes a numeric spacing class. **Released as 0.3.1 (tag `v0.3.1`, provenance attested); the `tokens` item now requires `^0.3.1`. Verified on production from a clean VM with the real npm package: button, table, attachment and drop-zone install into a Next.js app, `next build` exits 0, `--spacing` stays `.25rem`. 0.3.0 on npm still has the problem; consider `npm deprecate @unlocalhosted/metalui@0.3.0` pointing at 0.3.1.**
- [ ] **Still to do (shadcn):** look at an installed component rendered in a browser and click it (so far: built, type-checked, server-rendered HTML, never seen);
- Passed both runs: `button.json` is 200, `application/json`, CORS `*`; a missing item is a real 404.

**Sections 4 and 5, live crawl of metalui.dev, 2026-10-01:** all 103 sitemap pages return 200; all 152 other internal links resolve with no redirects or errors; every page has one `<h1>`, a self-referencing canonical, `og:url`, `og:title`, `og:description`, an absolute `og:image` and `twitter:card=summary_large_image`; `og.png` is 200, `image/png`, 554 kB. Found and fixed: 31 descriptions over 200 characters (now cut to whole sentences within 160) and two pages titled "Settings — MetalUI" (block pages are now "… block"; the build fails on a duplicate title).

- [ ] Several component descriptions in `meta.json` read like token specs ("frost-strong at .92, radius 18, padding 6", Menu, Tooltip, Slider, Command palette, Fan, Day, Folder) and show up that way in search results and the shadcn registry; rewrite them as one plain sentence about what the component is for.
- [ ] Still to do from 4 and 5: previews in the real scrapers (X card validator, LinkedIn, Slack, Discord, iMessage), `og.png` under 300 px readability, Search Console and Bing verification, favicon and touch icon check, Lighthouse and axe on mobile, keyboard and VoiceOver passes, the Safari and Firefox pass.

**Section 6, agent surfaces, live, 2026-10-01:** `/AI.md` (201 kB), `/llms.txt`, `/robots.txt`, `/sitemap.xml`, `/components.json` and `/icons.json` all 200 with the right content types; all 91 links in `AI.md` and `llms.txt` resolve; all 88 component guides exist. `llms.txt` and `AI.md` now say how to install (npm, shadcn, blocks, SwiftUI), that the package is ESM only, and link the changelog.

- [ ] `AI.md` is 201 kB (about 50k tokens): consider a short entry guide plus per-component guides fetched on demand. Try it for real: give an agent only `https://metalui.dev/AI.md`, ask for a settings panel, and fix what it gets wrong.

**Section 10, the repository as a public product, 2026-10-01:** added `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, bug and feature issue forms (blank issues off), a pull request template, `CODEOWNERS` and Dependabot config. Set on GitHub: 8 topics, private vulnerability reporting, Dependabot alerts and security updates, Discussions on, `main` protected against force-push and deletion (pull requests are not required, direct pushes remain the workflow), and a ruleset that stops `v*` release tags being moved or deleted. Already on: secret scanning with push protection.

- [ ] Still to do: social preview image (GitHub Settings, Social preview, upload `og.png`; no API for it), a pinned first Discussion saying where questions go, GitHub Releases per version (changelog text), repository size and the weight of `docs/captures`, history scan with gitleaks, and the decision about which `docs/` working notes stay public.

**Section 9, legal, 2026-10-01:** licences of everything an npm user installs (13 packages) are MIT, all permissive (`license-checker --onlyAllow` exits 0); `LICENSE` is standard MIT and GitHub's licence API reports MIT; added `THIRD_PARTY_NOTICES.md` (Geist, Martian Mono and Doto under OFL 1.1, with copyright lines taken from the licence files, plus the npm dependencies), linked from the README. A scan of all 914 commits for secret formats (AWS, GitHub, npm, Slack, OpenAI and Anthropic keys, private keys, passwords) found nothing; no `.env`, key, credential or `.npmrc` file was ever committed; secret scanning and push protection are on.

- [ ] **Decision (owner): repository weight.** `.git` is 352 MB; 338 MB of it is `docs/captures` PNGs across history (the current captures are 116 MB). Every `git clone`, and every SwiftPM resolve of the SwiftUI package, downloads all of it, for about 9 MB of real content. Fixing it means rewriting history (`git filter-repo`), which moves every commit hash and tag and leaves npm provenance links for 0.1.0 to 0.3.2 pointing at old commits; leaving it means every new Swift user pays 350 MB. Either way, stop it growing: captures are rewritten byte-differently on every e2e run, so commit only the captures that are meant to be reviewed (or keep them out of git).
- [ ] **Decision (owner): commit email.** 911 public commits carry a personal Gmail address as the author email. Going forward, `git config user.email "<id>+vijayksingh@users.noreply.github.com"` (GitHub Settings, Emails, keep my email private, block pushes that expose it) stops new exposure; removing the old exposure needs the same history rewrite as above.
- [ ] Still to do: which `docs/` working notes stay public (`research/`, `proposals/`, `prototypes/`, `SWIFT_REQUESTS.md`, `BACKLOG.md`); name search for "MetalUI" (npm, GitHub, App Store, trademark databases).

Section 1 partly done: 0.3.0 published (tag `v0.3.0`, provenance on npm, `verify:registry` passes). **Section 2, fresh installs from npm 0.3.1, 2026-10-01 (clean VM, headless Chromium, production builds).** Each app renders Surface, Button, Checkbox, Switch, Led, Kbd, Progress and Skeleton; the check asserts no console errors or warnings, no failed requests, a styled 32px button with a shadow, the checkbox toggling on a real click, the colorway attribute changing the surface, and (where the app has Tailwind) a host `p-4` still 16px.

- [x] Vite + React 19 + TS (no Tailwind), Vite + React 18, Vite + React 19 + Tailwind v4: `tsc` 0 errors, build ok, all assertions pass.
- [x] Next 16 App Router (components imported straight into a server component, so the `'use client'` banner is exercised) and Pages Router: `next build` and `next start`, no hydration warnings, all assertions pass.
- [x] SSR: `renderToString` of every export on React 19 and 18: 254 render with no props, 36 need props or a parent context, 0 touch browser-only globals. Found and fixed 25 React 18 `useLayoutEffect` server warnings (shared `useIsoLayoutEffect`).
- [x] No Tailwind at all: the Vite apps without Tailwind work from `styles.css` alone.
- [x] `publint` clean; are-the-types-wrong: types resolve for every entry under bundler and node16; legacy `node` resolution failed for `/icons`, `/icons/life`, `/sound`, fixed with `typesVersions`; both now run in CI (`npm run verify:types`). ESM-only is stated in the README; `require()` fails and only `import` works, by design.
- [x] **Bundle size.** Published 0.3.1: a Button-only Vite 8 app ships 621 kB JS (197 kB gzip) against 220 kB for React alone, i.e. tree-shaking was not working. Current `main` (the unreleased perf commits `f543a590`, `65f9b67d`): 236 kB (74 kB gzip), +17 kB over React alone, confirmed in the real Vite build. `styles.css` is a fixed 300 kB (48 kB gzip) whatever you use. **Released as 0.3.2 and re-measured from real npm: 236 kB (74 kB gzip), provenance attested, React 18 SSR warning-free.**
- [ ] Still to do: Tailwind v3 host (supported or stated unsupported), the full per-export render with real props.

Not yet run: the rest of section 1, the rest of section 2, and sections 4–12.

---

# Part 1. Before launch

## 1. The npm package 🤖🧑

- [ ] Working tree clean, on `main`, up to date with `origin/main`, CI green on the exact commit you will tag.
- [ ] `npm ci && npm run build && npm run typecheck && npm run verify:package` all pass locally from a fresh clone (`git clone` into a temp dir, not your working copy, so untracked files cannot hide a problem).
- [ ] `npm run check` passes: generated files fresh, no literal or recipe-parity drift beyond the two `*.allow.json` files. Read those allowlists; every entry is a known gap you are shipping. Delete any you can.
- [ ] Version in `packages/metalui/package.json` matches the tag you will push, and `package-lock.json` agrees.
- [ ] `CHANGELOG.md`: **Unreleased** moved under the new version with today's date; every user-visible change has a line (Added, Changed, Fixed, Removed). The `0.x` rule holds: any behaviour change is under **Changed**.
- [ ] `npm pack --workspace @unlocalhosted/metalui --dry-run`: list the files. Confirm it contains `dist/`, `src/components/tokens.css`, `theme.css`, `public/AI.md`, the three `*.json` manifests, `README.md`, `CHANGELOG.md`, `LICENSE`. Confirm it does **not** contain source maps you didn't intend, `.env`, fixtures, captures, or anything large. Check the unpacked size.
- [ ] Every `exports` entry resolves (`.`, `./icons`, `./icons/life`, `./sound`, `./styles.css`, `./icons.css`, `./icons/life.css`, `./tokens.css`, `./theme.css`, three JSON files). `npx publint` and `npx @arethetypeswrong/cli --pack` are clean. ESM-only is deliberate: confirm a CommonJS `require()` gives a clear error, and that this is stated in the README.
- [ ] Types: `.d.ts` present for every entry, and every public prop is typed (no accidental `any`). Open a consumer project with `strict: true` and `skipLibCheck: false`.
- [ ] `sideEffects: ["*.css"]` is correct: tree-shake a one-component import in a Vite build and confirm the bundle doesn't pull the whole library (check the size).
- [ ] Peer dependencies: React 18 **and** 19 both work (the range says `>=18`; test both, not just 19). `@base-ui/react` version range is right and the lockfile isn't hiding a breaking minor.
- [ ] npm account: 2FA on; the `@unlocalhosted` org exists and you are an owner; package is public; trusted publishing (GitHub Actions OIDC, workflow `publish.yml`) is configured and token publishing restricted.
- [ ] `npm view @unlocalhosted/metalui` shows the right description, repository, homepage, license, keywords, and `latest` dist-tag.
- [ ] After publish: the npm page renders the README (images, code blocks, links all work on npmjs.com, not only on GitHub), shows a provenance badge, and `npm run verify:registry` passes against the registry.
- [ ] Deprecation plan: decide what you'll do if a bad version ships (`npm deprecate`, never unpublish; publish a patch). Write the command in RELEASING.md.

## 2. A stranger installs it from npm 👤🤖

Do each in a brand-new folder. Nothing may come from this monorepo.

- [ ] **Vite + React 19 + TypeScript + Tailwind v4**: `npm i @unlocalhosted/metalui`, import `styles.css`, render `Button`. Looks right, no console errors.
- [ ] **Next.js App Router (server + client components)**: does it need `"use client"`? Is that handled by the package or documented? No hydration warnings. Try `next build` and `next start`, not only `next dev`.
- [ ] **Vite + React 18** and **Next.js Pages Router**.
- [ ] **No Tailwind at all** (plain CSS app): `styles.css` alone styles everything.
- [ ] **Tailwind v3 project**: either works or the README states clearly it is unsupported.
- [ ] **SSR**: `renderToString` of every component throws nothing (no `window`/`document` at import time).
- [ ] **Every export imports and renders**: script that does `import * as M from '@unlocalhosted/metalui'`, renders each component with minimal props into static markup, and fails on any throw. Same for `/icons`, `/icons/life`, `/sound`. Put this in `verify-package.mjs`.
- [ ] Colorways: `data-mu-colorway="bone"` and `"graphite"` both work; with no attribute, the system preference applies; switching at runtime has no flash.
- [ ] Fonts: Geist, Martian Mono and Doto load for an npm consumer (the package ships CSS, so check where the fonts come from and that there is no broken `@font-face` URL, no 404 in the network panel).
- [ ] Dark mode, reduced motion (`prefers-reduced-motion`) and forced-colors: components degrade, not break.
- [ ] Bundle sizes: record the CSS and JS weight of a Button-only app and a full-library app. Put the numbers in the README or docs so nobody has to guess.
- [ ] Each README code sample compiles and runs as written. Copy them from the rendered README, don't retype.

## 3. shadcn CLI install (your question) 👤🤖

The registry is served from `https://metalui.dev/r/<name>.json` (181 files in `public/r`, each component as `.json` plus `.md`). Every item depends on `https://metalui.dev/r/tokens.json`, and the components use Tailwind v4 utilities from `theme.css`.

Test in a fresh app for each of: **Vite + React + Tailwind v4**, **Next.js App Router + Tailwind v4**, and a **project that has never run `shadcn init`**.

- [ ] `npx shadcn@latest add https://metalui.dev/r/button.json` succeeds with no prompt you can't explain. Check what it wrote: the component file, `tokens.css`, and that `@base-ui/react` was added to `package.json` and installed.
- [ ] The installed file's imports resolve (relative paths, `@/` alias from the user's `components.json`, `cn` helper if used). Wrong aliases are the most common failure; test with a non-default alias too.
- [ ] Tailwind v4 `theme.css` is wired: how does a shadcn user get the `@theme` tokens? If the install doesn't add them, the component renders unstyled. Either the registry item must add them or the docs must give the one-line import.
- [ ] The tokens item installs once even when several components are added; adding a second component doesn't duplicate or overwrite the user's edited tokens without warning.
- [ ] Install **every** component, one at a time, in one project: `for n in $(jq -r '.items[].name' packages/metalui/registry.json); do npx shadcn@latest add "https://metalui.dev/r/$n.json" --yes; done`, then `tsc --noEmit` and `vite build`. Zero errors.
- [ ] Components with dependencies on other MetalUI components (for example field/form, dialogs, blocks) pull those in via `registryDependencies` with absolute URLs, and nothing is missing on a clean app.
- [ ] Icons: does a shadcn user get icons? If not, is that said on the page?
- [ ] Short name form works: `npx shadcn add @metalui/button` **if** you register a namespace in `components.json`. Decide whether to support it; document the exact line either way.
- [ ] Each registry JSON validates against `https://ui.shadcn.com/schema/registry-item.json`; `registry.json` validates against the registry schema.
- [ ] Response headers for `/r/*.json`: `content-type: application/json`, `access-control-allow-origin: *` (the CLI and browsers fetch cross-origin), sane cache headers, HTTP 200 with no redirect chain. `curl -sI https://metalui.dev/r/button.json`.
- [ ] `https://metalui.dev/r/does-not-exist.json` returns a real 404, not the SPA HTML with status 200 (the CLI would choke on HTML).
- [ ] Every component's docs page shows the exact, copy-pasteable `npx shadcn@latest add …` command, and the copy button copies it intact. Also show `pnpm dlx`, `yarn dlx`, `bunx` variants if you show any package-manager tabs.
- [ ] Registry stays in step with npm: a check (extend `verify:registry`) that the registry's files match the tagged source so a site deploy cannot serve a registry older or newer than the package.

## 4. The docs site (metalui.dev) 🤖🧑

- [ ] Cloudflare Pages production build from `main` is green and is the commit you intend to launch. DNS for apex and `www` resolve; certificate valid; `www` redirects (or serves) consistently; HTTP redirects to HTTPS; HSTS decision made.
- [ ] Every URL in `DEPLOYMENT.md`'s list returns 200: `/`, `/components/button`, `/icons`, `/r/button.json`, `/AI.md`, `/llms.txt`, `/robots.txt`, `/sitemap.xml`, an icon SVG. An unknown path returns **404** with the real 404 page.
- [ ] **Crawl the whole site** (`sitemap.xml`, every URL): zero 4xx/5xx, zero broken internal links, zero broken anchors (the fixed reference anchors on each page), zero broken images, zero console errors. Also crawl external links (GitHub, npm, Base UI).
- [ ] Deep links work on a cold load and on refresh (not only via in-app navigation): open `/components/select` directly in a new tab.
- [ ] The static per-route HTML has title, description, canonical, headings and real content without running JavaScript (`curl` it and read).
- [ ] Every component page has all of: live demo, API, slots, states, keyboard contract, tokens, React and SwiftUI code, agent-guide link. No empty section, no "TODO", no lorem, no placeholder text. No throwaway demo pages (project rule).
- [ ] The `/wip` page is accurate **today**: every "unfinished" item listed is actually unfinished and nothing finished is still listed. A launch visitor trusts this page.
- [ ] Search, command palette and keyboard navigation work; the sidebar matches the router; previous/next links make sense.
- [ ] Copy buttons copy the right text. Code blocks have correct syntax highlighting and don't overflow.
- [ ] Both colorways and reduced motion checked on the landing page, a component page, a foundations page, a block, and the icons page (project rule for visual changes).
- [ ] Phone width (375) and tablet: no horizontal scroll, tap targets ≥ 44px, sticky elements don't cover content. `docs-phone-width.spec.ts` exists; run it and also look by hand on a real phone.
- [ ] Browsers: latest Chrome, Safari (macOS and iOS), Firefox. Safari especially: materials use layered shadows, `backdrop-filter`, `@property` and `clip-path`, which differ there.
- [ ] Performance: Lighthouse on `/`, a component page and `/icons` on mobile throttling. Record LCP, CLS, INP, total JS. The landing page is animation-heavy; confirm it stays 60fps on a mid-range laptop and does not hang a low-end phone.
- [ ] Accessibility: axe (or Lighthouse a11y) on the same pages, a full keyboard-only pass, a screen-reader pass (VoiceOver) of one component page and one block. Contrast in both colorways. Visible focus everywhere.
- [ ] Analytics: decide. If you want any, pick a privacy-respecting one and add a one-line note; if none, say nothing. Cookie banner only if something needs it.
- [ ] Custom 404 page has a link home and is on-brand.
- [ ] Error reporting for the site (even simply Cloudflare's logs) so you would know if it breaks.

## 5. Social previews and SEO (og image) 🤖🧑

`scripts/build-og.mjs` (`npm run og`) makes `apps/docs/og.png` (2400×1260 per the tags) from the landing page; `build-site-discovery.mjs` puts it on every page.

- [ ] `https://metalui.dev/og.png` returns 200, `image/png`, under 5 MB (most platforms cap; under 1 MB is better), exactly the expected dimensions and **not stale**: regenerate with `npm run og` after any landing-page change and commit the result.
- [ ] Every page's HTML has `og:title`, `og:description`, `og:url`, `og:image`, `og:image:alt`, `twitter:card=summary_large_image`, and they are per-page, not copies of the home page. Spot-check 5 routes with `curl -s URL | grep -i 'og:\|twitter:'`.
- [ ] `og:image` is an **absolute** `https://metalui.dev/...` URL (relative URLs fail on most scrapers).
- [ ] Paste the URL into the real previewers, since cached scrapes are hard to undo: X/Twitter card validator or a draft post, LinkedIn Post Inspector, Facebook Sharing Debugger, Slack, Discord, iMessage, WhatsApp, Bluesky. Do this **before** the announcement so the first share is already correct; scrapers cache the first result.
- [ ] The image text is readable at thumbnail size (about 300 px wide) and survives centre-crop to 1:1 and 1.91:1.
- [ ] Do components and blocks deserve their own og image? Decide. One shared image is fine for launch, but say it's a decision.
- [ ] `<title>` and `description` are unique per page and under roughly 60 and 160 characters. One `<h1>` per page.
- [ ] `sitemap.xml` lists every route and nothing that 404s; `robots.txt` allows crawling and points at the sitemap; canonical URLs are the extensionless, https, non-www form everywhere.
- [ ] Structured data (the JSON-LD in the discovery script) validates in Google's Rich Results test; the `license`, `programmingLanguage` and URL fields are correct.
- [ ] Favicon, apple-touch-icon, `theme-color`, and web manifest present; favicon shows in a tab, bookmark and on iOS home screen.
- [ ] Submit the site to Google Search Console and Bing Webmaster Tools; verify the domain.

## 6. Agent and AI surfaces 🤖

- [ ] `/AI.md` and `/llms.txt` return 200 as `text/markdown` / `text/plain`, are current (regenerate with `npm run generate`; `npm run check` proves freshness), and every link inside them resolves.
- [ ] Every component page links its `.agent.md` and each one is reachable at its public URL.
- [ ] Try it for real: start a blank project, give an agent only `https://metalui.dev/AI.md`, ask it to build a settings panel, and read what it gets wrong. Fix the guide, not the agent.
- [ ] `<link rel="alternate" type="text/markdown">` is in the head of the pages that promise it.

## 7. SwiftUI and Swift Package Manager 🤖🧑

- [ ] On a clean Mac: new Xcode iOS app (iOS 17) → *Add Package Dependency* → `https://github.com/vijayksingh/metalui` → resolve → `import MetalUI` → a `MetalButton` renders in the simulator. Repeat for a macOS 14 app. Use the dependency rule "Up to Next Major" from the real tag, not a branch.
- [ ] `Package.swift` resolves from the **tag**, not the working copy; the tag exists on GitHub; the version you tell people to use matches it. (SwiftPM versions come from git tags only. There is no separate publish step.)
- [ ] Fonts (Geist, Martian Mono, Doto) and the SF Symbol asset catalog are bundled and registered at runtime (`MetalFonts`); a fresh app shows the right type without manual steps. `npm run symbols:check` passes.
- [ ] The package clone size is reasonable (fonts, fixtures, captures). Check `git count-objects -vH` and what SwiftPM downloads.
- [ ] `swift build` and `swift test` pass on a fresh clone; add `swift test` to CI if it's not too slow.
- [ ] README SwiftUI snippets compile exactly as written. Swift API docs or a per-component Swift section exists and is correct.
- [ ] Parity is honest: what exists in React but not in Swift (see `/wip` and `docs/PARITY.md`) is stated on the site and in the README, never implied away.

## 8. Quality of the components themselves 🤖🧑

- [ ] `npm run test:e2e -- --workers=1` passes in full on a clean machine. Every failure is fixed or explicitly documented; "existing fixtures in progress" is not a reason for a launch.
- [ ] Each component: every state works and was actually looked at (rest, hover, focus, pressed, disabled, loading, error, empty, selected), in both colorways, with reduced motion on and off.
- [ ] Keyboard and screen reader behaviour per component, since Base UI supplies ARIA and focus: confirm nothing in the wrappers broke it (focus rings visible, roles and labels present, Escape closes, focus returns).
- [ ] Controlled and uncontrolled usage, `disabled`, `ref` forwarding, `className` merging, and `data-*`/`aria-*` passthrough behave consistently.
- [ ] Forms: `Form`, `Field`, validation and native submit work with server-rendered frameworks and with `react-hook-form` (at least one example in docs).
- [ ] Sound: off by default or clearly opt-in; respects the user's preference; no autoplay-policy console errors.
- [ ] No console warnings (React keys, `act`, deprecated APIs, Base UI warnings) on any docs page.
- [ ] Icons: all icon SVGs at `/icons/...` load; motion respects reduced motion; every icon in the catalog appears on `/icons` and is tested for rendering in both the React and SF Symbol sets.
- [ ] Memory and listener leaks: open and close a popover, dialog, toast and sheet 200 times; heap and listener counts are flat.

## 9. Legal and licensing 🧑

- [ ] `LICENSE` (MIT) at repo root **and** in the npm tarball; copyright holder and year are right.
- [ ] Bundled fonts carry their OFL texts in the package and the SwiftPM resources (`Geist-OFL.txt`, `MartianMono-OFL.txt`, `Doto-OFL.txt` are there; confirm the npm tarball includes them too if it ships fonts). Attribution on the site.
- [ ] Third-party notices for every dependency that requires them. `npx license-checker --production` shows no surprising (GPL, AGPL, unknown) licence.
- [ ] Trademark and naming: "MetalUI" name search (npm, GitHub, domain, App Store, USPTO/EUIPO quick search) for conflicts. `@unlocalhosted` scope and GitHub user are what you want to be public under.
- [ ] No copied reference material: per `docs/NEUTRAL_NAMES.md` and the never-copy rule, `npm run lint:names` (run without `--report-only`) is clean. Reread the landing page, blocks and icon names with that rule in mind.
- [ ] No secrets or personal data in the repo **history** (not only HEAD): `gitleaks detect` or `trufflehog git file://.`. Check that the Cloudflare account id in `DEPLOYMENT.md` and the personal email in any commit are things you want public. Also check `docs/` for private notes (`research/`, `proposals/`, `prototypes/`, `SWIFT_REQUESTS.md`, `BACKLOG.md`): decide what goes public, since making the repo public publishes all of it.
- [ ] Privacy statement on the site only if anything collects data.

## 10. The repository as a public product 🧑

- [ ] Repo is public (required for npm provenance), has a description, topics (react, swiftui, base-ui, design-system, shadcn, tailwind), website URL, and a social preview image (Settings → Social preview; this is separate from the site's og image).
- [ ] README: the first screen has a one-line pitch, a screenshot or GIF, install for React, shadcn and SwiftUI, a minimal example, link to docs, status (alpha) and licence. Every link works; badges (npm version, CI, licence) are real.
- [ ] Add `CONTRIBUTING.md`, `SECURITY.md` (how to report a vulnerability privately; enable GitHub private vulnerability reporting), `CODE_OF_CONDUCT.md`, issue templates (bug with repro, feature, docs), a PR template, `CODEOWNERS`.
- [ ] Enable GitHub Discussions (or decide on Discord/none). Decide where questions go and say it in the README.
- [ ] Branch protection on `main`: require CI, no force-push. Tag protection for `v*` so only you can release.
- [ ] Dependabot or Renovate, and `npm audit --omit=dev` clean (or each finding reasoned).
- [ ] GitHub Release created for the version with the changelog text; release notes link to docs.
- [ ] A short **roadmap** and known-limits note so critics find honesty first. `/wip` is the start; link it from the README.
- [ ] Repo size: large PNG captures in `docs/captures/` bloat every clone. Check `git count-objects -vH`; move heavy captures to releases or LFS, or prune, **before** the repo goes public (history rewrites are much harder afterwards).

## 11. Rehearsal 🧑🤖

- [ ] A full dry run of the day-one path by someone who has never seen the repo (a friend, or a fresh agent with no context): landing page → pick a component → install by npm → install by shadcn → see it running. Watch where they hesitate; fix that.
- [ ] Rehearse a rollback: which commit do you redeploy (`wrangler pages deploy` in `DEPLOYMENT.md`), how do you deprecate a version, how do you revert the registry. Write it in one place and time it.
- [ ] Decide launch day and time (a weekday morning in the audience's time zone), and don't deploy anything else that day.
- [ ] Freeze: from 24 hours before, only fixes for things on this list.

## 12. Announcement assets 🧑

- [ ] A 30–60 s film or GIF of the landing page (the launch-film direction in memory); an autoplay-muted version under the platform's size limit.
- [ ] Three screenshots per platform with alt text: one per colorway, one block, one close-up of a press.
- [ ] Copy drafted for: X/Bluesky thread, Hacker News "Show HN" (title without hype, first comment explaining what it is and what is unfinished), Reddit (r/reactjs, r/SwiftUI, r/webdev per their self-promotion rules), Product Hunt if wanted, your own blog post.
- [ ] Each copy links to `https://metalui.dev` (not a `pages.dev` URL) and states "alpha, 0.x, APIs may change."
- [ ] Reply-ready answers for the predictable questions: "why not shadcn/ui or Radix?", "is it accessible?", "bundle size?", "does it work with Next.js?", "why skeuomorphic?", "what's the licence?", "what's missing?"

---

# Part 2. After launch

## Hour 0–1: watch it land 🧑🤖

- [ ] Open the live announcement from a logged-out browser and a phone; the card preview shows the right image and text.
- [ ] Run the stranger's path again against production: `npm i @unlocalhosted/metalui` and `npx shadcn@latest add https://metalui.dev/r/button.json` in a fresh folder. Launch day is when a broken registry costs the most.
- [ ] Watch Cloudflare analytics and error/5xx rates, response times and cache hit rate. A traffic spike hits `og.png` and `/r/*.json` hardest; confirm they are cached at the edge.
- [ ] Watch npm: `npm view @unlocalhosted/metalui` and the downloads API; GitHub stars, issues, discussions; replies on each platform.
- [ ] Reply to every comment in the first two hours, honestly: acknowledge gaps, don't argue.
- [ ] Keep a running "launch-day bugs" list (put it at the top of `docs/BACKLOG.md`), each with repro and severity.

## Day 1–3: triage and patch 🧑🤖

- [ ] Fix what breaks installation first (install failures, missing files, wrong types, registry 404s), then rendering bugs, then everything else.
- [ ] Ship a `0.x.y` patch if needed using the normal release path (changelog, tag, provenance check). Do not hand-publish from your laptop once trusted publishing is on.
- [ ] Every bug reported becomes an issue with a label; close the loop with the reporter when fixed.
- [ ] Check Google Search Console: pages indexed, sitemap accepted, no coverage errors. Re-scrape any social card that cached a wrong image.
- [ ] Check the crawl again for links that people posted to and that you didn't expect (old URLs, `www`).

## Week 1 🧑

- [ ] Review the numbers: npm downloads, unique visitors, top pages, bounce from the landing page, which component pages get read, where the shadcn installs come from. Write them down.
- [ ] Read every issue and comment once more as a pattern, not a list: what confused people? Fix the docs before the code where the docs are the cause.
- [ ] Run the full e2e, `npm audit`, and Lighthouse again on production; compare with the pre-launch numbers.
- [ ] Verify provenance and the trusted-publisher setup still work with one more release.
- [ ] Ship the first post-launch minor with a changelog entry that credits reporters.
- [ ] Publish the write-up (what you learned, what's next).

## Ongoing 🤖

- [ ] Every release: changelog line as each change lands; `npm run build`, `typecheck`, `verify:package`, `swift build`; tag from `main`; verify on npm and in a fresh consumer; GitHub Release; update docs `/wip`.
- [ ] Monthly: Base UI, React, Tailwind and Next.js upgrades tested against the consumer matrix in section 2; shadcn CLI changes retested against section 3 (the CLI and registry schema move).
- [ ] Monthly: dependency and licence audit, broken-link crawl, Lighthouse, uptime of `metalui.dev` and `/r/*.json` (an uptime monitor with an alert that reaches you).
- [ ] Watch for and answer security reports within the window you promised in `SECURITY.md`.
