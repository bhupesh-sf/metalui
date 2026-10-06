# Alert: variation sheet

From `docs/BACKLOG.md`, "Components other libraries ship that we don't" § 1. Written in the format of the sheets under "Variation sheets: existing components".

Now: nothing. The library has `AlertDialog` (a question that blocks), `Toast` (the result of your own action, floating, temporary) and `StatusBadge` (a few words for a lasting state of the system). A message about *this place* (a form that didn't save, a card whose source is offline, a page whose plan runs out) has no home, so hosts improvise with an empty state or a strong badge.

## Where it sits among its neighbours

| | Says | Where | Lasts | Blocks? |
|---|---|---|---|---|
| **Alert** | something about this place, in a sentence, with what to do | in the flow: top of a form, inside a card, along the top of a page | until it's resolved or dismissed | no |
| Toast | the result of what *you* just did ("Moved 3 notes"), with Undo | floating, bottom centre, over everything | seconds, then it leaves by itself | no |
| Status badge | a lasting state of the system, in a few uppercase words | a corner or a row | as long as the state | no |
| Alert dialog | a question that must be answered before anything else | over the page, with a scrim | until answered | yes |

The test: if it's about something the person just did and needs no place, it's a toast; if it fits in three words and has nothing to do, it's a badge; if the page can't go on without an answer, it's a dialog. Otherwise it's an alert.

**Layer: Component.** It isn't a part (it has a job and stands alone), not an object (it doesn't stand for a person's stuff; you can't hold it), not an instrument (it stays when you let go), not a place (it holds no objects). It is operated (its actions, its dismiss key) and it is the same in any app, like Toast and Status badge beside it.

## Kinds: ReUI's checklist restated as jobs

LED meanings stay the library's: green live or ok, amber waiting or urgent, red failed, blue a link's kind. Every kind is carried three ways: the **glyph** (its shape), the **words** (the title says it) and the **lamp's gesture**; colour is the fourth, never the only one.

| ReUI | The job | Our kind | Glyph | Lamp |
|---|---|---|---|---|
| default, info | tell something worth knowing, nothing is wrong | `note` | `info` | none: nothing to signal, and an off lamp would read as "something is off" |
| success | something finished well; often an alert that was `waiting` resolving | `done` | `check` | green, steady |
| *(none)* | something is under way and the alert will update (*ours*) | `waiting` | `clock` | amber, breathing while it lasts |
| warning | act soon or something will go wrong | `urgent` | `warning` | amber, steady (urgent is amber that doesn't breathe, as on Status) |
| destructive | something failed or was refused | `failed` | `sync-error` (the broken ring with "!") | red, two blinks, then lit |
| invert | be seen above everything else | dropped → `tone="strong"` | | |

Blue is not used: it means a link's kind, and "info" is not a link. No new LED colours.

## Over time (*ours*: what an alert does, not just how it looks)

- **Arrives**: rises one nest from below and fades in on the settle spring (T9, as the empty state does), so it never snaps into a form. Reduce Motion: it fades.
- **Updates in place**: changing `kind` morphs the glyph (`MorphIcon`, clock → check) and plays the new lamp's gesture from its start; the words change where they are and the region reads them out. A count inside ("3 of 12") turns on the drum when the host wraps it in `SwapText`.
- **Resolved**: the host turns `waiting` into `done` (or `failed`); the alert stays where it was, so the person sees the outcome in the place they were watching. It never auto-dismisses: a message in the flow that vanishes moves the page under the reader.
- **Dismissed**: with `onDismiss`, a quiet close key (and Esc inside the alert) lets it leave one nest down, fading on the release spring; then the host removes it. Without `onDismiss` it can't be dismissed (an error that's still true shouldn't be).

## Where it sits

- **Top of a form** (*inline*, the default): a plate the width of the form, above the first field; a form that fails to save says why here, and each field still carries its own error.
- **Inside a card or a panel**: `tone="quiet"`, no plate (a raised plate on a raised card is one plate too many): the glyph window and the words; the card's own padding frames it.
- **A page banner**: `banner`: the full width of its container, square ends, wider padding at the sides, actions at the end of the line. One per page.

## Must

- [x] **Kinds** `note` / `done` / `waiting` / `urgent` / `failed`, each with its glyph, words and lamp gesture (table above).
- [x] **Parts** (ReUI's `Alert.Title`, `Alert.Description`, `Alert.Action`): `Alert.Root`, `Alert.Title`, `Alert.Description`, `Alert.Actions`; title only, description only, or all; a long message wraps; title-only alerts keep their actions on the same line, and actions wrap under the words when the alert is narrow.
- [x] **The glyph window** (*ours*): the kind's glyph engraved in a small sunk well, its lamp seated in the well's top right corner, as a latched tool key wears its LED. The window is the alert's one mark: shape (glyph) and light (lamp) in one place.
- [x] **Tones**, the same three as Status badge: `plate` (a raised plate with a defined edge, the default), `quiet` (no plate, for cards and panels), `strong` (the plate tinted in the kind's ink, the words in its deep ink: one per view). The plates are the Status recipe's, not a new look.
- [x] **Arrive, update, dismiss** as above, Reduce Motion honoured.
- [x] **Reading**: `failed` and `urgent` are `role="alert"` (read out at once); `note`, `done` and `waiting` are `role="status"` (polite). The glyph is decorative; the title carries the meaning.
- [x] **SwiftUI** `MetalAlert` with the same kinds, tones, slots and motion.

## Should

- [x] **Banner** placement (`banner`): full width, square ends, actions at the end of the line.
- [x] **Solid** (as Status badge): on frost or an image the plate keeps a keyline; Reduce Transparency turns it on.

## Later

- [ ] An alert that points at the field it's about (a link in the description that focuses the field). Hosts can do it with a plain button today.
- [ ] A stack of alerts in one place merging repeats (Toast's ×N). Wait until a host shows two at once.

## Not doing

- **invert** (a dark plate on bone): a second colorway inside the page; emphasis is `strong`.
- **Custom icons per alert**: the glyph says the kind; a custom glyph would let the shape lie about the colour. A host that needs a different glyph wants a different kind, and should ask for one.
- **Auto-dismiss timers**: that's a toast's job (see above).
- **Sizes** (large / regular / compact): an alert is reading text, at the body size; a compact alert is a title-only one.
- **A blue info kind**: blue is a link's kind.

## Glyphs

- [x] **info** (an "i" in a disc) and **warning** (a triangle with "!") are drawn (2026-10-06); they replace the `note` and `bell` stand-ins, and morph into each other at .78.

Decide: where does the lamp go: in the glyph window's corner, or beside the title as on a badge?
- Decided: **in the window's corner.** Beside the title, a lamp and a glyph would be two marks for one meaning, split across the alert; in the corner of the window they read as one instrument (what kind, and whether it's live), the way a latched tool key wears its LED. The title then starts flush with the description, so a long message reads as one column.
- Done (2026-10-06): every Must and both Shoulds, in React, SwiftUI (`MetalAlert`), the agent guide, the page (the Alert panel) and `e2e/alert.spec.ts`. SwiftUI picks beside-or-under with `ViewThatFits` rather than the web's 480 container query, and posts an announcement (high priority for failed and urgent) in place of the live region. Left: the info and warning glyphs; a Swift capture on the page.
