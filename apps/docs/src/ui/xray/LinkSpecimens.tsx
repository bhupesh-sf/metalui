import * as React from 'react';
import { Link, type LinkKind, type LinkProps } from '@unlocalhosted/metalui';
import { tokens } from '../../lib/tokens';
import { STEP_AT, Readout, blip, clamp, summon, useHandle, useOnLand, useSpecimenZoom, type Hint, type Snap } from '../edit';
import './link-specimens.css';

/* ─────────────────────────────────────────────────────────
 * THE LINK'S SPECIMENS · the x-ray card for each part
 *
 *   states   drag the link sideways: it leans toward the next state, then snaps
 *   line     drag the line itself up or down; its weight and strength are readouts
 *   hover    the link held in its hover: drag the line up toward the words for the rise;
 *            a dashed ghost keeps where it rests
 *   press    press the link and pull down for how far the words sink; how much they dim
 *            is a readout
 *   kinds    drag the link sideways through inline, quiet and standalone
 *
 *   The model and every starting number are read from the link recipe in tokens.json,
 *   never from LinkXray (which imports this file).
 * ───────────────────────────────────────────────────────── */

const P = tokens.recipes.link.props;
const REST = Number(P.underline.ink.bone.match(/,\s*([\d.]+)\)$/)?.[1] ?? 0.3);

export type LinkState = 'rest' | 'hover' | 'pressed' | 'focus' | 'visited' | 'current' | 'disabled' | 'loading';
/** The real states, in the order a link meets them. */
export const STATES: LinkState[] = ['rest', 'hover', 'pressed', 'focus', 'visited', 'current', 'disabled', 'loading'];
export const KINDS: LinkKind[] = ['inline', 'quiet', 'standalone'];

export interface LinkModel {
  state: LinkState; kind: LinkKind;
  offset: number; thickness: number; rest: number;
  rise: number; hoverThickness: number; tint: number;
  travel: number; dim: number;
}
/** The recipe's own values. */
export const LINK_INITIAL: LinkModel = {
  state: 'rest', kind: 'inline',
  offset: P.underline.offset, thickness: P.underline.thickness, rest: REST,
  rise: P.hover.rise, hoverThickness: P.hover.thickness, tint: parseFloat(P.hover.tint),
  travel: P.self.travel, dim: Number(P.self.pressed),
};
export const TOKENS = LINK_INITIAL;

/** The recipe's variables from the model, so the specimen and the bench draw the same values. */
export function linkVars(m: LinkModel): React.CSSProperties {
  const v: Record<string, string> = {
    '--mu-r-link-underline-offset': `${m.offset}px`,
    '--mu-r-link-underline-thickness': `${m.thickness}px`,
    '--mu-r-link-hover-rise': `${m.rise}px`,
    '--mu-r-link-hover-thickness': `${m.hoverThickness}px`,
    '--mu-r-link-hover-tint': `${m.tint}%`,
    '--mu-r-link-self-travel': `${m.travel}px`,
    '--mu-r-link-self-pressed': `${m.dim}`,
  };
  // the recipe's own ink per colorway until the strength is tuned off it
  if (m.rest !== REST) v['--mu-r-link-underline-ink'] = `color-mix(in srgb, currentColor ${Math.round(m.rest * 100)}%, transparent)`;
  return v as React.CSSProperties;
}

/** What each state is, on the real Link. */
function stateProps(state: LinkState): Partial<LinkProps> & Record<`data-${string}`, string> {
  switch (state) {
    case 'hover': return { 'data-hovered': '' };
    case 'pressed': return { 'data-pressed': '' };
    case 'focus': return { 'data-focused': '' };
    case 'visited': return { href: '/components/link', visited: true };
    case 'current': return { 'aria-current': 'page' };
    case 'disabled': return { disabled: true, reason: 'Export is on the Pro plan' };
    case 'loading': return { loading: true };
    default: return {};
  }
}

