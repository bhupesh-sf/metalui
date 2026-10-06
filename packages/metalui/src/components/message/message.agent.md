# Message

One turn of a conversation: the person's at the end on a raised plate, the assistant's at the start on the page. React: `Message` from `@unlocalhosted/metalui`. SwiftUI: `MetalMessage`. An object: it stands for something said and stays. Every look is borrowed: the plate is the raised surface (raise-sm), the header's lamp is the LED with its meanings, the state's word turns on the drum (`SwapText`), a reply that hasn't started waits as a `Skeleton` line, the avatar is the host's `Avatar`. The `message` recipe holds the gaps, the indent and the plate's padding.

## Use it for

- The person's turns and the assistant's replies in a `Thread`.
- A system line in the conversation: "Model changed to Thorough", "Conversation restarted".

## Don't use it for

- A comment on a thing (a card, a photo): that belongs to the thing.
- A notice about the page: use `Alert` or `Toast`.

## Anatomy

- `Message`: `from` (user, assistant, system), `name`, `model`, `time`, `status`, `avatar` (an element), `attachments`, `footer`, `grouped`, `children` (the body).
- The person's turn: indented 48 from the start (32 under 28rem, a container query on the turn), aligned to the end; the body on the plate, padded 14 × 10, content type, ink. A header only for a `time` or an `avatar`.
- The assistant's turn: at the start; a header (24 tall, meta type, ink2): the lamp when `status` is set, the name ("Assistant"), `· model`, the time (ink3, tabular figures), the state's word (ink3). The body in content type, ink, on the page.
- `avatar` sits at the turn's own side (start for the assistant, end for the person), level with the header, 10 from the body.
- Files (`attachments`) above the body, the footer under it, both on the turn's side, 6 apart.
- A system message: its words centred in meta type, ink2, between two engraved rules, 12 apart.

## States and motion

| State | Look | Motion |
|---|---|---|
| `status` waiting | the amber lamp, "Thinking"; with no body yet, one sunk skeleton line | the lamp breathes |
| writing | the green lamp, "Writing" | the word turns on the drum |
| done | the off lamp, no word | – |
| stopped | the off lamp, "Stopped" | – |
| failed | the red lamp, "Failed" | – |
| footer appears after the turn did | – | fades in on the settle spring; not on the first render |
| `grouped` | no header; the avatar's column kept, empty | – |

Reduce Motion: the footer appears at once; the lamp holds steady; the drum changes in place.

## Rules

- Say a reply's state with `status`; colour never says it alone (the word goes with the lamp).
- Set `grouped` when the turn before has the same `from` (and speaker); the host decides, from its own list.
- Pass the avatar as an element (`<Avatar name="Ana Rocha" size="small" label="" />`): the turn's name already says who, so the avatar is silent.
- Put actions (Copy, Retry) and delivery ("Sent", "Not sent · Try again") in `footer`; show actions once a reply settles, so they fade in.
- The body is the host's node: for a reply, a `Markdown` (`streaming` while it writes, with its caret). Put `MessageActions` in `footer`.

## API

| React | SwiftUI |
|---|---|
| `Message` `from`, `name`, `model`, `time`, `status`, `avatar`, `attachments`, `footer`, `grouped`, `children` | `MetalMessage(_ from:, name:, model:, time:, status:, avatar:, grouped:) { body } footer: { … }` |
| `MessageFrom` `user`, `assistant`, `system` | `MetalMessageFrom` `.user`, `.assistant`, `.system` |
| `MessageStatus` `waiting`, `writing`, `done`, `stopped`, `failed` | `MetalMessageStatus` the same cases |

## Keyboard and accessibility

- An `article` named by its speaker: "You", or "Assistant, Thorough" when a model is set. Nothing in it is focusable but the host's actions and files.
- The state's word ("Thinking", "Writing", "Stopped", "Failed") is a `role="status"`, so a reader hears it change. The body is `aria-busy` while a reply writes, so its words are heard once they settle; `false` after.
- The lamp is decorative; the word says the state. The avatar is decorative when its label is `''`.
- A system message is a `note`; its rules are hidden.
