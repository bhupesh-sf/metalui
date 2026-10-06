# Message actions

The keys that act on a message, in `Message`'s footer. React: `MessageActions` from `@unlocalhosted/metalui`. SwiftUI: `MetalMessageActions`. A component: each key changes something else (the clipboard, the thread, the person's turn, the feedback the host keeps). Every look is borrowed: ghost `IconButton`s with `Tooltip`s, the copy, check, retry, pen and thumb glyphs (Bad is the thumb turned over), the drum (`SwapIcon`, `SwapText`), compact `Button`s for reasons. The `message-actions` recipe holds the gaps and the two holds.

## Use it for

- Copy and Retry under a reply; Edit under the person's last turn; Good and Bad on replies.

## Don't use it for

- Actions on something that isn't a message (a card's menu, a row's keys).
- Delivery ("Sent", "Not sent · Try again"): that is words in the footer.

## Anatomy

- A `toolbar`: the keys 2 apart, each only when given: Copy (`copy`, the text), Retry (`onRetry`), Edit (`onEdit`), Good and Bad (`onFeedback`); then the host's `children`.
- Under the keys, 6 below, the reasons row after Bad (`reasons`), its buttons 6 apart.

## States and motion

| State | Look | Motion |
|---|---|---|
| copied | the check, named "Copied", for `copy.hold` (1.6 s); "Copied" said once | the glyph and the name turn on the drum |
| `retryDisabled` | Retry dimmed | – |
| `feedback` up or down | that thumb latched (aria-pressed, the ghost's lit look) | – |
| asking | after Bad with `reasons`: a row of compact buttons | fades in on the settle spring |
| thanked | the row says "Thanks" for `thanks.hold`, then goes | the word on the drum |

Reduce Motion: the row appears at once; glyphs and words change in place.

## Rules

- Show the actions once a reply has settled (pass them to `Message` `footer` only then), so they fade in and nothing offers to copy half an answer.
- Retry only the last reply, and disable it (`retryDisabled`) while another writes.
- Keep `feedback` in the host when it is stored; pressing the chosen thumb again clears it (`null`).
- Offer reasons as a few words ("Not accurate", "Too long", "Other"); "Other" is the host's moment to ask more.
- Copy the message's source (its Markdown), not its rendered text.

## API

| React | SwiftUI |
|---|---|
| `MessageActions` `copy`, `onRetry`, `retryDisabled`, `onEdit`, `feedback`, `onFeedback(feedback, reason?)`, `reasons`, `children` | `MetalMessageActions(copy:, onRetry:, retryDisabled:, onEdit:, feedback:, onFeedback:, reasons:)` |
| `MessageFeedback` `'up'`, `'down'`, `null` | `MetalMessageFeedback` `.up`, `.down` (optional) |

## Keyboard and accessibility

- A `toolbar` named "Message actions"; each key is a button named by its tooltip ("Copy", "Retry", "Edit", "Good response", "Bad response").
- The thumbs are toggle buttons (`aria-pressed`).
- The reasons are a `group` named "What went wrong?"; "Copied" and "Thanks for the feedback" are said through a status.
