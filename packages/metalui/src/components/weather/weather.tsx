'use client';

import * as React from 'react';
import { DotDisplay, useDotTick, type DotInk } from '../dot-display/dot-display';
import { Led } from '../led/led';
import { Rule } from '../rule/rule';
import { DEFAULT_SUN, MINI_INKS, SKY_INKS, mini, sky, type SunHours, type WeatherKind } from './sky';

/* ─────────────────────────────────────────────────────────
 * WEATHER: a slim raised slab with a dot sky sunk into it (the weather design, Bone and Graphite)
 *
 *   tile      180 square, a 6 rim around a 168 well: a 21 × 21 sky, the temperature in Doto and
 *             the weather's name and one fact engraved beside it
 *   large     400 × 560: the place and a one-line summary, a live LED and the clock; a 46 × 28
 *             sky with the temperature, the condition and feels, rain, wind; the next hours as
 *             7 × 7 dot glyphs; seven days as lit dots on one shared scale, one dot per degree,
 *             with an ink dot for now
 *   motion    the sky is drawn for the clock and stepped by the dot display (6 a second); it
 *             holds still under reduced motion, in a hidden tab and off screen
 *   a11y      each sky is an image named in words ("Lisbon at 09:00: Sunny, 19°"); the hours are a
 *             list and the week a table, each row named in full
 * ───────────────────────────────────────────────────────── */

export type { WeatherKind, SunHours } from './sky';

/** A sky that steps on the display's clock. `phase` offsets the frame so tiles side by side differ. */
function Sky({ cols, rows, hz, kind, clock, sun, phase = 0, running }: { cols: number; rows: number; hz: number; kind: WeatherKind; clock: number; sun: SunHours; phase?: number; running: boolean }) {
  const ref = React.useRef<SVGSVGElement>(null);
  const tick = useDotTick(ref, running) + phase;
  const dots = React.useMemo(() => sky(cols, rows, hz, kind, clock, tick, sun), [cols, rows, hz, kind, clock, tick, sun]);
  return <DotDisplay ref={ref} cols={cols} rows={rows} dots={dots} inks={SKY_INKS} className="absolute inset-0" data-kind={kind} data-tick={tick} />;
}

const SLAB = 'mu-weather box-border recipe-weather';
const WELL = 'relative overflow-hidden material-well';

export interface WeatherTileProps extends React.HTMLAttributes<HTMLElement> {
  kind: WeatherKind;
  /** The temperature as shown: "21°". */
  temp: string;
  /** The weather's name, engraved: "Clear", "Rain". */
  name: string;
  /** One fact: "Rain 80%", "42 km/h". */
  meta: string;
  /** The hour it is where the weather is (0–24), for the sun, the moon and the stars. */
  clock: number;
  sun?: SunHours;
  /** Offsets the frame so tiles side by side don't move in step. */
  phase?: number;
  /** False holds the sky on its frame. */
  running?: boolean;
  'aria-label': string;
}

export const WeatherTile = React.forwardRef<HTMLElement, WeatherTileProps>(function WeatherTile(
  { kind, temp, name, meta, clock, sun = DEFAULT_SUN, phase, running = true, className, ...props }, ref) {
  const own = `${SLAB} size-weather-tile-size p-weather-tile-pad rounded-weather-tile-radius`;
  return (
    <article ref={ref} role="img" data-kind={kind} className={className ? `${own} ${className}` : own} {...props}>
      <div className={`${WELL} h-weather-tile-well rounded-weather-tile-well-radius`}>
        <Sky cols={21} rows={21} hz={13} kind={kind} clock={clock} sun={sun} phase={phase} running={running} />
        <div className="absolute left-weather-tile-text-x right-weather-tile-text-x bottom-weather-tile-text-y flex items-end justify-between">
          <span className="type-pixel text-ink">{temp}</span>
          <div className="flex flex-col items-end gap-weather-tile-meta-gap pb-weather-tile-meta-pad">
            <span className="type-label engraved">{name}</span>
            <span className="type-readout text-ink2">{meta}</span>
          </div>
        </div>
      </div>
    </article>
  );
});

/** One of the next hours. */
export interface WeatherHour {
  /** "Now", "12", "15". */
  label: string;
  kind: WeatherKind;
  /** The sun is up at that hour (a sun glyph, not a moon). */
  day: boolean;
  temp: string;
  /** "12:00, Partly cloudy, 24°". */
  'aria-label': string;
}

