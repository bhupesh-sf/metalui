### Timeline

From "Components other libraries ship that we don't" § 5: a vertical list of events in order (ReUI Timeline, shadcn timeline blocks, Mantine Timeline, Ant Design Timeline, GitHub's activity feed and checks list, Vercel's deployments, Shopify's order timeline, Linear's issue history).

Now: nothing. Three neighbours do part of the job and must not be duplicated:

- **`Stepper`** is a flow you move through: you press a step, Back and Continue, and the panel changes. Its "done" means *you* finished it. A timeline is not operated: nothing in it is a step you go to, and its events happen whether or not anyone is looking (a parcel moves, a build runs).
- **`Table` `live`** holds records you compare across columns and sort; new rows land at the top. A timeline is one story whose order *is* time, read top to bottom; there is nothing to sort, and each event has a place on a rail between what came before and what comes next.
- **`TimeScrubber` / Past banner** is a place you go into to see the canvas as it was. A timeline doesn't take you anywhere; it is the record itself.

So: a timeline is a record of what happened (and what is planned), in order, with where things stand now.

Read for jobs: ReUI Timeline, Mantine Timeline, Ant Design Timeline (pending, colours, label left, alternate), MUI Lab Timeline (opposite content, alternate), Carbon's "progress indicator" (vertical), GitHub's commit list and checks, GitLab pipelines, Vercel deployments, Shopify and Amazon order tracking, Linear's issue activity.

**Place (docs/COMPOSITION.md): an Object.** It stands for something of the person's (an order's history, a pipeline run, a deploy log, a roadmap) and it stays (Object holds). You don't operate it to change something else (Component fails: nothing in it is pressed), it isn't drawn only while you act (Instrument fails), and you don't go into it (Place fails). Its sibling is `Table`, the other record you read down, which is an Object too.

**Semantics.** An ordered list (`<ol>`, named by the host): the order means something. Each event is a list item whose state is said in words to assistive tech ("failed", "waiting", "running", "now", "planned"); the time is said exactly (the relative words are for the eye). No roles beyond the list: `feed` is for an endless scroll of articles you page through with keys, and a timeline is short and static between arrivals. Nothing is focusable unless the host puts a link in an event. New events arriving after the first render are said once, politely ("Shipped, now").

**Jobs**

