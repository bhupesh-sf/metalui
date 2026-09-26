import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Weather, WeatherTile, useDotTick, type WeatherDay, type WeatherDayKind, type WeatherHour, type WeatherKind } from '@unlocalhosted/metalui';
import source from '../../../../../packages/metalui/src/components/weather/weather.tsx?raw';
import skySource from '../../../../../packages/metalui/src/components/weather/sky.ts?raw';
import agentGuide from '../../../../../packages/metalui/src/components/weather/weather.agent.md?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalWeather.swift?raw';
import { Bench, PageHeader, Rules, Section, SourceTabs } from '../../ui/doc';
import { SwiftCapture } from '../../ui/SwiftCapture';

// Sample day in Lisbon, Saturday 26 September. Sunrise 07:25, sunset 19:31. °C and km/h.
const SUN = { rise: 7.5, set: 19.5 };
const PERIODS: { from: number; to: number; kind: WeatherKind; cond: string }[] = [
  { from: 0, to: 5.5, kind: 'clear', cond: 'Clear night' },
  { from: 5.5, to: 8.5, kind: 'mist', cond: 'Morning mist' },
  { from: 8.5, to: 11, kind: 'clear', cond: 'Sunny' },
  { from: 11, to: 14, kind: 'partly', cond: 'Partly cloudy' },
  { from: 14, to: 15.5, kind: 'rain', cond: 'Light rain' },
  { from: 15.5, to: 16.5, kind: 'storm', cond: 'Thunder' },
  { from: 16.5, to: 19.5, kind: 'cloud', cond: 'Cloudy' },
  { from: 19.5, to: 24, kind: 'clear', cond: 'Clear night' },
];
const TEMPS: [number, number][] = [[0, 15], [4, 14], [7, 14], [9, 19], [12, 24], [14, 23], [16, 21], [18, 20], [21, 17], [24, 15]];
const WINDS: [number, number][] = [[0, 8], [9, 9], [12, 14], [15, 22], [18, 16], [21, 10], [24, 8]];
const RAIN: Record<WeatherKind, number> = { clear: 0, mist: 5, partly: 10, cloud: 20, rain: 70, storm: 90, snow: 60, windy: 5, heat: 0 };
const OVERRIDE: Record<string, WeatherKind> = { Clear: 'clear', 'Partly cloudy': 'partly', Cloudy: 'cloud', Rain: 'rain', Thunderstorm: 'storm', Snow: 'snow', Mist: 'mist', Windy: 'windy', Heat: 'heat' };
const TILES: { kind: WeatherKind; name: string; t: number; meta?: string; wind?: number }[] = [
  { kind: 'clear', name: 'Clear', t: 21, meta: 'Dry' },
  { kind: 'partly', name: 'Partly', t: 20, meta: 'Rain 10%' },
  { kind: 'cloud', name: 'Cloudy', t: 17, meta: 'Rain 20%' },
  { kind: 'rain', name: 'Rain', t: 14, meta: 'Rain 80%' },
  { kind: 'storm', name: 'Thunder', t: 16, meta: 'Rain 90%' },
  { kind: 'snow', name: 'Snow', t: -3, meta: 'Snow 60%' },
  { kind: 'mist', name: 'Mist', t: 9, meta: 'Vis 800 m' },
  { kind: 'windy', name: 'Windy', t: 15, wind: 42 },
  { kind: 'heat', name: 'Heat', t: 38, meta: 'UV 10' },
];
const DAYS: { name: string; kind: WeatherDayKind; lo: number; hi: number }[] = [
  { name: 'Sat', kind: 'rain', lo: 14, hi: 24 },
  { name: 'Sun', kind: 'partly', lo: 15, hi: 23 },
  { name: 'Mon', kind: 'sun', lo: 16, hi: 26 },
  { name: 'Tue', kind: 'sun', lo: 17, hi: 28 },
  { name: 'Wed', kind: 'cloud', lo: 16, hi: 25 },
  { name: 'Thu', kind: 'rain', lo: 14, hi: 20 },
  { name: 'Fri', kind: 'partly', lo: 13, hi: 21 },
];

const lerp = (table: [number, number][], h: number) => {
  for (let i = 0; i < table.length - 1; i++) {
    const [a0, a1] = table[i]!, [b0, b1] = table[i + 1]!;
    if (h >= a0 && h <= b0) return a1 + (b1 - a1) * (h - a0) / (b0 - a0);
  }
  return table[table.length - 1]![1];
};
const period = (h: number) => PERIODS.find((p) => h >= p.from && h < p.to) ?? PERIODS[0]!;
const wrap = (v: number, n: number) => ((v % n) + n) % n;
const two = (n: number) => (n < 10 ? '0' : '') + n;

