# Gantt

A plan laid out against dates: tasks down, days across, moved and resized by hand or by keys. React: `Gantt` from `@unlocalhosted/metalui`. SwiftUI: `MetalGantt`. It is a **place**: it has area and holds the person's tasks. The bars are its own (their look is their dates); the side column has Table's look; progress is Progress's well and fill. The `gantt` recipe holds its numbers. Sheet: `docs/sheets/gantt.md`.

## Use it for

- A plan with lengths: a production schedule, a launch, a renovation, a course of study.
- Moving work in time and seeing what overlaps today.

## Don't use it for

- Work that moves through stages, not dates: `Kanban`.
- A record of what happened, in order: `Timeline`.
- Picking a day or a range: `Calendar`, `DatePicker`.
- Hours in a day, or people's calendars: the Event calendar (backlog).

## Anatomy

- The chart: one scroller (give it a height, `className="h-[420px]"`), a `group` named by `aria-label`.
- The header, two tiers of Table's head height on the opaque frost, sticky at the top: months over days (`scale="day"`), months over weeks (`"week"`), years over months (`"month"`), in the readout type; a label stays in view while its unit runs. The corner says `nameLabel` ("Task").
- The name column, `self.side` (200) wide, sticky on the start, Table's row height and row rule.
- A hairline starts each lower unit and runs down the chart.
- A bar: `bar.height` (22), a pill on the small raised plate. With `progress`, Progress's well (the switch's track, `bar.track` 4 tall, `bar.inset` 9 in) and its on-look fill. Its ends are `bar.edge` (8) grips.
- A milestone: the same plate as a diamond, `milestone.size` (18), centred on its day.
- Today: a hairline in ink3 with NOW in the readout type.
- The dates readout, after a bar's end while held or focused by keys: "Oct 6 – Oct 10".

## States and motion

| Moment | What happens | Spring |
|---|---|---|
| rest | bars on their rows; the grab cursor on a bar, the resize cursor on its ends | – |
| lift (move 4) | the bar rises to `lift.scale` with the floating shadow; its slot is the recess (the well's track) | surface |
| move | the bar follows the hand by `translate`; the recess and the bar's dates snap a day at a time (the detent haptic) | – |
| drop (release) | the bar travels into the recess | object |
| cancel (Escape, or the system cancels the pointer) | the dates go back; the bar travels home | object |
| resize (an end) | that end moves a day at a time; it never passes the other (a day is the shortest) | – |
| keys | the bar jumps a day per press; the readout shows its dates | – |
| saving (`onTasksCommit` returned a promise) | `aria-busy`; nothing lifts, keys do nothing | – |
| failed (the promise rejected) | the dates go back; "Couldn’t save. Layout is back at Oct 3 to Oct 12." | – |
| locked | it doesn't lift or step: it shakes once and says so (the refusal haptic) | refusal |

Reduce Motion: no scale and no travel (the travel tokens); the hand is still followed. Haptics where the platform has them: alignment on lift, a detent per day, refusal on a locked bar.

## API

| React `Gantt` | SwiftUI `MetalGantt` |
|---|---|
| `tasks: GanttTask[]` (`id`, `name`, `start`, `end` (included), `progress` 0–100, `milestone`, `locked`) | `tasks: Binding<[MetalGanttTask]>` (the same fields) |
| `onTasksChange(next)`: live while moving, on Escape and on rollback | the binding |
| `onTasksCommit(next, previous)`: once per drop and once per burst of keys; return a promise; reject to roll back | `onCommit: ([Task], [Task]) async throws -> Void` |
| `scale`: `'day' \| 'week' \| 'month'` (week) | `scale: .day / .week / .month` |
| `today` (the now line; the hour counts) | `today:` |
| `from`, `to` (a unit beyond the tasks either side by default) | `from:`, `to:` |
| `nameLabel` ("Task"), `locale`, `disabled`, `words` | `nameLabel:`, `disabled:` |

```tsx
const toast = useToast(); // under a ToastProvider
const [tasks, setTasks] = React.useState<GanttTask[]>(plan);
<Gantt
  aria-label="Autumn catalogue"
  tasks={tasks}
  onTasksChange={setTasks}
  onTasksCommit={async (next) => {
    try { await save(next); }
    catch (e) { toast.show({ title: 'Couldn’t move it', tone: 'error' }); throw e; } // throwing rolls back
  }}
  scale="week"
/>
```

```swift
MetalGantt($tasks, label: "Autumn catalogue", scale: .week) { next, previous in try await store.save(next) }
```

## Keyboard and accessibility

- Each bar is a focusable `button` (`aria-roledescription="task"`) named "Layout, Oct 3 to Oct 12, 55% done" (a milestone: "Proofs to client, milestone, Oct 16") and described by the instructions.
- ← → move it a day; Shift ← → move its end; Alt Shift ← → move its start; ↑ ↓ go to the bar above or below. Each step is said in a polite status: "Layout, Oct 4 to Oct 13."
- A burst of keys commits once, after `self.commit` (700 ms) without a key or when focus leaves the bar; Escape before then puts the burst back.
- The header, the hairlines and the names are hidden from assistive tech: the bar's name says its row and dates.
- SwiftUI: VoiceOver adjusts a bar a day later or earlier (swipe up and down), and has Longer and Shorter actions; on macOS the focused bar takes the same keys as the web.

## Rules

- **Show where it lands.** While held, the bar's slot snapped to whole days is the recess; the bar rides the rest of the way by `translate`.
- **One save per gesture.** A drop commits once; a burst of keys commits once.
- **A failed save goes back.** Reject from `onTasksCommit`; the host says it in a toast.
- **Days, not instants.** `start` and `end` are calendar days (the time is ignored), so a plan reads the same in every time zone.
- **Only transform and opacity move.** Bars follow and land by `translate` and `scale`; the lift's shadow fades.

## Left (see the sheet)

Should: quarter and year scales, off days, side columns (TableCell), summary bars, dependency arrows (Connector), the planned ghost, drag to create, auto-scroll while dragging. Later: virtual rows, people rows, infinite scroll, several at once, zoom gestures, right to left. SwiftUI: the header scrolls with the rows (not sticky) and the name column doesn't stick sideways.
