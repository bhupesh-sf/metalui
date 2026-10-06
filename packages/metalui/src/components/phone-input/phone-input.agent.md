# Phone input

A phone number the way you'd say it, with its country; the value is E.164. React: `PhoneInput` from `@unlocalhosted/metalui` (the library's `Field`, `FormField.Readback`, and Base UI Combobox drawn with Combobox's exported parts). SwiftUI: `MetalPhoneInput`. The `phone-input` recipe holds the key's padding, the flag sizes and the well's least width; everything else is the field's, the menu's and the combobox's.

## Use it for

- A phone number in a form: sign-up, a delivery contact, two-factor setup, a contact card's number.
- A number people paste from somewhere else ("+44 (0)7700 900123", "0044…"): the country follows.

## Don't use it for

- A one-time code sent to the phone: that is `CodeField`.
- An extension, a fax/home/work label: a second field or a `Select` beside it (E.164 has no extension).
- Checking that a number is reachable: send a code; the field checks lengths, not number plans.

## Anatomy

- One field well (large 44, regular 32 by default, compact 28), at least 248 wide.
- The country key leads: the field's mini key widened, the country's flag (the emoji drawn from the ISO code) and a chevron that turns while the plate is open. Its name says the country and code ("Country, United Kingdom +44").
- The dial code engraved after it (`Field.Prefix`, "+44"), not part of the input's text.
- The number, grouped in the country's way ("7700 900123", "(415) 555-0132", "6 12 34 56 78"); the placeholder is the grouping in zeros.
- The clear key in the trail, popping in once there is text.
- Under it, the form field's readback once the number is complete: "United Kingdom · mobile", "Canada".
- The plate (Combobox's, from a button) anchored to the whole well: the search well ("Country or code"), Recent (at most 3: `recent` and this field's picks), then every country A to Z in the reader's language under "All countries", each row its flag, its name, its dial code in ink3 and the check on the chosen one.

## Typing

- Digits group as you type; letters are not taken. The caret is kept by digits: after a regroup it sits after the same number of digits it followed, so it never jumps to the end.
- Backspace beside a space, dash or bracket takes the digit beyond it (Delete the one after).
- A trunk prefix ("0" in most countries, "8" in Russia, "1" in the US, "06" in Hungary) reads as typed ("07700 900123") and goes when you leave the field: the engraved code says it. Italy keeps its 0 (it is part of the number).
- "+" starts an international number: while the code is unfinished ("+3") the prefix steps aside and the input shows it as typed; once it matches a code, the code moves into the prefix and the country changes. "00" and, from a +1 country, "011" do the same. A "(0)" after the code is dropped.
- Shared codes: an area code that belongs to one country sends the number there (+1 416 Canada, +1 876 Jamaica, +7 7 Kazakhstan, +44 1534 Jersey); otherwise the chosen country keeps it if it shares the code; otherwise the code's main country (US, GB, RU).

## The value

- `value` / `defaultValue` / `onValueChange(value, details)`: E.164 ("+447700900123") once the number has the country's length, `null` while empty or incomplete. `details`: `{ country, valid, kind }`, `kind` "mobile" when the country's rules know its mobile leads.
- A controlled host can echo `null` back while a number is being typed; the text is only rewritten when the value changes to a different number (or to null from a number).
- `name` sends the E.164 in a hidden input (empty while incomplete).
- `defaultCountry` (ISO) starts it; without it, the reader's locale's region, else US. `only` limits the list and refuses numbers from elsewhere.
- `countries` merges rules over ours by ISO code: `{ code, dial, areas, trunk, length: [least, most], mobile, formats: [[lead, "#### ######"]] }`. A country without rules takes its code's main country's; ours cover dial codes for ~245 regions and full rules for 52.

## Validation

Checked when you leave (FormField's timing), said through the input's validity so `FormField.Error` shows it and a `Form` won't submit; the invalid ring with it, gone the moment you type:

| Case | Says |
|---|---|
| too short or too long | "United Kingdom numbers have 9 to 10 digits" |
| "+" without a known code | "Type the country code after +, or choose a country" |
| a country outside `only` | "Numbers in Japan aren’t accepted here" |

`required` is the input's own. `invalid` draws the ring from outside (a server said no).

## States and motion

| State | Look | Motion |
|---|---|---|
| rest | the flag, the engraved code, the number or the zeros | – |
| focus | the flush green ring (regular, compact); the caret (large) | – |
| plate open | the key down in the pressed look, chevron turned | the plate fades in on settle; its height settles to the rows |
| country changes | new flag and code; the number regrouped | – |
| complete | the readback row opens | the drum; the row grows like an error's |
| left, wrong | the invalid ring; the message under (FormField.Error) | the error's row |
| disabled | the well at 40 %; key and input disabled | – |

Reduce Motion: the field's, the plate's and the keys' own (the height snaps, fades stay).

## Keyboard and accessibility

- Tab reaches the country key, then the number, then the clear key. The key opens the plate (↩, Space, ↓); the search takes focus; ↑ ↓ move, ↩ chooses and puts the caret back in the number; Esc closes.
- The input is `type="tel"`, `autocomplete="tel"` (a browser's autofill arrives as "+44…" and the country follows). The engraved code describes the input, so a screen reader hears "+44".
- Flags are hidden from assistive tech; the key's name and the readback say the country in words. Where a platform draws flags as letters ("GB"), they still name it.

## SwiftUI

`MetalPhoneInput("Phone", value: $e164, defaultCountry: "GB", size: .regular)` draws the same well on the field recipe (its own, since `MetalField` has no leading slot for a key), the key, the engraved code, the grouping, the trunk on leaving, "+" and paste moving the country, the readback and the messages, from the same two table strings. The country list is a popover with a search field and rows. Left: SwiftUI's `TextField` can't place the caret before macOS 15, so a regroup leaves it at the end.
