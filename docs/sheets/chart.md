### Chart

From "Components other libraries ship that we don't" § 5: bar, line and area charts with axes and tooltips (shadcn Chart on Recharts, Tremor, Mantine Charts, Ant Design Charts, Apple's Swift Charts, Grafana and Stripe's dashboards, Vercel's usage page, Linear's insights).

Now: two small cases and no chart. They stay what they are:

- **`Sparkline`** is a Part: a trend with no axes, no figures and no job of its own, set inside a row or a pinned summary. You read its shape, never a value off it. A chart is what you open when the shape raises a question ("what was it on Tuesday?").
- **`Meter`** is a level in a range, one value, now. A chart is many values over a category or time.
- **`Table`** holds the same numbers as rows you compare down and sort. A chart shows their shape; its accessible alternative *is* a table in Table's cell look.

So: a chart is a picture of a person's numbers that you read a value off.

Read for jobs: shadcn Chart (bar, line, area, stacked, interactive legend, tooltip variants), Tremor (BarChart, AreaChart, LineChart, empty state), Mantine Charts, Apple's Human Interface Guidelines "Charts" and Audio Graphs, Swift Charts, Highcharts' accessibility module, the W3C WAI "complex images" tutorial, Stripe's and Vercel's usage dashboards.

**Place (docs/COMPOSITION.md): an Object.** It stands for the person's numbers (their storage this month, their sales by region) and it stays on the page (Object holds: you could pin it, put it in a card, keep it). You don't operate it to change something else (Component fails: pointing at it moves a readout *inside* it, it changes nothing outside), it isn't drawn only while you act (Instrument fails: the readout's crosshair is, and it lives inside the chart as Table's reading guide lives inside Table), and you don't go into it (Place fails). Its sibling is `Table`: the same numbers, read as rows.

**Semantics.** A focusable group (`role="group"`, `aria-roledescription="chart"`, named by the host) described by a one-sentence summary computed from the data ("Storage used, 30 points from 1 Sep to 30 Sep. Used: low 12 GB, high 48 GB, last 42 GB."). The marks are hidden from assistive tech; the numbers are in a real `<table>` (visually hidden in chart view, shown in table view). Arrow keys move the readout and a polite status says the point once per key press; pointer moves are never announced.

**Jobs**

