### Conversation: thinking words, past chats, branches, checkpoints, the chat in a panel, ghost text

From "AI components" § 2 and § 6: **Thinking indicator / shimmer** (AI Elements Shimmer, prompt-kit TextShimmer and ThinkingBar, shadcn's Marker), **Conversation list** (assistant-ui ThreadList, Ant Design X Conversations), **Branch picker** (assistant-ui BranchPicker), **Checkpoint** (AI Elements Checkpoint), **Chat sidebar and popup** (CopilotKit CopilotSidebar and CopilotPopup) and **Ghost text in a textarea** (CopilotKit CopilotTextarea).

Neighbours that must not be duplicated:

- **`Spinner`** is waiting, placed where the wait is, on one clock (`useWait`). A thinking line is one more placement: the wait is in words.
- **`Message`** already says a reply's state (the lamp breathing, "Thinking", one skeleton line). **`Reasoning`** already says "Thinking" while the model thinks.
- **`Sidebar`** is the side place with sections under engraved titles and the lifted highlight; **`Row`** is a row's look (`opened` is the row whose detail shows); **`useRowMotion`** lands, leaves and closes the gap; **`QuickEdit`** is every rename; **`Menu`** is a more key's actions; **`Skeleton`** holds the place of what will arrive.
- **`Pagination`** is a `nav` of numbered pages on the switcher's track; **`SwapText`** turns a number on the drum.
- **`Message` `from="system"`** is a centred note between two engraved rules.
- **`Sheet`**, **`Popover`**, **`Thread`** and **`PromptInput`** are the panel, the floating plate, the conversation and the composer.
- **Cues** (`Mark`) mark what a recognizer understood in the person's own words; **`Chip variant="suggestion"`** asks a question to accept or dismiss. Neither writes words that aren't there yet.

**Place (docs/COMPOSITION.md).**

- **The thinking words are not a new thing.** They are `Spinner.Text`, the Spinner's placement for a wait said in words (a Component, with the ring, the bar and the status).
- **Conversation list is a Place.** It has area (it scrolls), holds the person's conversations, and you go into one from it. Choosing a row changes the thread shown, but the list isn't a control with one job: it is where the past chats live, as `Sidebar` is where the app's places are. It sits in a `Sidebar`'s body.
- **Branch picker is a Component.** Two keys and a count: you operate it to change something else (which reply the message shows). It sits in `Message`'s footer beside `MessageActions`.
- **Checkpoint is not a new thing.** It is a `Message from="system"` holding the words and a compact Restore `Button`: a note in the thread with one action.
- **Chat sidebar and popup are not new things.** They are a block (`Chat panel`): `Thread` and `PromptInput` in a docked column or in a `Popover` from an Assistant key at the corner. Past chats stay with `ConversationList` in a `Sidebar` (a chat app's page), not in this column: an assistant beside the work holds one conversation.
- **Ghost text is not a new thing.** It is `Textarea`'s `suggestion`, passed through by `PromptInput`: the well already mirrors its text to measure its height, and the ghost is that mirror made visible.

**Decide**

- **A shimmer of its own, or the Spinner's?** The Spinner's (`Spinner.Text`). A shimmer is waiting; waiting has one language and one clock. The sheen is the skeleton's light passing across metal, on words instead of wells.
- **Does Message's "Thinking" shimmer?** No. The header's lamp breathes beside the word; a sheen on the word too would say it twice. `Spinner.Text` is for a working line with no lamp of its own: "Searching the web", "Reading 3 files" under a reply, a tool's progress, a panel's first load.
- **A thinking bar (P's ThinkingBar)?** Covered: the reply's header says Thinking and `PromptInput` `busy` turns Send into Stop. A second bar would be a second Stop.
- **Only transform and opacity animate.** The sheen is a window that slides across the words (translate) holding a copy of them that slides the other way (so the copy stays put), with a soft-edged mask fixed to the window. No background-position animation.
- **How are conversations grouped?** By the day the person last spoke in them: Today, Yesterday, Previous 7 days, Previous 30 days, then by month ("September 2026"). The list groups from each conversation's `time`; pinned ones come first under Pinned. The host sorts nothing.
- **Which row is current?** The Sidebar's own current: the open row says `aria-current="page"`, so the sidebar's lifted highlight sits under it and glides when another is chosen, exactly as for `Sidebar.Item`. Not `Row` `opened` (a rail beside the highlight would say it twice) and not `selected` (one of several picked). SwiftUI, with no gliding highlight yet, uses the row's selected plate.
- **Where do Rename and Delete live?** In each row's More key (a `Menu`), visible on the current row and on hover or focus. Rename opens `QuickEdit` in a `Popover` anchored to the row (the rule for every rename); Delete lets the row leave (one nest down, release spring, the rows under it close up) and then calls `onDelete`; the host offers Undo in a toast. No confirmation dialog: deleting is undone, not asked.
- **Loading.** `loading` shows skeleton rows where the conversations will be (`Skeleton.Swap`), so the first load never flashes.
- **Branch picker: Pagination's track or its own?** Its own: Pagination is a landmark of numbered pages; a branch picker is two ghost keys and "2 / 3" in a footer, at the footer's size. The count turns on the drum. Hidden when there is one reply.
- **Checkpoint: who restores?** The host: Restore's press drops the turns after it. The note stays, so the thread reads as where it went back to; after restoring, its words say "Restored" and the key goes.
- **Chat panel: Sheet or a docked column?** Docked: a chat beside the work must not cover the work or trap focus (Sheet is modal). The popup is a `Popover` from an Assistant key at the corner (words, not a glyph: the set has no glyph for an assistant): it opens at once when the column is floated, closes on ⎋ and on a press outside, and keeps the conversation while closed. SwiftUI has no block twin (as the AI composer): a checkpoint there is `MetalMessage(.system) { HStack { Text; MetalButton("Restore", icon: .undo, size: .compact) } }`.
- **Ghost text: who decides what to suggest?** The host (`suggestion`, the words after the caret). The well shows them in ink3 after the text while the caret is at the end; Tab accepts (inserted as typed, so ⌘Z undoes it), ⎋ dismisses (`onSuggestionDismiss`), typing the suggestion's next letters eats them; anything else hides it. A screen reader hears "Suggestion: …, Tab to accept" once per suggestion.

**Jobs: Thinking words**

| Job | Where | Our form | Tier |
|---|---|---|---|
| Say what the agent is doing, in words, while it does it | "Searching the web" under a reply | `Spinner.Text`: the words in ink2 with a sheen passing across them (the skeleton's light) after the show delay; `active={false}` stops it in place | Must |
| Fast work shows no sheen | | the sheen starts after the spinner's show delay | Must |
| A screen reader hears it | | a polite status: the words, once | Must |
| Reduce Motion | | no sheen: the words breathe (the progress breathe) | Must |
| A thinking bar with Stop (P) | | covered: Message's header word and PromptInput's Stop | covered |
| Shimmer on any text (V) | headlines, loading copy | dropped: a sheen means waiting; nothing else shimmers | dropped |

**Jobs: Conversation list**

| Job | Where | Our form | Tier |
|---|---|---|---|
| See past chats and go into one | a chat app's sidebar | `ConversationList`: rows of titles (`Row` `list`, ellipsis), grouped by day under engraved titles; pressing one calls `onSelect` | Must |
| Know which is open | | `current`: `aria-current="page"`; the sidebar's highlight sits under the row and glides to the next | Must |
| Rename a chat | a better title | the row's More key → Rename → `QuickEdit` in a `Popover` anchored to the row; `onRename(id, title)` (a promise holds the key) | Must |
| Delete a chat | | More → Delete (red): the row leaves and the rows close up, then `onDelete(id)`; focus goes to the next row | Must |
| A loading list | first load | `loading`: skeleton rows | Must |
| A new chat arrives | after New chat | a row new to the list lands on the object spring | Must |
| Pinned chats first | | `pinned` on a conversation: a Pinned group above the days | Should |
| Nothing yet | | `empty` (a node): shown in place of the groups | Should |
| New chat | | covered: the host's key in `Sidebar.Header` | covered |
| Archive (A) | | Later: a second state the host keeps; the menu takes host items (`actions`) today | Later |
| Rows as links to a route | `/c/:id` | Later: `onSelect` and the host's router today | Later |
| Search past chats | many chats | covered: a `Field` above the list filters the host's array | covered |

**Jobs: Branch picker**

| Job | Where | Our form | Tier |
|---|---|---|---|
| Move between the replies to one question | after Retry | `BranchPicker` `index`, `count`, `onIndexChange`: ghost previous and next keys (the chevron turned) and "2 / 3" in tabular figures between them | Must |
| See which one this is | | the count turns on the drum (`SwapText`); a polite status says "Reply 2 of 3" | Must |
| At the first or last | | that key is disabled | Must |
| One reply | | renders nothing | Must |
| Branches of the person's edited turn | | covered: the same picker under the person's turn | covered |

**Jobs: Checkpoint**

| Job | Where | Our form | Tier |
|---|---|---|---|
| A point in the thread to go back to | an agent that changes files | `Message from="system"`: "Checkpoint · 14:02" and a compact Restore `Button` with the undo glyph | Must |
| Go back to it | | Restore calls the host, which drops the turns after it; the note then says "Restored" and the key goes | Must |
| Restoring is serious | an agent that edits code | covered: the host can ask with `Confirmation` or offer Undo in a toast | covered |

**Jobs: Chat panel (block)**

| Job | Where | Our form | Tier |
|---|---|---|---|
| The chat beside the work | an app with an assistant | a docked column: a header (Float, Close), `Thread` and `PromptInput`; under 34rem it takes the block's width | Must |
| The chat on demand | a site's help | an Assistant `Button` at the corner opens a `Popover` holding `Thread` and `PromptInput` (Float opens it at once); ⎋ or a press outside closes it; the conversation is kept | Must |
| Branches and checkpoints in use | | the replies keep their takes (`BranchPicker`); a checkpoint note restores | Should |

**Jobs: Ghost text**

| Job | Where | Our form | Tier |
|---|---|---|---|
| See the AI's next words where I'm writing | a composer, a long field | `Textarea` `suggestion`: the words after the text in ink3 while the caret is at the end | Must |
| Take them | | Tab inserts them as typed (⌘Z undoes it); focus stays | Must |
| Not take them | | ⎋ calls `onSuggestionDismiss`; typing anything but their next letters hides them | Must |
| Keep typing what it suggested | | each letter that matches eats one from the ghost | Must |
| In the composer | | `PromptInput` passes `suggestion` and `onSuggestionDismiss` through | Must |
| Accept a word at a time (C) | | Later: ⌘→ | Later |

**Must**
- [x] React: `Spinner.Text`; `ConversationList` (`conversations`, `current`, `onSelect`, `onRename`, `onDelete`, `loading`, `empty`, `actions`); `BranchPicker` (`index`, `count`, `onIndexChange`, `label`); `Textarea` `suggestion` / `onSuggestionDismiss`, through `PromptInput`.
- [x] SwiftUI `MetalSpinnerText`, `MetalConversationList`, `MetalBranchPicker`, `MetalTextarea` `suggestion:`.
- [x] Recipes (`spinner` text, `conversation-list`, `branch-picker`, `textarea` ghost), agent guides, meta.json, pages with DialKit panels, e2e slices, bundle ceilings.
- [x] The Chat panel block: docked and popup, with branches and a checkpoint.

**Later**
- [ ] Archive; rows as router links.
- [ ] Ghost text a word at a time.
