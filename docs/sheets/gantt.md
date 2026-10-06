# Variation sheet: Gantt

From `docs/BACKLOG.md` § 5: "Gantt: day, week, month, quarter and year scales; drag to move, resize and create; summary bars that roll up; planned against actual (a ghost baseline); dependencies as finish-to-start arrows; milestones as diamonds; progress fills; side columns (owner, status); people rows with avatars; zoom, now line, off days, infinite scroll; time zones; right-to-left."

Now: nothing lays work out against dates. `Timeline` lists events in order (no lengths, no overlap), `Calendar` picks days, `Table` compares records, `Kanban` moves things between stages. A plan's tasks have a start, an end and a share done; the person moves them in time.

How this was made: the backlog's list (from DHTMLX Gantt, Bryntum, SVAR and Frappe Gantt), Microsoft Project, TeamGantt, Linear's and GitHub Projects' roadmaps and Apple's HIG on drag were read for the **jobs**; each job got our form, was marked covered, or was dropped with the reason. *Ours* marks ideas of our own.

## Where it sits (docs/COMPOSITION.md)

- **The chart is a Place.** It has area (time across, tasks down), it holds the person's things (each task is theirs), and you go into it to plan; it isn't a control that changes something else (Component fails) and it stays when you let go (Instrument fails). Its siblings are Kanban (stages) and Timeline (an Object: a record you read, not a space you arrange).
- **The bars are its own.** Unlike a Kanban card (the host's Card), a bar has no content of its own to give: its body *is* its dates. Gantt draws them (the raised plate, Progress's fill) rather than taking a slot, so a bar always means the same thing.
- **The drag is not Sortable's.** Sortable orders a list; a bar moves along a continuous axis that snaps to days. The press handling (threshold, the lift, the landing spring, Escape, the refusal) follows Sortable's and Kanban's rules; the code is a few lines of pointer capture.
- **The side column is Table's look.** The header row and the name column use Table's utilities (`table-sticky`, `table-pin`, `table-rule`, its head and row heights) without importing Table (96 KB): only the look is shared.

## Jobs