const stay = (e: React.MouseEvent) => e.preventDefault();

/** The real Link as a specimen: it never navigates, and handles own the pointer. */
export function Specimen({ m, state = 'rest', kind, words = 'the export guide', ...rest }: { m: LinkModel; state?: LinkState; kind?: LinkKind; words?: string } & Partial<LinkProps> & Record<`data-${string}`, string | undefined>) {
  return <Link href="#x-ray" tabIndex={-1} onClick={stay} kind={kind ?? m.kind} style={linkVars(m)} {...stateProps(state)} {...rest}>{words}</Link>;
}

type Props = { m: LinkModel; set: (p: Partial<LinkModel>) => void; setPressed: (on: boolean) => void };


/* ───────────────────────── stepping: states and kinds ───────────────────────── */

/** Drag the link sideways through a set of real options: a lean, then a snap. */
function Stepper<T extends string>({ title, options, at, choose, children, render }: {
  title: string; options: T[]; at: T; choose: (t: T) => void; children: React.ReactNode;
  render: (lean: T | null) => React.ReactNode;
}) {
  const [well, zoom] = useSpecimenZoom();
  const [held, setHeld] = React.useState(false);
  const [peek, setPeek] = React.useState(false);
  const [lean, setLean] = React.useState<T | null>(null);
  const el = React.useRef<HTMLSpanElement>(null);
  const index = options.indexOf(at);
  const go = (i: number) => { const next = options[clamp(i, 0, options.length - 1)]; if (next !== at) choose(next); };
  useOnLand(at, () => blip(el.current?.querySelector('.ed-link-ring')));
  const handle = useHandle({
    zoom,
    hint: () => ({ gesture: 'steps', title, value: held ? (lean ? `→ ${lean}` : at) : undefined, how: `drag sideways for the next ${title.toLowerCase()}` }),
    keyHint: (): Hint => ({ gesture: 'steps', title, value: at, keys: [{ k: '←→', say: 'step' }] }),
    start: () => { setHeld(true); return { index, at: 0 }; },
    move: (s, dx) => {
      const travel = dx - s.at, d = Math.sign(travel), next = options[s.index + d];
      if (next && Math.abs(travel) >= STEP_AT) { go(s.index + d); s.index += d; s.at = dx; setLean(null); }
      else setLean(next && Math.abs(travel) > 2 ? next : null);
    },
    end: () => { setHeld(false); setLean(null); },
    step: (d) => go(index + Math.sign(d)), axis: 'x', over: setPeek,
  });
  return (
    <>
      {children}
      <div ref={well} className="ed-specimen">
        <div className="ed-link-steps" style={{ zoom }} data-hint-anchor>
          <span ref={el} className="ed-link-grab" data-peek={peek || held ? '' : undefined} data-lean={lean ? '' : undefined} role="slider" tabIndex={0}
            aria-label={title} aria-valuetext={at} aria-valuenow={index + 1} aria-valuemin={1} aria-valuemax={options.length} {...handle}>
            {render(lean)}
            <i className="ed-link-ring" aria-hidden />
          </span>
          {/* the real options, in order: the one it is ringed, the one it leans to lit */}
          <span className="ed-link-pips" aria-hidden>
            {options.map((o) => <span key={o} data-at={o === at ? '' : undefined} data-lean={o === lean ? '' : undefined} title={o} />)}
          </span>
        </div>
      </div>
      <div className="ed-readouts">
        <Readout label={title} value={at} unit="" snap={{ at: index, name: at }} peek={setPeek} pick={() => summon(el.current)} scrub={(d) => go(index + d)} />
      </div>
    </>
  );
}