export default function WeatherPage() {
  const d = useDialKit('Weather', {
    cycle: true,
    dayLength: [48, 12, 180, 6],
    hour: [9, 0, 23.75, 0.25],
    weather: { type: 'select', options: ['Forecast', ...Object.keys(OVERRIDE)], default: 'Forecast' },
    animate: true,
    fahrenheit: false,
  });
  const clockRef = React.useRef<HTMLDivElement>(null);
  const step = useDotTick(clockRef, d.cycle);
  const [base, setBase] = React.useState({ hour: d.hour, step: 0 });
  React.useEffect(() => setBase({ hour: d.hour, step }), [d.hour]); // eslint-disable-line react-hooks/exhaustive-deps
  const clock = d.cycle ? wrap(base.hour + (step - base.step) * 24 / (d.dayLength * 6), 24) : d.hour;

  const f = d.fahrenheit;
  const deg = (c: number) => (f ? Math.round(c * 9 / 5 + 32) : Math.round(c)) + '°';
  const speed = (k: number) => (f ? Math.round(k * 0.621) + ' mph' : Math.round(k) + ' km/h');
  const hh = Math.floor(clock), mm = Math.floor((clock - hh) * 60 / 5) * 5;
  const clockText = `${two(hh)}:${two(mm)}`;
  const per = period(clock);
  const forced = OVERRIDE[d.weather];
  const kind = forced ?? per.kind;
  const day = clock >= SUN.rise && clock <= SUN.set;
  let cond = forced ? d.weather : per.cond;
  if (kind === 'clear' && forced) cond = day ? 'Clear' : 'Clear night';
  const t = lerp(TEMPS, clock);
  const next = PERIODS.find((p) => p.from > clock && p.kind !== per.kind);
  const summary = forced ? `Showing ${d.weather.toLowerCase()} · Lisbon`
    : next ? `${per.cond} now · ${next.cond.toLowerCase()} from ${two(Math.floor(next.from))}:${next.from % 1 ? '30' : '00'}` : `${per.cond} until midnight`;

  const start = Math.ceil((clock + 0.01) / 3) * 3;
  const slots = [clock, ...[0, 1, 2, 3, 4].map((n) => start + n * 3)];
  const hours: WeatherHour[] = slots.map((h, i) => {
    const hw = wrap(h, 24), p = period(hw), k = forced ?? p.kind;
    const label = i === 0 ? 'Now' : two(Math.floor(hw));
    return { label, kind: k, day: hw >= SUN.rise && hw <= SUN.set, temp: deg(lerp(TEMPS, hw)), 'aria-label': `${i === 0 ? 'Now' : label + ':00'}, ${forced ? d.weather : p.cond}, ${deg(lerp(TEMPS, hw))}` };
  });
  const days: WeatherDay[] = DAYS.map((x, i) => ({ ...x, name: i === 0 ? 'Today' : x.name, 'aria-label': `${i === 0 ? 'Today' : x.name}: ${x.kind}, low ${deg(x.lo)}, high ${deg(x.hi)}` }));

  return (
    <>
      <PageHeader
        title="Weather"
        lede="A slim raised slab with a dot sky sunk into it. The sky is drawn for the clock: the sun on its arc, the moon and stars at night, a warm glow at dawn and dusk, and one picture for each weather. The large widget adds the place, the next hours and the week on one dot scale."
      />
      <Section title="The widget and the tiles" lede="One day in Lisbon on a running clock. Every tile runs on the same clock, a few frames apart.">
        <Bench caption="weather · 400 × 560 · tile 180 · sky 46 × 28 and 21 × 21 · pitch 8">
          <div ref={clockRef} className="flex flex-wrap items-start justify-center gap-32" data-testid="weather-bench" data-clock={clock.toFixed(2)}>
            <Weather
              place="Lisbon"
              summary={summary}
              live={d.cycle}
              status={d.cycle ? 'Live' : 'Paused'}
              clockText={clockText}
              clock={clock}
              sun={SUN}
              kind={kind}
              temp={deg(t)}
              condition={cond}
              detail={`Feels ${deg(t - (t > 22 ? -1 : 1))} · Rain ${RAIN[kind]}% · ${speed(lerp(WINDS, clock))}`}
              skyLabel={`Lisbon at ${clockText}: ${cond}, ${deg(t)}`}
              hours={hours}
              days={days}
              now={forced ? undefined : t}
              format={deg}
              running={d.animate}
              data-testid="weather-large"
            />
            <div className="grid grid-cols-3 gap-10" data-testid="weather-tiles">
              {TILES.map((x, i) => (
                <WeatherTile key={x.kind} kind={x.kind} temp={deg(x.t)} name={x.name} meta={x.wind ? speed(x.wind) : x.meta!}
                  clock={clock} sun={SUN} phase={i * 5} running={d.animate} aria-label={`${x.name}, ${deg(x.t)} at ${clockText}`} />
              ))}
            </div>
          </div>
        </Bench>
        <SwiftCapture name="weather" maxWidth={1000} />
      </Section>
      <Section title="Rules">
        <Rules
          rules={[
            { id: 'W1', title: 'One sky per weather', body: 'Clear, partly, cloudy, rain, thunder, snow, mist, wind and heat each have one picture. The clock moves the sun and the moon; the weather never changes the colours.' },
            { id: 'W2', title: 'The slab stays slim', body: 'A 6 rim around the tile\'s well, 16 around the large widget. The sky is the object.' },
            { id: 'W3', title: 'One scale for the week', body: 'Every day\'s low to high is lit on the same dots, one per degree, so days compare at a glance. An ink dot marks now.' },
            { id: 'W4', title: 'Words for every picture', body: 'Each sky is named in words, the hours are a list and the week a table.' },
          ]}
        />
      </Section>
      <Section title="Source">
        <SourceTabs tabs={[
          { id: 'react', label: 'React', code: source },
          { id: 'sky', label: 'Sky', code: skySource },
          { id: 'swift', label: 'SwiftUI', code: swiftSource },
          { id: 'agent', label: 'Agent guide', code: agentGuide },
        ]} />
      </Section>
    </>
  );
}
