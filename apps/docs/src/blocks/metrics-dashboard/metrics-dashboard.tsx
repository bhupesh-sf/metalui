import * as React from 'react';
import { Tabs as BaseTabs } from '@base-ui/react/tabs';
import { Button, Led, SlidingIndicator, SwapText, Switcher, Toggle, type LedKind } from '@unlocalhosted/metalui';
import { MorphIcon } from '@unlocalhosted/metalui/icons';

/* ─────────────────────────────────────────────────────────
 * METRICS DASHBOARD · a small, explorable view of four key measures
 *
 *   rest      a raised slab: the title and site, a range switch and Export; four KPI tiles in a
 *             sunk tray, the chosen one on a lifted plate; one chart sunk behind glass; top pages
 *             and sources as rows with a bar of their share
 *
 *   range     7D · 30D · 90D (the switch's thumb glides on the part spring)
 *      0 ms   the subtitle's range words turn on the drum
 *      0 ms   each KPI value turns on the drum, left to right (stagger 30 ms)
 *      0 ms   the old line is gone; the new one draws from left to right (settle spring) while the
 *             area under it fades in; axis labels turn on the drum
 *      0 ms   list counts turn, bars settle to their new share, rows travel to their new rank
 *
 *   metric    choosing a tile: the lifted plate glides to it (settle spring); the line and its
 *             area morph in place to the new measure's shape (same points, settle spring); the
 *             y-axis labels turn on the drum
 *
 *   compare   the toggle beside the chart's title lights its lamp; the previous period draws in as a dashed line under the
 *             current one; off, it goes at once
 *
 *   inspect   pointer over the chart, or focus it and use ← → (Home / End): a hairline and a dot
 *             sit on the day at once (they are the pointer); the readout plate follows on the part
 *             spring; its figures turn on the drum; leaving, it fades
 *
 *   export    pressing Export saves the charted series as CSV; its glyph morphs share → check and
 *             the label turns to "Exported"; after 1.6 s both turn back
 *
 * Reduce Motion: every value and view changes at once; the drum crossfades; nothing draws in.
 * Layout follows the block's own width (a container): under 32rem the tiles are two by two and the
 * lists stack.
 * ───────────────────────────────────────────────────────── */

const TIMING = {
  tileStagger: 30,    // ms between KPI values turning, left to right
  exported:    1600,  // ms the Export key says "Exported"
};

const CHART = {
  height:   184,  // px, the plot and its axes
  padLeft:  40,   // px, room for the y labels
  padRight: 12,
  padTop:   14,
  padBottom: 26,  // px, room for the x labels
  xLabels:  5,    // date labels along the bottom
  gridLines: 3,   // 0, half, top
  plateWidth: 112, // px, the readout plate
  plateGap:  10,   // px between the hairline and the plate
};

/* ── Data ──────────────────────────────────────────────────── */

type Range = '7' | '30' | '90';
type MetricId = 'visitors' | 'signups' | 'conversion' | 'bounce';

const RANGES: { value: Range; label: string; words: string }[] = [
  { value: '7', label: '7D', words: 'Last 7 days' },
  { value: '30', label: '30D', words: 'Last 30 days' },
  { value: '90', label: '90D', words: 'Last 90 days' },
];

const METRICS: { id: MetricId; label: string; kind: 'count' | 'rate'; better: 'up' | 'down' }[] = [
  { id: 'visitors', label: 'Visitors', kind: 'count', better: 'up' },
  { id: 'signups', label: 'Signups', kind: 'count', better: 'up' },
  { id: 'conversion', label: 'Conversion', kind: 'rate', better: 'up' },
  { id: 'bounce', label: 'Bounce rate', kind: 'rate', better: 'down' },
];

const PAGES = [
  { name: '/', share: 0.31 },
  { name: '/pricing', share: 0.17 },
  { name: '/docs/getting-started', share: 0.12 },
  { name: '/blog/usage-based-billing', share: 0.08 },
  { name: '/changelog', share: 0.05 },
];
const SOURCES = [
  { name: 'Direct', share: 0.38 },
  { name: 'Google', share: 0.29 },
  { name: 'Hacker News', share: 0.11 },
  { name: 'X', share: 0.08 },
  { name: 'Newsletter', share: 0.06 },
];

