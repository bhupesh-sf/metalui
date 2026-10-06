# Variation sheet: one-time code input (CodeField)

Bhupesh Gupta, in "Components other libraries ship that we don't" § 2: "Input OTP (shadcn): one box per digit for a one-time code; paste fills all of them." (2026-10-05)

Now: nothing takes a code. A host puts a plain `Field` with `maxLength={6}`, so nobody can see how far they are, a pasted "123 456" overflows, and the phone's "from Messages" suggestion has no field that asks for it.

How this was made: shadcn's Input OTP (input-otp underneath: one transparent input over painted slots), Base UI 1.8's OTP Field (one input per slot, roving focus), Apple's HIG and `textContentType(.oneTimeCode)`, the HTML `autocomplete="one-time-code"` token and WebOTP, and the sign-in screens of Stripe, GitHub and Slack were read for the **jobs**; each job got our form, was marked covered, or was dropped with the reason. *Ours* marks ideas of our own.

## Where it sits (docs/COMPOSITION.md)

- **A Component.** You operate it to change something else (a sign-in, a confirmation); it is not the person's thing, and it stays while you are not acting, so it is neither an Object nor an Instrument.
- **Its slots are Field's well.** Each slot is the field well (`recipe-well-field`) at Field's sizes and radii, so a code field sits level with the fields and selects around it. A character is a compact keycap (`recipe-button-compact`, the Number field's keys) seated in the well. No new look, so no new Part.
- **It wraps Base UI OTP Field** (`@base-ui/react/otp-field`), the house rule: Base UI already owns the roving focus, arrows, Home and End, Backspace, paste distribution, validation types, completion and `Field` integration.

## Jobs

| Job (who asked) | Our form | Tier |
|---|---|---|
| **Type a code read off another device, quickly** (everyone) | One Tab stop; each character moves to the next slot; the keyboard is numeric (`inputMode`) for digits. Mono type, tabular, at Field's sizes: large 44 (the default: a code is the one thing on its screen), regular 32, compact 28. | Must |
| **See how far you are** (shadcn, Apple) | *Ours, keycap slots*: an empty slot is a sunk well; a filled one holds a keycap with the character, which springs into the well as it is typed (scale from the recipe's `pop` and a fade, on the part spring: a part you touch, it may overshoot its stop). The slot you are on wears the flush green ring and, while empty, a still caret. Screen readers hear "Character 3 of 6" on each slot. | Must |
| **Paste it** (shadcn: "paste fills all of them") | Paste anywhere fills from that slot; spaces and dashes in "123-456" or "123 456" are dropped, not refused. *Ours*: the keycaps arrive in one ripple, left to right, each a `ripple` step after the last, so a paste looks like a hand running across the keys. | Must |
| **Let the phone fill it** (Apple, `autocomplete="one-time-code"`) | The first slot carries `autocomplete="one-time-code"` (and `maxLength` the code's length, so the whole suggestion lands); Base UI spreads it across the slots, and it ripples like a paste. A hidden input carries the whole value to a form. | Must |
| **Fix one wrong character** (everyone) | Click or arrow to the slot: its character is selected, so typing replaces it and moves on. Backspace clears the slot you are on, or the one before an empty slot; ⌘ or Ctrl Backspace clears all. | Must |
| **Digits only, or letters** (shadcn pattern, Base UI `validationType`) | `validationType`: `numeric` (default), `alpha`, `alphanumeric`, `none`. Letters show in capitals (a recovery code is read off paper; case never matters). A character the code can't hold is refused: the slot you are on shakes once on the refusal spring and nothing is typed. | Must |
| **Groups with a separator, 3–3** (shadcn `InputOTPSeparator`) | `groups={[3, 3]}`; a short engraved dash between groups (ink3, the label's lip), decorative and hidden from screen readers. Default by length: 6 → 3–3, 8 → 4–4, otherwise one group. | Must |
| **A wrong code** (everyone) | `invalid`: every slot wears the invalid ring and the whole row shakes once on the refusal spring. *Ours*: the code stays visible (so it can be compared with the message) and focus goes back to the first slot with its character selected, so typing again overwrites from the start. The host's words go in `FormField`'s error; the slots say `aria-invalid`. | Must |
| **A code that is being checked** (Stripe, GitHub) | `checking`: the row is held (read-only, `aria-busy`, the slots dim to the spinner's item dim) and the Spinner's small ring turns just after the last slot, on `useWait`'s clock, so a fast check never flashes it. When checking ends without `invalid`, the ring draws the check's tick ("Code accepted" is said). The ring sits outside the row's box, so nothing shifts. | Must |
| **Resend, with a countdown** (Slack, GitHub) | `CodeField.Resend`: a link cap, "Resend in 0:42" (disabled), the seconds turning on the drum (`SwapText`), then "Resend code". Pressing it calls `onResend` and starts the count again. The clock ticks only while counting and catches up after a hidden tab (it counts to an end time). | Should |
| **Mask it** (a PIN) | `mask`: the keycaps show a dot. Base UI types the slots as passwords. | Should |
| **Submit when complete** (Base UI `autoSubmit`) | `onValueComplete(code)` for the host's check; `autoSubmit` passes through for a form. | Must |
| **Placeholder characters** (shadcn examples "○") | An empty well already reads as "a place for one character"; a glyph in it is noise and fights the caret. | Dropped |
| **One box per digit you can style apart** (shadcn slots render props) | The compound parts (`CodeField.Slot`, `CodeField.Separator`) let a host rearrange; styling one slot apart breaks "one recipe per look". | Covered |
| **SMS auto-read on the web** (WebOTP `navigator.credentials.get({ otp })`) | Chrome on Android only, and it needs the host's SMS format. `autocomplete` covers iOS and Android keyboards. A host can call WebOTP and set `value`. | Later |
| **Right to left** | Base UI flips the arrows; the slots follow `dir`. | Covered |

## Motion (one place per moment)

| Moment | What moves | Spring |
|---|---|---|
| a character arrives | its keycap scales from `pop` to 1 and fades in, inside the well | part (may overshoot) |
| paste, autofill | each new keycap as above, `ripple` after the one before | part, staggered |
| a character the code can't hold | the slot you are on shakes a nest | refusal |
| a wrong code | the whole row shakes a nest; the invalid ring appears | refusal |
| checking | slots dim (opacity), the ring arrives after the show delay | the spinner's fade |
| resend countdown | the seconds turn on the drum | settle (the drum) |

Reduce Motion: keycaps appear without the pop or the ripple, nothing shakes, the drum crossfades, the ring breathes in place. Only transform and opacity animate; nothing runs at rest (the caret is still, not blinking).

## Decide

- **Name.** `CodeField` (Swift `MetalCodeField`). It is a field in our vocabulary, beside `Field`, `NumberField` and `FormField`; "OTP" is jargon and "Input" is a slot (`Field.Input`), not a component. It takes any short code: a sign-in code, a recovery code, a PIN.
- **One input underneath, or one per slot?** One per slot, Base UI's model, because the house rule is to wrap Base UI rather than reimplement its keys and ARIA, and because it does the jobs better than a single transparent input: each slot is a real input, so a screen reader says "Character 3 of 6" (how far you are) where a single input reads "1 2 3" and needs caret reading; there is one Tab stop (roving `tabIndex`); the first slot carries `autocomplete="one-time-code"` with the full `maxLength`, so the phone's suggestion lands whole and is spread; and a hidden input holds the full value for forms. The first slot is named by the label (`FormField.Label` or `aria-labelledby`); the rest by "Character n of N".
- **Wells or keycaps?** Both: the slot is a well (an input is sunk in this library), the character a keycap seated in it. Typing sets a key into place; that is the "keycap slots" idea without making an input look like a button.
- **What happens after a wrong code?** Keep it, ring it, shake once, and select the first character. Clearing it (Apple's way) throws away the evidence and makes a one-digit slip cost six keys.
- **Who clears `invalid`?** The host, in `onValueChange` (the component never decides that a code is right).
- **A blinking caret?** No: nothing runs at rest, and a focused field waiting for a code is at rest. The ring says where you are; the still caret says the slot is empty.
- **Uppercase letters?** Yes by default for `alpha` and `alphanumeric` (through `normalizeValue`, which a host can replace).
- **Refuse a paste with junk around the code ("Your code is 123456")?** No: the code is taken and nothing shakes. Only a typed character that can't be held shakes.
- **Swift editing model.** SwiftUI on macOS 14 has no text selection API, so `MetalCodeField` types and deletes at the end (one hidden `TextField` with `.textContentType(.oneTimeCode)`); replacing one character in the middle is Later (macOS 15's `TextSelection`).

## Tiers

**Must**: the slots at three sizes with keycaps that spring in; paste and autofill with the ripple; groups and the separator; the validation types with refusal; fix one character (Base UI's keys); invalid with the row shake and the selection back at the start; checking with the ring and the tick; `onValueComplete`; SwiftUI `MetalCodeField`; the agent guide, the page with its DialKit panel and the e2e slice.

**Should**: `CodeField.Resend` with the countdown on the drum (React and SwiftUI); `mask`.

**Later**: WebOTP; replacing a middle character in SwiftUI (macOS 15 `TextSelection`); SwiftUI captures on the page.
