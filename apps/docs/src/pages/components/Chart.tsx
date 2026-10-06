import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Button, Chart, Switcher, type ChartKind, type ChartSeries } from '@unlocalhosted/metalui';
import { type SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';
import reactSource from '../../../../../packages/metalui/src/components/chart/chart.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalChart.swift?raw';
import agentSource from '../../../../../packages/metalui/src/components/chart/chart.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * CHART PAGE · a person's numbers, read off an instrument
 *
 *   usage     API requests this month against last month: a line (or an area, or bars), one day the
 *             collector was down, the readout following the pointer and the keys; the same numbers as
 *             a table
 *   regions   orders by region, two quarters side by side: grouped bars, Q3 the signal
 *   states    the numbers on their way (skeleton bars), none yet, and a failed load with Try again;
 *             loading resolves into the draw-in
 *   narrow    the usage chart in a 300 px card: the x labels thin out
 *   tune      DialKit: kind, how many series, the signal, zero, height, the arrival's spring
 * ───────────────────────────────────────────────────────── */

const DAYS = Array.from({ length: 30 }, (_, i) => `${i + 1} Sep`);
// A weekly rhythm with growth: weekdays busy, weekends quiet, a launch on the 16th.
const wave = (i: number, base: number, grow: number) => Math.round(base + grow * i + (i % 7 >= 5 ? -0.35 : 0.12) * base + (i >= 15 ? base * 0.3 : 0) + ((i * 37) % 11) * base * 0.02);
const THIS_MONTH = DAYS.map((_, i) => (i === 21 ? null : wave(i, 1200, 18)));
const LAST_MONTH = DAYS.map((_, i) => wave(i, 1050, 6));
const requests = (n: number) => `${(n / 1000).toFixed(1)} k`;

const USAGE: ChartSeries[] = [
  { id: 'this', label: 'September', values: THIS_MONTH, signal: true },
  { id: 'last', label: 'August', values: LAST_MONTH },
];

function Usage() {
  const [kind, setKind] = React.useState<ChartKind>('line');
  const [view, setView] = React.useState<'chart' | 'table'>('chart');
  return (
    <div className="grid w-full max-w-[720px] gap-16">
      <div className="flex flex-wrap gap-8">
        <Switcher size="compact" aria-label="Kind" value={kind} onValueChange={(v) => setKind(v as ChartKind)} options={[{ value: 'line', label: 'Line' }, { value: 'area', label: 'Area' }, { value: 'bar', label: 'Bars' }]} />
        <Switcher size="compact" aria-label="View" value={view} onValueChange={(v) => setView(v as 'chart' | 'table')} options={[{ value: 'chart', label: 'Chart' }, { value: 'table', label: 'Table' }]} />
      </div>
      <div className={view === 'table' ? 'max-h-[320px] overflow-auto' : undefined}>
        <Chart aria-label="API requests per day, September against August" kind={kind} view={view} categories={DAYS} series={USAGE} format={requests} />
      </div>
    </div>
  );
}

const REGIONS = ['Lisbon', 'Porto', 'Madrid', 'Paris', 'Berlin'];
const QUARTERS: ChartSeries[] = [
  { id: 'q2', label: 'Q2', values: [412, 268, 355, 498, 301] },
  { id: 'q3', label: 'Q3', values: [468, 254, 402, 520, 377], signal: true },
];

/* ── loading, empty and failed ───────────────────────────── */

type Phase = 'loading' | 'ready' | 'empty' | 'failed';

function States() {
  const [phase, setPhase] = React.useState<Phase>('ready');
  const timer = React.useRef(0);
  React.useEffect(() => () => window.clearTimeout(timer.current), []);
  const load = () => {
    setPhase('loading');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setPhase('ready'), 1400);
  };
  return (
    <div className="grid w-full max-w-[560px] gap-16">
      <Chart
        aria-label="Orders by region"
        kind="bar"
        categories={REGIONS}
        series={phase === 'empty' ? QUARTERS.map((s) => ({ ...s, values: s.values.map(() => null) })) : QUARTERS}
        loading={phase === 'loading'}
        empty="No orders in these quarters yet"
        error={phase === 'failed' ? <><span>Couldn’t load the orders.</span><Button size="compact" onClick={load}>Try again</Button></> : undefined}
      />
      <div className="flex flex-wrap gap-8">
        <Button size="compact" onClick={load}>Load</Button>
        <Button size="compact" onClick={() => setPhase('empty')}>Empty</Button>
        <Button size="compact" onClick={() => setPhase('failed')}>Fail</Button>
      </div>
    </div>
  );
}

/* CHART TUNER: the page's DialKit panel. kind and series change what is drawn (series 1 to 4 show the four
 * patterns and marker shapes); signal makes the first series the green one; zero lets a line hug its data;
 * height sets the plot; rise swaps the arrival's spring and slow stretches it; Replay sends the data again. */