/** The week row's line glyphs (the MetalUI life-icon construction: 24 grid, stroke 1.7, round caps). */
export type WeatherDayKind = 'sun' | 'partly' | 'cloud' | 'rain';
const SUN_DISC = 'M8.1 12a3.9 3.9 0 1 0 7.8 0a3.9 3.9 0 1 0-7.8 0Z';
const SUN_RAYS = 'M12 5.6L12 3.6M7.47 7.47L6.06 6.06M5.6 12L3.6 12M7.47 16.53L6.06 17.94M12 18.4L12 20.4M16.53 16.53L17.94 17.94M18.4 12L20.4 12M16.53 7.47L17.94 6.06';
const CLOUD = 'M7.2 16.4h10a3.6 3.6 0 0 0 .5-7.2 5.4 5.4 0 0 0-10.4-.9A4.05 4.05 0 0 0 7.2 16.4Z';
const RAIN_CLOUD = 'M7.2 14.2h10a3.6 3.6 0 0 0 .5-7.2 5.4 5.4 0 0 0-10.4-.9A4.05 4.05 0 0 0 7.2 14.2Z';
const DROPS = 'M8.4 17.2l-.8 1.8M12.2 17.2l-.8 1.8M16 17.2l-.8 1.8';
const SMALL_SUN = 'M3.8 6.6a2.8 2.8 0 1 0 5.6 0a2.8 2.8 0 1 0-5.6 0Z';
const SMALL_RAYS = 'M6.6 2.3V1M2.3 6.6H1M3.56 3.56L2.64 2.64M9.64 3.56L10.56 2.64M3.56 9.64L2.64 10.56';
const SMALL_CLOUD = 'M9.76 15.96h8a2.88 2.88 0 0 0 .4-5.76 4.32 4.32 0 0 0-8.32-.72A3.24 3.24 0 0 0 9.76 15.96Z';
const GLYPHS: Record<WeatherDayKind, { fill: string; op: number; stroke: string }> = {
  sun: { fill: SUN_DISC, op: 0.24, stroke: SUN_DISC + SUN_RAYS },
  partly: { fill: SMALL_SUN + SMALL_CLOUD, op: 0.2, stroke: SMALL_SUN + SMALL_RAYS + SMALL_CLOUD },
  cloud: { fill: CLOUD, op: 0.12, stroke: CLOUD },
  rain: { fill: RAIN_CLOUD, op: 0.12, stroke: RAIN_CLOUD + DROPS },
};
const DAY_INK: Record<WeatherDayKind, DotInk> = { sun: 'sun', partly: 'sun', cloud: 'cloud-dark', rain: 'rain' };

/** One day of the week. */
export interface WeatherDay {
  /** "Today", "Sun". */
  name: string;
  kind: WeatherDayKind;
  lo: number;
  hi: number;
  /** "Today: rain, low 14°, high 24°". */
  'aria-label': string;
}

export interface WeatherProps extends React.HTMLAttributes<HTMLElement> {
  place: string;
  /** "Sunny now · partly cloudy from 11:00". */
  summary: string;
  /** Live (a green LED) or paused. */
  live?: boolean;
  /** "Live", "Paused", "Updated 09:10". */
  status: string;
  /** "09:00". */
  clockText: string;
  /** The hour it is there (0–24). */
  clock: number;
  sun?: SunHours;
  kind: WeatherKind;
  temp: string;
  condition: string;
  /** "Feels 20° · Rain 0% · 9 km/h". */
  detail: string;
  /** The sky in words: "Lisbon at 09:00: Sunny, 19°". */
  skyLabel: string;
  hours: WeatherHour[];
  days: WeatherDay[];
  /** The week's shared scale, one dot per degree (default 10 to 30). */
  scale?: { min: number; max: number };
  /** The temperature now, as an ink dot on today's range. */
  now?: number;
  /** How a scale number reads: "10°". */
  format?: (degrees: number) => string;
  running?: boolean;
}

const WEEK_COLUMNS = { gridTemplateColumns: 'var(--mu-r-weather-week-day) var(--mu-r-weather-week-glyph) var(--mu-r-weather-week-lo) var(--mu-r-weather-week-bar) var(--mu-r-weather-week-hi)' };
const WEEK_ROW = 'grid items-center gap-x-weather-week-col-gap h-weather-week-row';
const degrees = (c: number) => `${Math.round(c)}°`;

function Range({ lo, hi, kind, now, min, max }: { lo: number; hi: number; kind: WeatherDayKind; now?: number; min: number; max: number }) {
  const cols = max - min + 1;
  const dots = React.useMemo(() => {
    const d = new Uint8Array(cols);
    for (let c = min; c <= max; c++) if (c >= lo && c <= hi) d[c - min] = 1;
    if (now !== undefined) { const at = Math.round(now) - min; if (at >= 0 && at < cols) d[at] = 2; }
    return d;
  }, [cols, lo, hi, now, min, max]);
  return <DotDisplay cols={cols} rows={1} dots={dots} inks={['off', DAY_INK[kind], 'ink']} data-lo={lo} data-hi={hi} />;
}

