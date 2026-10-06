# Dialog

A modal layer. React: `Dialog` with parts `Dialog.Root` (open, onOpenChange) and `Dialog.Popup` (a `Surface`, material `plate` by default). SwiftUI: `MetalDialog(isPresented:) { popup: … }`.

## Behaviour

- Focus moves in and stays in; Escape and a click on the scrim close it; focus returns to the opener.
- The popup rises a step (−6, from .985) on the surface spring and closes on release; under Reduce Motion it fades in place.
- Name it: `aria-label` on the popup.

## Rules

- **A small edit is a Quick edit** (`QuickEdit` under `Dialog.Title`; quick-edit.agent.md), as in "Rename canvas…": it brings its own Cancel and confirm, so it takes the place of `Dialog.Actions`. The key leads with its glyph and stays off until the value changed; a refusal keeps the dialog open with the reason under the field; done shows on the key (`check`, "Renamed") before the dialog closes after the hold; a failure shows `sync-error` and Try again. Offer Undo in a toast.
- A dialog that asks for more than one value keeps `Dialog.Actions`, and its confirm follows the same states: its glyph, off while nothing changed, waiting while it saves, done on the key, failure on the key.
