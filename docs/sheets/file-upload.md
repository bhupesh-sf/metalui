### File upload layouts (DropZone and Attachment)

From "Extend what exists": "DropZone and Attachment → file upload layouts: an avatar upload (one image with a preview); a compact row with thumbnails and a count; a gallery grid with a preview dialog; a table of files with round progress; image tiles with their own progress; drag to reorder (needs Sortable); retry on failure (ours has it)."

Now: `DropZone` (a Place: a sunk tray that arms, sinks, refuses and comes back up; compact for a composer) and `Attachment` (an Object: a 52 raised plate with the extension engraved in a 36 well, a thin track while uploading, the reason and Try again when it fails, the land and the leave). Both SwiftUI files are placeholders. Nothing shows a picture of an image file, nothing is square, and no page shows how the two are laid out together beyond a list under a tray.

Read for jobs: ReUI's file upload set (avatar, compact, gallery, table, image grid, sortable, progress), shadcn's dropzone examples, Uppy's dashboard, Filepond, Apple Mail's and Messages' attachment rows, Photos' import grid, Notion's and Linear's attachment rows, Dropbox's upload table.

**Place (docs/COMPOSITION.md): no new thing.** Every layout above is a *place* that took files (DropZone) next to *the files it took* (Attachments), arranged by a host: a list, a row, a grid, a table. A layout has no job of its own the person operates and no body of its own; it is composition. So the layouts are documented patterns on the two pages, built only from parts that exist, and the only new code is what one of the two lacks to stand in a layout: a picture of the file, and a square form for a grid. No `FileUpload` mega-component: its props would be the union of five layouts, and every host would fight the one it didn't choose.

**Blocks or page sections?** Page sections. A block is a whole screen (Settings, Share panel); these are each a dozen lines around two components. They live on the Attachment page ("Layouts"), and the avatar upload on the Drop zone page, where its question ("one image?") is asked.

**Jobs**

