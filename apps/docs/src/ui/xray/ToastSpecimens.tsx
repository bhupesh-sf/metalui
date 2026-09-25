import * as React from 'react';
import { Kbd, Row, Switch, toastParts as T } from '@unlocalhosted/metalui';
import { tokens } from '../../lib/tokens';
import { scalePx, type LayerDef } from './kit';
import { PILL, UNDO, type Model, type Spot } from './ToastXray';
import { CornerArc, Outline, Readout, blip, clamp, summon, useHandle, useOnLand, useSpecimenZoom, type Hint, type Seg } from '../edit';
import './toast-specimens.css';

/* ─────────────────────────────────────────────────────────
 * THE TOAST'S SPECIMENS · the x-ray card for each part
 *
 *   The card holds the real toast (its own part classes) to handle; the bench reads the
 *   same model. The toast has one height, one look and no sizes, so nothing here steps:
 *     timing   pull the toast down to where it rises from; let go and it arrives
 *     type     the space before the detail sits between the words; the detail switches
 *     undo     press the cap and it sinks; Undo switches
 *     shape    the left end is the space before the words, the right end the glass
 *              around the cap
 *     shadow   lift the toast up or set it down
 *     layers   a row with a switch per layer, pill and cap
 *   Every number is read from the toast recipe in tokens.json.
 * ───────────────────────────────────────────────────────── */

type Props = {
  spot: Spot; m: Model; set: (patch: Partial<Model>) => void; focus: (name: string | null) => void;
  /** Hold the bench at the pose it rises from (true), or let it go. */
  hold: (on: boolean) => void;
  /** Play the arrival on the bench. */
  replay: () => void;
  /** The Undo cap is held down. */
  press: (on: boolean) => void;
};

const RECIPE = tokens.recipes.toast;
const P = RECIPE.props;
const layer = (part: string, prop: string) => RECIPE.layers.filter((l) => l.part === part && l.prop === prop).map((l) => l.value);
const BG = layer('self', 'background')[0], SH = layer('self', 'shadow');
const CAP_BG = layer('undo', 'background')[0], CAP_SH = layer('undo', 'shadow');
const RISE = P.self.rise, SCALE = Number(P.self.scale);
const PAD_L = P.self['pad-left'], PAD_R = P.self['pad-right'], TEXT_GAP = P.text.gap;
const HEIGHT = P.self.height, CAP_H = P.undo.height;
const PRESS = parseFloat(tokens.motion.press.value);
const STAYS = { undo: tokens.toast['undo-ms'] / 1000, plain: tokens.toast['plain-ms'] / 1000 };
// the outer shadows (contact, near, far) follow the lift; the insets and the rim are the glass itself
const OUTER_FROM = SH.findIndex((v) => !v.startsWith('inset') && !/^0 0 0 /.test(v));

const round = (v: number) => Math.round(v * 10) / 10;
const token = (v: number, at: number) => (v === at ? { at, name: 'toast recipe token' } : undefined);
const catchAt = (v: number, at: number, reach: number) => (Math.abs(v - at) <= reach ? at : v);
const quiet = () => document.documentElement.classList.contains('rm') || matchMedia('(prefers-reduced-motion: reduce)').matches;
/** A pulse on a drawn guide (a border, not a stroke), for landing on a token. */
const pulse = (el: HTMLElement | null) => { if (el && !quiet()) el.animate([{ opacity: 0.8 }, { opacity: 1, borderWidth: '1.6px', offset: 0.3 }, { opacity: 0.8 }], { duration: 380, easing: 'cubic-bezier(.3,.7,.3,1)' }); };

/** The recipe's layers from the model: a layer that is off is gone, and the outer shadows scale with the lift. */
function look(m: Model): React.CSSProperties {
  const shadow = SH.map((v, i) => (!m.pill[i + 1] ? null : i >= OUTER_FROM ? (m.lift > 0 ? scalePx(v, m.lift) : null) : v)).filter(Boolean).join(', ') || 'none';
  return {
    ['--mu-r-toast-self-pad-left' as string]: `${m.padL}px`,
    ['--mu-r-toast-self-pad-right' as string]: `${m.padR}px`,
    ['--mu-r-toast-text-gap' as string]: `${m.textGap}px`,
    ['--mu-r-toast-self-background' as string]: m.pill[0] ? BG : 'transparent',
    ['--mu-r-toast-self-shadow' as string]: shadow,
    ['--mu-r-toast-undo-background' as string]: m.cap[0] ? CAP_BG : 'transparent',
    ['--mu-r-toast-undo-shadow' as string]: CAP_SH.filter((_, i) => m.cap[i + 1]).join(', ') || 'none',
    display: 'inline-flex',
    transition: 'none', // a tunable being dragged never chases the pointer
  };
}

