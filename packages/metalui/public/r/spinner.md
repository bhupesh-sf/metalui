# Spinner

Waiting, shown where it happens, with one clock. React: `Spinner`, `Spinner.Bar`, `Spinner.Status` and the `useWait` hook from `@unlocalhosted/metalui`. SwiftUI: `MetalSpinner`, `MetalSpinnerBar` and `.metalWait(_:into:)`. The `spinner` recipe holds the timing and every look; the ring reuses the button's wait arc (`button` recipe, `wait.*`) and draws the check glyph's tick.

## Where the wait is (pick the placement, not a widget)

| Where | What waits | How |
|---|---|---|
| On an action (a button, a key) | the key: held down, refusing presses; its glyph becomes the arc | `Button` `state`, from `useWait` (see below) |
| On a small item (row, chip, avatar) | a ring in the item's glyph slot; the rest of the item dims and refuses | `waiting={wait.busy}` on `Row` / `Chip`, `<Spinner phase={wait.phase}>` around the item's glyph; `Avatar` `waiting` waits on its rim |
| On a large item (card, image, panel) | the item's own edge: a light travels round its border; its words say what is happening | `Card` `waiting={wait.busy}`, your words in `Card.Description`, `Spinner.Status` beside it |
| In a field (search, combobox, validation) | a ring in the trailing slot, in place of the clear key | `{wait.showing ? <Spinner phase={wait.phase} /> : clearKey}` in `Field.Trail` |
| For the whole place (a page, a view) | first load: skeletons of what will arrive; a route change: a thin bar across the top, the old view kept and dimmed | `Skeleton.Swap loading={wait.busy}`; `<Spinner.Bar phase={wait.phase} />` in a positioned host |
| Background work (sync, upload) | the status lamp breathes; nothing is held | `<Led kind="waiting" gesture="breathe" />` while `wait.phase === 'shown'`, `live` + `flicker` when done, `failed` + `blink2` on failure, with words |
| Known amount | it fills instead of turning | `value` (0–100) on the ring or the bar; a card hands over to `Progress`; an `Attachment` takes `progress={null}` until the amount is known |

Never a spinner floating in the middle of a card or in a corner of the page.

## The clock: `useWait` (motion/wait.ts)

```tsx
const wait = useWait(work, ref?); // work: 'idle' | 'working' | 'done' | 'failed'
// wait.phase: 'idle' | 'quiet' | 'shown' | 'done' | 'failed'
// wait.busy: quiet or shown (hold the item, aria-busy)
// wait.showing: shown or done (the sign or its result is in the slot)
// wait.still: the work has run past `still` (say "Still …")
```

| Rule | Token (`--mu-r-spinner-self-*`) | Default |
|---|---|---|
| Show delay: nothing for fast work (`quiet`), then `shown` | `delay` | 400 ms |
| Once shown, at least this long on screen (no flash) | `minimum` | 600 ms |
| The result (`done`) stays this long, then `idle` on its own | `result` | 1400 ms |
| After this long, `still` is true | `still` | 8 s |

Work that ends inside the delay goes straight to its result: nothing, then the check. `failed` stays until the host moves on (it shows the failure in words and Try again). Pass `'idle'` instead of `'done'` when the result speaks for itself (a search's results). A `ref` makes the hook read the tokens where the host is, so a wrapper that sets them (a dense table, a docs panel) tunes every wait inside it. Combobox, Table and Card waits use this hook; don't write another timer.

The button: `state={wait.busy ? 'waiting' : wait.phase === 'done' ? 'done' : 'ready'}`, label `wait.phase === 'shown' ? 'Saving…' : wait.phase === 'done' ? 'Saved' : 'Save'` on `SwapText`, glyph a `MorphIcon` (`save` → `check`).

## Anatomy

- Ring: a 24-grid svg the host's glyph slot sizes (16, small 12 where the host has no size), `currentColor` (white on a primary key, ink2 in a row). The arc is the button's wait arc (r 8.5, stroke 1.9, 68 % of the ring). Known: a faint track (18 %) and a fill from twelve o'clock. Done: the check glyph's tick, drawn by a pen.
- Item: every direct part except the one holding the ring dims to 50 %; pointer events off.
- Rim (avatar): a 26 % arc on the avatar's ring, ink2, 1.6 s a turn.
- Edge (card): a 1.5 lit edge in the card's ink at 75 %, a 42 % comet tail, 2.8 s a lap; the card's border, not a box over it.
- Bar: 2 tall, the switch's lit fill, creeping to 86 % over 9 s (easing out, never arriving), completing in 260 ms and fading.

## States and motion

| Phase | Ring | Item | Bar |
|---|---|---|---|
| idle | the item's glyph | as it is | hidden |
| quiet | the glyph | held, dimmed, aria-busy | hidden |
| shown | glyph fades out (160 ms), arc fades in and turns (900 ms a turn, linear) | held, dimmed | creeps |
| known | the fill grows on the settle spring | held | scales to the value |
| done | arc fades, the tick draws (280 ms), after `result` the glyph returns | back | completes, fades |
| failed | the glyph (pass `sync-error` through a `MorphIcon`) | back; the host says why, with Try again | hidden |

A bare `<Spinner />` (no `phase`) shows itself after the show delay on mount: for code that can't use the hook.

Reduce Motion: nothing turns, creeps or travels; the arc, rim, edge and bar breathe in place (the progress breathe); the tick is whole at once.

## API

| React | SwiftUI |
|---|---|
| `Spinner` `phase` (from `useWait`) | `phase:` (`MetalWaitPhase`) |
| `value` (0–100, or null) | `value:` |
| `label` ("Loading"), `result` ("Done") | `label:`, `result:` |
| `size` (`regular` 16, `small` 12) | `size:` |
| children: the glyph it stands in for | `glyph:` view builder |
| `Spinner.Bar` `phase`, `value`, `label` | `MetalSpinnerBar(phase:value:)` |
| `Spinner.Status` `phase`, `label`, `result` | (the ring says it; `.accessibilityValue` on hosts) |
| `useWait(work, ref?)` | `.metalWait(work, into: $wait)` |
| `Row` / `Chip` / `Avatar` / `Card` `waiting` | `waiting:` on `MetalRow`, `MetalChip`, `MetalAvatar`, `MetalCard` |

```tsx
const [work, setWork] = React.useState<WaitWork>('idle');
const wait = useWait(work);

<Row variant="option" waiting={wait.busy}>
  <Spinner phase={wait.phase} label="Archiving notes.pdf" result="Archived notes.pdf">
    <MorphIcon name={wait.phase === 'failed' ? 'sync-error' : 'document'} />
  </Spinner>
  <Row.Text>notes.pdf</Row.Text>
</Row>
```

## Keyboard and accessibility

- `aria-busy` on the waiting thing (the hosts set it from `waiting`). A polite status says `label` when the sign shows and `result` when it is done, nothing in between: the ring carries one; a host whose sign is its own (card, avatar, lamp, bar) mounts `Spinner.Status` beside it, before the work starts. Keep it out of a button's content (it would join the button's name).
- With `value` the ring is a `progressbar` with `aria-valuenow`. A bare ring is a named `status`.
- A failure is said by the host, in words, with Try again; colour and glyph never carry it alone.

## Rules

- Put the wait where it is; one sign per wait (a waiting card's footer button is disabled, not spinning too).
- Constant speed: never ease or spring a turn.
- Measure when you can: switch to filling as soon as the amount is known.
- Say what is working ("Lifting the subject…"), and more after a long wait ("Still lifting…").
- Don't restyle the ring's colour: it is the slot's ink.
