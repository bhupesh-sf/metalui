# Empty state

A place with nothing in it yet. React: `EmptyState` from `@unlocalhosted/metalui`. SwiftUI: `MetalEmptyState` (work in progress; `ContentUnavailableView` is the system's). A place: the glyph sits in a `well`; the `empty-state` recipe adds the layout and the arrival.

## Use it for

- A list, board or panel with nothing in it: first use, a cleared filter, everything done.
- The welcome of a new chat, in a `Thread`: the assistant's glyph or `Avatar` as `icon`, a greeting as `title` ("What are we making?"), what it can do as `description`, and starter prompts as `action`: two to four compact standard `Button`s, each the prompt's words, sending it when pressed. The action row wraps and centres; the welcome goes when the first message arrives.

## Don't use it for

- Errors (say what went wrong and how to fix it), or loading (use a skeleton).

## Anatomy

- A 56 sunk well (radius 18) with a 24 glyph in ink3.
- Title (title type): what would be here. Description (body type, ink2): how to start.
- One action, 16 below.
- Compact: one line in ink3 and the action, for small places.

## States and motion

| State | Look | Motion |
|---|---|---|
| empties | the empty state | rises one nest from below on the settle spring (T9) |
| content arrives | the content | the empty state goes; the content's own arrival |

Reduce Motion: it fades in without travel.

## API

| React | SwiftUI |
|---|---|
| `title`, `description`, `icon`, `action` | `ContentUnavailableView(title, systemImage:, description:)` |
| `compact` | – |

## Keyboard and accessibility

- A polite `status`: when a place empties, assistive tech hears what would be here. The action is an ordinary button or link.

## Rules

- Say what would be here and how to start, not only "Nothing here".
- One action; the one that starts it. A new chat is the exception: its starter prompts are several ways in, at most four, each a whole prompt in a few words ("Summarise this thread"), never a category.
- Follow-ups after a reply are not an empty state: put the same compact `Button`s in a row under the assistant's `Message`, inside the `Thread`, and drop them when the person sends.
