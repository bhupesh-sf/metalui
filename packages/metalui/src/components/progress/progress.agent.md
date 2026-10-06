# Progress

How far a task has come. React: `Progress` from `@unlocalhosted/metalui`, on Base UI Progress. SwiftUI: `MetalProgress`. The track and fill are the `switch` recipe's sunk track and green on look; the `progress` recipe adds the sizes, the head, the failed ink and the motion. The ring is the Spinner's ring with a value (one ring, not a fork).

## Use it for

- A task that takes more than a moment and whose end you can see or estimate: an upload, an export, a sync.
- `value={null}` when the amount is unknown but something is happening.
- Known steps (a setup, a wizard): `steps={4}`, `value` counts the steps done.
- Media: `buffer` for how much is loaded ahead of the playhead.

## Don't use it for

- A level or a measurement that is not a task (use Meter), or a wait under a second (show nothing; Button `state` and Spinner cover short waits).

## Anatomy

- Head (bar only): a glyph (`icon`, 16; 14 compact, ink2), the label (ui type; meta when compact), and at the right the value (`showValue`, tabular) or `detail` ("8 of 12 · about 20 s"). Both turn on the drum.
- Track: a pill well, 8 tall (6 compact, 3 slim), at least 160 wide; `steps` splits it into one well per step, 3 apart.
- Fill: the switch's green on look, a whole pill slid in from the start (translate), so its leading edge is always round. Buffer: the same look at 40 % ahead of it.

## States and motion

| State | Look | Motion |
|---|---|---|
| running | the fill reaches the value | rising: the edge moves on the settle spring, never past the value; falling (reset, cancel): it drains on the release spring |
| unknown (`value={null}`) | a short lit segment (32 % of the track) | sweeps across and loops, 1.4 s ease-in-out |
| paused | the fill holds and dims to 45 % | fade |
| failed | the fill stops where it was in the failed ink (red) | cross-fade |
| complete | full | the fill lands first; then the head shows the glyph and label you passed for complete (held until then) |
| cancelled | (a value of 0 while running) | drains back on the release spring |

Reduce Motion: the edge snaps; the unknown segment sits in the middle and breathes (opacity); fades stay.

## Shapes and sizes

- `shape="bar"` (default): head + track.
- `shape="slim"`: no head (the label still names it), 3 tall, along an edge: under a toolbar, along a card's bottom edge (`absolute inset-x-0 bottom-0`).
- `shape="ring"`: the Spinner's ring in the host's ink, 16 (12 compact): it turns while unknown, fills once known, turns red on failure, dims when paused, and draws the check's tick once complete lands. Put it in a key's `icon` slot or beside an avatar.
- `steps={n}`: segmented; with `showValue` the head says "Step 2 of 4" (and so does aria-valuetext).
- `buffer={n}`: buffered, on the same scale as `value`.
- `size="compact"` for a row or a toast; `regular` for a dialog or a page.

## API

| React | SwiftUI |
|---|---|
| `value` (number or `null`), `min`, `max` (100, or `steps`) | `value:` (`Double?`), `total:` |
| `label`, `icon` (a node: pass a MorphIcon) | `_ label`, `icon:` (`MetalIconName`; complete shows check, failed sync-error) |
| `showValue`, `detail` | `showValue:`, `detail:` |
| `state`: `running` · `paused` · `failed` · `complete` | `state:` |
| `shape`: `bar` · `slim` · `ring`; `steps`; `buffer` | `shape:`, `steps:`, `buffer:` |
| `size`: `regular` · `compact` | `size:` |
| `format` (Intl.NumberFormat options for the value) | – |
| `Progress.Root` with your own `Progress.Label`, `Progress.Value`, `Progress.Track` | – |

## Recipes

```tsx
// An export: the key turns to Cancel while it runs; Reset drains to 0 %.
<Progress value={pct} state={done ? 'complete' : 'running'} label={done ? 'Exported 12 photos' : 'Exporting 12 photos'}
  icon={<MorphIcon name={done ? 'check' : 'download'} />} showValue />
<Button icon={<MorphIcon name={running ? 'close' : 'download'} />} onClick={running ? cancel : run}>
  <SwapText value={running ? 'Cancel' : 'Run export'} />
</Button>

// Failed: the words and the action say it, not only the red.
<Progress value={pct} state="failed" icon={<MorphIcon name="sync-error" />} label="Couldn’t export: the disk is full" />
<Button size="compact" icon={<MorphIcon name="retry" />}>Try again</Button>
```

## Keyboard and accessibility

- A `progressbar` with aria-valuenow (absent when unknown); steps add aria-valuetext "Step 2 of 4". The label names it (on slim and ring it is visually hidden); give `aria-label` when there is no label.
- It takes no focus. Say when it is done somewhere that is announced (a toast); a ring that completes says its label once.
- Never let red alone say it failed: change the glyph and the words, and offer Try again.

## Rules

- The fill never moves backward unless the task really did (reset, cancel, a real rollback); when it does, it drains, never jumps.
- Say what is in progress in the label, not "Loading…"; when you can count, say so in `detail`.
- Only `transform` and `opacity` animate: the fill slides, the failed ink and the pause fade.
