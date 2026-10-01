# Launch copy (drafts)

Every claim below was checked against the live package or site on 2026-10-01; the checklist ([LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md)) says where. Re-check a number before you post it. Link `https://metalui.dev`, never a `pages.dev` address. Say "alpha" in the first sentence everywhere.

## One line

React and SwiftUI components that look and move like physical hardware: soft plastic, smoked glass, press-in keys. Alpha.

## Show HN

**Title:** Show HN: MetalUI, React components that look like physical hardware (alpha)

**First comment** (post it yourself, right after submitting):

> I've been building a component library where controls behave like objects: a button sinks into its well while held and springs back, a checkbox is a recessed dimple that becomes a pressed key, a toast stacks like a deck. It is an alpha (0.3), so APIs will still change.
>
> What's in it: about 90 React components on top of Base UI (so focus, keyboard and ARIA come from there), animated duotone icons, six whole-screen blocks (settings, task inbox, share panel, …), and a macOS SwiftUI package that renders the same materials from one token file.
>
> Install two ways: `npm i @unlocalhosted/metalui`, or copy the source into your project with the shadcn CLI (`npx shadcn@latest add https://metalui.dev/r/button.json`; Tailwind v4, tested on Vite and Next.js App Router/Pages).
>
> What isn't done, so you don't have to find out: the SwiftUI package builds for macOS only (iOS is a known port, listed in the backlog), a number of components have React but only placeholder SwiftUI versions, and a few contrast and target-size findings remain (listed on /wip and in the repo). The package is ESM only. Styles are a fixed ~48 kB gzip; a one-button app adds about 17 kB of JS over React.
>
> Source and a changelog: https://github.com/vijayksingh/metalui · https://metalui.dev/changelog. I'd most like to hear what feels wrong when you press things.

## X / Bluesky (thread)

1. MetalUI is out in alpha: React and SwiftUI components that look and move like hardware. Soft plastic, smoked glass, keys that press in. https://metalui.dev [film or GIF]
2. A button sinks 1px into a well while held and springs back. A checkbox is a recessed dimple that turns into a dark pressed key. Every state is a real physical gesture. [GIF of the press]
3. ~90 components on Base UI (so keyboard and ARIA are solid), animated duotone icons, and six full-screen blocks you can copy in. [screenshot of a block, both colorways]
4. Install it from npm, or copy the source with the shadcn CLI: `npx shadcn@latest add https://metalui.dev/r/button.json` (Tailwind v4; Vite and Next.js tested).
5. Honest edges: alpha, SwiftUI is macOS only for now, ESM only. What's unfinished is listed on the site: https://metalui.dev/wip. Changelog: https://metalui.dev/changelog

## Reddit

Follow each subreddit's self-promotion rule first (many want a flair or a participation history).

- **r/reactjs, r/webdev:** "I built a React component library where everything looks like hardware (alpha)". Lead with the GIF; two sentences on Base UI and the shadcn registry install; the honest-edges paragraph from the HN comment.
- **r/SwiftUI:** lead with the macOS-only fact in the first line, then what exists and the token file shared with the web version. Don't imply iOS.
- **r/Frontend, r/web_design:** the design angle (materials, motion, springs) and the live docs; skip the install detail.

## Answers to the questions that will come

- **Why not shadcn/ui or Radix?** Those are unstyled or neutral; this is an opinionated visual language. It uses Base UI for behaviour and can be installed with the same CLI, so the two sit side by side.
- **Is it accessible?** Behaviour comes from Base UI. Text contrast meets WCAG AA (4.5:1) in both colorways after a pass on 2026-10-01 (axe: 0 contrast failures on Bone, 3 nodes on Graphite across 12 pages); every tab stop on ten sampled pages has a visible focus ring. It has not had a screen-reader audit by a person, and a few findings are open (see the checklist). Say that.
- **Bundle size?** A one-button app adds about 17 kB of JS over React (Vite 8); `styles.css` is a fixed ~300 kB, 48 kB gzipped, whatever you use.
- **Next.js?** App Router and Pages Router, built and run in production mode; components are client components.
- **Tailwind?** The npm package ships compiled CSS and needs no Tailwind. The shadcn route needs Tailwind v4 and installs the package for its tokens.
- **Why skeuomorphic?** A deliberate style ("Soft Hardware"), not a retro revival: the physical metaphor makes state legible (pressed, latched, armed).
- **Licence?** MIT. Fonts (Geist, Martian Mono, Doto) are OFL; see THIRD_PARTY_NOTICES.md.
- **What's missing?** https://metalui.dev/wip, plus the backlog in the repo.

## Before posting

- Open the card previews for `https://metalui.dev` in X's post composer, LinkedIn, Slack, Discord and iMessage, so the first share is already correct (scrapers cache the first result).
- Have a 30 to 60 second film or GIF under each platform's size limit, plus screenshots in both colorways with alt text.
- Post on a weekday morning in your audience's time zone, and don't deploy anything else that day.
- Be at the keyboard for the first two hours; reply to everything honestly, and add anything people find to the backlog.
