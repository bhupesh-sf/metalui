# Changelog

All notable changes to `@unlocalhosted/metalui`. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [Semantic Versioning](https://semver.org/) (while the package is `0.x`, a minor version may change behaviour, and every such change is listed under **Changed**).

## Unreleased

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
