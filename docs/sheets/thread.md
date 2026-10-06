### Thread and Message

From "AI components" § 1, "Lift the AI composer block's parts into components": the scrolling conversation (AI Elements Conversation, prompt-kit ChatContainer, assistant-ui Thread, shadcn Message scroller) and the turns in it (AI Elements Message, prompt-kit Message, assistant-ui Message, Ant Design X Bubble, shadcn Message and Bubble).

Now: the AI composer block (`apps/docs/src/blocks/ai-composer`) does both inside itself: a `role="log"` in a `ScrollArea` that follows the words while you are at the foot, stays put when you scroll up and offers Jump to latest; a person's turn on a raised plate at the end, a reply as plain text at the start with a header (lamp, "Assistant · model", the state's word on the drum), a skeleton while it thinks, Copy and Retry fading in once it settles. Neighbours that must not be duplicated:

- **`ScrollArea`** is the scrolling (bar, edge fades, keys). A thread is a scroll area that knows which end is news: it holds the newest in view and gives the way back.
- **`Timeline`** is a record of events on a rail, read as one story with a now marker. A thread is people talking; each turn has a speaker, and the order is the order things were said.
- **`Table` `live`** lands new rows at the top for comparing. A thread lands them at the foot, to be read.

**Place (docs/COMPOSITION.md).**

- **Message is an Object.** It stands for something said, by the person or the assistant, and it stays (Object holds). You don't operate it to change something else (its actions are buttons in its footer, not the message), it isn't drawn only while you act, and you don't go into it. Its siblings are `Card` and `Attachment`.
- **Thread is a Place.** It has area, holds messages, and you look through it (scroll up to read, come back to the foot). It isn't a control (Component fails: scrolling it changes nothing else) and it isn't a thing of the person's (it is where their messages live). Its siblings are `Region` and `Split pane`.

**Semantics.** The thread's list is a `log` (polite by its role): what arrives at its end is said, nothing earlier is. Each message is an `article` named by its speaker ("You", "Assistant, Thorough"), `aria-busy` while the reply thinks or writes, so a reader hears the turn once it settles. A system message is a `note`. Jump to latest is a button that is `inert` and hidden while you are at the foot.

**Jobs: Thread**