const TUNE_SERIES: ChartSeries[] = [
  { id: 'a', label: 'Web', values: [42, 48, 45, 61, 58, 66, 72, 69, 80, 77, 85, 91] },
  { id: 'b', label: 'iOS', values: [30, 33, 39, 37, 44, 49, 47, 53, 58, 62, 60, 67] },
  { id: 'c', label: 'Android', values: [22, 25, 24, 29, 31, 30, 36, 38, 37, 41, 45, 44] },
  { id: 'd', label: 'Desktop', values: [12, 14, 13, 15, 18, 17, 19, 22, 21, 24, 23, 26] },
];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function Tuner() {
  const d = useDialKit('Chart', {
    kind: { type: 'select', options: ['line', 'area', 'bar'], default: 'line' },
    series: [4, 1, 4, 1],
    signal: true,
    zero: true,
    height: [200, 120, 320, 10],
    rise: { type: 'select', options: SPRING_NAMES, default: 'settle' },
    slow: [1, 1, 10],
  });
  const [round, setRound] = React.useState(0);
  const [away, setAway] = React.useState(false);
  const replay = () => {
    setAway(true);
    requestAnimationFrame(() => { setAway(false); setRound((r) => r + 1); });
  };
  const series = TUNE_SERIES.slice(0, d.series).map((s, i) => ({ ...s, signal: d.signal && i === 0, values: away ? s.values.map(() => null) : s.values }));
  return (
    <div data-testid="chart-tuner" data-round={round} className="grid w-full max-w-[720px] gap-16 justify-self-center" style={springVars('settle', d.rise as SpringName, d.slow) as React.CSSProperties}>
      <Chart aria-label="Weekly active people by platform, thousands" kind={d.kind as ChartKind} categories={MONTHS} series={series} zero={d.zero} height={d.height} format={(v) => `${v} k`} />
      <div><Button size="compact" onClick={replay}>Replay arrival</Button></div>
    </div>
  );
}

export default function ChartPage() {
  return (
    <ComponentPage
      capture="chart"
      title="Chart"
      lede="A person's numbers as an instrument's graph: lines, areas or bars on a sunk well with engraved hairlines, read off a readout that follows your pointer and your keys."
      play={{
        lede: 'Move along the plot, or focus it and use the arrow keys: the readout turns to each day and the markers follow. The 22nd is missing (the collector was down), so the line breaks and the readout says a dash. Switch to Table for the same numbers.',
        caption: 'a usage trend',
        wide: true,
        node: <div className="flex w-full justify-center"><Usage /></div>,
      }}
      more={[
        { id: 'regions', title: 'Comparing categories', lede: 'Grouped bars stand on the zero line. Q2 is hatched and Q3 is solid and green, so the two differ without colour too. Hover a region and a plate stands behind its bars.', node: <div className="flex w-full justify-center"><div className="w-full max-w-[560px]"><Chart aria-label="Orders by region, Q2 against Q3" kind="bar" categories={REGIONS} series={QUARTERS} /></div></div> },
        { id: 'states', title: 'Loading, empty and failed', lede: 'Load: after a beat, skeleton bars wait in the well; when the numbers arrive they rise from zero once. Empty and Fail say so in the well, over the zero line, and a failure carries its Try again.', node: <div className="flex w-full justify-center"><States /></div> },
        { id: 'narrow', title: 'Out of width', lede: 'The chart takes its container\'s width. In a narrow card the day labels thin out, counted back from the latest so it always shows.', node: <div className="flex w-full justify-center"><div className="w-full max-w-[300px]"><Chart aria-label="Narrow API requests" kind="area" categories={DAYS} series={[USAGE[0]]} format={requests} height={140} /></div></div> },
        { id: 'tune', title: 'Tune the chart', lede: 'The Chart panel changes the kind, shows one to four series (four patterns, four marker shapes), makes the first one the signal, lets a line leave zero, sets the height and swaps the arrival\'s spring. Replay sends the data again.', node: <Tuner /> },
      ]}
      usage={`<Chart
  aria-label="API requests per day"
  kind="line"
  categories={days}
  series={[
    { id: 'sep', label: 'September', values: september, signal: true },
    { id: 'aug', label: 'August', values: august },
  ]}
  format={(n) => \`\${(n / 1000).toFixed(1)} k\`}
  loading={isLoading}
/>`}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'swift', label: 'SwiftUI', code: swiftSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'CH1', title: 'A readout, not a tooltip', body: 'The values stand still over the plot and turn on the drum; nothing floats over the marks you are reading.', origin: 'Ours' },
        { id: 'CH2', title: 'Patterns before colour', body: 'Series differ by dash, fill and marker shape. Colour marks one signal series and never says anything alone.', origin: 'Ours' },
        { id: 'CH3', title: 'One axis, from zero', body: 'Bars and areas start at zero; a line may hug its data. Two measures get two charts, never two scales.', origin: 'Ours' },
      ]}
    />
  );
}
