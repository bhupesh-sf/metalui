# Attachment

A file someone attached. React: `Attachment` from `@unlocalhosted/metalui` (named so it never shadows the browser's `File`). SwiftUI: `MetalAttachment` (work in progress). An object: the plate is the raised `surface`, the type sits in a `well`, the upload uses the progress fill (a row) or Progress's ring (a tile); the `attachment` recipe adds the layout, the tile and the land and leave.

## Use it for

- Files attached to a note, a message or a form: before, during and after upload.
- Images: `preview` shows the picture; `kind="tile"` lays them out in a grid or a row of thumbnails.
- The file upload layouts (below): a gallery you put in order, a composer's row, a table of files, an avatar upload.

## Don't use it for

- Browsing files (use a table or a list of cards), or links (use a link card).

## Anatomy

- Plate: raised, 52 tall, filling its column from 240 to 360 wide (a list shares one width), radius 14, padding 8.
- Type: a 36 sunk well with the extension engraved (PDF, PNG).
- Name: ui type; a long name keeps its extension and cuts the middle.
- Line: meta type, ink3: the size, "Uploading · 40 %", or the error in red.
- Track (uploading): 3 tall, Progress's fill: a whole capsule slid in by transform on the settle spring (never a width, so it paints and does not lay out). Try again (failed), Remove (a mini key).
- Preview: the picture fills the type well (object-fit cover), the well's inset shade kept over it, fading in over the extension once it loads; a picture that can't load never shows.

### Tile (`kind="tile"`)

- Plate: raised, square window plus caption, radius 14, padding 4; it fills its grid column (at least 112). `compact`: 52 square, padding 3, the window alone (the name and the line are its `title` and label).
- Window: a sunk well (radius 10; 11 compact) cut in the plate, a slide in its mount: the picture, or the extension engraved.
- Caption (regular): the name (meta type, the middle cut) and the line (size, "Uploading · 40 %", or the reason in red).
- Disc: a 28 raised disc in the window's middle: Progress's ring while uploading (it turns while the amount is unknown), Try again (the `retry` glyph, a ghost key) once failed.
- Caps: 20 raised discs (18 compact) inset 6 (3) at the top corners: open (`zoom-in`, start) and remove (end), mini keys, so they read on any picture.

## States and motion

| State | Look | Motion |
|---|---|---|
| added | the plate | lands from one nest above on the object spring (T5b) |
| uploading | the track fills; the line counts | settle spring |
| done | the size | – |
| failed | the reason in red; Try again | announced once |
| removed | – | one nest down, fading, on the release spring (T9); then gone |
| tile uploading | the picture at 45 %; the ring on the disc | the ring fills on the settle spring; the dim fades |
| tile failed | the picture at 45 %; Try again on the disc; the reason under it in red | announced once |

Reduce Motion: it appears and goes at once; the fill still moves.

## API

| React | SwiftUI |
|---|---|
| `name`, `size` (bytes) | `name:`, `size:` |
| `progress` (0–100 while uploading) | `progress:` |
| `error`, `onRetry` | `error:`, `retry:` |
| `onRemove` (called after it has left) | `remove:` |
| `fill` (no max width: a list as wide as its panel) | `.frame(maxWidth: .infinity)` |
| `preview` (an image's address: an object URL or a thumbnail) | `preview:` (an `Image`) |
| `kind`: `row` (default) · `tile` | `kind:` `.row` · `.tile` |
| `compact` (tiles: 52 square, the window alone) | `compact:` |
| `onOpen` (tiles: the open key; a click on the picture) | `open:` |

## Keyboard and accessibility

- A `group` named by the file name. The progress is a named `progressbar`; a failure is an `alert`. Remove is a button named "Remove report.pdf"; move focus to a neighbour after removing.
- A tile's keys are "Open Receipt.png", "Remove Receipt.png" and "Try again Receipt.png". A click on the picture opens it for a pointer only; the open key is the way in for keys and readers. A compact tile says its failure in a visually hidden `alert`.

## Rules

- Say why an upload failed in a few words ("Too large, 25 MB at most"), and offer to try again.
- Keep the extension visible; cut the middle of long names.

## Layouts

File upload is a drop zone beside the files it took, laid out by the host. No layout is a component; each is a few lines (the Attachment page shows them, with code).

- **Gallery to put in order**: `DropZone compact accept="image/*"` over `Sortable.Root orientation="grid"`, each `Sortable.Item` holding a tile with `onOpen`. The picture is not a button, so a drag starts on it; a click without moving opens it, and Sortable swallows the click that ends a drag. Space on the item lifts it (Sortable's), Enter on the open key opens. Show the picture in a `Dialog`.
- **Composer's row**: `DropZone compact` with up to four compact tiles in a row, a `+N` readout well (52, the well's look, the count on the drum) for the rest, and "6 files · 13 MB" in meta under it.
- **Table of files**: `Table` with a `cell` that puts `<Progress shape="ring" size="compact">` beside the words ("Uploading · 40 %", "Failed: …"; `state` failed or complete); Try again (primary, `retry` glyph) and Remove as the row's `actions`. Not Table's `progress` kind: that is a meter for a share, not a task.
- **One image (an avatar)**: see the drop zone guide.
- Revoke an object URL (`URL.revokeObjectURL`) when its file is removed.

```tsx
<Sortable.Root aria-label="Photo order" orientation="grid" value={order} onValueChange={setOrder}>
  {order.map((id) => (
    <Sortable.Item key={id} value={id} label={files[id].name}>
      <Attachment kind="tile" name={files[id].name} size={files[id].size} preview={files[id].url}
        progress={files[id].progress} error={files[id].error} onRetry={() => retry(id)}
        onOpen={() => setOpen(id)} onRemove={() => remove(id)} />
    </Sortable.Item>
  ))}
</Sortable.Root>
```

## Waiting

- `progress={null}` while uploading before the amount is known: a lit segment sweeps the track and the line says "Uploading"; pass the number as soon as it is known and the fill takes over.