/** A small seeded random, so the sample data is the same on every visit. */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAYS = 180; // two 90-day periods
const TODAY = new Date(2026, 8, 30);

/** Daily visitors, signups and bounces for the last 180 days: a weekly rhythm on a slow climb. */
const DAILY = (() => {
  const r = seeded(7);
  return Array.from({ length: DAYS }, (_, i) => {
    const date = new Date(TODAY);
    date.setDate(TODAY.getDate() - (DAYS - 1 - i));
    const weekday = date.getDay();
    const rhythm = weekday === 0 || weekday === 6 ? 0.72 : 1;
    const visitors = Math.round((820 + i * 2.4) * rhythm * (0.86 + r() * 0.28));
    const signups = Math.round(visitors * (0.043 + r() * 0.012 + i * 0.00002));
    const bounces = Math.round(visitors * (0.43 - i * 0.00012 + (r() - 0.5) * 0.06));
    return { date, visitors, signups, bounces };
  });
})();

type Day = (typeof DAILY)[number];
type Point = { date: Date; value: number; previous: number };

function valueOf(metric: MetricId, days: Day[]) {
  const v = days.reduce((s, d) => s + d.visitors, 0);
  const s = days.reduce((a, d) => a + d.signups, 0);
  const b = days.reduce((a, d) => a + d.bounces, 0);
  if (metric === 'visitors') return v;
  if (metric === 'signups') return s;
  if (metric === 'conversion') return v ? (s / v) * 100 : 0;
  return v ? (b / v) * 100 : 0;
}

/** The charted points: daily for 7 and 30 days, weekly for 90; each with the same slot a period before. */
function seriesOf(metric: MetricId, range: Range): Point[] {
  const n = Number(range);
  const now = DAILY.slice(DAYS - n);
  const before = DAILY.slice(DAYS - 2 * n, DAYS - n);
  const step = range === '90' ? 7 : 1;
  const points: Point[] = [];
  for (let i = 0; i < n; i += step) {
    const a = now.slice(i, i + step);
    const b = before.slice(i, i + step);
    points.push({ date: a[a.length - 1].date, value: valueOf(metric, a), previous: valueOf(metric, b) });
  }
  return points;
}

function totals(range: Range) {
  const n = Number(range);
  const now = DAILY.slice(DAYS - n);
  const before = DAILY.slice(DAYS - 2 * n, DAYS - n);
  return METRICS.map((m) => ({ ...m, value: valueOf(m.id, now), previous: valueOf(m.id, before) }));
}

/** Rows for a list: the range's visitors split by share, nudged per range so ranks can change. */
function rowsOf(list: typeof PAGES, range: Range, salt: number) {
  const visitors = valueOf('visitors', DAILY.slice(DAYS - Number(range)));
  const r = seeded(Number(range) * 31 + salt);
  return list
    .map((row) => ({ name: row.name, value: Math.round(visitors * row.share * (0.84 + r() * 0.32)) }))
    .sort((a, b) => b.value - a.value);
}

/* ── Formatting ────────────────────────────────────────────── */

const count = new Intl.NumberFormat('en');
const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const day = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' });
const format = (kind: 'count' | 'rate', v: number) => (kind === 'count' ? count.format(Math.round(v)) : `${v.toFixed(1)}%`);
const axis = (kind: 'count' | 'rate', v: number) => (kind === 'count' ? compact.format(v) : `${Math.round(v)}%`);

/** The change in words and the lamp that goes with it: direction is said, never only coloured. */
function delta(m: ReturnType<typeof totals>[number]) {
  const diff = m.kind === 'count' ? ((m.value - m.previous) / m.previous) * 100 : m.value - m.previous;
  const size = Math.abs(diff);
  const flat = size < 0.05;
  const up = diff > 0;
  const good = flat ? null : (up ? m.better === 'up' : m.better === 'down');
  const amount = m.kind === 'count' ? `${size.toFixed(1)}%` : `${size.toFixed(1)} pts`;
  const words = flat ? 'level' : `${amount} ${up ? 'up' : 'down'}`;
  const led: LedKind = good == null ? 'off' : good ? 'live' : 'failed';
  return { words, led };
}

