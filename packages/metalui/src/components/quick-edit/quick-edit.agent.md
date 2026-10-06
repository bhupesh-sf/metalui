# Quick edit

One short value edited where it stands and committed with one key. React: `QuickEdit` from `@unlocalhosted/metalui`. SwiftUI: `MetalQuickEdit`. It is the pattern for every confirm that commits a small edit: Rename, Save region, Tag, a label. It goes in a popover's body or a dialog; the plate's title says what is edited. The looks are the field, form field and button recipes; the `quick-edit` recipe adds the gaps and the hold.

## Use it for

- Renaming a region, a canvas, a file; tagging; naming a saved view. One value, one key.

## Don't use it for

- Several fields, or a choice from options (a form in a dialog, a select).
- Editing a name in place on the object itself (the region's own title edits inline).
- A comment or anything that wraps: a textarea's confirm follows the same rules, but this component is one line.

## Anatomy

- A regular (32) field, the field's invalid ring and the form field's error line under it (meta type, red).
- 10 below: the actions, 8 apart, at the end: Cancel (words only), then the primary key leading with its glyph (`pen` for Rename).

## States and motion

| State | Field | Key | Motion |
|---|---|---|---|
| open | focused, the value selected (a file: the name without its extension) | the verb, off | – |
| unchanged or empty | – | off (`disabled`); Enter does nothing | – |
| changed | – | on | – |
| not accepted (on commit) | the invalid ring; the reason under it; the plate stays | on | the error row grows open on the settle spring; it checks live after that and closes when fixed |
| saving | locked (read-only); Cancel and Escape held off | held down (`state="waiting"`), "Renaming…" on the drum; the arc after the spinner's 400 ms delay | the drum turns |
| done | locked; Cancel or Esc close it early | held (`state="done"`), glyph morphs `pen` → `check`, "Renamed" | morph on the settle spring; the plate closes after the hold (800 ms) |
| failed | unlocked, focused | glyph morphs to `sync-error`, "Try again"; pressing it retries | editing turns the key back to the verb and `pen` |

Reduce Motion: the glyph and the word change in place; the hold stays (it is for reading). A sync `onCommit` skips saving and goes straight to done.

## API

| React | SwiftUI |
|---|---|
| `value` (what it is now) | `value:` |
| `label` (names the field: "Region name") | first argument |
| `onCommit(next)`: the trimmed value; return a promise for an async save, reject to fail | `onCommit: (String) async throws -> Void` |
| `onClose()`: Cancel, and the hold after a commit lands | `onClose:` |
| `validate(next)`: the reason it is not accepted, or nothing | `validate:` |
| `extension`: a file name; its extension stays out of the selection | `keepsExtension:` |
| `words` `{ verb, doing, done, failed }`, default Rename / Renaming… / Renamed / Couldn’t rename | `words:` (`.rename`) |
| `icon`: the key's glyph as its parts, `{ glyph: tagGlyph, morph: tagMorph }` from `@unlocalhosted/metalui/icons`; default pen. It ships only that glyph, check and sync-error | `icon:` (`.pen`) |

```tsx
const toast = useToast(); // under a ToastProvider
<Popover open={open} onOpenChange={setOpen}>
  <Popover.Trigger><Button icon={<PenIcon />}>Rename…</Button></Popover.Trigger>
  <Popover.Content>
    <Popover.Title>Rename region</Popover.Title>
    <Popover.Body>
      <QuickEdit
        label="Region name"
        value={name}
        validate={(next) => (taken.has(next) ? `A region is already called ${next}.` : null)}
        onCommit={async (next) => {
          const was = name;
          await save(next);
          setName(next);
          toast.show({ title: `Renamed to ${next}`, undo: () => setName(was) });
        }}
        onClose={() => setOpen(false)}
      />
    </Popover.Body>
  </Popover.Content>
</Popover>
```

```swift
MetalQuickEdit("Region name", value: name,
               validate: { taken.contains($0) ? "A region is already called \($0)." : nil },
               onCommit: { next in try await save(next); deck.show(.init("Renamed to \(next)", undo: { name = was })) },
               onClose: { renaming = false })
```

## Keyboard and accessibility

- Enter commits (the form's submit; nothing when the key is off). Escape cancels through the plate (the popover's or dialog's own Escape); while a save is out, Escape waits.
- The field is named by `label`; when not accepted it says aria-invalid and the reason is read with it.
- The key's word is its name; it says aria-busy while saving. Done and failed are announced (a status region).

## Rules

- **Every confirm that commits a small edit follows this**: it leads with its glyph, is off while nothing changed, refuses with a reason instead of closing, holds while saving, shows done on the key (glyph to `check`, word on the drum) before the plate closes, and fails on the key (`sync-error`, Try again).
- Offer Undo in a toast when it lands, in the action's words: "Renamed to Lisbon · Undo". The toast is the host's (`useToast`), so the host words it and undoes it; ⌘Z runs the newest Undo.
- The reason says what to do: "A region is already called Lisbon.", "Keep it to 40 characters." Not "Invalid".
- Don't close on a refusal or a failure; the person's text stays.
- Swift: the glyph cross-fades (no Swift morph yet) and the word changes on the settle animation.