| Job | Where | Our form | Tier |
|---|---|---|---|
| See a trend over time | usage over 30 days, revenue by month | `kind="line"`: a 2 px ink line on a sunk plot well, the line rising from the baseline once when the data arrives | Must |
| Compare a few categories | sales by region, tasks by status | `kind="bar"`: bars standing on the baseline, one group per category, 2 px apart, round tops (the data-end only) | Must |
| See an amount, filled | storage over time, a running total | `kind="area"`: the line with a faint ink wash under it to the baseline; cheap once the line exists | Must |
| See a total and its parts | spend by team per month | stacked bars and stacked areas: the parts in the same patterns, the total in the readout | Should |
| Read an exact value at a point | every chart (shadcn's tooltip) | **the readout**, not a floating box: a strip over the plot names the point (the category) and each series' value in tabular figures, turning on the drum (`SwapText`). It follows the pointer and the arrow keys; an engraved crosshair and the series' markers mark the point. At rest it shows the latest point, so the chart always answers "where are we now?" | Must |
| Read the axes | every chart | engraved hairlines across the well at nice steps (Table's row rule), the zero line as the rule's groove, y figures in readout type (tabular, ink3) at the start, x labels under the well thinned to fit the width | Must |
| Tell series apart without colour | two years, plan vs actual | lines differ by dash (solid, dashed, dotted, dash-dot) and their readout marker's shape (circle, square, diamond, triangle); bars by fill (solid, hatched, outline, dotted). A legend row names each with its key for two or more series. At most four series | Must |
| One series to look at | this year against last year | `signal`: one series in the intent green (the sparkline's last dot); every other series is ink. The pattern still says it, so green is never alone. LED colours (amber, red) never paint a series: those mean status | Must |
| Know it is loading | a dashboard opening | `loading`: the axes stay, the well holds skeleton bars after the show delay (`useWait` + `Skeleton`'s sheen), nothing for a fast load; `aria-busy` | Must |
| Know there is nothing | a new account, a filter with no data | no values at all: the well stays with its zero line and one sentence in it (`empty`, default "No data yet") | Must |
| Know what is missing | a day the sensor was off | `null` in a series: the line breaks (no invented bridge), no bar stands there, the readout and the table say "—" in ink3 | Must |
| Know it failed | the request for the numbers failed | `error`: the sentence in the well in place of the marks, the host's Try again beside it (a node) | Must |
| An accessible alternative | screen readers, copying the numbers, print | the summary sentence; the numbers in a `<table>` in Table's cell look (engraved head, rule hairlines, tabular end-aligned figures); `view="table"` shows it instead of the plot | Must |
| Fit the width | a card, a phone, a sidebar | the width is the container's (measured once per resize, never per frame); the x labels thin to what fits; the height is the host's | Must |
| Values on the bars (shadcn "label") | a small bar chart in a report | Should: one figure above each bar when there are few enough to fit; selective direct labels, never on every point of a line | Should |
| Two measures, two scales (dual axis) | "revenue and users" | dropped: two y-scales let any two lines look correlated. Two charts side by side, or one indexed to a common base | dropped |
| Interactive legend (toggle a series) | shadcn's interactive charts | Later: a legend key that hides its series keeps the others' patterns (pattern follows the series, never its rank) | Later |
| Zoom and brush | a year of data | Later: a brush under the plot on the slider's thumbs. Today the host passes the range it wants (a Select of "7 d, 30 d, 90 d") | Later |
| Horizontal bars | long category names | Later: names on the start axis. Today: short names, or a Table with a bar cell | Later |
| Pie, donut, radial, radar | shadcn's other kinds | dropped (pie, radar) / covered (radial): angles and areas are read worse than lengths; a share is a stacked bar or a Meter. The radial gauge is Progress's ring | dropped |
| A tooltip box that follows the pointer | every other library | covered by the readout: a box over the marks hides the next point and jumps with the pointer; the readout stands still and only its figures turn | covered |
| A colour per series (Recharts' palette) | everywhere | covered by patterns and one signal colour: ink is the instrument's paint, colour is reserved for meaning | covered |
| Grid on or off, axis on or off | shadcn's variants | covered: the grid is the axis's ticks (hairlines are quiet enough to stay); a chart without axes is `Sparkline` | covered |
| Gradient fills, glow, 3-D | marketing charts | dropped: decoration, and a gradient implies a meaning it doesn't have | dropped |

Not doing: a floating tooltip; an animated or looping chart (the draw-in plays once, on arrival); a legend that repeats what the title says for one series; a fifth series (fold into "Other" or small multiples).

**Decide**

- **Object, Component or Place?** Object. It stands for the person's numbers and stays; nothing in it changes anything outside it. The readout's crosshair is an instrument-like thing *inside* it, as Table's reading guide is inside Table.
- **Readout or tooltip?** The readout, above the plot, always present (latest point at rest). Its figures turn on the drum. A floating box covers the marks and moves with the hand; an instrument's readout stands still.
- **What do keys do?** The plot is one tab stop. ←/→ move one point, Home/End jump to the ends; the status says the point once ("Tue 9 Sep: Used 42 GB, Backups 12 GB"). Leaving (blur, pointer out) returns the readout to the latest point. No roving focus per mark: thirty tab stops would be a trap.
- **Where does the y axis start?** At zero for bars and areas (their length is the value, a cut axis lies). A line may sit on a nice range around its data when `zero={false}`; it starts at zero by default.
- **How are series told apart?** By pattern first (dash or fill, and the marker's shape), by ink weight second, by colour only for the one signal series. Four patterns, four series at most.
- **SVG or HTML?** The line and area are one SVG path stretched to the well (`non-scaling-stroke`, so the 2 px stays 2 px at any width); bars, hairlines, labels, the crosshair and markers are HTML positioned in percent, so text is crisp, the hairlines are Table's own, and nothing needs measuring except the label thinning. No charting dependency; a nice-step helper of a dozen lines.
- **Draw-in?** Once per arrival (data after empty or loading): the marks rise from the baseline (scaleY with the settle spring, transform and opacity only). Changing the data later swaps it in place. Reduce Motion: none.
- **SwiftUI?** Swift Charts (`LineMark`, `AreaMark`, `BarMark`), dressed in the same recipe: the well, the hairlines, the patterns (dash, hatching via opacity, symbol shapes), the readout strip with `numericText`, and `chartXSelection` for the pointer.

**Must**
- [ ] React: `Chart` (`kind`, `categories`, `series`, `aria-label`, `format`, `zero`, `loading`, `empty`, `error`, `view`) with `ChartSeries` `{ id, label, values, signal }`.
- [ ] Line, area, grouped bar; axes and hairlines; the readout with the crosshair and markers on pointer and keys; the summary and the table; loading, empty, missing, failed; responsive width; draw-in once.
- [ ] SwiftUI `MetalChart` on Swift Charts with the same kinds, patterns, readout and states.
- [ ] Recipe `chart`, agent guide, meta.json, the page with a usage trend, a category comparison and its DialKit panel, the e2e slice.

**Should**
- [ ] Stacked bars and areas (a total and its parts).
- [ ] Values on the bars.

**Later**
- [ ] A legend that hides a series.
- [ ] Zoom and brush.
- [ ] Horizontal bars.
