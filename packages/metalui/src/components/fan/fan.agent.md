# Fan

A compact control bar for a toolbar that must stay small: it shows the current state, and each cell opens in place.

## Parts
- `Fan` (the bar, `aria-label` required): keeps which cell is open, one at a time; Escape or a press outside folds it and focus returns to the cell that opened it.
- `Fan.Label`: what the bar is about now, as a word ("Canvas", "Text", "3 selected") or, with `icon`, as a glyph cap whose children name it (tooltip and accessible name): `<Fan.Label icon={<PaletteIcon />}>Ink</Fan.Label>` while inking.
- `Fan.Picker`: the current choice. Pressing it unfolds every choice into a grid from behind the cap: each key grows out of the cap and travels to its cell on the part spring, nearest first (one `--mu-motion-fan-stagger` beat per ring of distance); folding goes back together. One row per `group` on the options, in order (ungrouped, rows of ⌈√n⌉); the cap's column is the grid's middle. `direction="up"` puts the rows above the cap (a bar at the bottom of the screen), `"both"` splits them above and below. The current choice sits latched (sunk, green LED) in its cell and takes focus on open; arrows move in two dimensions, down past the row nearest the cap returns to it; Enter picks.
- `Fan.Tray`: an options cap that stretches sideways into a capsule of more controls (any children: picks, separators, buttons); the set's `chevron`, turned to point the way the tray folds, ends it and folds it.
- The bar is a graphite toolbar to what it holds (`data-variant="graphite"`): `ToolbarSeparator` and the draw picks take their graphite look inside it.

## Rules
- Use it where a full strip does not fit or would crowd the canvas. Every option is one press away and in view once opened: never put options in a dropdown menu instead.
- The picker holds one kind of choice (tools). Group related ones so the grid stays three or four wide: place (select, write, region), freehand (pen, pencil, marker, eraser), shapes (line, arrow, rectangle, ellipse).
- The tray holds what goes with the current context (inks and widths while drawing; a selection's actions).
- The Ink tray explains itself: its cap is `<InkStroke ink={ink} width={width} />` (the stroke the pen will draw), and it holds `InkPicks`, a `ToolbarSeparator` and `WidthPicks`: two named groups ("Ink", "Width") whose picks are named in their tooltips ("Ink: red", "Width: fine"), the chosen ones latched in the strip's well, the widths drawn as strokes in the chosen ink.
- A selection's actions are glyph keys, not worded buttons: `<IconButton variant="tool" label="Export" title="Export" icon={<DownloadIcon />} />` (SwiftUI: `MetalIconButton("Export", icon: .download, variant: .tool)`). The name is the tooltip and the accessible name; the glyph plays its act on hover and press.
- Motion is the part spring; Reduce Motion keeps the layout and drops the travel.

## Example
```tsx
<Fan aria-label="Canvas tools">
  <Fan.Label icon={<PaletteIcon size={16} />}>Ink</Fan.Label>
  <Fan.Picker label="Tool" value={tool} options={TOOLS /* { value, label, icon, shortcut, group } */} onValueChange={setTool} />
  <Fan.Tray label="Ink and width" icon={<InkStroke ink={ink} width={width} />}>
    <InkPicks value={ink} onValueChange={setInk} />
    <ToolbarSeparator />
    <WidthPicks value={width} onValueChange={setWidth} ink={ink} />
  </Fan.Tray>
</Fan>
```
