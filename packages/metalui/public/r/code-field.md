# Code field

A one-time code, one slot per character. React: `CodeField` from `@unlocalhosted/metalui`, on Base UI OTP Field. SwiftUI: `MetalCodeField`, `MetalCodeFieldResend`. The `code-field` recipe sets the sizes, the keycap's arrival and the ripple; the slot is the `well` recipe's field well, the keycap the `button` recipe's compact cap. A component: you operate it to sign in or confirm something.

## Use it for

- A sign-in or confirmation code sent by email, SMS or an authenticator (4 to 8 characters).
- A recovery or invite code read off paper (`validationType="alphanumeric"`).
- A short PIN (`mask`).

## Don't use it for

- Anything longer than about 8 characters, or of unknown length (a licence key, an API token): use `Field`.
- A number to step or scrub: use `NumberField`.
- A password: use `Field` with `Field.Reveal`.

## Anatomy

- Root (`CodeField`): a row of slots, `length` (default 6), `groups` (default 6 → 3–3, 8 → 4–4, otherwise one group), `size`. Pass children (`CodeField.Slot index`, `CodeField.Separator`) to arrange them yourself.
- Slot: the field well at Field's sizes (large 44 × 38, radius 14; regular 32 × 28, radius 10; compact 28 × 24, radius 9). A filled slot holds a compact keycap inset by the slot's pad (4 or 3), concentric (cap radius 10, 7, 6), with the character in mono type (19, 14, 12) in ink. The real input covers the slot; its own text and caret are hidden.
- Separator: a short engraved dash (8 or 6 wide, 2 thick, ink3 with the lip), between groups; hidden from screen readers.
- The ring: the Spinner's small ring, 10 after the last slot, outside the row's box so nothing shifts.
- Resend (`CodeField.Resend`): a link cap, "Resend in 0:42", then "Resend code".

## States and motion

| State | Look | Motion |
|---|---|---|
| empty | sunk wells | – |
| current | the slot you are on wears the flush green focus ring; empty, a still green caret | – |
| typed | the slot's keycap springs in from 60 % and fades in; focus moves on | part spring (may overshoot) |
| pasted, autofilled | the new keycaps arrive left to right, 45 ms apart | part spring, staggered |
| refused character | nothing is typed; the slot you are on shakes a nest | refusal spring |
| invalid | the invalid ring on every slot; the row shakes once; focus goes to the first slot, its character selected | refusal spring |
| checking | read-only, `aria-busy`; slots at the spinner's item dim (0.5); after the show delay the small ring turns | the spinner's fade and turn |
| accepted | checking ended without `invalid`: the ring draws the tick, held for the spinner's result time | the tick's draw |
| disabled | 40 % | – |
| Resend counting | disabled link cap; the seconds turn on the drum each second | settle (the drum) |

Only transform and opacity animate. Nothing runs at rest: the caret does not blink; the Resend clock ticks only while counting and while it can be seen, and catches up after a hidden tab.

Reduce Motion: keycaps appear at once without the pop or the ripple; nothing shakes; the drum crossfades; the ring breathes in place.

## API

| React | SwiftUI |
|---|---|
| `CodeField` `value`, `defaultValue`, `onValueChange(value, details)`, `onValueComplete(value)` | `MetalCodeField(_ label:, text:, onComplete:)` |
| `length` (6), `groups`, `size` (`large`, `regular`, `compact`) | `length:`, `groups:`, `size:` (`MetalFieldSize`) |
| `validationType` (`numeric`, `alpha`, `alphanumeric`, `none`), `normalizeValue` (default: capitals for letters) | `kind:` (`.numeric`, `.alpha`, `.alphanumeric`) |
| `invalid`, `checking`, `checkingLabel`, `acceptedLabel` | `invalid:`, `checking:` |
| `mask`, `disabled`, `readOnly`, `name`, `form`, `required`, `autoSubmit` (Base UI) | `mask:`; `.disabled()` |
| `CodeField.Slot` `index`; `CodeField.Separator` | – |
| `CodeField.Resend` `cooldown` (30 s), `onResend`, `label`, `countingLabel` | `MetalCodeFieldResend(cooldown:, onResend:)` |

## Keyboard and accessibility

- One input per slot, one Tab stop (Base UI's roving focus). The first slot is named by the label (`FormField.Label`, or a `<label htmlFor>` with the Root's `id`); the others say "Character n of N", so a screen reader says how far you are.
- The first slot carries `autocomplete="one-time-code"` and a `maxLength` of the whole code, so the phone's suggestion (from Messages or Mail) lands whole and is spread across the slots. Never turn it off. A hidden input carries the whole value to a form under `name`.
- Typing fills and moves on; focusing a filled slot selects its character, so typing replaces it. Left and Right move; Home or Up, End or Down go to the ends. Backspace clears the slot you are on, or the one before an empty slot; ⌘ or Ctrl Backspace clears everything; Delete removes the character and closes the gap.
- Paste anywhere: spaces and dashes are dropped and the rest fills from that slot. Letters show in capitals for `alpha` and `alphanumeric`.
- `invalid` puts `aria-invalid` on every slot; say why in `FormField.Error`, which the slots are described by. `checking` says "Checking the code" once the ring shows and `acceptedLabel` when the tick draws.

## Rules

- Check on `onValueComplete`; set `checking` while you do, then `invalid` if it was wrong. Clear `invalid` in `onValueChange`: the field never decides a code is right.
- Pass `invalid` to the `CodeField` (it shakes and moves focus) and to the `FormField` (its error shows): `<FormField invalid={wrong}>…<FormField.Error match={wrong}>`.
- Keep a wrong code on screen; don't clear it. The person compares it with the message, and fixing one digit costs one key.
- Say where the code went in the description ("We sent a code to ana@example.com"), and put Resend under the field, not inside it.
- No placeholder characters in the slots: an empty well already reads as a place for one character.
