import * as React from 'react';
import { IconButton, Row, Switch } from '@unlocalhosted/metalui';
import { Icon } from '@unlocalhosted/metalui/icons';
import { tokens } from '../../lib/tokens';
import { aim, useStateLayers } from './kit';
import { DOWN, UP, type Kind, type Model, type Spot } from './IconButtonXray';
import {
  STEP_AT, STEP_MOTION, CornerArc, Outline, Readout, blip, clamp, summon, useHandle, useOnLand, useSpecimenZoom, useStepMotion,
  type Hint, type Seg,
} from '../edit';
import './icon-button-specimens.css';

/* ─────────────────────────────────────────────────────────
 * THE ICON BUTTON'S SPECIMENS · the x-ray card for each part
 *
 *   The card holds the real IconButton to handle; the model on the bench reads the same
 *   values (IconButtonXray keeps the model). Each part offers its own handles:
 *     press    press the cap and pull down for how far it sinks
 *     latch    a row with a switch (or click the cap): it stays down with its LED
 *     shape    top edge for the size, the top-left corner for the corners, the glyph up
 *              or down for its size (all tunable, caught on the recipe's tokens)
 *     kinds    drag the button sideways: tool, ghost, mini (steps, never between)
 *     light    a sun on an arc above the cap
 *     layers   a row with a switch per layer, up or down
 *   Only the tool is a raised cap: a ghost or a mini has no press, latch, shape, light or
 *   layers to change, so those cards offer the way back to the tool instead.
 *   Tokens are read here from tokens.json, never from IconButtonXray at load (it imports
 *   this file: a circular import would leave its constants undefined).
 * ───────────────────────────────────────────────────────── */

const P = tokens.recipes['icon-button'].props;
type Props = { spot: Spot; m: Model; set: (patch: Partial<Model>) => void; focus: (name: string | null) => void; onPress: (on: boolean) => void };

