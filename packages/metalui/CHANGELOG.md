# Changelog

All notable changes to `@unlocalhosted/metalui`. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [Semantic Versioning](https://semver.org/) (while the package is `0.x`, a minor version may change behaviour, and every such change is listed under **Changed**).

## Unreleased

### Added

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
- A shadcn registry entry for every new component at `https://metalui.dev/r/<name>.json`.

### Changed

- The modal layer (Dialog, Alert dialog, Sheet) moves from `z-index` 30 to 50, above page chrome and still under menus and popovers (60). If your app puts chrome between 30 and 50, it now sits under open dialogs.
- The modal scrim is stronger: half the colorway's own tone with a light backdrop blur (nearly opaque under Reduce Transparency).
- Select, Radio and Textarea draw the shared invalid ring; the recipe values `select.error.*`, `radio.error.*` and `textarea.error.*` are gone (use `--mu-invalid` and `--mu-invalid-width`).
- `Field.Input` and `Textarea` render Base UI's field control, so inside a `FormField` they take its label, description, error and states.

### SwiftUI

- `MetalRadioGroup`, `MetalTextarea`, `MetalPopover`, `MetalAlertDialog`, `MetalProgress`, `MetalSpinner`, `MetalNumberField`, `MetalToggle`, `MetalAccordion`, `MetalMeter`, `MetalSheet`, `MetalScrollArea`, `MetalCheckboxGroup`, `MetalCombobox` and `MetalFormField` exist as work-in-progress placeholders with the React API's shape; web is the reference until they are finished.

## 0.2.1

Earlier releases are recorded in the git history and tags (`v0.1.0`, `v0.2.0`, `v0.2.1`).