| Job (who asked) | Our form | Tier |
|---|---|---|
| **See the plan against dates** (every Gantt) | A sticky two-tier header (months over days, months over weeks, or years over months) above rows, one per task; engraved hairlines at each lower unit; a sticky name column on the start. One scroller, so the header, names and bars never drift apart. | Must |
| **Day, week and month scales** (backlog) | `scale="day" \| "week" \| "month"`: the width of a day (recipe `scale.*`) and the header's units change; bars keep their dates. | Must |
| **Quarter and year scales** (backlog) | Two more widths and headers (quarters over years, years). Real for multi-year roadmaps; month at 4 px a day already shows a year in a laptop's width. | Should |
| **Zoom** (DHTMLX, Bryntum) | Covered by the scale: the host puts a Switcher over it (the docs page does). Pinch and ⌘-wheel zoom between scales: Later. | Covered / Later |
| **Move a task in time** (backlog: drag to move) | Press the bar and move (4 px threshold): it lifts (raised plate, `lift.scale`) and follows the hand; its slot is the well's track recess, snapped to whole days, so you see where it lands; release and it lands into the slot on the object spring. Escape or a cancelled pointer puts it back. | Must |
| **Change how long it takes** (backlog: resize) | Its two ends are grips (an 8 px hit at each end, the resize cursor): drag one and that end snaps day by day, with the detent haptic each day. An end never passes the other (one day is the shortest task). | Must |
| **Do it without a pointer** (WCAG 2.1.1, 2.5.7) | Each bar is a focusable button named with its name, dates and share done. ← → move it a day; Shift ← → move its end (longer, shorter); Alt Shift ← → move its start; ↑ ↓ go to the bar above or below; Escape undoes the keys since the last save. Each step is said in a polite status: "Prints, 8 Oct to 14 Oct." | Must |
| **Save, and undo a failed save** (Kanban's contract) | `onTasksChange(next)` live; `onTasksCommit(next, previous)` once per drop, and once per burst of keys (after a pause, or when focus leaves). Return a promise: the chart is `aria-busy` and nothing lifts; a rejection puts the tasks back and says so; the host's toast says why. | Must |
| **A task that can't move** (a booked slot, someone else's) | `locked` on a task: it doesn't lift; trying shakes it once (refusal), the refusal haptic, and "Press check can't be moved." | Must |
| **How far along it is** (backlog: progress fills) | `progress` (0–100): Progress's slim well inside the bar with the on-look fill, so "done" looks the same as everywhere else; said with the dates. No progress, no well. | Must |
| **A date that matters** (backlog: milestones as diamonds) | `milestone: true`: a raised diamond on its day, the same plate as the bars. It moves (drag, ← →) but has no length to resize. | Must |
| **Where we are today** (backlog: now line) | The rule's groove down the chart at `today` (the hour too), with NOW in the readout type in the header, Timeline's now marker turned on its side. | Must |
| **What a bar's dates are while you move it** (*ours*) | A readout after the bar's end (meta type, tabular) shows its dates while held or focused by keys; hidden at rest. | Must |
| **Weekends and holidays** (backlog: off days) | A faint well wash under non-working days (`offDays`, weekends by default) in the day and week scales. Bars still cover them: working-day arithmetic is the host's schedule, not the picture. | Should |
| **Owner, status and other columns** (backlog: side columns) | `columns` beside the name, rendered with Table's cell kinds (`TableCell`: person, status, date). Imports TableCell, so it costs weight only when used. | Should |
| **Groups that roll up** (backlog: summary bars) | A task with children draws a summary bar (a bracket from the first child's start to the last child's end, its progress the children's weighted by length), folds with Tree's disclosure, and doesn't drag on its own. | Should |
| **What depends on what** (backlog: finish-to-start arrows) | `dependsOn: ['id']`: Connector's curve from the end of one bar to the start of the next, its arrowhead at the dependent; a move that breaks one turns the connector amber with "Starts before Design ends" (words, never colour alone). | Should |
| **Planned against actual** (backlog: ghost baseline) | `baseline: { start, end }`: a sunk track (the recess look) under the bar, offset half a step, so slipping shows as the bar off its ghost. | Should |
| **Make a task by drawing it** (backlog: drag to create) | Drag across an empty row's track: a recess grows day by day; release calls `onCreate({ row, start, end })`; the host adds the task. Needs empty rows, so it waits on people rows. | Should |
| **Follow the hand past the edge** (every Gantt) | Auto-scroll near the chart's edges while dragging, Kanban's rule. Keys already go anywhere. | Should |
| **Open at today** (*ours*) | Scroll so the now line sits a third in on mount and when the scale changes: at 32 px a day the plan is wider than the page. | Must |
| **Many tasks** (Bryntum) | Virtual rows (Table's window). A plan the person arranges by hand rarely passes a few hundred rows; rows are plain divs. | Later |
| **People rows with avatars** (backlog, resource view) | Rows by person (Avatar in the name cell), several bars to a row. A second model (bars per row, overlap) on top of tasks per row. | Later |
| **Infinite scroll in time** (backlog) | Extending `from`/`to` as the edge nears. The range covers the tasks plus a unit either side; a host can widen it with `from`/`to`. | Later |
| **Several bars at once** (Project) | Select and move a set. Sortable's and Kanban's Later too. | Later |
| **Right to left** (backlog) | Time running right to left. The library hasn't committed to RTL text (backlog: "Direction … only if the library commits"); when it does, the axis flips with it. | Later |
| **Time zones** (backlog) | Dropped: tasks are calendar days, not instants. A day-granular plan reads the same in every zone; hours-level scheduling is the Event calendar's job. | Dropped |
| **Critical path, auto-scheduling, resource levelling** (Project, Bryntum) | Dropped: a scheduling engine, the host's. The chart shows dates it's given. | Dropped |
| **Export to PDF, PNG, MS Project** (DHTMLX) | Dropped: the host's. | Dropped |

## Motion (one place per moment)

| Moment | What moves | Spring |
|---|---|---|
| lift | the bar rises to `lift.scale` with the raised plate's floating shadow; its slot shows the recess | surface |
| follow | the bar follows the hand by `translate`; the recess snaps day by day | – (the hand) |
| land | the bar travels from the hand into the recess | object |
| cancel | the dates go back; the bar travels home | object |
| resize | the end snaps a day at a time (the detent haptic); no travel | – |
| refuse (locked) | the bar shakes once | refusal |
| progress | the fill slides (Progress's) | settle |
| rollback | the dates go back (they snap, as keys do) | – |

Reduce Motion: no scale and no travel; the bar is followed by the hand and lands at once.

## Decide

- **Layer?** A Place (above). The bars are drawn by the chart, not a slot: a bar's look carries its meaning (dates, share done, milestone).
- **Data or compound parts?** Data (`tasks`), like Table and Timeline: every row is the same shape, and a compound `Gantt.Bar` would let a host break the axis. Side columns come as `columns` (Should).
- **Commit on every key?** No: a burst of arrows is one change. It commits after a short pause (`commit` in the recipe, 700 ms) or when focus leaves the bar; Escape before then undoes the burst.
- **What does a key step?** One day, at every scale: predictable and said out loud. Bigger steps (a week with Page Up/Down) are Later.
- **Live layout or transform while dragging?** The bar's box (`left`, `width`) follows the snapped dates, so the recess is honest and the header lines match; the bar itself rides the remainder by `translate` and lands on the object spring (transform only).
- **Range?** From the start of the unit before the earliest task to the end of the unit after the latest (`from`/`to` override). `today` is not folded in: a plan for next year shouldn't open on empty weeks.
- **Swift: same keys?** Yes on macOS (`onKeyPress`); VoiceOver gets an adjustable action (a day later or earlier) plus Longer and Shorter.

## Tiers

**Must**: day, week and month scales; the two-tier sticky header and sticky name column; bars with progress; milestones; drag to move with the lift, recess and landing; resize by either end; the keyboard path, announced in a polite status; `onTasksChange`, `onTasksCommit(next, previous)` with rollback; locked tasks; the now line; opening at today; the dates readout; Reduce Motion; SwiftUI `MetalGantt`.

**Should**: quarter and year scales; off days; side columns with TableCell; summary bars; dependency arrows with Connector; the planned ghost; drag to create; auto-scroll.

**Later**: virtual rows; people rows; infinite scroll; several at once; pinch and ⌘-wheel zoom; Page Up/Down by a week; right to left.

**Dropped**: time zones; scheduling engines; export.
