# Chart

A person's numbers as an instrument's graph: a trend over time, a few categories compared. React: `Chart` from `@unlocalhosted/metalui` (HTML and SVG, no charting dependency). SwiftUI: `MetalChart` (Swift Charts). The plot is the field well; the hairlines are Table's row rule, the zero line the rule's groove; the readout's figures turn on the drum (`SwapText`); loading is `Skeleton`. The `chart` recipe holds the sizes, the patterns and the signal green. An object: it stands for the person's numbers and stays; pointing at it moves a readout inside it and changes nothing else.

## Use it for

- A trend over time (`kind="line"`, or `"area"` for an amount): requests per day, storage over a month.
- A comparison of a few categories (`kind="bar"`): orders by region, two quarters side by side.

## Don't use it for

- A shape with no values to read, inside a row or a summary: use `Sparkline`.
- One level in a range, now: use `Meter`. A task's progress: use `Progress`.
- Numbers people compare across columns, sort or copy: use `Table` (or `view="table"` for the chart's own numbers).
- Two measures on two scales: draw two charts. There is no second axis.

## Anatomy

- Root (`Chart`): `kind` (line, area, bar), `categories` (the x positions as the reader reads them), `series`, `aria-label` (required), `format` (a value with its unit), `zero`, `loading`, `empty`, `error`, `view` (chart, table), `height`.
- A series (`ChartSeries`): `id`, `label`, `values` (one per category, `null` where there is none), `signal`.
- The readout, over the plot: the category (readout type, uppercase, ink2) and per series its key (the line's dash and marker, or the bar's fill), its name (meta, ink2) and its value (readout type, tabular, ink).
- The plot: the field well (radius 12, height 200 by default) with the marks inset 12 at the sides, 14 at the top and 10 at the bottom; hairlines at nice steps (about 4) running the well's width; the zero line as the groove.
- The axes: y figures before the well (readout type, ink3, tabular, end-aligned); x labels under it, at least 56 apart, counted back from the latest so it always shows.
- Marks: lines 2 (the signal 2.5), round joins; an area adds a wash at 8 % down to zero; bars in ink2 stand on zero, 2 apart in a category, the group taking 80 % of its slot, round only at the data end.
- At the point: a crosshair (ink3 at 55 %) and a marker per series (8, ringed 2 in the surface) for lines and areas; for bars, the menu's row highlight as a plate behind the category.

## Series

| Slot | Line | Marker | Bar |
|---|---|---|---|
| 1 (or the signal) | solid | circle | solid |
| 2 | dashed | square | hatched |
| 3 | dotted | diamond | outline |
| 4 | dash-dot | ring | dotted |

The signal series takes slot 1 and the intent green; the rest follow in order. At most four series: fold more into "Other" or draw small multiples. SwiftUI bars use tones of the ink in place of hatching (Swift Charts has no pattern fill).

## States and motion

| State | Look | Motion |
|---|---|---|
| rest | the readout reads the latest point; markers on it (lines) | – |
| pointing / keys | the readout reads the point; the crosshair or plate shows | the crosshair, markers and plate glide on the settle spring; figures turn on the drum |
| missing (`null`) | the line breaks, no bar; the readout and table say "—" | – |
| loading | the axes stay; skeleton bars in the well after the skeleton's delay; `aria-busy` | the skeleton's sheen, only while loading |
| empty | the zero line and the `empty` sentence in the well (default "No data yet") | – |
| failed (`error`) | the sentence (and the host's Try again) in the well | – |
| arriving | – | data after nothing (or on first show) rises from zero once on the settle spring, scale and opacity; later changes swap in place |

Reduce Motion: no rise (the marks fade in); the crosshair and markers jump; the drum crossfades.

## Rules

- Name the chart with what and when: "API requests per day, September". `format` carries the unit (`(n) => \`${n} GB\``); the axis and the readout use it.
- Bars and areas start at zero; a line starts at zero unless `zero={false}`, for data far from zero where the shape matters.
- One `signal` series at most, the one the reader should look at (this month against last). Never paint a series amber or red: those are status.
- Pass `null` for a missing value, never 0: zero is a value.
- Keep categories short (a day, a name); the x labels thin out but never wrap.
- No floating tooltip, no legend toggle, no zoom: pass the range you want (a Select of 7, 30, 90 days).

## API

| React | SwiftUI |
|---|---|
| `Chart` `kind`, `categories`, `series`, `aria-label`, `format`, `zero`, `loading`, `empty`, `error`, `view`, `height` | `MetalChart(_ series:, categories:, label:, kind:, format:, zero:, loading:, empty:, error:, height:)` |
| `ChartSeries` `{ id, label, values, signal }` | `MetalChartSeries(id:, _ label:, values:, signal:)` |
| `ChartKind` `line`, `area`, `bar` | `MetalChartKind` the same cases |
| `niceTicks(lo, hi, count)` | – |

## Keyboard and accessibility

- The plot is one tab stop: a group with the role description "chart", named by `aria-label` and described by a summary computed from the data ("30 points from 1 Sep to 30 Sep. September: low 0.9 k, high 2.4 k, last 2.3 k.").
- ←/→ move the readout one point, Home/End to the ends; a polite status says the point once per key ("22 Sep: September —, August 1.4 k"). Leaving the plot (blur, pointer out) returns it to the latest point. Pointer moves are never announced.
- The marks, axes and readout are hidden from assistive tech; the numbers are in a real table after the plot (visually hidden in chart view, shown with `view="table"` in Table's cell look).
- SwiftUI: Swift Charts' own accessibility (audio graphs, per-mark values), the label, and ←/→/Home/End when focused.
