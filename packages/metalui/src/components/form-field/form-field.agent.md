# Form field and fieldset

A control with its words, and groups of them. React: `FormField`, `Fieldset`, `Form` and the shared `ChangedMark` from `@unlocalhosted/metalui`, on Base UI Field, Fieldset and Form. SwiftUI: `MetalFormField`, `MetalFieldset`, `MetalChangedMark`. The `form-field` recipe sets the gaps, the side column, the marks, the error ink and the rows' motion; the invalid ring is the foundation's.

## Use it for

- Every control in a form that needs a visible label, a hint, or a reason it was not accepted: Field (at a form size), Textarea, Select, Combobox, Number field, Radio group, Checkbox group.
- `Form` around the fields: it validates them all on submit, focuses the first one not accepted, and shows a server's errors by field name.
- `Fieldset` with a `Legend` for a group: a radio or checkbox group, or several fields about one thing ("Shipping").

## Anatomy

- Label above the control (ui type, ink), 6 apart; clicking it focuses the control.
- Description below (meta type, ink3).
- Readback below (`FormField.Readback`, readout type, ink2): what was understood.
- Error below (meta type, red) while the field is invalid.
- Fieldset: the legend (the engraved label type), fields 16 apart.

## Labels beside the field

`orientation="horizontal"`: the label sits in a 136 column, end-aligned, on the control's first baseline, 16 from it; the description, readback and error stay under the control. The field is its own container (`@container/form-field`): when it is narrower than 400 it stacks like a vertical field, so a settings panel that narrows never squeezes its controls. A horizontal field must be given a width (a grid or block parent); it does not size to its content.

## Required or optional

Mark the minority, never both: `<FormField.Label mark="optional">` writes "Optional" in ink3 after the label when most fields are required; `mark="required"` puts a 4 dot in ink2 (lifted to the cap height) after it when most are optional. The dot is for the eye; give the control `required` so assistive tech says it. "Optional" is read with the label.

## Changed

`<FormField changed={value !== saved}>`: a 6 engraved dot (the engraved ink with its lip) hangs 6 before the label, in the margin, so labels stay in their column. Leave room at the start (a form's padding). Pass `false` once saved, not nothing, so it leaves on its spring. A screen reader hears "Region name changed".

`ChangedMark` is the same dot on its own, for other controls: Number field's "off its default", an edited Table cell, a Settings row. `changed` (default true) shows it; `label` (default "changed") is what a screen reader hears after the thing it marks. It keeps no space; place it before what it marks, or hang it there with `form-field-changed-hang` inside a `relative` parent (6 before, centred on a ui line).

```tsx
<span className="relative">Grid size<ChangedMark changed={size !== 8} className="form-field-changed-hang" /></span>
```

## Readback

`<FormField.Readback>{understood}</FormField.Readback>`: a line under the control saying what the field understood, for dates in words ("tomorrow 8am" → "Wed 7 Oct, 08:00"), expressions ("12 * 8" → "= 96") and units. The host parses; the readback shows. Each new reading turns on the drum (`SwapText`); an empty reading closes the row like the error's. It describes the control (read with it) and is not announced on every keystroke. Say only what changes the person's mind: never repeat the value as typed.

## Errors at the right moment

A field checks when you leave it (or when the form is sent) and its error goes the moment you change the value: Base UI's `onBlur` validation, the default for `FormField` and `Form`. Never show an error on the first keystroke. A check that needs a server returns a promise from `validate`; when it passes, show `Field.Check` in the trail ("Name available"). Ordinary valid fields show nothing.

## States and motion

| State | Look | Motion |
|---|---|---|
| valid | label, control, description | – |
| invalid | the control's invalid ring; the error below | the error's row grows open on the settle spring as it fades in |
| valid again | the error leaves | release spring |
| readback | the line under the control | its row opens on settle, closes on release; the words turn on the drum |
| changed | the dot before the label | pops in from 40 % on settle; leaves on release |
| disabled | label and control at 40 % | – |

Reduce Motion: the rows snap and the marks fade without the pop; the fades stay.

## API

| React | SwiftUI |
|---|---|
| `FormField` `invalid`, `disabled`, `name`, `validate`, `validationMode` (default `onBlur`), `orientation`, `changed` | `error:`, `.disabled()`, `orientation:`, `changed:` |
| `FormField.Label` `mark` | `label`, `mark:` |
| `FormField.Description` | `description:` |
| `FormField.Readback` (a string; empty closes it) | `readback:` |
| `FormField.Error` (children, or empty to say the validation message), `match` | `error:` (also the control's invalid ring) |
| `ChangedMark` `changed`, `label` | `MetalChangedMark(changed:)` |
| `Fieldset` `disabled`; `Fieldset.Legend` | `MetalFieldset("Legend") { … }` |
| `Form` `onFormSubmit` (values by name), `errors` (a server's, by name), `validationMode` (default `onBlur`) | – |

## Keyboard and accessibility

- The label names the control; the description, readback and error are read with it (aria-describedby). An invalid control says aria-invalid.
- A fieldset's legend names its group; a disabled fieldset disables everything in it.

## Rules

- Every control has a visible label. Placeholder text is not a label.
- An error says what to do, not only what is wrong: "Give the region a name", not "Invalid".
- Show errors after the person has had a chance (on blur or on submit), not on the first keystroke.
- Mark the minority: optional or required, never both in one form.
- Only a check the person could not see happen earns a tick.