| Job | Where | Our form | Tier |
|---|---|---|---|
| Read what happened, in order | every timeline | an ordered list of events: a node on an engraved rail (the rule's groove, as Tree's guides), then the title (ui type, ink) and an optional line (meta type, ink2) | Must |
| See which event is now | an order out for delivery, the step a pipeline is on | `state="live"`: the node is the green lamp, and the visible word "Now" sits with the time. Colour never alone | Must |
| See what failed | a CI step, a failed deploy | `state="failed"`: the red lamp and the word "Failed". It blinks twice (the LED's failure gesture) when an event *turns* failed while you watch, never on load | Must |
| See what waits on someone | an approval, a queued job, a parcel held at customs | `state="waiting"`: the amber lamp, steady, and the word "Waiting" | Must |
| See what is running | a CI step, a deploy rolling out | `state="running"`: the node gives way to the Spinner's ring after the show delay (`useWait`: nothing for fast work, a minimum once shown, the tick when it ends), the word "Running" | Must |
| The past | events behind you | `state="done"` (the default): the off lamp, a dull lens. Nothing said: past is what a record is | Must |
| What is planned | a roadmap, an expected delivery | `state="planned"`: the off lamp, the words in ink3, said "planned" | Must |
| Where the past meets the plan | a roadmap, "expected Thursday" | the **now marker**: where events turn from not planned to planned, a hairline tick crosses the rail and the word "Now" in the readout's ink runs into an engraved rule across the row. Drawn by the component from the states, so it can't sit in the wrong place | Must |
| When it happened | every event | `time`: relative ("2 h ago", "in 3 d") in tabular figures, the exact time in a tooltip and said to readers; `format` `date`, `time`, `datetime` for a fixed time (an order's "6 Oct, 14:32"). `now` sets the clock relative times count from (Table's rule; no clock ticks at rest) | Must |
| Dates on the left (ReUI, MUI "opposite") | a deploy log, a changelog | `timeSide="start"`: the times stand in a column before the rail, end-aligned, so the rail stays straight however long the dates are | Must |
| How long it took | CI steps, deploys | `duration` (ms): "42 s", "1:12" in tabular figures before the time | Should |
| Custom indicators or icons (ReUI, Mantine "bullet") | git activity (commit, merge, comment), an activity feed | `glyph`: the host's glyph (an element: the set's `<CommitIcon />`, an `Avatar`) in a 24 sunk well on the rail (the switch's well, the stepper's upcoming indicator), with the state's lamp on its corner (the tool button's corner lamp) for live, waiting and failed. One column width either way, so mixed events keep one rail | Must |
| New events arrive | an activity feed, a pipeline as it runs | `useRowMotion`: a new event lands one nest from above on the object spring, fading in; the others glide to make room on the settle spring. A lamp that turns live flickers once (the LED's activity burst) | Must |
| Out of width | a sidebar, a phone | under 360 px (a container query on the list) the time moves under the title, so titles never truncate beside a date column | Should |
| An active step (ReUI) | "the step we're on" | covered by `live` and the now marker; a separate "active" index would say it twice | covered |
| A colour per event (Ant, Mantine) | "blue for info" | covered by the LED meanings: green live, amber waiting, red failed; anything else is a glyph. Never a fifth colour | covered |
| A line under the title (ReUI "description") | every timeline | `description` | covered (Must row 1) |
| Links and actions in an event | "View commit", "Retry" | covered: `title` and `description` take nodes; the host puts a `Link` or a `Button` there. The event itself is not pressable | covered |
| Avatars as indicators | git activity, comments | covered by `glyph` (an `Avatar` at small size) | covered |
| Grouped by day ("Today", "Yesterday") | an activity feed | Later: a group heading row on the rail; needs a real feed long enough to want it | Later |
| "Show N earlier events" | a long issue history | Later: a fold in the rail that opens in place (Collapsible's reveal) | Later |
| Horizontal, indicators above or below (ReUI) | a roadmap across a wide header | Later: across a page the labels collide and scroll sideways; `Progress` `steps` or `Stepper` say "how far" in a row today. Build it when a real roadmap screen asks | Later |
| Compact size | a dense sidebar feed | Later: one regular size (the 32 row); compact 28 when a screen asks | Later |
| Alternating sides (MUI, Ant "alternate") | a marketing "our story" page | dropped: it halves the reading width, makes the eye zig-zag, and says nothing a single column doesn't. Decoration, not a job | dropped |
| A custom "pending" dot at the end (Ant) | "Recording…" | dropped: that is `running` or `waiting` on the last event | dropped |
| Reverse order prop (Ant `reverse`) | newest first | dropped: the host passes events in the order it wants read; newest first and oldest first both work, and the now marker follows the states | dropped |

Not doing: buttons for events (a record isn't operated; Stepper is the one you press); a lit fill along the rail up to now (that is the stepper's groove and Progress's bar; here the now marker says it once); a fifth lamp colour.

**Decide**

- **Object or Component?** Object. Nothing in it changes something else; it stands for the person's order, pipeline or history and stays, as `Table` does.
- **Who places the now marker?** The component, from the states: between the last event that isn't `planned` and the first that is (in either order). A `now` index from the host could disagree with the states; one source per fact.
- **Waiting or running?** Two states. `waiting` is held on someone or something else (amber, still); `running` is work in progress (the Spinner's ring on `useWait`). A queued CI job waits; a building one runs.
- **Does a failed lamp blink on load?** No. The blink is news: only when an event turns failed while on screen. A page that opens on a failed build shows a steady red lamp and the word.
- **Visible state words?** Yes for now, running, waiting and failed, beside the time in ink2; none for done and planned (the past is the default, and planned is said by the now marker and ink3). Colour never alone, and a reader of a long record shouldn't have to decode lamps.
- **Relative time and the clock.** Relative words count from `now` (default: the render). Nothing ticks at rest; a host that keeps a clock passes `now`. Exact time in the tooltip and to readers.
- **Glyphs.** The host passes an element (performance rule 11: never a name, which ships the catalog). The glyph sits in the sunk well; the state's lamp moves to its corner.
- **Reuse.** The rail is the rule's groove; the lamps are LEDs with their gestures; the glyph well is the switch's well; the ring is the Spinner on `useWait`; the arrival is `useRowMotion`; the exact time is the Tooltip. The `timeline` recipe holds only sizes and the rail's layout.

**Must**
- [ ] React: `Timeline` (`events`, `aria-label`, `format`, `now`, `timeSide`) with `TimelineEvent` `{ id, title, description, time, state, glyph }`.
- [ ] States: done, live, running, waiting, failed, planned; the now marker; gestures only on change.
- [ ] Arrival with `useRowMotion`; a polite status for events that arrive.
- [ ] SwiftUI `MetalTimeline` with the same states, glyphs, now marker and both time sides.
- [ ] Recipe `timeline`, agent guide, meta.json, the page with its DialKit panel, the e2e slice.

**Should**
- [ ] `duration`.
- [ ] Out of width: the time under the title.

**Later**
- [ ] Day groups.
- [ ] A fold for earlier events.
- [ ] Horizontal.
- [ ] Compact size.