/** The real toast, drawn with its own part classes (the live one lives in a portal). */
const Face = React.forwardRef<HTMLDivElement, { m: Model; gap?: React.ReactNode; cap?: React.HTMLAttributes<HTMLSpanElement> & { ref?: React.Ref<HTMLSpanElement> }; down?: boolean }>(
  function Face({ m, gap, cap, down }, ref) {
    return (
      <div ref={ref} className={`${T.TOAST} ed-toast`} style={look(m)}>
        <span className={T.TEXT}>
          <span>Moved 3 blocks</span>
          {m.sub && <span className={`${T.SUB} ed-toast-sub`}>{gap}· undo it any time</span>}
        </span>
        {m.undo && (
          <span {...cap} className={`${T.UNDO} ed-toast-cap`} style={{ translate: down ? `0 ${PRESS}px` : undefined }}>
            Undo <Kbd surface="plain" className={T.KEY}>⌘Z</Kbd>
          </span>
        )}
      </div>
    );
  },
);

/**
 * The specimen's magnification: the shared zoom, or less when the toast (a wide object)
 * would not fit the well. Handles read drags at the zoom actually shown.
 */
function useFit() {
  const [well, zoom] = useSpecimenZoom();
  const face = React.useRef<HTMLDivElement>(null);
  const [fit, setFit] = React.useState(zoom);
  React.useLayoutEffect(() => {
    const w = well.current, f = face.current;
    if (!w || !f) return;
    const read = () => { if (f.offsetWidth) setFit(Math.min(zoom, Math.floor(((w.clientWidth - 40) / f.offsetWidth) * 20) / 20)); };
    read();
    const ro = new ResizeObserver(read); ro.observe(w); ro.observe(f);
    return () => ro.disconnect();
  }, [zoom, well]);
  return { well, face, fit };
}

/* ───────────────────────── timing ───────────────────────── */

function Timing({ m, set, hold, replay }: Props) {
  const { well, face, fit } = useFit();
  const [live, setLive] = React.useState(false);
  const [peek, setPeek] = React.useState(false);
  const [cycle, setCycle] = React.useState(0);
  const grip = React.useRef<HTMLSpanElement>(null);
  const rest = React.useRef<HTMLSpanElement>(null);
  const arrive = () => { setCycle((n) => n + 1); replay(); };
  const setRise = (v: number, caught = true) => { const x = Math.round(clamp(v, 0, RISE * 3) * 2) / 2; set({ rise: caught ? catchAt(x, RISE, 1) : x }); };
  const setScale = (v: number) => set({ scale: Math.round(clamp(v, 0.8, 1) * 100) / 100 });
  const handle = useHandle({
    zoom: fit,
    hint: (): Hint => ({ gesture: 'press', title: 'Rises from', value: live ? `${m.rise}pt below` : undefined, how: 'drag down, then let go' }),
    keyHint: (): Hint => ({ gesture: 'press', title: 'Rises from', value: `${m.rise}pt below`, keys: [{ k: '↑↓', say: 'change' }] }),
    start: () => { hold(true); setLive(true); return m.rise; },
    move: (r0, _dx, dy) => setRise(r0 + dy),
    end: () => { setLive(false); hold(false); arrive(); },
    step: (d) => { setRise(m.rise + d, false); arrive(); }, axis: 'y',
    over: setPeek,
  });
  useOnLand(live && m.rise === RISE ? 'rise' : undefined, () => pulse(rest.current));
  const stays = m.undo ? STAYS.undo : STAYS.plain;
  return (
    <>
      <p>The toast rises in from just below and settles without bouncing. Pull it down to where it starts, then let go to watch it arrive.</p>
      <div ref={well} className="ed-specimen ed-toast-well">
        <div style={{ zoom: fit }}>
          <div className="ed-toast-rise" data-hint-anchor data-live={live ? '' : undefined} data-peek={peek ? '' : undefined}>
            <span ref={rest} className="ed-toast-rest" aria-hidden />
            <span ref={grip} className="ed-toast-grip" role="slider" tabIndex={0} aria-label="Rises from" aria-valuetext={`${m.rise} points below`} aria-valuenow={m.rise} aria-valuemin={0} aria-valuemax={RISE * 3}
              style={live ? { translate: `0 ${m.rise}px`, scale: String(m.scale), opacity: 0.55 } : undefined} {...handle}>
              <span key={cycle} className={cycle ? 'ed-toast-in' : undefined} style={{ ['--rise' as string]: `${m.rise}px`, ['--from' as string]: m.scale }}>
                <Face ref={face} m={m} />
              </span>
            </span>
          </div>
        </div>
      </div>
      <div className="ed-readouts">
        <Readout label="rises from" value={`${m.rise}`} snap={token(m.rise, RISE)} peek={setPeek} pick={() => summon(grip.current)} scrub={(d) => { setRise(m.rise + d, false); arrive(); }} />
        <Readout label="starts at" value={`${Math.round(m.scale * 100)}`} unit="%" snap={token(m.scale, SCALE)} scrub={(d) => { setScale(m.scale + d * 0.01); arrive(); }} />
        <Readout label="stays" value={`${stays}`} unit="s" snap={{ at: stays, name: m.undo ? 'with Undo' : 'without Undo' }} />
      </div>
    </>
  );
}