function States({ m, set }: Props) {
  const say: Record<LinkState, string> = {
    rest: 'At rest it is the sentence\'s own words over an engraved hairline: the line is how you know it is a link, never the colour.',
    hover: 'Pointed at, the line rises toward the words and darkens, over a faint tint of their ink.',
    pressed: 'Pressed, the words sink one step and dim, like a key going down.',
    focus: 'From the keyboard it wears the green ring.',
    visited: 'Visited (in documents) the words step to ink2 and the line to ink3, a tone quieter.',
    current: 'A link to where you are has no line and full ink: it reads as here.',
    disabled: 'Unavailable it is ink3 with no line, and a tooltip says why; it still takes focus so the keyboard hears that too.',
    loading: 'Waiting for its route, a run of ink travels along the line.',
  };
  return (
    <Stepper title="State" options={STATES} at={m.state} choose={(state) => set({ state })}
      render={() => <Specimen m={m} state={m.state} kind="inline" />}>
      <p>{say[m.state]} Drag the link sideways to step through its states.</p>
    </Stepper>
  );
}

function Kinds({ m, set }: Props) {
  const say: Record<LinkKind, string> = {
    inline: 'Inline is the link in a sentence: always underlined.',
    quiet: 'Quiet has no line until you point at it, for dense lists and tables where everything is already a link.',
    standalone: 'Standalone sits on its own line, with a chevron after it that points the way.',
  };
  return (
    <Stepper title="Kind" options={KINDS} at={m.kind} choose={(kind) => set({ kind })} 
      render={() => <Specimen m={m} kind={m.kind} words={m.kind === 'standalone' ? 'All regions' : m.kind === 'quiet' ? 'Lisbon' : 'the export guide'} />}>
      <p>{say[m.kind]} Drag the link sideways to step through its kinds.</p>
    </Stepper>
  );
}

/* ───────────────────────── the line, at rest and on hover ───────────────────────── */

