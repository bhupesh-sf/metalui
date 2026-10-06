### Phone input

From "Components other libraries ship that we don't" § 2: a country picker plus number formatting; an E.164 value; a default country; sizes; disabled (shadcn Phone Input on react-phone-number-input, ReUI Phone Input, MUI Tel Input, intl-tel-input).

Now: nothing. Three neighbours already draw every piece and must not be copied:

- **`Field`**: the well, its sizes, the invalid ring, `Field.Prefix` engraved on the floor (here the dial code), the clear key.
- **`Combobox`**: finding one of many: the frosted plate with the search well at its top (`trigger="button"`), rows, the gliding highlight, "Recent", the settling height. Exported as `comboboxParts`, `ComboboxFit`, `ComboboxMatched`, `comboboxOffset` (Autocomplete already draws with them).
- **`FormField`**: the error under the field, checked on leaving; `FormField.Readback` for what was understood ("United Kingdom · mobile").

Read for jobs: react-phone-number-input (shadcn's base), intl-tel-input, MUI Tel Input, iOS Contacts' phone row, Stripe Checkout's phone field, Google's account phone field, libphonenumber's AsYouTypeFormatter (the behaviour, not the library).

**Place (docs/COMPOSITION.md): a Component.** You operate it (type a number, choose a country) to change something else: a form's phone value. It stands for nothing of the person's on a canvas (Object fails: a number in a contact card is the card's), it stays when you stop typing (Instrument fails), and it has no area (Place fails). It composes Field, FormField and Combobox's parts.

**Jobs**

| Job | Where | Our form | Tier |
|---|---|---|---|
| Enter a number the way you'd say it | every use | one well: a country key (flag and chevron) leads, the dial code engraved after it as `Field.Prefix` ("+44"), then the number, grouped as you type in the country's own way ("7700 900123", "(415) 555-0132", "6 12 34 56 78"). The national trunk 0 may be typed ("07700 900123" reads as typed) and is dropped on leaving, since the engraved +44 already says it | Must |
| The caret never jumps | every keystroke | the caret is kept by digits, not characters: after a reformat it sits after the same number of digits it followed before. Backspace or Delete next to a space or dash removes the digit beyond it (otherwise the separator would come straight back and the key would seem dead). Letters are not taken | Must |
| Paste any format, the country follows | a number copied from an email or a signature | "+44 7700 900123", "0044 7700 900123", "+44 (0)7700-900-123", "011 44…" (from a NANP country): the code moves into the prefix and the country key changes to it; "(0)" is dropped. Typing "+" does the same as you go: while the code is unfinished ("+3") the prefix steps aside and the input shows it as typed | Must |
| Shared codes go to the right country | +1 (US, Canada, the Caribbean), +44 (GB, Jersey, Guernsey, Man), +7 (Russia, Kazakhstan) | the area code decides (+1 416 is Canada, +1 876 Jamaica, +7 7 Kazakhstan); otherwise the country already chosen keeps it if it shares the code; otherwise the code's main country | Must |
| Pick a country quickly | every use | the country key opens Combobox's plate (from a button: the search well at its top, every country below under its flag with its dial code in the trail), at least as wide as the well. Search by name (in the reader's language), by dial code ("44", "+44") or by ISO code ("gb"); names that start with the query first | Must |
| Recently used | an app whose people call a few countries | `recent` (ISO codes from the host) plus the countries picked in this field, under an engraved "Recent" before anything is typed (at most 3) | Must |
| A default country | every use | `defaultCountry` (ISO); without it, the reader's locale's region (`Intl.Locale(…).maximize()`), else US | Must |
| A clean value | every app | `value` / `defaultValue` / `onValueChange(e164, details)`: E.164 ("+447700900123") once the number is complete, `null` while empty or incomplete; `details` carries `country`, `valid` and `kind` ("mobile" when the country's mobile prefixes say so). `name` sends the E.164 in a hidden input | Must |
| Know when it is incomplete or invalid | forms | checked on leaving (FormField's timing): too short or too long for the country says "United Kingdom numbers have 9 to 10 digits" through the input's validity, so `FormField.Error` says it and a `Form` won't submit; an unfinished "+3" says "Type the country code after +, or choose a country". The invalid ring once you leave; it goes the moment you type | Must |
| Read back what was understood | every form | `FormField.Readback` under the field once the number is complete: "United Kingdom · mobile", "Canada". It answers the flag on platforms that draw flags as letters, and confirms a pasted number landed in the right country | Must |
| Sizes | a form, a dense row, a sign-up page | `size` large 44 / regular 32 (default) / compact 28, the field's | Must |
| Disabled | every use | the well at 40 %, the input and the country key disabled | Must |
| Invalid from outside | a server said no | `invalid` draws the ring and sets aria-invalid | Must |
| Clear | a form | the field's clear key, popping in once there is text | Must |
| A host's own rules | a market we don't format | `countries`: entries merged over ours by ISO code (dial code, trunk, lengths, mobile prefixes, groupings, area codes) | Should |
| Only some countries | a service in the EU only | `only` (ISO codes): the plate lists just those, and a pasted number from elsewhere stays in the field but is invalid ("We can't call numbers in Japan") | Should |
| Extensions ("x204") | office numbers | Later: E.164 has no extension; it needs a second value | Later |
| Validation by number plan (is 0800 a real range?) | carrier-grade checks | dropped: that is libphonenumber's 200 KB of metadata and still goes stale; lengths per country catch typos, the server checks reachability (send a code) | dropped |
| Format as the international "+44 7700 900123" in the input | display | covered: the prefix is engraved before the national number, so the well reads exactly that | covered |
| Flag images (SVG sprites) | intl-tel-input | dropped: 100+ KB of art. Flags are the emoji drawn from the ISO code (two regional-indicator letters), free and in every OS's own style; where a platform draws them as letters ("GB") they still name the country, and the readback says it in words | dropped |
| A native `<select>` of countries (MUI, ReUI) | — | dropped: no search by dial code, and its list is not ours. The plate is Combobox's | dropped |
| Phone type picker (mobile / home / work) | Contacts | dropped: that is the host's label, a Select beside the field | dropped |
| Auto-detect the country by IP | sign-up | dropped: a network call in a form field. The locale's region is the default; a host that knows better passes `defaultCountry` | dropped |
| Validate on every keystroke | — | dropped: an error on the first digit is noise; FormField checks on leaving | dropped |

Not doing: an LED for valid (colour would carry a state alone; the readback says it in words); a mask with placeholder underscores ("___ ___ ____": it lies about length in countries whose numbers vary); moving the caret to the end after a reformat.

**Decide**

- **A dependency (libphonenumber-js) or our own table?** Our own. libphonenumber-js's smallest build is ~80 KB min (~40 KB gzip) before our code, and its "max" metadata is 145 KB; Combobox's core already costs most of the budget. A table of ~245 regions (ISO and dial code, the area codes that split a shared code) plus rules for ~45 countries that carry most traffic (trunk prefix, lengths, mobile prefixes, groupings by leading digits) is ~5 KB, and `countries` lets a host add the rest. Names come from the platform (`Intl.DisplayNames`, `Locale.localizedString(forRegionCode:)`), so they are in the reader's language and cost nothing. The ceiling, written where the table is: grouping and lengths, not number-plan validity.
- **Flags: emoji, images or none?** Emoji, drawn from the ISO code; no images. A key with only "+1" would not tell the US from Canada, and an ISO code ("US") is less glanceable than a flag where flags draw. Windows draws them as letters, which still works; the readback names the country in words.
- **Where does the picker sit?** Inside the well, leading, as a key (the field's mini key, widened to hold the flag and a chevron), with the dial code engraved after it: one well reads "🇬🇧⌄ +44 7700 900123", the way the number is said. Not a separate cap beside the field (Combobox `trigger="button"` would draw "United Kingdom" at 160 wide before the number); its plate is Combobox's button plate, anchored to the whole well.
- **The value while incomplete?** `null`. "The value is a number you can dial, or nothing" is the clean contract; `details.valid` and the input's validity say why. A controlled host that echoes `null` back doesn't wipe what is being typed (the text is only rewritten when the value changes to a different number).
- **The trunk 0?** Accepted as typed and kept on screen while typing ("07700 900123" is how a Briton says it), dropped from the value at once and from the field on leaving. Italy keeps its 0 (it is part of the number there), and countries without a trunk prefix are marked.
- **Readback when?** Whenever the number is complete. It is quiet (readout type, ink2) and its arrival is the confirmation that the number is whole.
- **SwiftUI.** `MetalPhoneInput` draws its own well on the field recipe (MetalField has no leading slot for a key), with the same key, prefix, grouping, caret rule (re-placed by digits on each change) and readback; the country list is a popover with the search field and rows, the same table parsed from the same literal strings (the e2e slice fails if the two copies differ).

**Must**
- [x] React: `PhoneInput` (`value`, `defaultValue`, `onValueChange(value, details)`, `defaultCountry`, `recent`, `size`, `invalid`, `disabled`, `required`, `name`, `id`, `aria-label`, `placeholder`, `readback`) on Field, FormField.Readback and Base UI Combobox drawn with Combobox's parts.
- [x] Formatting as you type with the caret kept by digits; Backspace over separators; paste and "+" typing move the country; shared codes by area.
- [x] Validity on leaving, said through the input; the readback.
- [x] SwiftUI `MetalPhoneInput`.
- [x] Agent guide, meta.json, recipe, page with its DialKit panel, route, e2e slice.

**Should**
- [x] `countries` to add or override rules.
- [x] `only` to limit the countries.

**Later**
- [ ] Extensions.
- [ ] A per-country example as the placeholder (now a generic one from the country's grouping).
- [ ] SwiftUI: the caret is not re-placed mid-number on macOS (SwiftUI's TextField has no selection API before macOS 15); the number is regrouped and the caret goes to the end.
