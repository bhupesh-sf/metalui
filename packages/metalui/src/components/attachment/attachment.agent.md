# Attachment

A file someone attached. React: `Attachment` from `@unlocalhosted/metalui` (named so it never shadows the browser's `File`). SwiftUI: `MetalAttachment` (work in progress). An object: the plate is the raised `surface`, the type sits in a `well`, the upload uses the progress fill; the `attachment` recipe adds the layout and the land and leave.

## Use it for

- Files attached to a note, a message or a form: before, during and after upload.

## Don't use it for

- Browsing files (use a table or a list of cards), or links (use a link card).

## Anatomy

- Plate: raised, 52 tall, filling its column from 240 to 360 wide (a list shares one width), radius 14, padding 8.
- Type: a 36 sunk well with the extension engraved (PDF, PNG).
- Name: ui type; a long name keeps its extension and cuts the middle.
- Line: meta type, ink3: the size, "Uploading · 40 %", or the error in red.
- Track (uploading): 3 tall, the progress fill. Try again (failed), Remove (a mini key).

## States and motion

| State | Look | Motion |
|---|---|---|
| added | the plate | lands from one nest above on the object spring (T5b) |
| uploading | the track fills; the line counts | settle spring |
| done | the size | – |
| failed | the reason in red; Try again | announced once |
| removed | – | one nest down, fading, on the release spring (T9); then gone |

Reduce Motion: it appears and goes at once; the fill still moves.

## API

| React | SwiftUI |
|---|---|
| `name`, `size` (bytes) | `name:`, `size:` |
| `progress` (0–100 while uploading) | `progress:` |
| `error`, `onRetry` | `error:`, `retry:` |
| `onRemove` (called after it has left) | `remove:` |
| `fill` (no max width: a list as wide as its panel) | `.frame(maxWidth: .infinity)` |

## Keyboard and accessibility

- A `group` named by the file name. The progress is a named `progressbar`; a failure is an `alert`. Remove is a button named "Remove report.pdf"; move focus to a neighbour after removing.

## Rules

- Say why an upload failed in a few words ("Too large, 25 MB at most"), and offer to try again.
- Keep the extension visible; cut the middle of long names.

## Waiting

- `progress={null}` while uploading before the amount is known: a lit segment sweeps the track and the line says "Uploading"; pass the number as soon as it is known and the fill takes over.
