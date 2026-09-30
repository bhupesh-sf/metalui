# Form field and fieldset

A control with its words, and groups of them. React: `FormField` and `Fieldset` from `@unlocalhosted/metalui`, on Base UI Field and Fieldset. SwiftUI: `MetalFormField` (work in progress). The `form-field` recipe sets the gaps, the error ink and the error's motion; the invalid ring is the foundation's.

## Use it for

- Every control in a form that needs a visible label, a hint, or a reason it was not accepted: Field (at a form size), Textarea, Select, Combobox, Number field, Radio group, Checkbox group.
- `Form` around the fields: it validates them all on submit, focuses the first one not accepted, and shows a server's errors by field name.
- `Fieldset` with a `Legend` for a group: a radio or checkbox group, or several fields about one thing ("Shipping").

## Anatomy

- Label above the control (ui type, ink), 6 apart; clicking it focuses the control.
- Description below (meta type, ink3).
- Error below (meta type, red) while the field is invalid.
- Fieldset: the legend (the engraved label type), fields 16 apart.

## States and motion

| State | Look | Motion |
|---|---|---|
| valid | label, control, description | – |
| invalid | the control's invalid ring; the error below | the error's row grows open on the settle spring as it fades in |
| valid again | the error leaves | release spring |
| disabled | label and control at 40 % | – |

Reduce Motion: the error's row snaps; the fade stays.

## API

| React | SwiftUI |
|---|---|
| `FormField` `invalid`, `disabled`, `name`, `validate`, `validationMode` | `invalid:`, `.disabled()` |
| `FormField.Label`, `FormField.Description` | `label:`, `description:` |
| `FormField.Error` (children, or empty to say the validation message), `match` | `error:` |
| `Fieldset` `disabled`; `Fieldset.Legend` | `legend:` |
| `Form` `onFormSubmit` (values by name), `errors` (a server's, by name), `validationMode` | – |

## Keyboard and accessibility

- The label names the control; the description and the error are read with it (aria-describedby). An invalid control says aria-invalid.
- A fieldset's legend names its group; a disabled fieldset disables everything in it.

## Rules

- Every control has a visible label. Placeholder text is not a label.
- An error says what to do, not only what is wrong: "Give the region a name", not "Invalid".
- Show errors after the person has had a chance (on blur or on submit), not on the first keystroke.