| Job | Where | Our form | Tier |
|---|---|---|---|
| Read the conversation, newest at the foot | every chat | `Thread`: a `ScrollArea` holding a `log` of messages, gutters and a gap between turns from the `thread` recipe | Must |
| Stay with a reply while it writes | a streaming answer | pinned: while you are at the foot (within the recipe's `follow` slop) the thread follows its content as it grows (a ResizeObserver, so nothing runs at rest) | Must |
| Scroll up to read while it writes | a long answer | away: scrolling up unpins; the thread stays put however much arrives below | Must |
| Get back to the newest | after reading up | Jump to latest: a compact `Button` with the chevron rises at the thread's end edge from one nest below (settle) while away; pressing it glides to the foot (jumps under Reduce Motion) and follows again | Must |
| Sending always shows the reply | the person sends while scrolled up | `pinKey`: when it changes the thread goes to the foot and follows again. The host passes the id of the person's newest message | Must |
| New turns arrive | every send, every reply | `useRowMotion`: a new message rises one nest from below on the object spring, fading in; nothing lands on the first render | Must |
| Open at the newest | a conversation reopened | the first render starts at the foot | Must |
| Out of width | a sidebar, a phone | under 28 rem (a container query on the thread) the gutters narrow | Should |
| Something under the host's title | a panel with a header | covered: `ScrollArea` marks `data-overflow-y-start`; the host draws its hairline from it (the block does) | covered |
| Load earlier messages at the top (A, V) | long histories | Later: keep the reading place while rows are added above; needs a real paged history | Later |
| A count of new messages on Jump to latest | a group chat | Later: the AI thread has one writer; build with a multi-person chat | Later |
| Empty thread greeting | a new chat | covered by `EmptyState` (and "Welcome" in the AI backlog) placed in the thread by the host | covered |

**Jobs: Message**

| Job | Where | Our form | Tier |
|---|---|---|---|
| Tell the person's turns from the assistant's | every chat | `from="user"`: aligned to the end on a raised plate (raise-sm, the card radius), indented from the start; `from="assistant"`: plain content type on the page at the start, as a reader reads an answer | Must |
| Who said it | every turn | the header: the speaker's `name` (default "Assistant"; the person is "You", said, not shown), the `model` after a `·`, the `time` in tabular figures; meta type, ink2 | Must |
| A face for the speaker | named assistants, people | `avatar`: the host's element (an `Avatar` at small size) at the start of an assistant turn or the end of the person's, level with the header | Must |
| A reply thinking, writing, stopped or failed | every reply | `status`: the header's lamp with the LED meanings and its word on the drum (`SwapText`): waiting the amber lamp breathing and "Thinking"; writing the green lamp and "Writing"; stopped the off lamp and "Stopped"; failed the red lamp and "Failed"; done the off lamp and no word. Waiting with no body yet shows one sunk skeleton line | Must |
| What can be done with it, and how it went | Copy, Retry, "Sent" | `footer`: the host's node (Message actions are their own entry); when it appears after the message did (a reply settling) it fades in on settle | Must |
| Files sent with a turn | the person attaches | `attachments`: the host's `Attachment`s above the body, on the turn's side | Must |
| Consecutive turns from one sender | two replies, a follow-up | `grouped`: no header and an invisible avatar (the body keeps its column), and the thread closes the gap to the group gap | Must |
| A system message | "Model changed to Thorough", "Conversation restarted" | `from="system"`: centred meta words in ink2 between two engraved rules, a `note` | Must |
| Out of width | a phone | under 28 rem the person's indent narrows | Should |
| Bubbles for both sides (X, S) | a messaging app | dropped: an answer reads better as text on the page; the plate says "you said this". A host that wants a plate around replies puts a `Card` in the body | dropped |
| Placement left / right props (X `placement`) | | covered by `from`; mirroring is the browser's `dir` | covered |
| Loading dots inside the bubble (X `loading`) | | covered by `status="waiting"`: the lamp breathes, the word says it, and the skeleton holds the place | covered |
| Markdown, streaming caret | answers | its own entry ("Streaming text and Markdown"); the body is the host's node until then | Later |
| Copy, retry, edit, feedback | answers | its own entry ("Message actions"); the footer slot is where they go | Later |
| Branch picker "2 of 3" (A) | regenerated replies | its own entry in "Agent parts" | Later |

Not doing: a typing indicator of its own (the lamp, the word and the skeleton say it), a colour per speaker (the LED meanings are fixed; the side and the plate say who), timestamps that tick.

**Decide**

- **Where is a reply's state said, header or footer?** The header, beside the speaker. It is the first thing read in a turn and where the eye already is while words arrive below; the footer is what comes after (actions, delivery). The backlog's "footer (status)" is the footer slot.
- **Who groups consecutive turns?** The host, with `grouped` (one boolean from its own list: the previous turn's `from`). The thread reading its children's props would be a second source of truth.
- **Does the person's turn have a header?** Only for a time or an avatar. "You" is said to readers as the article's name; written over every message it is noise.
- **Who keeps the thread at the foot?** The thread, from its own size: content that grows while pinned scrolls with it. The host only says "the person just sent" (`pinKey`), because only the host knows that a new row is theirs.
- **New rows rise from below.** A conversation grows down, so news comes up from under the fold. `useRowMotion` gains a `from` direction (default above, so every list stays as it is).
- **Reuse.** The scrolling is `ScrollArea` (its `viewportRef`); the plate is the surface's raise-sm; the lamp is the LED with its gestures; the state's word is `SwapText`; the waiting line is `Skeleton`; the avatar is `Avatar`; arrival is `useRowMotion`; Jump to latest is `Button` with `ChevronIcon`. The `thread` and `message` recipes hold only sizes.

**Must**
- [x] React: `Thread` (`aria-label`, `pinKey`, `jumpLabel`, children) and `Message` (`from`, `name`, `model`, `time`, `status`, `avatar`, `attachments`, `footer`, `grouped`, children).
- [x] Pinned, away, Jump to latest, `pinKey`; arrival from below; the footer's fade.
- [x] SwiftUI `MetalThread` and `MetalMessage` with the same states.
- [x] Recipes `thread` and `message`, agent guides, meta.json, the pages with their DialKit panels, the e2e slices.
- [x] The AI composer block rebuilt from them.

**Should**
- [x] Out of width: narrower gutters and indent.

**Later**
- [ ] Load earlier messages at the top.
- [ ] A count of new messages on Jump to latest.