/** Where the real line is, in the specimen's own units: from the words' box, measured after each change. */
function useLineAt(box: React.RefObject<HTMLDivElement | null>, deps: unknown[]) {
  const [at, setAt] = React.useState({ y: 0, left: 0, width: 0 });
  React.useLayoutEffect(() => {
    const line = box.current?.querySelector<HTMLElement>('.mu-link-line');
    if (line) setAt({ y: line.offsetTop + line.offsetHeight, left: line.offsetLeft, width: line.offsetWidth });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return at;
}

const half = (v: number) => Math.round(v * 2) / 2;
const on = (v: number, at: number): Snap | undefined => (v === at ? { at, name: 'token' } : undefined);

function Line({ m, set }: Props) {
  const [well, zoom] = useSpecimenZoom();
  const box = React.useRef<HTMLDivElement>(null);
  const grip = React.useRef<HTMLSpanElement>(null);
  const [live, setLive] = React.useState(false);
  const [peek, setPeek] = React.useState(false);
  const at = useLineAt(box, [m.thickness]);
  // a drag catches on the token; a key or a readout step never does, so it can step past it
  const setOffset = (v: number, catches = false) => { const x = half(clamp(v, -2, 6)); set({ offset: catches && Math.abs(x - TOKENS.offset) <= 0.5 ? TOKENS.offset : x }); };
  useOnLand(live && m.offset === TOKENS.offset ? 'token' : undefined, () => blip(grip.current?.querySelector('i')));
  const handle = useHandle({
    zoom,
    hint: () => ({ gesture: 'press', title: 'Line', value: live ? `${m.offset}pt under the words` : undefined, how: 'drag the line up or down' }),
    keyHint: (): Hint => ({ gesture: 'press', title: 'Line', value: `${m.offset}pt`, keys: [{ k: '↑↓', say: 'move' }] }),
    start: () => m.offset, move: (o0, _dx, dy) => { setLive(true); setOffset(o0 + dy, true); }, end: () => setLive(false),
    step: (d) => setOffset(m.offset - d * 0.5), axis: 'y', over: setPeek,
  });
  return (
    <>
      <p>The line is an engraved hairline in the words' own ink, faint at rest, sitting just under the letters that hang down. Drag the line up or down to move it.</p>
      <div ref={well} className="ed-specimen">
        <div ref={box} className="ed-link-box" data-live={live ? '' : undefined} style={{ zoom }} data-hint-anchor>
          <Specimen m={m} kind="inline" />
          <span ref={grip} className="ed-link-rule" data-on={peek || live ? '' : undefined} style={{ top: at.y + m.offset - 3, left: at.left, width: at.width, height: 6 + m.thickness }}
            role="slider" tabIndex={0} aria-label="Line position" aria-valuetext={`${m.offset} points under the words`} aria-valuenow={m.offset} aria-valuemin={-2} aria-valuemax={6} {...handle}><i /></span>
        </div>
      </div>
      <div className="ed-readouts">
        <Readout label="under" value={`${m.offset}`} snap={on(m.offset, TOKENS.offset)} peek={setPeek} pick={() => summon(grip.current)} scrub={(d) => setOffset(m.offset + d * 0.5)} />
        <Readout label="weight" value={`${m.thickness}`} snap={on(m.thickness, TOKENS.thickness)} scrub={(d) => set({ thickness: clamp(half(m.thickness + d * 0.5), 0.5, 3) })} />
        <Readout label="strength" value={`${Math.round(m.rest * 100)}`} unit="%" snap={m.rest === REST ? { at: REST, name: 'token' } : undefined} scrub={(d) => set({ rest: clamp(Math.round(m.rest * 100 + d * 5) / 100, 0.1, 1) })} />
      </div>
    </>
  );
}

function Hover({ m, set }: Props) {
  const [well, zoom] = useSpecimenZoom();
  const box = React.useRef<HTMLDivElement>(null);
  const grip = React.useRef<HTMLSpanElement>(null);
  const [live, setLive] = React.useState(false);
  const [peek, setPeek] = React.useState(false);
  const at = useLineAt(box, [m.hoverThickness]);
  const setRise = (v: number, catches = false) => { const x = half(clamp(v, 0, 5)); set({ rise: catches && Math.abs(x - TOKENS.rise) <= 0.5 ? TOKENS.rise : x }); };
  useOnLand(live && m.rise === TOKENS.rise ? 'token' : undefined, () => blip(grip.current?.querySelector('i')));
  const handle = useHandle({
    zoom,
    hint: () => ({ gesture: 'press', title: 'Rise', value: live ? `${m.rise}pt toward the words` : undefined, how: 'drag the line up toward the words' }),
    keyHint: (): Hint => ({ gesture: 'press', title: 'Rise', value: `${m.rise}pt`, keys: [{ k: '↑↓', say: 'rise' }] }),
    start: () => m.rise, move: (r0, _dx, dy) => { setLive(true); setRise(r0 - dy, true); }, end: () => setLive(false),
    step: (d) => setRise(m.rise + d * 0.5), axis: 'y', over: setPeek,
  });
  const restY = at.y + m.offset;
  return (
    <>
      <p>Pointed at, the line rises toward the words on the settle spring, thickens and takes their full ink, and a faint tint of that ink lies behind them. The dashed line is where it rests. Drag the line up to change how far it rises.</p>
      <div ref={well} className="ed-specimen">
        <div ref={box} className="ed-link-box" data-live={live ? '' : undefined} style={{ zoom }} data-hint-anchor>
          <Specimen m={m} state="hover" kind="inline" />
          <i className="ed-link-ghost" aria-hidden style={{ top: restY, left: at.left, width: at.width }} />
          <span ref={grip} className="ed-link-rule" data-on={peek || live ? '' : undefined} style={{ top: restY - m.rise - 3, left: at.left, width: at.width, height: 6 + m.hoverThickness }}
            role="slider" tabIndex={0} aria-label="Rise on hover" aria-valuetext={`${m.rise} points`} aria-valuenow={m.rise} aria-valuemin={0} aria-valuemax={5} {...handle}><i /></span>
        </div>
      </div>
      <div className="ed-readouts">
        <Readout label="rises" value={`${m.rise}`} snap={on(m.rise, TOKENS.rise)} peek={setPeek} pick={() => summon(grip.current)} scrub={(d) => setRise(m.rise + d * 0.5)} />
        <Readout label="weight" value={`${m.hoverThickness}`} snap={on(m.hoverThickness, TOKENS.hoverThickness)} scrub={(d) => set({ hoverThickness: clamp(half(m.hoverThickness + d * 0.5), 0.5, 3) })} />
        <Readout label="tint" value={`${m.tint}`} unit="%" snap={on(m.tint, TOKENS.tint)} scrub={(d) => set({ tint: clamp(m.tint + d, 0, 20) })} />
      </div>
    </>
  );
}

/* ───────────────────────── press ───────────────────────── */

function Press({ m, set, setPressed }: Props) {
  const [well, zoom] = useSpecimenZoom();
  const [held, setHeld] = React.useState(false);
  const el = React.useRef<HTMLSpanElement>(null);
  const setTravel = (v: number, catches = false) => { const x = Math.round(clamp(v, 0, 3) * 4) / 4; set({ travel: catches && Math.abs(x - TOKENS.travel) <= 0.25 ? TOKENS.travel : x }); };
  const press = useHandle({
    zoom,
    hint: () => ({ gesture: 'press', title: 'Press depth', value: held ? `${m.travel}pt` : undefined, how: 'press and pull down' }),
    keyHint: (): Hint => ({ gesture: 'press', title: 'Press depth', value: `${m.travel}pt`, keys: [{ k: '↑↓', say: 'deeper' }] }),
    start: () => { setHeld(true); setPressed(true); return m.travel; }, move: (t0, _dx, dy) => setTravel(t0 + dy / 6, true), end: () => { setHeld(false); setPressed(false); },
    step: (d) => setTravel(m.travel - d * 0.25), axis: 'y',
  });
  return (
    <>
      <p>Pressed, the words sink one step, the same press as a button's key, and dim for as long as you hold. Press the link and pull down to choose how far it sinks.</p>
      <div ref={well} className="ed-specimen">
        <div className="ed-press" style={{ zoom }} data-hint-anchor>
          <span ref={el} className="ed-link-press" role="slider" tabIndex={0} aria-label="Press depth" aria-valuenow={m.travel} aria-valuemin={0} aria-valuemax={3} {...press}>
            <Specimen m={m} state={held ? 'pressed' : 'rest'} kind="inline" />
          </span>
          <div className="ed-gauge" aria-hidden data-held={held ? '' : undefined}>
            {[0, 1, 2, 3].map((n) => <i key={n} style={{ top: n * 6 }} data-token={n === TOKENS.travel ? '' : undefined} />)}
            <b style={{ top: m.travel * 6 }} />
          </div>
        </div>
      </div>
      <div className="ed-readouts">
        <Readout label="sinks" value={`${m.travel}`} snap={on(m.travel, TOKENS.travel)} peek={() => {}} pick={() => summon(el.current)} scrub={(d) => setTravel(m.travel + d * 0.25)} />
        <Readout label="dims to" value={`${Math.round(m.dim * 100)}`} unit="%" snap={on(m.dim, TOKENS.dim)} scrub={(d) => set({ dim: clamp(Math.round(m.dim * 100 + d * 4) / 100, 0.2, 1) })} />
      </div>
    </>
  );
}

export type LinkSpot = 'states' | 'shape' | 'slide' | 'press' | 'surface';

/** The card for a part of the link's x-ray. */
export function LinkSpecimenCard({ spot, ...props }: Props & { spot: LinkSpot }) {
  switch (spot) {
    case 'states': return <States {...props} />;
    case 'shape': return <Line {...props} />;
    case 'slide': return <Hover {...props} />;
    case 'press': return <Press {...props} />;
    case 'surface': return <Kinds {...props} />;
  }
}
