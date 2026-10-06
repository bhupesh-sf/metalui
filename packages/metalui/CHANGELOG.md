# Changelog

All notable changes to `@unlocalhosted/metalui`. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [Semantic Versioning](https://semver.org/) (while the package is `0.x`, a minor version may change behaviour, and every such change is listed under **Changed**).

## Unreleased

### Changed

- **One glyph ships one glyph.** Each `<Name>Icon` carries only its own glyph, and the library's components draw their glyphs through them, so a component no longer ships the whole icon catalog: Table 122 → 93 KB gzip, ToolStrip 95 → 71, Card 79 → 54, Link 67 → 43, Fan 41 → 17, and every import that never drew a glyph (Calendar, Weather, Connector, …) is about 25 KB lighter. `DownloadIcon` alone is 2.7 KB (was 27). `<Icon name>` and `createIcon` still work and still ship the catalog; prefer `<Name>Icon` for a known glyph.
- **Combobox and QuickEdit take the glyph itself, not its name.** A Combobox item's `icon` is the glyph as its parts, `{ glyph: tagGlyph, morph: tagMorph }` (both exported from `@unlocalhosted/metalui/icons`; the type is `GlyphParts`), or an element as before; it still plays its act on row hover and morphs from search into the well. A Combobox action's `icon` is an element (`<SettingsIcon />`). QuickEdit's `icon` is `GlyphParts` too (default pen). Names pulled every glyph and every glyph's morph parts into any app that used them: Combobox 112 → 81 KB gzip, QuickEdit 37 → 32. Migrate `icon: 'task'` to `icon: { glyph: taskGlyph, morph: taskMorph }`. SwiftUI keeps `MetalIconName`.
- `@unlocalhosted/metalui/icons` exports each glyph's record (`tagGlyph`) and morph parts (`tagMorph`), `MorphPair` (a morph among the glyphs you give it) and `GlyphParts`.
- **Table: an action's icon is an element**: `icon: <SendIcon />`, like Button's and MenuItem's, not a glyph name (`icon: 'send'`). A name pulled every glyph into any app that used Table.

## 0.3.3 - 2026-10-01

### Added

- `@unlocalhosted/metalui/styles.unlayered.css`: `styles.css` without cascade layers, for Tailwind v3 apps (their PostCSS plugin rejects `@layer` rules it has no `@tailwind` directive for, so `styles.css` failed their build). Same rules in the same order; verified in a Vite + Tailwind 3.4 app: styled, interactive, and the host's own `p-4` still 16px.

### Changed

- **Tertiary text and engraved labels now meet WCAG AA (4.5:1) in both colorways.** `ink3` was 2.5:1 on Bone and 3.1 to 4.3:1 on Graphite, and `engrave` 2.7:1 and 3.3 to 3.6:1. Bone `ink3` is now `#6C6C6F` (was `#9A9A9D`), Graphite `ink3` `#939397` (was `#77777B`), and `engrave` is `rgba(40,38,32,.65)` on Bone (was .46) and `rgba(255,255,255,.49)` on Graphite (was .38). Placeholders, captions, hints, counts, tags and engraved labels read a little firmer; ink and ink2 are unchanged. SwiftUI tokens follow.
- The mini icon button (the accept and reject marks inside chips) has a 24 × 24 hit area (WCAG 2.5.8); it looks the same.
- SwiftUI package: `Package.swift` declares macOS 14 only. It listed iOS 17, but eight files use AppKit and the package does not build for iOS; the README, agent guide and `docs/BACKLOG.md` ("SwiftUI on iOS") say so, with the file-by-file port list.

### Fixed

- The npm tarball no longer contains `dist/index.css`, an unreferenced duplicate of `icons.css` (13 kB smaller packed). Nothing imported it; import `icons.css` for icons as before.
- The landing page has a `<main>` landmark and one (visually hidden) `<h1>` once it renders, so it has a heading structure for assistive technology.
## 0.3.2 - 2026-10-01

### Fixed

- TypeScript projects on the legacy `moduleResolution: "node"` can now import `@unlocalhosted/metalui/icons`, `/icons/life` and `/sound` with types (`typesVersions`). CI runs `publint` and are-the-types-wrong on every change.
- Server rendering on React 18 no longer logs `useLayoutEffect does nothing on the server` (25 warnings for Calendar, Checkbox, Combobox and others): components use one shared `useIsoLayoutEffect`, a layout effect in the browser and a plain effect on the server. The shadcn `motion` item includes it.

## 0.3.1 - 2026-10-01

### Fixed

- `theme.css` no longer redefines `--spacing`, `--font-sans` or `--font-mono`. Importing it into an app with its own Tailwind (the shadcn route) used to set the spacing scale to 1px per step, shrinking that app's `p-4`, `gap-2` and `h-10` to a quarter of their size, and to replace its fonts. It now adds names of its own only, so the host's layout and fonts are untouched. `check:host-safe` keeps it that way. The `styles.css` build is unchanged.
- shadcn registry: the `tokens` item imports `tokens.css` and `theme.css` from `@unlocalhosted/metalui` instead of a copied path that Next.js could not resolve; it works in Vite and Next.js (`app/` and `src/app/`) with no edits.
- `Icon` is marked `'use client'` in source, so a copy of it works as a Next.js client component.

## 0.3.0 - 2026-10-01

### Added

- **Blocks in the shadcn registry**: Settings, Studio week, Task inbox, Share panel, AI composer and Availability picker install with `npx shadcn@latest add https://metalui.dev/r/block-<name>.json`, into `components/metalui/screens/<name>/`; they need this package installed.
- **Radio group** (`RadioGroup`, `Radio`): one choice from a short list; the pressed well darkens, releasing latches a pip in while the old one drops out.
- **Textarea** (`Textarea`): grows with what is written between `minRows` and `maxRows`; with `maxLength`, a counter appears near the limit and refuses writing past it.
- **Popover** (`Popover`): a small panel that rises out of its trigger; `Title`, `Description`, `Body`, `Close` slots.
- **Alert dialog** (`AlertDialog`): a question that must be answered; focus starts on Cancel, a click outside is refused.
- **Progress** (`Progress`) and **Spinner** (`Spinner`): a task's progress, known or unknown; steady work that shows only after a beat.
- **Number field** (`NumberField`): step, scrub or type a number; the value turns like a counter drum.
- **Toggle** and **Toggle group** (`Toggle`, `ToggleGroup`): latching push buttons with a lamp.
- **Accordion** (`Accordion`): sections that open in place.
- **Meter** (`Meter`): a level in a range as lit segments, coloured by position (`bad="low"` for a battery).
- **Sheet** (`Sheet`): a panel from the right or bottom edge that follows a drag.
- **Scroll area** (`ScrollArea`): the system's own scrollbar and edge fades.
- **Checkbox group** (`CheckboxGroup`): choices with an optional parent that ticks them in a cascade.
- **Combobox** (`Combobox`): type to find one of many.
- **Form field**, **Fieldset** and **Form** (`FormField`, `Fieldset`, `Form`): labels, descriptions and errors tied to any control; invalid and disabled reach every control inside; `Form` validates on submit and focuses the first field not accepted.
- **Field** sizes `regular` (32) and `compact` (28) for forms, with a visible focus ring; `invalid` and `disabled` on `Field`.
- `invalid` on `Combobox` and `NumberField`; `size` on `Combobox`.
- Checkbox has a pressed state; checkbox group rows press from anywhere on the row.
- A foundation for invalid: `--mu-invalid` per colorway, `--mu-invalid-width`, and the `invalid-ring` utility; `MetalRing.invalidWidth` in SwiftUI.
- `buttonParts` (the button cap's frame and size without its press) for keys that travel their own way.
- **Skeleton** (`Skeleton`): the shape of content still loading, with a slow sheen.
- **Link** (`Link`): inline text that goes somewhere; an external link carries a small arrow.
- **Button group** and **Split button** (`ButtonGroup`, `SplitButton`): caps joined into one bar; an action with a menu of its variants.
- **Breadcrumbs** (`Breadcrumbs`): the way back up; long trails fold into a menu.
- **Pagination** (`Pagination`): pages of results; the current page's lift glides between numbers.
- **Menubar** (`Menubar`): an app's menus in a row; moving along the bar opens the next at once.
- **Navigation menu** (`NavigationMenu`): site sections whose panels open under the bar.
- **Preview card** (`PreviewCard`): a glance at where a link goes, on hover or focus.
- **Calendar** and **Date picker** (`Calendar`, `DatePicker`): a month of days; the chosen day lands with a small press.
- **Avatar** (`Avatar`, `AvatarGroup`): a person, as a photo or initials, with presence.
- **Card** (`Card`): a person's thing on a raised plate that lifts when it can be opened.
- **Attachment** (`Attachment`, `formatBytes`): a file someone attached, with upload progress and failure.
- **Table** (`Table`): rows that travel to their places when sorted; selectable rows.
- **Empty state** (`EmptyState`): a place with nothing in it yet, and how to start.
- **Split pane** (`SplitPane`): two places with a divider you can move, with a detent at the default.
- **Sidebar** (`Sidebar`): an app's side place that folds to a rail with tooltips.
- **Drop zone** (`DropZone`): a place that receives files by drop or by picking; it lights while files are dragged in the window and refuses what it won't take.
- `disabled` on `Tooltip`, to keep it shut without changing the tree.
- A shadcn registry entry for every new component at `https://metalui.dev/r/<name>.json`.

### Changed

- The modal layer (Dialog, Alert dialog, Sheet) moves from `z-index` 30 to 50, above page chrome and still under menus and popovers (60). If your app puts chrome between 30 and 50, it now sits under open dialogs.
- The modal scrim is stronger: half the colorway's own tone with a light backdrop blur (nearly opaque under Reduce Transparency).
- Select, Radio and Textarea draw the shared invalid ring; the recipe values `select.error.*`, `radio.error.*` and `textarea.error.*` are gone (use `--mu-invalid` and `--mu-invalid-width`).
- `Field.Input` and `Textarea` render Base UI's field control, so inside a `FormField` they take its label, description, error and states.

### SwiftUI

- `MetalRadioGroup`, `MetalTextarea`, `MetalPopover`, `MetalAlertDialog`, `MetalProgress`, `MetalSpinner`, `MetalNumberField`, `MetalToggle`, `MetalAccordion`, `MetalMeter`, `MetalSheet`, `MetalScrollArea`, `MetalCheckboxGroup`, `MetalCombobox` and `MetalFormField` exist as work-in-progress placeholders with the React API's shape; web is the reference until they are finished.

### Fixed

- shadcn registry: `add …/button.json` now imports `tokens.css` and `theme.css` into your global CSS, so a copied component is styled. Files land under `components/metalui/` in the same layout as the package, so imports between components, `motion` and `icons` resolve; shared code comes as `motion`, `icons` and `icon-components` items, and each item lists the components it uses. Removed components are no longer served.

## 0.2.1

Earlier releases are recorded in the git history and tags (`v0.1.0`, `v0.2.0`, `v0.2.1`).