/* ───────────────────────── type ───────────────────────── */

function Type({ m, set }: Props) {
  const { well, face, fit } = useFit();
  const [live, setLive] = React.useState(false);
  const [peek, setPeek] = React.useState(false);
  const el = React.useRef<HTMLSpanElement>(null);
  const setGap = (v: number, caught = true) => { const x = round(clamp(v, 0, TEXT_GAP * 3)); set({ textGap: caught ? catchAt(x, TEXT_GAP, 0.6) : x }); };
  const handle = useHandle({
    zoom: fit,
    hint: (): Hint => ({ gesture: 'sides', title: 'Space before the detail', value: live ? `${m.textGap}pt` : undefined, how: 'drag sideways' }),
    keyHint: (): Hint => ({ gesture: 'sides', title: 'Space before the detail', value: `${m.textGap}pt`, keys: [{ k: '←→', say: 'change' }] }),
    start: () => m.textGap, move: (g0, dx) => { setLive(true); setGap(g0 + dx); }, end: () => setLive(false),
    step: (d) => setGap(m.textGap + d * 0.5, false),
    over: setPeek,
  });
  useOnLand(live && m.textGap === TEXT_GAP ? 'gap' : undefined, () => pulse(el.current));
  // the handle is the space itself, between the words and the detail: it frames the gap and never crosses a letter
  const gap = (
    <span ref={el} className="ed-toast-gap" style={{ width: m.textGap + 8, marginRight: -4 }} data-live={live ? '' : undefined} data-peek={peek ? '' : undefined}
      role="slider" tabIndex={0} aria-label="Space before the detail" aria-valuenow={m.textGap} aria-valuemin={0} aria-valuemax={TEXT_GAP * 3} {...handle} />
  );
  return (
    <>
      <p>First what happened, then a quieter detail after a dot. Drag the space before the detail sideways to change it.</p>
      <div ref={well} className="ed-specimen ed-toast-well">
        <div style={{ zoom: fit }}><div className="ed-toast-box" data-hint-anchor><Face ref={face} m={m} gap={gap} /></div></div>
      </div>
      <div className="ed-readouts">
        <Readout label="space before the detail" value={`${m.textGap}`} snap={token(m.textGap, TEXT_GAP)} peek={setPeek} pick={() => summon(el.current)} scrub={(d) => setGap(m.textGap + d * 0.5, false)} />
      </div>
      <Switches rows={[{ name: 'Detail', on: m.sub, set: (sub) => set({ sub }) }]} />
    </>
  );
}

/* ───────────────────────── undo ───────────────────────── */