export const Weather = React.forwardRef<HTMLElement, WeatherProps>(function Weather(
  { place, summary, live = true, status, clockText, clock, sun = DEFAULT_SUN, kind, temp, condition, detail, skyLabel, hours, days,
    scale = { min: 10, max: 30 }, now, format = degrees, running = true, className, ...props }, ref) {
  const own = `${SLAB} flex flex-col w-weather-width h-weather-height p-weather-pad rounded-weather-radius gap-weather-gap`;
  return (
    <article ref={ref} aria-label={`Weather in ${place}`} className={className ? `${own} ${className}` : own} {...props}>
      <header className="flex items-start justify-between gap-weather-header-gap pt-weather-header-pad-top px-weather-header-pad-x">
        <div className="flex flex-col gap-weather-header-title-gap">
          <h2 className="m-0 type-display text-ink">{place}</h2>
          <p className="m-0 type-meta text-ink2">{summary}</p>
        </div>
        <div className="flex items-center gap-weather-header-status-gap h-weather-header-status-height">
          <Led kind={live ? 'live' : 'off'} />
          <span className="type-meta text-ink2">{status}</span>
          <span className="type-readout text-ink2">{clockText}</span>
        </div>
      </header>

      <div role="img" aria-label={skyLabel} className={`${WELL} flex-none h-weather-sky-height rounded-weather-sky-radius`}>
        <Sky cols={46} rows={28} hz={21} kind={kind} clock={clock} sun={sun} running={running} />
        <div className="absolute left-weather-sky-text-x right-weather-sky-text-x bottom-weather-sky-text-y flex items-end justify-between gap-weather-sky-text-gap">
          <span className="type-pixel text-ink">{temp}</span>
          <div className="flex flex-col items-end gap-weather-sky-meta-gap pb-weather-sky-meta-pad">
            <span className="type-content text-ink">{condition}</span>
            <span className="type-readout text-ink2">{detail}</span>
          </div>
        </div>
      </div>

      <ol aria-label="Next hours" className="m-0 p-0 list-none grid grid-cols-6 h-weather-hours-height">
        {hours.map((h, i) => (
          <li key={i} aria-label={h['aria-label']} className="flex flex-col items-center justify-center gap-weather-hours-gap">
            <span className="type-label engraved">{h.label}</span>
            <DotDisplay cols={7} rows={7} dots={mini(h.kind, h.day)} inks={MINI_INKS} size="mini" data-kind={h.kind} />
            <span className="type-pixel-small text-ink">{h.temp}</span>
          </li>
        ))}
      </ol>

      <Rule orientation="horizontal" className="mx-weather-rule-inset" />

      <div role="table" aria-label="Seven-day forecast" className="flex flex-col gap-weather-week-gap h-weather-week-height px-weather-week-pad-x">
        <div role="row" className={WEEK_ROW} style={WEEK_COLUMNS}>
          <span role="columnheader" className="type-label engraved">{days.length} days</span>
          <span />
          <span role="columnheader" className="type-label engraved text-right">Low</span>
          <div aria-hidden className="flex justify-between type-tick text-ink2">
            <span>{format(scale.min)}</span><span>{format((scale.min + scale.max) / 2)}</span><span>{format(scale.max)}</span>
          </div>
          <span role="columnheader" className="type-label engraved">High</span>
        </div>
        {days.map((d, i) => {
          const g = GLYPHS[d.kind];
          return (
            <div key={i} role="row" aria-label={d['aria-label']} className={WEEK_ROW} style={WEEK_COLUMNS}>
              <span className={`type-figure text-ink ${i === 0 ? 'font-semibold' : 'font-medium'}`}>{d.name}</span>
              <svg viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" className="size-weather-week-glyph text-icon stroke-width-weather-week-stroke">
                <path d={g.fill} fill="currentColor" fillOpacity={g.op} stroke="none" />
                <path d={g.stroke} />
              </svg>
              <span className="type-figure text-right text-ink2">{format(d.lo)}</span>
              <Range lo={d.lo} hi={d.hi} kind={d.kind} now={i === 0 ? now : undefined} min={scale.min} max={scale.max} />
              <span className="type-figure font-semibold text-ink">{format(d.hi)}</span>
            </div>
          );
        })}
      </div>
    </article>
  );
});