/** The three real kinds, their words and their footprints, from the recipe. */
const KINDS: { value: Kind; word: string; w: number; h: number; r: number }[] = [
  { value: 'tool', word: 'tool', w: P.tool.size, h: P.tool.size, r: P.tool.radius },
  { value: 'ghost', word: 'ghost', w: P.ghost.size, h: P.ghost.size, r: P.ghost.size / 2 },
  { value: 'mini', word: 'mini', w: P.mini.w, h: P.mini.h, r: P.mini.h / 2 },
];
const round = (v: number, places = 1) => Number(v.toFixed(places));
const near = (v: number, at: number, reach: number) => (Math.abs(v - at) <= reach ? at : v);
const token = (v: number, at: number, name = 'token') => (v === at ? { at, name } : undefined);
const SIZE = { lo: P.tool.size / 2, hi: P.tool.size * 1.5 };
const GLYPH = { lo: P.tool.glyph / 2 };
const PRESS = { lo: 0, hi: P.tool.press * 4 };
/** A beat when a value lands on its token (a part that is not a stroke, so not blip); none under reduced motion. */
function pulse(el: Element | null | undefined, grow: string) {
  if (!el || document.documentElement.classList.contains('rm') || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  el.animate([{ scale: '1' }, { scale: grow, offset: 0.3 }, { scale: '1' }], { duration: 380, easing: 'cubic-bezier(.3,.7,.3,1)' });
}

/**
 * The cap's face from the model, the same recipe the bench draws: the fill turns with the
 * light, the shadows aim and scale with it, and a layer that is off is gone. Handed to the
 * real IconButton as its own recipe variables, so its pressed and latched states still work.
 */
function useFace(m: Model, held = false): React.CSSProperties {
  const up = useStateLayers('icon-button', '', 'tool');
  const down = useStateLayers('icon-button', 'pressed', 'tool');
  const grad = (v: string) => v.replace('linear-gradient(', `linear-gradient(${180 + m.lightDeg}deg, `);
  const shade = (list: string[], mask: boolean[]) => list.map((v, i) => (mask[i + 1] ? aim(v, m.lightDeg, m.lightK) : null)).filter(Boolean).join(', ') || 'none';
  const upBg = m.up[0] ? grad(up.fill) : 'transparent', upSh = shade(up.shadows, m.up);
  const downBg = m.down[0] ? grad(down.fill) : 'transparent', downSh = shade(down.shadows, m.down);
  return {
    ['--mu-r-icon-button-tool-size' as string]: `${m.size}px`,
    ['--mu-r-icon-button-tool-radius' as string]: `${m.radius}px`,
    ['--mu-r-icon-button-tool-glyph' as string]: `${m.glyph}px`,
    ['--mu-r-icon-button-tool-press' as string]: `${m.press}px`,
    ['--mu-r-icon-button-tool-background' as string]: held ? downBg : upBg,
    ['--mu-r-icon-button-tool-shadow' as string]: held ? downSh : upSh,
    ['--mu-r-icon-button-tool-pressed-background' as string]: downBg,
    ['--mu-r-icon-button-tool-pressed-shadow' as string]: downSh,
    ...(held ? { translate: `0 ${m.press}px` } : {}),
  };
}

/** The tool as the x-ray shows it: the select glyph, latched when the model says so. */
function Tool({ m, face, icon, ...rest }: { m: Model; face: React.CSSProperties; icon?: React.ReactNode } & Omit<React.ComponentProps<typeof IconButton>, 'label' | 'icon' | 'variant'>) {
  return <IconButton variant="tool" label="Select" icon={icon ?? <Icon name="select" />} pressed={m.latched} {...rest} style={{ ...face, ...rest.style }} />;
}

function Well({ well, zoom, light, children }: { well: React.RefObject<HTMLDivElement | null>; zoom: number; light?: boolean; children: React.ReactNode }) {
  return <div ref={well} className={`ed-specimen${light ? ' is-light' : ''}`}><div style={{ zoom }}>{children}</div></div>;
}

/** Press, on the specimen: hold the cap and pull down to set how far it sinks; the model sinks with it. */
function Press({ m, set, onPress }: Props) {
  const [well, zoom] = useSpecimenZoom();
  const [held, setHeld] = React.useState(false);
  const [peek, setPeek] = React.useState(false);
  const face = useFace(m, held);
  const el = React.useRef<HTMLSpanElement>(null);
  const change = (v: number, caught = true) => { const n = round(clamp(v, PRESS.lo, PRESS.hi)); set({ press: caught ? near(n, P.tool.press, 0.15) : n }); };
  const handle = useHandle({
    zoom,
    hint: () => ({ gesture: 'press', title: 'Press depth', value: held ? `${m.press}pt` : undefined, how: 'press and pull down' }),
    keyHint: (): Hint => ({ gesture: 'press', title: 'Press depth', value: `${m.press}pt`, keys: [{ k: '↑↓', say: 'deeper' }] }),
    start: () => { setHeld(true); onPress(true); return m.press; },
    move: (p0, _dx, dy) => change(p0 + dy / 6),
    end: () => { setHeld(false); onPress(false); },
    step: (d) => change(m.press - d * 0.1), axis: 'y', over: setPeek,
  });
  const mark = React.useRef<HTMLElement>(null);
  useOnLand(held && m.press === P.tool.press ? 'token' : undefined, () => pulse(mark.current, '1.4 2.6'));
  const ticks = Array.from({ length: PRESS.hi / P.tool.press + 1 }, (_, i) => i * P.tool.press);
  return (
    <>
      <p>When you press the cap it drops a little into its hole, then comes back up. Press it and pull down to choose how far it drops.</p>
      <Well well={well} zoom={zoom}>
        <div className="ed-press" data-hint-anchor>
          <span ref={el} className="ed-ib-hold" data-peek={peek || held ? '' : undefined} role="slider" tabIndex={0} aria-label="Press depth" aria-valuenow={m.press} aria-valuemin={PRESS.lo} aria-valuemax={PRESS.hi} {...handle}>
            <Tool m={m} face={face} tabIndex={-1} />
          </span>
          <div className="ed-gauge" aria-hidden data-held={held ? '' : undefined}>
            {ticks.map((n) => <i key={n} style={{ top: n * 6 }} data-token={n === P.tool.press ? '' : undefined} />)}
            <b ref={mark} style={{ top: m.press * 6 }} />
          </div>
        </div>
      </Well>
      <div className="ed-readouts">
        <Readout label="Press depth" value={`${m.press}`} snap={token(m.press, P.tool.press)} peek={setPeek} pick={() => summon(el.current)} scrub={(d) => change(m.press + d * 0.1, false)} />
      </div>
    </>
  );
}

/** Latch, on the specimen: a switch, or click the cap; latched, it stays down with its LED on. */
function Latch({ m, set }: Props) {
  const [well, zoom] = useSpecimenZoom();
  const face = useFace(m);
  return (
    <>
      <p>A tool you are using, like the pen you draw with, stays down, turns dark inside and lights a small green LED in its corner. Click the cap, or turn on the switch, to keep it down.</p>
      <Well well={well} zoom={zoom}><Tool m={m} face={face} onClick={() => set({ latched: !m.latched })} /></Well>
      <div className="ed-layers">
        <Row.Root variant="list" className="ed-layer" data-off={m.latched ? undefined : ''} onClick={(e) => { if (!(e.target as HTMLElement).closest('.mu-switch')) set({ latched: !m.latched }); }}>
          <Row.Text>Stay down</Row.Text>
          <Row.Trail><Switch size="small" aria-label="Stay down" checked={m.latched} onCheckedChange={(latched) => set({ latched })} /></Row.Trail>
        </Row.Root>
      </div>
    </>
  );
}

/** Shape, on the specimen: the top edge sets the size, the top-left corner the corners, the glyph its own size. */
function Shape({ m, set }: Props) {
  const [well, zoom] = useSpecimenZoom();
  const face = useFace(m);
  type Name = 'size' | 'corners' | 'glyph';
  const [live, setLive] = React.useState<Name | null>(null);
  const [peek, setPeek] = React.useState<Name | null>(null);
  const segs = React.useRef<Partial<Record<Seg, SVGPathElement | null>>>({});
  const refs = React.useRef<Partial<Record<Name, HTMLSpanElement | null>>>({});
  const setSize = (v: number, caught = true) => {
    const n = round(clamp(v, SIZE.lo, SIZE.hi));
    const size = caught ? near(n, P.tool.size, 0.6) : n;
    // the corners and the glyph never outgrow the cap
    set({ size, radius: Math.min(m.radius, size / 2), glyph: Math.min(m.glyph, size) });
  };
  const setCorners = (v: number, caught = true) => { const n = round(clamp(v, 0, m.size / 2)); set({ radius: caught ? near(n, P.tool.radius, 0.6) : n }); };
  const setGlyph = (v: number, caught = true) => { const n = Math.round(clamp(v, GLYPH.lo, m.size) * 2) / 2; set({ glyph: caught ? near(n, P.tool.glyph, 0.5) : n }); };
  const on = (name: Name) => (yes: boolean) => setPeek((p) => (yes ? name : p === name ? null : p));
  const sizeHandle = useHandle({
    zoom,
    hint: () => ({ gesture: 'sides', title: 'Size', value: live === 'size' ? `${m.size}pt` : undefined, how: 'drag up to make it bigger' }),
    keyHint: (): Hint => ({ gesture: 'sides', title: 'Size', value: `${m.size}pt`, keys: [{ k: '↑↓', say: 'bigger' }] }),
    start: () => m.size, move: (s0, _dx, dy) => { setLive('size'); setSize(s0 - dy * 2); }, end: () => setLive(null),
    step: (d) => setSize(m.size + d), axis: 'y', over: on('size'), grab: () => blip(segs.current.top),
  });
  const cornerHandle = useHandle({
    zoom,
    hint: () => ({ gesture: 'corner', title: 'Corners', value: live === 'corners' ? `${m.radius}pt` : undefined, how: 'drag in to round, out to square' }),
    keyHint: (): Hint => ({ gesture: 'corner', title: 'Corners', value: `${m.radius}pt`, keys: [{ k: '←→', say: 'rounder' }] }),
    start: () => m.radius, move: (r0, dx, dy) => { setLive('corners'); setCorners(r0 + (dx + dy) / 1.2); }, end: () => setLive(null),
    step: (d) => setCorners(m.radius + d), axis: 'both', over: on('corners'), grab: () => blip(segs.current.corner),
  });
  const glyphHandle = useHandle({
    zoom,
    hint: () => ({ gesture: 'type', title: 'Icon size', value: live === 'glyph' ? `${m.glyph}pt` : undefined, how: 'drag the icon up or down' }),
    keyHint: (): Hint => ({ gesture: 'type', title: 'Icon size', value: `${m.glyph}pt`, keys: [{ k: '↑↓', say: 'bigger' }] }),
    start: () => m.glyph, move: (g0, _dx, dy) => { setLive('glyph'); setGlyph(g0 - dy / 2); }, end: () => setLive(null),
    step: (d) => setGlyph(m.glyph + d * 0.5), axis: 'y', over: on('glyph'),
  });
  useOnLand(live === 'size' && m.size === P.tool.size ? 'size' : undefined, () => blip(segs.current.top, segs.current.bottom));
  useOnLand(live === 'corners' && m.radius === P.tool.radius ? 'corners' : undefined, () => blip(segs.current.corner));
  useOnLand(live === 'glyph' && m.glyph === P.tool.glyph ? 'glyph' : undefined, () => pulse(refs.current.glyph, '1.12'));
  const pointed = live ?? peek;
  const shown: Seg[] = pointed === 'size' ? ['top'] : pointed === 'corners' ? ['corner'] : pointed === 'glyph' ? [] : ['top', 'corner'];
  const lit: Seg[] = pointed === 'size' ? (live ? ['top', 'bottom'] : ['top']) : [];
  const glyph = (
    <span ref={(el) => { refs.current.glyph = el; }} className="ed-type-label ed-ib-glyph" role="slider" tabIndex={0} aria-label="Icon size" aria-valuenow={m.glyph} aria-valuemin={GLYPH.lo} aria-valuemax={m.size} {...glyphHandle}>
      <Icon name="select" size={m.glyph} />
    </span>
  );
  return (
    <>
      <p>A square cap with round corners and an icon in the middle. Drag the top edge to change its size, the top-left corner to change the corners, or the icon up and down to change the icon.</p>
      <Well well={well} zoom={zoom}>
        <div className="ed-box ed-typebox ed-ib-box" data-hint-anchor data-live={live ?? undefined} data-peek={peek ?? undefined} data-shown={shown.join(' ')} data-show={pointed === 'glyph' ? 'label' : undefined}>
          <Tool m={m} face={face} tabIndex={-1} icon={glyph} style={{ transition: live ? 'none' : undefined }} />
          <div className="ed-overlay">
            <Outline W={m.size} h={m.size} r={m.radius} on={lit} only={shown} segs={segs} />
            <span ref={(el) => { refs.current.size = el; }} className="ed-edge is-y" style={{ top: -3 }} role="slider" tabIndex={0} aria-label="Size" aria-valuenow={m.size} aria-valuemin={SIZE.lo} aria-valuemax={SIZE.hi} {...sizeHandle} />
            <span ref={(el) => { refs.current.corners = el; }} className="ed-corner" style={{ width: Math.max(m.radius, 6) + 3, height: Math.max(m.radius, 6) + 3 }} role="slider" tabIndex={0} aria-label="Corners" aria-valuenow={m.radius} aria-valuemin={0} aria-valuemax={m.size / 2} {...cornerHandle}>
              <CornerArc r={m.radius} on={pointed === 'corners'} arcRef={(el) => { segs.current.corner = el; }} />
            </span>
          </div>
        </div>
      </Well>
      <div className="ed-readouts">
        <Readout label="Size" value={`${m.size}`} snap={token(m.size, P.tool.size)} peek={on('size')} pick={() => summon(refs.current.size ?? null)} scrub={(d) => setSize(m.size + d, false)} />
        <Readout label="Corners" value={`${m.radius}`} snap={token(m.radius, P.tool.radius)} peek={on('corners')} pick={() => summon(refs.current.corners ?? null)} scrub={(d) => setCorners(m.radius + d, false)} />
        <Readout label="Icon size" value={`${m.glyph}`} snap={token(m.glyph, P.tool.glyph)} peek={on('glyph')} pick={() => summon(refs.current.glyph ?? null)} scrub={(d) => setGlyph(m.glyph + d * 0.5, false)} />
      </div>
    </>
  );
}

/** What a kind looks like on the specimen: the real IconButton in that variant. */
function KindButton({ m, face, kind, transition }: { m: Model; face: React.CSSProperties; kind: Kind; transition?: string }) {
  if (kind === 'tool') return <Tool m={m} face={face} tabIndex={-1} style={{ transition }} />;
  if (kind === 'ghost') return <IconButton variant="ghost" label="More" icon={<Icon name="more" />} tabIndex={-1} style={{ transition }} />;
  return <IconButton variant="mini" accept label="Accept" icon={<>✓</>} tabIndex={-1} style={{ transition }} />;
}

/** Kinds, on the specimen: drag the button sideways; it leans toward the next kind, then snaps to it. */
function Kinds({ m, set, spot }: Props) {
  const [well, zoom] = useSpecimenZoom();
  const face = useFace(m);
  const [lean, setLean] = React.useState<Kind | null>(null);
  const [held, setHeld] = React.useState(false);
  const [peek, setPeek] = React.useState(false);
  const motion = useStepMotion();
  const el = React.useRef<HTMLSpanElement>(null);
  const index = KINDS.findIndex((k) => k.value === m.kind);
  const choose = (d: number) => { const next = KINDS[clamp(index + Math.sign(d), 0, KINDS.length - 1)]; if (next.value !== m.kind) { motion.stepped(); set({ kind: next.value }); } };
  const handle = useHandle({
    zoom,
    hint: () => ({ gesture: 'steps', title: 'Kind', value: held ? (lean ? `→ ${lean}` : m.kind) : undefined, how: 'drag sideways for the next kind' }),
    keyHint: (): Hint => ({ gesture: 'steps', title: 'Kind', value: m.kind, keys: [{ k: '←→', say: 'step' }] }),
    start: () => { motion.held(); setHeld(true); return { index, at: 0 }; },
    move: (s, dx) => {
      const delta = dx - s.at, d = Math.sign(delta), next = KINDS[s.index + d];
      if (next && Math.abs(delta) >= STEP_AT) { choose(d); s.index += d; s.at = dx; setLean(null); }
      else setLean(next && Math.abs(delta) > 2 ? next.value : null);
    },
    end: () => { setHeld(false); setLean(null); motion.let(); },
    step: choose, axis: 'x', over: setPeek, grab: () => blip(el.current),
  });
  // a snap rides the part spring from one real footprint to the next; nothing moves under the finger
  const transition = motion.transition === STEP_MOTION.step ? ['width', 'height', 'border-radius'].map((p) => `${p} var(--spring-part-d) var(--spring-part)`).join(', ') : undefined;
  const target = lean ? KINDS.find((k) => k.value === lean)! : null;
  const box = target && (target.value === 'tool' ? { w: m.size, h: m.size, r: m.radius } : target);
  const word = KINDS[index].word;
  const say: Partial<Record<Spot, string>> = {
    press: `A ${word} is flat and does not drop when you press it; only the tool cap does. Drag it sideways to go back to the tool.`,
    states: `A ${word} never stays down; only the tool cap does. Drag it sideways to go back to the tool.`,
    shape: `A ${word} comes in one size and is always round; only the tool cap has a size and corners to change. Drag it sideways to go back to the tool.`,
    light: `A ${word} is flat, so there is no edge for the light to catch; only the tool cap has one. Drag it sideways to go back to the tool.`,
    layers: `A ${word} is one flat fill that shows when you hover it; only the tool cap is built in layers. Drag it sideways to go back to the tool.`,
  };
  return (
    <>
      <p>{spot !== 'surface' && m.kind !== 'tool' ? say[spot] : 'There are three kinds: a dark tool cap for a toolbar, a flat round ghost that fills when you hover it, and a tiny mini inside a chip. Drag the button sideways to change its kind.'}</p>
      <Well well={well} zoom={zoom}>
        <div className="ed-ib-kinds" data-hint-anchor>
          <span ref={el} className="ed-ib-kind" data-kind={m.kind} data-peek={peek || held ? '' : undefined} style={{ ['--ib-r' as string]: `${m.kind === 'tool' ? m.radius : KINDS[index].r}px` }} role="slider" tabIndex={0} aria-label="Kind" aria-valuetext={word} aria-valuenow={index + 1} aria-valuemin={1} aria-valuemax={KINDS.length} {...handle}>
            <KindButton m={m} face={face} kind={m.kind} transition={transition} />
          </span>
          {box && <i className="ed-ib-lean" data-target={lean} style={{ width: box.w, height: box.h, borderRadius: box.r }} aria-hidden />}
        </div>
      </Well>
      <div className="ed-readouts">
        <Readout label="Kind" value={word} unit="" snap={{ at: index, name: m.kind }} peek={setPeek} pick={() => summon(el.current)} scrub={choose} />
      </div>
    </>
  );
}

/** Light, on the specimen: a sun on a faint arc; around it turns the light, nearer makes it stronger. */
function Light({ m, set }: Props) {
  const [well, zoom] = useSpecimenZoom();
  const face = useFace(m);
  const [live, setLive] = React.useState(false);
  const [peek, setPeek] = React.useState(false);
  const sunEl = React.useRef<HTMLSpanElement>(null);
  const R = 40; // the orbit, in the specimen's own units, around the cap's centre
  const reach = (k: number) => R * (1.35 - k * 0.35); // stronger light sits nearer
  const at = (deg: number, k: number) => ({ x: Math.sin((deg * Math.PI) / 180) * reach(k), y: -Math.cos((deg * Math.PI) / 180) * reach(k) });
  const sun = at(m.lightDeg, m.lightK);
  const setLight = (x: number, y: number) => {
    const deg = clamp(Math.round((Math.atan2(x, -y) * 180) / Math.PI / 5) * 5, -90, 90);
    const k = clamp(Math.round(((1.35 - Math.hypot(x, y) / R) / 0.35) * 20) / 20, 0, 1.5);
    set({ lightDeg: near(deg, 0, 5), lightK: near(k, 1, 0.08) });
  };
  useOnLand(live && m.lightDeg === 0 && m.lightK === 1 ? 'home' : undefined, () => pulse(sunEl.current, '1.6'));
  const sunHandle = useHandle({
    zoom,
    hint: () => ({ gesture: 'corner', title: 'Light', value: live ? `${m.lightDeg === 0 ? 'top' : m.lightDeg < 0 ? `${-m.lightDeg}° left` : `${m.lightDeg}° right`} · ${Math.round(m.lightK * 100)}%` : undefined, how: 'drag around the cap, closer for stronger' }),
    keyHint: (): Hint => ({ gesture: 'corner', title: 'Light', value: `${m.lightDeg}° · ${Math.round(m.lightK * 100)}%`, keys: [{ k: '←→', say: 'turn' }, { k: '↑↓', say: 'stronger' }] }),
    start: () => ({ ...sun }), move: (s0, dx, dy) => { setLive(true); setLight(s0.x + dx, s0.y + dy); }, end: () => setLive(false),
    step: (d, e) => (e.key === 'ArrowUp' || e.key === 'ArrowDown' ? set({ lightK: round(clamp(m.lightK + d * 0.05, 0, 1.5), 2) }) : set({ lightDeg: clamp(m.lightDeg + d * 5, -90, 90) })), axis: 'both',
    over: setPeek,
  });
  return (
    <>
      <p>Light falls from the top, so the cap's top edge is bright when it is up; pressed down, the light sits on the bottom edge of the hole instead. Drag the sun to move the light, or closer to make it stronger.</p>
      <Well well={well} zoom={zoom} light>
        <div className="ed-lightbox ed-ib-light" data-lit={live || peek ? '' : undefined} data-hint-anchor>
          <Tool m={m} face={face} tabIndex={-1} />
          <svg className="ed-orbit" width={reach(0) * 2 + 2} height={reach(0) + 1} viewBox={`${-reach(0) - 1} ${-reach(0) - 1} ${reach(0) * 2 + 2} ${reach(0) + 1}`} style={{ translate: `0 ${-reach(0) / 2}px` }} aria-hidden>
            <path d={`M${-reach(0)} 0A${reach(0)} ${reach(0)} 0 0 1 ${reach(0)} 0`} />
            <path className="is-near" d={`M${-reach(1.5)} 0A${reach(1.5)} ${reach(1.5)} 0 0 1 ${reach(1.5)} 0`} />
          </svg>
          <span ref={sunEl} className="ed-sun" style={{ translate: `${sun.x}px ${sun.y}px` }} role="slider" tabIndex={0} aria-label="Light" aria-valuetext={`${m.lightDeg} degrees, ${Math.round(m.lightK * 100)} percent`} aria-valuenow={m.lightDeg} aria-valuemin={-90} aria-valuemax={90} {...sunHandle} />
        </div>
      </Well>
      <div className="ed-readouts">
        <Readout label="Light from" value={m.lightDeg === 0 ? 'top' : `${Math.abs(m.lightDeg)}`} unit={m.lightDeg === 0 ? '' : m.lightDeg < 0 ? '° left' : '° right'} snap={token(m.lightDeg, 0)} peek={setPeek} pick={() => summon(sunEl.current)} scrub={(d) => set({ lightDeg: clamp(m.lightDeg + d * 5, -90, 90) })} />
        <Readout label="Strength" value={`${Math.round(m.lightK * 100)}`} unit="%" snap={token(m.lightK, 1)} peek={setPeek} pick={() => summon(sunEl.current)} scrub={(d) => set({ lightK: round(clamp(m.lightK + d * 0.05, 0, 1.5), 2) })} />
      </div>
    </>
  );
}

/** Layers, on the specimen: a row with a switch per layer, for the cap up or (latched) down. */
function Layers({ m, set, focus }: Props) {
  const [well, zoom] = useSpecimenZoom();
  const face = useFace(m);
  const list = m.latched ? DOWN : UP, on = m.latched ? m.down : m.up;
  const toggle = (i: number, v: boolean) => set(m.latched ? { down: m.down.map((x, j) => (j === i ? v : x)) } : { up: m.up.map((x, j) => (j === i ? v : x)) });
  return (
    <>
      <p>{m.latched
        ? 'Held down, the cap is four layers. Turn a layer off to see what it adds; let the cap up under Latch to see the other set.'
        : 'Standing up, the cap is six layers. Turn a layer off to see what it adds; keep the cap down under Latch to see the other set.'}</p>
      <Well well={well} zoom={zoom}><Tool m={m} face={face} tabIndex={-1} /></Well>
      <div className="ed-layers">
        {list.map((l, i) => (
          <Row.Root key={l.name} variant="list" className="ed-layer" data-off={on[i] ? undefined : ''}
            onPointerEnter={() => focus(l.name)} onPointerLeave={() => focus(null)}
            onClick={(e) => { if (!(e.target as HTMLElement).closest('.mu-switch')) toggle(i, !on[i]); }}>
            <Row.Text>{l.name}</Row.Text>
            <Row.Trail><Switch size="small" aria-label={l.name} checked={on[i]} onCheckedChange={(v) => toggle(i, v)} onFocus={() => focus(l.name)} onBlur={() => focus(null)} /></Row.Trail>
          </Row.Root>
        ))}
      </div>
    </>
  );
}

/** The card for a part of the icon button's x-ray. */
export function IconButtonSpecimenCard(props: Props) {
  // only the tool is a raised cap; any other kind offers the way back to it
  if (props.spot === 'surface' || props.m.kind !== 'tool') return <Kinds {...props} />;
  switch (props.spot) {
    case 'press': return <Press {...props} />;
    case 'states': return <Latch {...props} />;
    case 'shape': return <Shape {...props} />;
    case 'light': return <Light {...props} />;
    case 'layers': return <Layers {...props} />;
  }
}