function Undo({ m, set, press }: Props) {
  const { well, face, fit } = useFit();
  const [down, setDown] = React.useState(false);
  const hold = (on: boolean) => { setDown(on); press(on); };
  const handle = useHandle({
    zoom: fit,
    hint: (): Hint => ({ gesture: 'press', title: 'Undo', value: down ? 'pressed' : undefined, how: 'press the cap' }),
    keyHint: (): Hint => ({ gesture: 'press', title: 'Undo', keys: [{ k: 'Space', say: 'press' }] }),
    start: () => hold(true), move: () => {}, end: () => hold(false), step: () => {},
  });
  const cap = {
    ...handle, role: 'button', tabIndex: 0, 'aria-label': 'Undo', 'aria-pressed': down,
    onKeyDown: (e: React.KeyboardEvent<HTMLSpanElement>) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); hold(true); } handle.onKeyDown(e); },
    onKeyUp: (e: React.KeyboardEvent<HTMLSpanElement>) => { if (e.key === ' ' || e.key === 'Enter') hold(false); },
  } as React.HTMLAttributes<HTMLSpanElement>;
  return (
    <>
      <p>Undo is a small raised cap on the glass, the only thing you can press. Press it to feel it sink.</p>
      <div ref={well} className="ed-specimen ed-toast-well">
        <div style={{ zoom: fit }}><div className="ed-toast-box" data-hint-anchor><Face ref={face} m={m} cap={cap} down={down} /></div></div>
      </div>
      <div className="ed-readouts">
        <Readout label="cap height" value={`${CAP_H}`} snap={token(CAP_H, CAP_H)} />
        <Readout label="sinks" value={`${PRESS}`} snap={token(PRESS, PRESS)} />
      </div>
      <Switches rows={[{ name: 'Undo', on: m.undo, set: (undo) => set({ undo }) }]} />
    </>
  );
}

/* ───────────────────────── shape ───────────────────────── */