/* ── Motion helpers ────────────────────────────────────────── */

/** A spring's duration (ms, zero under Reduce Motion) and curve, read from the element's own tokens. */
function spring(el: Element, name: 'settle' | 'part') {
  const s = getComputedStyle(el);
  const ms = parseFloat(s.getPropertyValue(`--mu-spring-${name}-d`)) * 1000 * (parseFloat(s.getPropertyValue(`--mu-travel-${name}`)) || 0);
  return { ms, easing: s.getPropertyValue(`--mu-spring-${name}`).trim() || 'ease-out' };
}

/** Draws a path from its start to its end (pathLength 1), on the settle spring. */
function drawIn(path: SVGPathElement | null) {
  if (!path) return;
  const { ms, easing } = spring(path, 'settle');
  if (ms > 0) path.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: ms, easing });
}

/** Rows travel from where they were to where they now are (FLIP), inside one list. */
function useTravel(list: React.RefObject<HTMLOListElement | null>, order: string) {
  const tops = React.useRef(new Map<string, number>());
  React.useLayoutEffect(() => {
    const el = list.current;
    if (!el) return;
    const { ms, easing } = spring(el, 'settle');
    const next = new Map<string, number>();
    el.querySelectorAll<HTMLElement>('[data-row]').forEach((row) => {
      const key = row.dataset.row!;
      const was = tops.current.get(key);
      next.set(key, row.offsetTop);
      if (was != null && was !== row.offsetTop && ms > 0) row.animate([{ transform: `translateY(${was - row.offsetTop}px)` }, { transform: 'none' }], { duration: ms, easing });
    });
    tops.current = next;
  }, [list, order]);
}