| Job | Where | Our form | Tier |
|---|---|---|---|
| See which image you attached (ReUI thumbnails, Mail, Messages) | a row of attachments | `preview` on Attachment: the image fills the 36 type well, cut to its radius, instead of the extension. It fades in over the extension when it loads (the avatar photo's fade); a broken one never shows | Must |
| Images as tiles, each with its own progress (ReUI image grid, Photos import) | a gallery, an image field | `kind="tile"` on Attachment: a square raised plate with the picture in a sunk window (or the extension engraved large when there is no picture), the name and size under it. Uploading, the picture dims and a raised disc in the middle holds Progress's ring (`shape="ring"`), which turns while the amount is unknown and fills once it is known | Must |
| Retry on failure (ReUI, "ours has it") | every layout | covered on the row (the reason in red, Try again); the tile says the reason under it in red and its disc becomes a `retry` key ("Try again Receipt.png") | Must |
| Remove a tile | every grid | the mini remove key on the tile's corner, as on the row; the tile leaves as rows do (T9) | Must |
| Look at an image bigger before sending (ReUI gallery preview) | a gallery | `onOpen` on a tile: a click on the picture opens it, and a mini `zoom-in` key ("Open Receipt.png") on its corner is the keyboard and assistive path. The host shows it in a `Dialog`; the page shows the pattern | Must |
| Put files in order (ReUI sortable) | a gallery, a listing photo set, slides | `Sortable` around tiles (`orientation="grid"`) or rows (vertical). Nothing new: the picture is not a control, so a drag starts on it, a click without moving still opens, and Sortable swallows the click that ends a drag | Must |
| A compact row with thumbnails and a count (ReUI compact, a composer) | a message composer | pattern: `DropZone compact` with a horizontal row of compact tiles (52, the row's height, picture only) under it, the first four and a `+N` readout well for the rest, and the count and total size said on one line ("6 files · 14 MB") | Must |
| A table of files with round progress (ReUI table, Dropbox) | many files, uploads to watch | pattern: `Table` with a `cell` that puts Progress's compact ring beside the words ("Uploading · 40 %", "Failed: too large"); Try again and Remove as the table's row `actions`. No new kind on Table: a `progress` kind exists for shares and is a meter, not a task | Must |
| One image with a preview (ReUI avatar upload, every profile form) | a profile, a workspace icon | pattern on the Drop zone page: a large `Avatar` showing the chosen picture (an object URL) at once, waiting (`useWait`'s `busy` on Avatar `waiting`) while it uploads, beside a `DropZone compact` that takes one image (`multiple={false}`, `accept="image/*"`). Remove puts the initials back | Must |
| Several sizes of tile (ReUI sm / lg) | dense rows vs a gallery | regular (fills its grid column, square, with a caption) and `compact` (52 square, no caption; the name is its label and title), a boolean as on DropZone (`size` is already the file's bytes). Not the field ladder: a tile is never level with a field | Must |
| Reduce Motion | every layout | the tile lands and leaves at once (as the row does); the picture's fade stays; the ring still fills | Must |
| SwiftUI | – | `MetalAttachment` gains `preview:` (an `Image`) and `.tile` kind with the ring; still marked work in progress (the plate's land and leave are the row's open item) | Must |
| Paste or capture an image (Messages, Linear) | a composer | Later: a paste handler is the host's (it calls the same `onFiles`); the page could show it | Later |
| Crop the avatar before upload (ReUI avatar crop) | profile | Later: a crop is an editor with its own handles (an Instrument) and needs its own sheet | Later |
| A whole-window drop (Uppy dashboard) | an app | dropped: the drop zone's guide already says a canvas or window handles the drop itself | dropped |
| A file-type colour per tile (Filepond's coloured badges) | | dropped: colour standing for a kind; the engraved extension says it | dropped |
| An upload queue with pause and resume per file (Uppy) | large uploads | dropped here: Progress's `paused` state exists; a host passes it in a table cell. No second control per tile | dropped |

*ours*: the tile's picture sits *in* a sunk window cut in the raised plate, like a slide in a mount, so the image never reads as a flat rectangle pasted on the page, and the same window holds the engraved extension when there is no picture. The uploading disc is the glass button's raised disc (the key you would press to retry), so the failure is the same disc turning from a ring into a key.

**Decide**

- **New component or props?** Props on Attachment (`preview`, `kind="tile"`, `compact`, `onOpen`) and patterns on the pages. DropZone needs nothing new: every layout uses it as it is (the avatar uses `compact` and `multiple={false}`).
- **Round progress: Attachment's own ring or Progress?** Progress's `shape="ring"` (the Spinner's ring with a value): one ring in the library. Attachment now imports Progress for the tile, and the table pattern uses it in a cell.
- **How do you open a tile that can be dragged?** The picture opens on click (not a `button`, so Sortable can lift from it; its click after a drag is swallowed), and the mini `zoom-in` key is the real control for keys and readers. Space and Enter on the tile itself stay Sortable's (lift).
- **Where does the count go in the compact row?** A `+N` readout well after four tiles (the badge's job, in the tile's footprint so the row stays one height), plus the count and size in a meta line. Four, because four compact tiles and the well fit a composer 360 wide.
- **Avatar upload: Avatar with a hidden input, or Avatar beside a compact DropZone?** Beside a compact DropZone: dropping onto it works, the picker is a real file input, refusals come for free, and the avatar shows the result. The drop zone guide's "Don't use it for: one image" becomes this pattern.

**Must**
- [x] Attachment `preview` (row and tile), `kind="tile"`, `compact`, `onOpen`; the tile's ring, failed key and caption.
- [x] SwiftUI `MetalAttachment` `preview:`, `kind: .tile`, `compact:`, `retry:`, `remove:`, `open:`.
- [x] Recipe `attachment` props for the tile; the agent guides (attachment and drop zone).
- [x] Pages: the Attachment page's "Layouts" (tiles, gallery with preview and reorder, composer row, table of files); the Drop zone page's avatar upload.
- [x] e2e slices: tiles, gallery preview, reorder by keys, composer count, table ring, avatar upload; both colorways and Reduce Motion.

**Later**
- [ ] Paste an image into a composer.
- [ ] Avatar crop.

- Done (2026-10-06): the Must tier. Decisions while building: the tile size is a `compact` boolean, because `size` already means bytes; the well's inset shade is drawn again over a picture (`attachment-window`), or the picture covers it and reads pasted on; the page's simulated uploads tick only while something uploads. Swift captures in `docs/captures/swift/attachment-tiles-*`, web slices in `e2e/file-upload.spec.ts`. Left: the Later tier; Swift's row still has no raised plate, land or leave (the old WIP note), and Swift's tile opens on tap without the web's zoom-in cursor.