function Shape({ m, set }: Props) {
  const { well, face, fit } = useFit();
  const [live, setLive] = React.useState<'left' | 'right' | null>(null);
  const [over, setOver] = React.useState<'left' | 'right' | null>(null);
  const [peek, setPeek] = React.useState<'left' | 'right' | null>(null);
  const [W, setW] = React.useState(0);
  const segs = React.useRef<Partial<Record<Seg, SVGPathElement | null>>>({});
  const ends = React.useRef<Partial<Record<'left' | 'right', HTMLSpanElement | null>>>({});
  React.useLayoutEffect(() => {
    const f = face.current; if (!f) return;
    const read = () => setW(f.offsetWidth); read();
    const ro = new ResizeObserver(read); ro.observe(f);
    return () => ro.disconnect();
  }, [face]);
  const setLeft = (v: number, caught = true) => { const x = Math.round(clamp(v, PAD_L / 2, PAD_L * 2)); set({ padL: caught ? catchAt(x, PAD_L, 1) : x }); };
  const setRight = (v: number, caught = true) => { const x = round(clamp(v, 0, (HEIGHT - CAP_H) + PAD_R)); set({ padR: caught ? catchAt(x, PAD_R, 0.6) : x }); };
  const hover = (side: 'left' | 'right') => (on: boolean) => setOver((o) => (on ? side : o === side ? null : o));
  const left = useHandle({
    zoom: fit,
    hint: (): Hint => ({ gesture: 'sides', title: 'Space on the left', value: live === 'left' ? `${m.padL}pt` : undefined, how: 'drag the left end sideways' }),
    keyHint: (): Hint => ({ gesture: 'sides', title: 'Space on the left', value: `${m.padL}pt`, keys: [{ k: '←→', say: 'change' }] }),
    start: () => m.padL, move: (p0, dx) => { setLive('left'); setLeft(p0 - dx); }, end: () => setLive(null),
    step: (d) => setLeft(m.padL - d, false), over: hover('left'), grab: () => blip(segs.current.left, segs.current.corner),
  });
  const right = useHandle({
    zoom: fit,
    hint: (): Hint => ({ gesture: 'sides', title: 'Space around the cap', value: live === 'right' ? `${m.padR}pt` : undefined, how: 'drag the right end sideways' }),
    keyHint: (): Hint => ({ gesture: 'sides', title: 'Space around the cap', value: `${m.padR}pt`, keys: [{ k: '←→', say: 'change' }] }),
    start: () => m.padR, move: (p0, dx) => { setLive('right'); setRight(p0 + dx); }, end: () => setLive(null),
    step: (d) => setRight(m.padR + d * 0.5, false), over: hover('right'), grab: () => blip(segs.current.right),
  });
  useOnLand(live === 'left' && m.padL === PAD_L ? 'left' : undefined, () => blip(segs.current.left, segs.current.corner));
  useOnLand(live === 'right' && m.padR === PAD_R ? 'right' : undefined, () => blip(segs.current.right));
  const point = live ?? over ?? peek;
  const sides: Seg[] = m.undo ? ['left', 'right'] : ['left'];
  const shown: Seg[] = point ? [point] : sides;
  return (
    <>
      <p>{m.undo
        ? 'A pill of one height, with more room on the left where the words start. Drag its left end to change that room, or its right end to change the glass around the cap.'
        : 'A pill of one height; without Undo it has the same room at both ends. Drag its left end to change that room.'}</p>
      <div ref={well} className="ed-specimen ed-toast-well">
        <div style={{ zoom: fit }}>
          <div className="ed-box ed-toast-box" data-hint-anchor data-live={live ?? undefined} data-peek={peek ?? undefined}>
            <Face ref={face} m={m} />
            <div className="ed-overlay">
              <Outline W={W} h={HEIGHT} r={HEIGHT / 2} on={point ? [point] : []} only={shown} segs={segs} />
              {/* the outline leaves its top-left quarter to a corner handle; the toast has none, so the left end draws it whole */}
              {shown.includes('left') && <span className="ed-toast-leftend" aria-hidden><CornerArc r={HEIGHT / 2} on={point === 'left'} arcRef={(el) => { segs.current.corner = el; }} /></span>}
              <span ref={(el) => { ends.current.left = el; }} className="ed-edge is-x" style={{ left: -3 }} role="slider" tabIndex={0} aria-label="Space on the left" aria-valuenow={m.padL} aria-valuemin={PAD_L / 2} aria-valuemax={PAD_L * 2} {...left} />
              {m.undo && <span ref={(el) => { ends.current.right = el; }} className="ed-edge is-x" style={{ right: -3 }} role="slider" tabIndex={0} aria-label="Space around the cap" aria-valuenow={m.padR} aria-valuemin={0} aria-valuemax={HEIGHT - CAP_H + PAD_R} {...right} />}
            </div>
          </div>
        </div>
      </div>
      <div className="ed-readouts">
        <Readout label="height" value={`${HEIGHT}`} snap={token(HEIGHT, HEIGHT)} />
        <Readout label="space on the left" value={`${m.padL}`} snap={token(m.padL, PAD_L)} peek={(on) => setPeek(on ? 'left' : null)} pick={() => summon(ends.current.left ?? null)} scrub={(d) => setLeft(m.padL + d, false)} />
        {m.undo && <Readout label="space around the cap" value={`${m.padR}`} snap={token(m.padR, PAD_R)} peek={(on) => setPeek(on ? 'right' : null)} pick={() => summon(ends.current.right ?? null)} scrub={(d) => setRight(m.padR + d * 0.5, false)} />}
      </div>
    </>
  );
}

/* ───────────────────────── shadow ───────────────────────── */

