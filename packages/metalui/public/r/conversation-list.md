# Conversation list

The person's past conversations, in a `Sidebar`'s body. React: `ConversationList` from `@unlocalhosted/metalui`. SwiftUI: `MetalConversationList`. A place: it has area, holds the person's conversations, and you go into one from it. Every look is borrowed: the sidebar's engraved section titles and gaps, `Row` (`list`), the sidebar's lifted highlight for the open one, a ghost `IconButton` with a `Menu`, `QuickEdit` in a `Popover` for Rename, `Skeleton` while loading, `useRowMotion` and `leaveRows` for rows that arrive and leave. The `conversation-list` recipe holds the More key's reveal and the skeleton row count.

## Use it for

- A chat app's past conversations beside the thread: in `Sidebar` under its header's New chat key.

## Don't use it for

- An app's places (use `Sidebar.Item`), a list of files or people (use `Row`s in a list), search results (use `Table` or `Combobox`).

## Anatomy

- Groups by the day a conversation was last spoken in: Pinned, Today, Yesterday, Previous 7 days, Previous 30 days, then by month ("September 2026"). Each group: the sidebar's engraved title (label type, 10 in) and its rows 2 apart; groups 16 apart.
- Row: the `list` row (5 / 8, radius 12, 13 pt); the title on one line with an ellipsis (the whole title in the native tooltip); at its end a ghost More key (28, pulled into the row's padding).
- Loading: six skeleton lines in the rows' places.

## States and motion

| State | Look | Motion |
|---|---|---|
| rest | titles in ink | – |
| hover, focus | the row's lift; the More key shows | the key fades in on the settle spring |
| current | the sidebar's lifted highlight under the whole row; its More key always shows | the highlight glides to a newly chosen row on the settle spring |
| menu open | the key stays shown | the menu's own |
| renaming | `QuickEdit` in a popover beside the row; the key holds while `onRename`'s promise is out, then Renamed | QuickEdit's own |
| deleted | the row leaves one nest down, fading | release spring; the rows and groups under it close up on the settle spring; then `onDelete` |
| new row | – | lands one nest from above on the object spring |
| loading | skeleton lines | the skeleton's beat and sheen |
| empty | the host's `empty` node | – |

Reduce Motion: rows appear, leave and close up at once; the key appears at once.

## Rules

- Keep the order and the times in the host; the list sorts (pinned first, newest first) and groups from `time`.
- Delete without asking, and offer Undo in a toast ("Deleted “Tide tables” · Undo"); put the conversation back with its old `time` and it lands where it was.
- Rename goes through `QuickEdit` (the rule for every rename): return a promise from `onRename` when the save is remote.
- Pin, Archive, Share are the host's `actions` (rows between Rename and Delete). Pinned conversations come first under Pinned.
- New chat is the host's key in `Sidebar.Header`; a conversation added to the array lands at the top of Today.

## API

| React | SwiftUI |
|---|---|
| `conversations` `{ id, title, time, pinned? }[]` | `conversations: [MetalConversation]` |
| `current`, `onSelect(id)` | `current: Binding<String?>` |
| `onRename(id, title)` (a promise holds the key) | `onRename: (String, String) async throws -> Void` |
| `onDelete(id)` | `onDelete:` |
| `actions` `{ label, icon?, onSelect(id) }[]` | `actions: [MetalConversationAction]` |
| `loading`, `empty` | `loading:`, `empty:` view builder |
| `now`, `aria-label` ("Conversations") | `now:`, `label:` |

```tsx
<Sidebar aria-label="Chats">
  <Sidebar.Header><Button icon={<PlusIcon />} onClick={newChat}>New chat</Button></Sidebar.Header>
  <ConversationList
    aria-label="Chats"
    conversations={chats}
    current={open}
    onSelect={setOpen}
    onRename={(id, title) => save(id, { title })}
    onDelete={(id) => { const was = chats; setChats(chats.filter((c) => c.id !== id)); toast.show({ title: 'Deleted', undo: () => setChats(was) }); }}
    loading={!chats}
  />
</Sidebar>
```

## Keyboard and accessibility

- A `group` named by `aria-label`; each day a `group` named by its title holding a list. Tab reaches each title (a button; the open one `aria-current="page"`) and its More key ("More for Tide tables").
- The More key opens a `Menu` (↑ ↓, ↩, ⎋). Rename moves focus into the popover's field; closing it returns focus to the row. After a delete, focus moves to the next row (or the one before).
- Loading is a busy `status` named "Loading conversations".
