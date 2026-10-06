'use client';

import * as React from 'react';
import { useIsoLayoutEffect } from '../../motion/layout-effect';
import { SwapText } from '../../motion/swap';
import { Skeleton } from '../skeleton/skeleton';

/* ─────────────────────────────────────────────────────────
 * CHART, an instrument's graph of a person's numbers
 *
 *   kinds     line (a 2 px ink line), area (the line and a faint wash to zero), bar (grouped bars on zero)
 *   well      a sunk plot well; engraved hairlines at nice steps, the zero line as the rule's groove;
 *             y figures before the well, x labels under it, thinned to fit the width
 *   readout   over the well: the point's category and each series' value, turning on the drum. At rest
 *             the latest point; it follows the pointer and ←/→/Home/End. A crosshair and markers (line,
 *             area) or a plate behind the category (bar) glide to the point on the settle spring
 *   series    told apart by pattern (solid, dashed, dotted, dash-dot; bars solid, hatched, outline,
 *             dotted) and the marker's shape; one `signal` series in the intent green. At most four
 *   missing   null breaks the line, leaves no bar, reads "—"
 *   states    loading (skeleton bars after the skeleton's delay), empty and error (a sentence in the well)
 *   arrive    data after nothing rises from the zero line once (settle); later changes swap in place
 *   access    a focusable group described by a computed summary; the numbers in a <table> (hidden in
 *             chart view, shown with view="table"); a key press says the point once
 * Reduce Motion: no rise, only the fade; the crosshair and markers jump.
 * ───────────────────────────────────────────────────────── */

export type ChartKind = 'line' | 'area' | 'bar';

export interface ChartSeries {
  /** Stable key. */
  id: string;
  /** Its name in the legend, the readout and the table: "Used". */
  label: string;
  /** One value per category; null where there is none. */
  values: (number | null)[];
  /** The one series to look at, in the intent green. Only the first signal series is honoured. */
  signal?: boolean;
}

export interface ChartProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  kind?: ChartKind;
  /** The x positions, in order: dates or names, as the reader should read them ("Mon 8", "Lisbon"). */
  categories: string[];
  /** Up to four series. */
  series: ChartSeries[];
  /** Names the chart: "Storage used, last 30 days". */
  'aria-label': string;
  /** How a value reads, with its unit: (v) => `${v} GB`. Default: the locale's number, a real minus. */
  format?: (value: number) => string;
  /** Start the value axis at zero (default). Bars and areas always do; a line may hug its data. */
  zero?: boolean;
  /** The numbers are on their way: skeleton bars in the well. */
  loading?: boolean;
  /** What to say when there are no values. Default "No data yet". */
  empty?: React.ReactNode;
  /** The numbers couldn't be had: the sentence (and the host's Try again) in the well. */
  error?: React.ReactNode;
  /** chart (default) or table: the same numbers in Table's cell look. */
  view?: 'chart' | 'table';
  /** The plot's height in px. Default: the recipe's. */
  height?: number;
}

const ROOT = 'mu-chart chart';
const HEAD = 'mu-chart-head chart-head';
const AT = 'mu-chart-at type-readout uppercase text-ink2';
const KEY = 'mu-chart-key chart-key';
const NAME = 'type-meta text-ink2';
const VALUE = 'mu-chart-value type-readout tabular-nums text-ink';
const BODY = 'mu-chart-body chart-body';
const Y = 'mu-chart-y chart-y type-readout tabular-nums text-ink3';
const PLOT = 'mu-chart-plot chart-plot recipe-well-field focus-visible:focus-ring';
const AREA = 'mu-chart-area chart-area';
const X = 'mu-chart-x chart-x type-readout text-ink3';
const MESSAGE = 'mu-chart-message chart-message type-body text-ink2';
const TABLE = 'mu-chart-table table-reset w-full';
const TH = 'align-middle h-table-head-height px-table-row-pad-x type-label engraved font-normal text-left whitespace-nowrap table-rule';
const TD = 'align-middle h-table-row-height px-table-row-pad-x type-ui tabular-nums text-right text-ink table-rule';
const ROW_HEAD = 'align-middle h-table-row-height px-table-row-pad-x type-ui font-normal normal-case text-left text-ink table-rule';

const SHAPES = ['circle', 'square', 'diamond', 'ring'] as const;
const MAX_SERIES = SHAPES.length;
// Skeleton bars: a plausible rise, so the well doesn't read as a flat line while it waits.
const GHOSTS = [0.42, 0.58, 0.5, 0.7, 0.62, 0.8, 0.68, 0.88];

const join = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ');
const pct = (f: number) => `${(f * 100).toFixed(3)}%`;