function Shadow({ m, set }: Props) {
  const { well, face, fit } = useFit();
  const [live, setLive] = React.useState(false);
  const [peek, setPeek] = React.useState(false);
  const el = React.useRef<HTMLSpanElement>(null);
  const setLift = (v: number, caught = true) => { const x = round(clamp(v, 0, 3)); set({ lift: caught ? catchAt(x, 1, 0.15) : x }); };
  const handle = useHandle({
    zoom: fit,
    hint: (): Hint => ({ gesture: 'press', title: 'Height above the page', value: live ? m.lift.toFixed(1) : undefined, how: 'drag up to raise, down to lower' }),
    keyHint: (): Hint => ({ gesture: 'press', title: 'Height above the page', value: m.lift.toFixed(1), keys: [{ k: '↑↓', say: 'higher' }] }),
    start: () => m.lift, move: (l0, _dx, dy) => { setLive(true); setLift(l0 - dy / 6); }, end: () => setLive(false),
    step: (d) => setLift(m.lift + d * 0.1, false), axis: 'y', over: setPeek,
  });
  useOnLand(live && m.lift === 1 ? 'lift' : undefined, () => { if (!quiet()) el.current?.animate([{ scale: 1 }, { scale: 1.03, offset: 0.3 }, { scale: 1 }], { duration: 380, easing: 'cubic-bezier(.3,.7,.3,1)' }); });
  return (
    <>
      <p>The toast floats above the page with the same soft shadows as the toolbar. Drag it up to raise it: the shadow grows bigger and softer.</p>
      <div ref={well} className="ed-specimen ed-toast-well">
        <div style={{ zoom: fit }} data-hint-anchor>
          <span ref={el} className="ed-lift ed-toast-lift" data-live={live ? '' : undefined} data-peek={peek ? '' : undefined} style={{ translate: `0 ${-(m.lift - 1) * 3}px` }}
            role="slider" tabIndex={0} aria-label="Height above the page" aria-valuenow={m.lift} aria-valuemin={0} aria-valuemax={3} {...handle}>
            <Face ref={face} m={m} />
          </span>
        </div>
      </div>
      <div className="ed-readouts">
        <Readout label="height above the page" value={m.lift.toFixed(1)} unit="" snap={token(m.lift, 1)} peek={setPeek} pick={() => summon(el.current)} scrub={(d) => setLift(m.lift + d * 0.1, false)} />
      </div>
    </>
  );
}

/* ───────────────────────── layers ───────────────────────── */

function Layers({ m, set, focus }: Props) {
  const { well, face, fit } = useFit();
  const flip = (key: 'pill' | 'cap', i: number, on: boolean) => set({ [key]: m[key].map((v, j) => (j === i ? on : v)) } as Partial<Model>);
  const group = (title: string, key: 'pill' | 'cap', layers: LayerDef[]) => (
    <div className="ed-toast-group">
      <b className="eng">{title}</b>
      <div className="ed-layers">
        {layers.map((l, i) => (
          <Row.Root key={l.name} variant="list" className="ed-layer" data-off={m[key][i] ? undefined : ''}
            onPointerEnter={() => focus(l.name)} onPointerLeave={() => focus(null)}
            onClick={(e) => { if (!(e.target as HTMLElement).closest('.mu-switch')) flip(key, i, !m[key][i]); }}>
            <Row.Text>{l.name}</Row.Text>
            <Row.Trail><Switch size="small" aria-label={l.name} checked={m[key][i]} onCheckedChange={(v) => flip(key, i, v)} onFocus={() => focus(l.name)} onBlur={() => focus(null)} /></Row.Trail>
          </Row.Root>
        ))}
      </div>
    </div>
  );
  return (
    <>
      <p>The pill has eight layers and the Undo cap has three. Turn one off to see what it adds.</p>
      <div ref={well} className="ed-specimen ed-toast-well"><div style={{ zoom: fit }}><Face ref={face} m={m} /></div></div>
      {group('The pill', 'pill', PILL)}
      {m.undo && group('The Undo cap', 'cap', UNDO)}
    </>
  );
}

/** On/off things: a row with a switch each. */
function Switches({ rows }: { rows: { name: string; on: boolean; set: (on: boolean) => void }[] }) {
  return (
    <div className="ed-layers">
      {rows.map((r) => (
        <Row.Root key={r.name} variant="list" className="ed-layer" data-off={r.on ? undefined : ''}
          onClick={(e) => { if (!(e.target as HTMLElement).closest('.mu-switch')) r.set(!r.on); }}>
          <Row.Text>{r.name}</Row.Text>
          <Row.Trail><Switch size="small" aria-label={r.name} checked={r.on} onCheckedChange={r.set} /></Row.Trail>
        </Row.Root>
      ))}
    </div>
  );
}

/** The card for a part of the toast's x-ray. */
export function ToastSpecimenCard(props: Props) {
  switch (props.spot) {
    case 'states': return <Timing {...props} />;
    case 'type': return <Type {...props} />;
    case 'press': return <Undo {...props} />;
    case 'shape': return <Shape {...props} />;
    case 'shadow': return <Shadow {...props} />;
    case 'layers': return <Layers {...props} />;
  }
}