/** A value that follows another after a delay: tiles turn one after another, left to right. */
function useLater<T>(value: T, ms: number) {
  const [later, setLater] = React.useState(value);
  React.useEffect(() => {
    if (!ms) { setLater(value); return; }
    const t = window.setTimeout(() => setLater(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return later;
}

function Figure({ value, delay }: { value: string; delay: number }) {
  return <SwapText value={useLater(value, delay)} />;
}

/** Watches the width of an element. */
function useWidth<T extends HTMLElement>() {
  const ref = React.useRef<T>(null);
  const [width, setWidth] = React.useState(0);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/* ── Chart ─────────────────────────────────────────────────── */

/** A monotone cubic through the points (no overshoot between days). */
function monotone(xs: number[], ys: number[]) {
  const n = xs.length;
  if (n < 2) return `M${xs[0] ?? 0},${ys[0] ?? 0}`;
  const d = xs.slice(1).map((x, i) => (ys[i + 1] - ys[i]) / (x - xs[i]));
  const m = xs.map((_, i) => (i === 0 ? d[0] : i === n - 1 ? d[n - 2] : d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2));
  let path = `M${xs[0].toFixed(2)},${ys[0].toFixed(2)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = (xs[i + 1] - xs[i]) / 3;
    path += ` C${(xs[i] + h).toFixed(2)},${(ys[i] + m[i] * h).toFixed(2)} ${(xs[i + 1] - h).toFixed(2)},${(ys[i + 1] - m[i + 1] * h).toFixed(2)} ${xs[i + 1].toFixed(2)},${ys[i + 1].toFixed(2)}`;
  }
  return path;
}

/** A round top for the y axis, close above the data: 1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6 or 8 times a power of ten. */
function niceMax(v: number) {
  const p = 10 ** Math.floor(Math.log10(v || 1));
  return [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map((k) => k * p).find((k) => k >= v) ?? v;
}

const MORPH = { transition: 'd calc(var(--mu-spring-settle-d) * var(--mu-travel-settle)) var(--mu-spring-settle)' };

function Chart({ metric, range, compare, onCompareChange }: { metric: (typeof METRICS)[number]; range: Range; compare: boolean; onCompareChange: (on: boolean) => void }) {
  const [box, width] = useWidth<HTMLDivElement>();
  const points = React.useMemo(() => seriesOf(metric.id, range), [metric.id, range]);
  const [at, setAt] = React.useState<number | null>(null);
  const line = React.useRef<SVGPathElement>(null);
  const area = React.useRef<SVGPathElement>(null);
  const was = React.useRef<SVGPathElement>(null);
  const plate = React.useRef<HTMLDivElement>(null);

  const top = niceMax(Math.max(...points.map((p) => Math.max(p.value, compare ? p.previous : 0))) * 1.08);
  const innerW = Math.max(0, width - CHART.padLeft - CHART.padRight);
  const innerH = CHART.height - CHART.padTop - CHART.padBottom;
  const xs = points.map((_, i) => CHART.padLeft + (points.length === 1 ? 0 : (i / (points.length - 1)) * innerW));
  const y = (v: number) => CHART.padTop + innerH * (1 - v / top);
  const d = width ? monotone(xs, points.map((p) => y(p.value))) : '';
  const bottom = CHART.padTop + innerH;
  const fill = d ? `${d} L${xs[xs.length - 1].toFixed(2)},${bottom} L${xs[0].toFixed(2)},${bottom} Z` : '';
  const previous = width ? monotone(xs, points.map((p) => y(p.previous))) : '';

  // A new range is new data: the line draws in from the left and the area fades in under it.
  React.useEffect(() => {
    drawIn(line.current);
    const el = area.current;
    if (el) {
      const { ms, easing } = spring(el, 'settle');
      if (ms > 0) el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms, easing });
    }
    setAt(null);
  }, [range, width > 0]); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => { if (compare) drawIn(was.current); }, [compare]);

  const pick = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    const x = e.clientX - r.left;
    let best = 0;
    xs.forEach((px, i) => { if (Math.abs(px - x) < Math.abs(xs[best] - x)) best = i; });
    setAt(best);
  };
  const keys = (e: React.KeyboardEvent) => {
    const last = points.length - 1;
    const now = at ?? last;
    const next = e.key === 'ArrowLeft' ? Math.max(0, now - 1) : e.key === 'ArrowRight' ? Math.min(last, now + 1) : e.key === 'Home' ? 0 : e.key === 'End' ? last : null;
    if (next == null) return;
    e.preventDefault();
    setAt(next);
  };

  const shown = at == null ? null : points[at];
  // The plate sits beside the hairline (right of it, or left near the end), never over the point read.
  const plateX = at == null ? 0 : xs[at] + CHART.plateGap + CHART.plateWidth <= width - CHART.padRight ? xs[at] + CHART.plateGap : xs[at] - CHART.plateGap - CHART.plateWidth;
  // Date labels at even steps, always ending on the last point.
  const stepOf = Math.max(1, Math.ceil((points.length - 1) / (CHART.xLabels - 1)));
  const labels = [...Array.from({ length: Math.ceil(points.length / stepOf) }, (_, k) => k * stepOf).filter((i) => points.length - 1 - i >= stepOf / 2), points.length - 1];
  const rangeWords = range === '90' ? 'week' : 'day';

  return (
    <div className="grid gap-8">
      <div className="flex items-baseline justify-between gap-12">
        <span className="type-title text-ink"><SwapText value={metric.label} /></span>
        <span className="flex items-center gap-12">
          <span className="type-meta text-ink3">{range === '90' ? 'By week' : 'By day'}</span>
          <Toggle pressed={compare} onPressedChange={onCompareChange}>Compare</Toggle>
        </span>
      </div>
      <div
        ref={box}
        tabIndex={0}
        role="img"
        aria-label={`${metric.label}, ${RANGES.find((r) => r.value === range)!.words.toLowerCase()}, by ${rangeWords}. Use the arrow keys to read each ${rangeWords}.`}
        className="relative outline-none rounded-card recipe-well-field focus-visible:focus-ring touch-none select-none"
        style={{ height: CHART.height }}
        onPointerMove={pick}
        onPointerDown={pick}
        onPointerLeave={() => setAt(null)}
        onFocus={() => setAt((a) => a ?? points.length - 1)}
        onBlur={() => setAt(null)}
        onKeyDown={keys}
      >
        {width > 0 && (
          <svg width={width} height={CHART.height} className="absolute inset-0 overflow-visible" aria-hidden>
            {Array.from({ length: CHART.gridLines }, (_, k) => {
              const v = (top / (CHART.gridLines - 1)) * k;
              return (
                <g key={k}>
                  <line x1={CHART.padLeft} x2={width - CHART.padRight} y1={y(v)} y2={y(v)} className="stroke-rule" strokeWidth={1} />
                  <foreignObject x={0} y={y(v) - 8} width={CHART.padLeft - 8} height={16}>
                    <div className="type-figure text-ink3 text-right"><SwapText value={axis(metric.kind, v)} /></div>
                  </foreignObject>
                </g>
              );
            })}
            {labels.map((i) => (
              <text key={i} x={xs[i]} y={CHART.height - 8} textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'} className="type-figure fill-ink3">
                {day.format(points[i].date)}
              </text>
            ))}
            <g key={range}>
              <path ref={area} d={fill} style={{ d: `path("${fill}")`, ...MORPH } as React.CSSProperties} className="fill-green-deep opacity-10" />
              {compare && (
                <path ref={was} d={previous} pathLength={1} strokeDasharray="0.006 0.006" style={{ d: `path("${previous}")`, ...MORPH } as React.CSSProperties} className="fill-none stroke-ink3" strokeWidth={1.5} strokeLinecap="round" />
              )}
              <path ref={line} d={d} pathLength={1} strokeDasharray="1 1" style={{ d: `path("${d}")`, ...MORPH } as React.CSSProperties} className="fill-none stroke-green-deep" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </g>
            {shown && at != null && (
              <g>
                <line x1={xs[at]} x2={xs[at]} y1={CHART.padTop} y2={bottom} className="stroke-ink3" strokeWidth={1} />
                {compare && <circle cx={xs[at]} cy={y(shown.previous)} r={3} className="fill-page stroke-ink3" strokeWidth={1.5} />}
                <circle cx={xs[at]} cy={y(shown.value)} r={4} className="fill-page stroke-green-deep" strokeWidth={2} />
              </g>
            )}
          </svg>
        )}
        <div
          ref={plate}
          aria-hidden
          className="pointer-events-none absolute top-8 left-0 grid gap-2 px-10 py-8 rounded-surface-radius-plate recipe-surface-pop backdrop-surface-blur-pop transition-[transform,opacity] duration-part ease-part reduced-motion:transition-none"
          style={{ width: CHART.plateWidth, transform: `translateX(${plateX}px)`, opacity: shown ? 1 : 0 }}
        >
          <span className="type-meta text-ink3">{shown ? day.format(shown.date) : ''}</span>
          <span className="type-ui text-ink tabular-nums"><SwapText value={shown ? format(metric.kind, shown.value) : '·'} /></span>
          {compare && <span className="type-meta text-ink3 tabular-nums">was <SwapText value={shown ? format(metric.kind, shown.previous) : '·'} /></span>}
        </div>
      </div>
      <p role="status" className="sr-only">{shown ? `${day.format(shown.date)}: ${format(metric.kind, shown.value)}${compare ? `, previous period ${format(metric.kind, shown.previous)}` : ''}` : ''}</p>
    </div>
  );
}

/* ── Lists ─────────────────────────────────────────────────── */

function TopList({ title, rows }: { title: string; rows: { name: string; value: number }[] }) {
  const list = React.useRef<HTMLOListElement>(null);
  useTravel(list, rows.map((r) => r.name).join('|'));
  const max = rows[0]?.value || 1;
  return (
    <section aria-label={title} className="grid content-start gap-6">
      <div className="flex items-baseline justify-between px-8">
        <h3 className="m-0 type-title text-ink">{title}</h3>
        <span className="type-meta text-ink3">Visitors</span>
      </div>
      <ol ref={list} className="m-0 grid list-none gap-2 p-0">
        {rows.map((r) => (
          <li key={r.name} data-row={r.name} className="relative flex h-28 items-center justify-between gap-12 overflow-hidden rounded-surface-radius-row px-8">
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 rounded-surface-radius-row bg-green-deep/6 transition-[width] duration-settle ease-settle reduced-motion:transition-none"
              style={{ width: `${(r.value / max) * 100}%` }}
            />
            <span className="relative truncate type-ui text-ink">{r.name}</span>
            <span className="relative type-figure text-ink2"><SwapText value={count.format(r.value)} /></span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ── The block ─────────────────────────────────────────────── */

export interface MetricsDashboardProps {
  /** The site the figures are for. */
  site?: string;
  className?: string;
}

/** A small analytics view: a range, four KPI tiles that pick the charted measure, and top lists. */
export function MetricsDashboard({ site = 'metalui.dev', className }: MetricsDashboardProps) {
  const [range, setRange] = React.useState<Range>('30');
  const [metric, setMetric] = React.useState<MetricId>('visitors');
  const [compare, setCompare] = React.useState(false);
  const [exported, setExported] = React.useState(false);
  const kpis = React.useMemo(() => totals(range), [range]);
  const rangeWords = RANGES.find((r) => r.value === range)!.words;
  const chosen = METRICS.find((m) => m.id === metric)!;

  React.useEffect(() => {
    if (!exported) return;
    const t = window.setTimeout(() => setExported(false), TIMING.exported);
    return () => window.clearTimeout(t);
  }, [exported]);

  const exportCsv = () => {
    const rows = seriesOf(metric, range).map((p) => `${p.date.toISOString().slice(0, 10)},${p.value.toFixed(2)},${p.previous.toFixed(2)}`);
    const blob = new Blob([`date,${metric},previous\n${rows.join('\n')}\n`], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${site}-${metric}-${range}d.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    setExported(true);
  };

  return (
    <section aria-label={`Analytics for ${site}`} className={`@container grid w-full gap-20 p-20 rounded-surface-radius-hero recipe-surface-raise ${className ?? ''}`}>
      <header className="flex flex-wrap items-center justify-between gap-12">
        <div className="grid gap-2">
          <h2 className="m-0 type-display text-ink">Analytics</h2>
          <p className="m-0 type-meta text-ink2">{site} · <SwapText value={rangeWords} /></p>
        </div>
        <div className="flex items-center gap-8">
          <Switcher size="compact" aria-label="Range" value={range} onValueChange={setRange} options={RANGES.map(({ value, label }) => ({ value, label }))} />
          <Button size="compact" onClick={exportCsv} icon={<MorphIcon name={exported ? 'check' : 'share'} />}>
            <SwapText value={exported ? 'Exported' : 'Export'} />
          </Button>
        </div>
      </header>

      <BaseTabs.Root value={metric} onValueChange={(v) => setMetric(v as MetricId)}>
        <BaseTabs.List aria-label="Measure to chart" className="relative grid grid-cols-2 gap-4 p-4 rounded-card recipe-switcher @lg:grid-cols-4">
          <SlidingIndicator spring="settle" className="rounded-surface-radius-plate recipe-switcher-thumb" />
          {kpis.map((m, i) => {
            const change = delta(m);
            return (
              <BaseTabs.Tab
                key={m.id}
                value={m.id}
                className="relative z-1 grid cursor-pointer gap-4 border-0 bg-transparent p-12 text-left outline-none rounded-surface-radius-plate focus-visible:focus-ring"
              >
                <span className="type-meta text-ink2">{m.label}</span>
                <span className="type-stat text-ink">
                  <Figure value={format(m.kind, m.value)} delay={i * TIMING.tileStagger} />
                </span>
                <span className="flex items-center gap-6 type-meta text-ink2">
                  <Led kind={change.led} size="small" />
                  <Figure value={change.words} delay={i * TIMING.tileStagger} />
                </span>
              </BaseTabs.Tab>
            );
          })}
        </BaseTabs.List>
        <BaseTabs.Panel value={metric} keepMounted className="mt-16 outline-none">
          <Chart metric={chosen} range={range} compare={compare} onCompareChange={setCompare} />
        </BaseTabs.Panel>
      </BaseTabs.Root>

      <div className="grid gap-20 border-t border-rule pt-16 @lg:grid-cols-2">
        <TopList title="Top pages" rows={rowsOf(PAGES, range, 1)} />
        <TopList title="Sources" rows={rowsOf(SOURCES, range, 2)} />
      </div>
    </section>
  );
}