let numberFormat: Intl.NumberFormat | undefined;
function defaultFormat(v: number) {
  numberFormat ??= new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });
  return numberFormat.format(v).replace(/^-/, '−');
}

/** Ticks at a nice step (1, 2, 2.5 or 5 × 10ⁿ) covering lo..hi in about `count` steps. */
export function niceTicks(lo: number, hi: number, count: number): number[] {
  if (!(hi > lo)) hi = lo + 1;
  const raw = (hi - lo) / Math.max(1, count);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw * (1 - 1e-9)) ?? 10 * mag;
  const ticks: number[] = [];
  for (let t = Math.floor(lo / step) * step; t <= Math.ceil(hi / step) * step + step / 2; t += step) ticks.push(Number(t.toPrecision(12)));
  return ticks;
}

/** The runs of consecutive values, so a missing value breaks the line. */
function runs(values: (number | null)[]) {
  const out: [number, number][][] = [];
  let run: [number, number][] | null = null;
  values.forEach((v, i) => {
    if (v == null || !Number.isFinite(v)) return void (run = null);
    if (!run) out.push((run = []));
    run.push([i, v]);
  });
  return out;
}

/** An instrument's graph: line, area or bars on a sunk well, read off a readout that follows the pointer and the keys. */
export function Chart({
  kind = 'line', categories, series: all, format = defaultFormat, zero = true, loading = false, empty, error,
  view = 'chart', height, className, style, 'aria-label': label, ...props
}: ChartProps) {
  const series = all.slice(0, MAX_SERIES);
  const signal = series.findIndex((s) => s.signal);
  const n = categories.length;
  const id = React.useId();

  const values = series.flatMap((s) => s.values.filter((v): v is number => v != null && Number.isFinite(v)));
  const hasData = values.length > 0 && !loading && error == null;

  // The scale: zero in the domain for bars, areas and (by default) lines.
  const lo0 = values.length ? Math.min(...values) : 0;
  const hi0 = values.length ? Math.max(...values) : 1;
  const withZero = zero || kind !== 'line';
  const root = React.useRef<HTMLDivElement>(null);
  const [fit, setFit] = React.useState({ width: 0, xMin: 56, ticks: 4, inset: 0.2 });
  const ticks = niceTicks(withZero ? Math.min(0, lo0) : lo0, withZero ? Math.max(0, hi0) : hi0, fit.ticks);
  const lo = ticks[0], hi = ticks[ticks.length - 1];
  const yOf = (v: number) => 1 - (v - lo) / (hi - lo || 1);
  const zeroY = yOf(Math.min(hi, Math.max(lo, 0)));
  const xOf = (i: number) => (i + 0.5) / Math.max(1, n);

  // The width is the container's: measured before paint and on resize, never per frame.
  useIsoLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const read = () => {
      const s = getComputedStyle(el);
      setFit({
        width: el.getBoundingClientRect().width,
        xMin: parseFloat(s.getPropertyValue('--mu-r-chart-axis-x-min')) || 56,
        ticks: parseFloat(s.getPropertyValue('--mu-r-chart-axis-y-ticks')) || 4,
        inset: parseFloat(s.getPropertyValue('--mu-r-chart-bar-inset')) || 0,
      });
    };
    read();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // Every `step`-th label, counted back from the latest so it always shows.
  const step = fit.width ? Math.max(1, Math.ceil(n / Math.max(1, Math.floor(fit.width / fit.xMin)))) : 1;

  // The point under the readout: the pointer's or the keys', else the latest with a value.
  const latest = (() => {
    for (let i = n - 1; i >= 0; i--) if (series.some((s) => s.values[i] != null)) return i;
    return n - 1;
  })();
  const [active, setActive] = React.useState<number | null>(null);
  const at = active ?? latest;
  const box = React.useRef<DOMRect | null>(null);
  const area = React.useRef<HTMLDivElement>(null);
  const [said, setSaid] = React.useState('');

  // Data that arrives after nothing rises once; the marks are keyed by the arrival.
  const [had, setHad] = React.useState(hasData);
  const [arrival, setArrival] = React.useState(0);
  if (had !== hasData) {
    setHad(hasData);
    if (hasData) setArrival((a) => a + 1);
  }

  const read = (v: number | null | undefined) => (v == null || !Number.isFinite(v) ? '—' : format(v));
  const sentence = (i: number) => `${categories[i]}: ${series.map((s) => `${s.label} ${read(s.values[i])}`).join(', ')}`;

  const pointAt = (clientX: number) => {
    const r = box.current;
    if (!r || !n) return;
    const i = Math.min(n - 1, Math.max(0, Math.floor(((clientX - r.left) / (r.width || 1)) * n)));
    setActive((a) => (a === i ? a : i));
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!hasData) return;
    const from = active ?? latest;
    const to = e.key === 'ArrowLeft' ? from - 1 : e.key === 'ArrowRight' ? from + 1 : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : null;
    if (to == null) return;
    e.preventDefault();
    const i = Math.min(n - 1, Math.max(0, to));
    setActive(i);
    setSaid(sentence(i));
  };

  // The summary a reader hears with the chart's name.
  const summary = hasData
    ? `${n} points from ${categories[0]} to ${categories[n - 1]}. ` + series.map((s) => {
      const v = s.values.filter((x): x is number => x != null && Number.isFinite(x));
      return v.length ? `${s.label}: low ${format(Math.min(...v))}, high ${format(Math.max(...v))}, last ${read(s.values[latest])}.` : `${s.label}: no values.`;
    }).join(' ')
    : loading ? 'Loading.' : error != null ? 'Couldn’t load.' : 'No data.';

  // The pattern slot: the signal series takes the first (solid), the rest follow in order.
  const pattern = (i: number) => (signal < 0 || i > signal ? i : i === signal ? 0 : i + 1) % MAX_SERIES;
  const seriesProps = (i: number) => ({
    className: 'mu-chart-series chart-series',
    'data-pattern': String(pattern(i)),
    'data-signal': i === signal ? '' : undefined,
  });

  const longest = ticks.map(format).reduce((a, b) => (b.length > a.length ? b : a), '');
  const vars = { ...style, '--mu-chart-n': n, '--mu-chart-zero': pct(zeroY), ...(height ? { '--mu-chart-height': `${height}px` } : null) } as React.CSSProperties;

  const table = (
    <table className={view === 'table' ? TABLE : 'sr-only'}>
      <caption className="sr-only">{label}</caption>
      <thead>
        <tr>
          <th scope="col" className={TH}><span className="sr-only">Point</span></th>
          {series.map((s) => <th key={s.id} scope="col" className={join(TH, 'text-right')}>{s.label}</th>)}
        </tr>
      </thead>
      <tbody>
        {categories.map((c, i) => (
          <tr key={`${c}-${i}`}>
            <th scope="row" className={ROW_HEAD}>{c}</th>
            {series.map((s) => {
              const v = s.values[i];
              return <td key={s.id} className={join(TD, v == null && 'text-ink3')}>{read(v)}</td>;
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div ref={root} data-kind={kind} data-view={view} aria-busy={loading || undefined} className={join(ROOT, className)} style={vars} {...props}>
      {view === 'chart' && (
        <>
          <div className={HEAD} aria-hidden>
            <span className={AT}><SwapText value={hasData && categories[at] != null ? categories[at] : '—'} /></span>
            {series.map((s, i) => (
              <span key={s.id} className={KEY}>
                <span {...seriesProps(i)} className={join('mu-chart-series chart-series', 'mu-chart-swatch chart-swatch')} data-kind={kind === 'bar' ? 'bar' : undefined}>
                  {kind === 'bar'
                    ? <span className="mu-chart-bar chart-bar inset-0" />
                    : (
                      <>
                        <svg viewBox="0 0 16 10" preserveAspectRatio="none"><path className="chart-line" d="M0 5H16" /></svg>
                        <span className="mu-chart-dot chart-dot" data-shape={SHAPES[pattern(i)]} />
                      </>
                    )}
                </span>
                <span className={NAME}>{s.label}</span>
                <span className={VALUE}><SwapText value={hasData ? read(s.values[at]) : '—'} /></span>
              </span>
            ))}
          </div>
          <div className={BODY}>
            <div className={Y} aria-hidden>
              <span className="mu-chart-ysize">{longest}</span>
              {hasData && ticks.map((t) => <span key={t} style={{ top: pct(yOf(t)) }}>{format(t)}</span>)}
            </div>
            <div
              role="group"
              aria-roledescription="chart"
              aria-label={label}
              aria-describedby={`${id}-summary`}
              tabIndex={0}
              className={PLOT}
              onPointerEnter={() => { box.current = area.current?.getBoundingClientRect() ?? null; }}
              onPointerDown={(e) => { box.current = area.current?.getBoundingClientRect() ?? null; if (hasData) pointAt(e.clientX); }}
              onPointerMove={(e) => { if (hasData) pointAt(e.clientX); }}
              onPointerLeave={() => setActive(null)}
              onKeyDown={onKeyDown}
              onBlur={() => setActive(null)}
            >
              <div ref={area} className={AREA} data-active={active != null && hasData ? '' : undefined}>
                {(hasData ? ticks : [Math.min(hi, Math.max(lo, 0))]).map((t) => (
                  <span key={t} aria-hidden className="mu-chart-hair chart-hair" data-zero={t === 0 || !hasData ? '' : undefined} style={{ top: pct(hasData ? yOf(t) : 1) }} />
                ))}
                {hasData && kind === 'bar' && (
                  <span aria-hidden className="mu-chart-cross chart-cross" style={{ '--mu-chart-x': at / n } as React.CSSProperties}>
                    <span className="mu-chart-plate" />
                  </span>
                )}
                {hasData && (
                  <div key={arrival} aria-hidden data-arrive="" className="mu-chart-marks chart-marks">
                    {kind === 'bar'
                      ? categories.map((c, ci) => (
                        <div key={`${c}-${ci}`} className="absolute top-0 bottom-0 flex gap-chart-bar-gap" style={{ left: pct((ci + fit.inset / 2) / n), width: pct((1 - fit.inset) / n) }}>
                          {series.map((s, i) => {
                            const v = s.values[ci];
                            const ok = v != null && Number.isFinite(v);
                            const top = ok ? Math.min(yOf(v), zeroY) : zeroY;
                            return (
                              <span key={s.id} {...seriesProps(i)} className="mu-chart-series chart-series relative flex-1">
                                {ok && <span className="mu-chart-bar chart-bar left-0 right-0" data-negative={v < 0 ? '' : undefined} style={{ top: pct(top), height: pct(Math.abs(yOf(v) - zeroY)) }} />}
                              </span>
                            );
                          })}
                        </div>
                      ))
                      : (
                        <svg viewBox="0 0 1000 1000" preserveAspectRatio="none">
                          {series.map((s, i) => {
                            const parts = runs(s.values);
                            const P = (ci: number, v: number) => `${(xOf(ci) * 1000).toFixed(2)} ${(yOf(v) * 1000).toFixed(2)}`;
                            const line = parts.map((r) => r.map(([ci, v], k) => `${k ? 'L' : 'M'}${P(ci, v)}`).join('')).join('');
                            const z = (zeroY * 1000).toFixed(2);
                            const wash = parts.map((r) => `M${(xOf(r[0][0]) * 1000).toFixed(2)} ${z}${r.map(([ci, v]) => `L${P(ci, v)}`).join('')}L${(xOf(r[r.length - 1][0]) * 1000).toFixed(2)} ${z}Z`).join('');
                            return (
                              <g key={s.id} {...seriesProps(i)}>
                                {kind === 'area' && <path className="chart-wash" d={wash} />}
                                <path className="chart-line" d={line} />
                              </g>
                            );
                          })}
                        </svg>
                      )}
                  </div>
                )}
                {hasData && kind !== 'bar' && (
                  <>
                    <span aria-hidden className="mu-chart-cross chart-cross" style={{ '--mu-chart-x': xOf(at) } as React.CSSProperties}>
                      <span className="mu-chart-crossline" />
                    </span>
                    {series.map((s, i) => {
                      const v = s.values[at];
                      const ok = v != null && Number.isFinite(v);
                      return (
                        <span key={s.id} aria-hidden {...seriesProps(i)} className="mu-chart-series chart-series absolute inset-0 pointer-events-none">
                          <span className="mu-chart-marker chart-marker" data-missing={ok ? undefined : ''} style={{ '--mu-chart-x': xOf(at), '--mu-chart-y': ok ? yOf(v) : zeroY } as React.CSSProperties}>
                            <span className="mu-chart-dot chart-dot" data-shape={SHAPES[pattern(i)]} />
                          </span>
                        </span>
                      );
                    })}
                  </>
                )}
                {loading && (
                  <div aria-hidden className="mu-chart-marks chart-marks">
                    {GHOSTS.map((g, i) => (
                      <span key={i} className="absolute bottom-0" style={{ left: pct((i + 0.2) / GHOSTS.length), width: pct(0.6 / GHOSTS.length), height: pct(g) }}>
                        <Skeleton height="100%" />
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {!loading && !hasData && <p className={MESSAGE}>{error ?? empty ?? 'No data yet'}</p>}
            </div>
            <div className={X} aria-hidden>
              {categories.map((c, i) => ((n - 1 - i) % step === 0 ? <span key={`${c}-${i}`} style={{ left: pct(xOf(i)) }}>{c}</span> : null))}
            </div>
          </div>
          <span id={`${id}-summary`} className="sr-only">{summary}</span>
          <span role="status" className="sr-only">{said}</span>
        </>
      )}
      {view === 'table' && !hasData && <p className="type-body text-ink2">{loading ? 'Loading\u2026' : error ?? empty ?? 'No data yet'}</p>}
      {hasData && table}
    </div>
  );
}
