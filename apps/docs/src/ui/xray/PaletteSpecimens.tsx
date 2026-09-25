import * as React from 'react';
import { Kbd, Row as ListRow, Switch, paletteParts as P } from '@unlocalhosted/metalui';
import { Icon } from '@unlocalhosted/metalui/icons';
import { tokens } from '../../lib/tokens';
import { useStateLayers, type LayerDef } from './kit';
import { STEP_AT, CornerArc, Readout, blip, clamp, summon, useHandle, useOnLand, useSpecimenZoom, type Hint } from '../edit';
import './palette-specimens.css';

/* ─────────────────────────────────────────────────────────
 * PALETTE SPECIMENS · the x-ray card holds a still of the real palette
 *
 *   The palette lives in a dialog, so the card shows it the way its own stills do:
 *   the component's part classes (paletteParts), with its --mu-palette-* tokens
 *   overridden by the shared model. The field is a real input: type and the rows
 *   refilter, ↑↓ move the chosen row. Every other value is a handle on the still.
 *
 *   This file owns the model (PaletteXray imports it), so nothing here reads the
 *   x-ray at load time.
 * ───────────────────────────────────────────────────────── */

const T = tokens.palette;
const RADIUS = tokens.foundations.radius;

export type Spot = 'well' | 'states' | 'type' | 'press' | 'surface' | 'layers';

export const LAYERS: LayerDef[] = [
  { name: 'Frost', why: 'A light, slightly see-through plate. You can still sense the page under it.' },
  { name: 'Inner glow', why: 'A soft light just inside the edge.' },
  { name: 'Top light', why: 'A bright edge along the top left.' },
  { name: 'Bottom shade', why: 'A faint dark edge along the bottom right.' },
  { name: 'Rim', why: 'A very thin outline.' },
  { name: 'Contact', why: 'A small shadow.' },
  { name: 'Near shadow', why: 'A soft shadow, a bit bigger.' },
  { name: 'Mid shadow', why: 'A larger soft shadow.' },
  { name: 'Far shadow', why: 'A very big, very faint shadow. The palette floats as high as a dialog.' },
];

export interface Model {
  q: string; sel: number;
  fieldH: number; fieldR: number; fieldPad: number;
  rowH: number; rowR: number;
  secTop: number; markOffset: number;
  footGap: number; footTop: number; pinnable: boolean; status: boolean;
  pad: number; radius: number;
  on: boolean[];
}
export const INITIAL: Model = {
  q: 'tidy', sel: 0,
  fieldH: T['field-height'], fieldR: T['field-radius'], fieldPad: T['field-pad-start'],
  rowH: T['row-height'], rowR: RADIUS.row,
  secTop: T['sec-pad-top'], markOffset: T['mark-offset'],
  footGap: T['foot-gap'], footTop: T['foot-pad-top'], pinnable: true, status: false,
  pad: T.pad, radius: RADIUS.card,
  on: LAYERS.map(() => true),
};
/** What the footer says on its right when the answer source is shown. */
export const STATUS = 'SYNC OFFLINE';

export type PRow = { sec: string; label: string; key?: string; icon: 'search' | 'plus' | 'tidy' | 'trash'; danger?: boolean };
const ACTIONS: PRow[] = [
  { sec: 'ACTIONS', label: 'New canvas', key: '⌘N', icon: 'plus' },
  { sec: 'ACTIONS', label: 'Tidy the canvas', key: '⌘T', icon: 'tidy' },
  { sec: 'ACTIONS', label: 'Delete selection', key: '⌫', icon: 'trash', danger: true },
];
export const rowsFor = (q: string): PRow[] => {
  const t = q.trim().toLowerCase();
  const acts = t ? ACTIONS.filter((a) => a.label.toLowerCase().includes(t)) : ACTIONS;
  return [...(t ? [{ sec: 'LENS', label: `See “${q.trim()}”`, icon: 'search' as const }] : []), ...acts];
};
export const sectionsOf = (rows: PRow[]) => rows.reduce<{ name: string; rows: (PRow & { i: number })[] }[]>((acc, r, i) => {
  const last = acc[acc.length - 1];
  if (last && last.name === r.sec) last.rows.push({ ...r, i }); else acc.push({ name: r.sec, rows: [{ ...r, i }] });
  return acc;
}, []);
export const chosen = (m: Model) => Math.min(m.sel, Math.max(0, rowsFor(m.q).length - 1));

/** The plate's fill and shadows for the colorway, with the layers that are off left out. */
export function usePlate(on: boolean[]) {
  const plate = useStateLayers('surface', 'plate');
  const fill = on[0] ? plate.fill : 'transparent';
  const shadow = plate.shadows.filter((_, i) => on[i + 1]).join(', ') || 'none';
  return { fill, shadow, all: plate, colorway: plate.colorway };
}

type Props = { spot: Spot; m: Model; set: (patch: Partial<Model>) => void; focus: (name: string | null) => void };

const round = (v: number, by = 1) => Math.round(v / by) * by;
const near = (v: number, at: number, reach: number) => (Math.abs(v - at) <= reach ? at : v);
const token = (v: number, at: number) => (v === at ? { at, name: 'palette token' } : undefined);

/* ───────────────────────── the still ───────────────────────── */

/** The query with each typed word marked, as the palette marks it. */
function Marked({ text, query }: { text: string; query: string }) {
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return <>{text}</>;
  const parts = text.split(new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi'));
  return <>{parts.map((p, i) => (i % 2 ? <mark key={i} className={P.MARK}>{p}</mark> : p))}</>;
}

function Still({ m, set, width }: { m: Model; set: Props['set']; width: number }) {
  const { fill, shadow } = usePlate(m.on);
  const rows = rowsFor(m.q);
  const s = chosen(m);
  const vars = {
    position: 'static', transform: 'none', translate: 'none', margin: 0, opacity: 1, width,
    background: fill, boxShadow: shadow, transition: 'none',
    ['--mu-palette-pad' as string]: `${m.pad}px`,
    ['--mu-palette-field-height' as string]: `${m.fieldH}px`,
    ['--mu-palette-field-radius' as string]: `${m.fieldR}px`,
    ['--mu-palette-field-pad-start' as string]: `${m.fieldPad}px`,
    ['--mu-palette-row-height' as string]: `${m.rowH}px`,
    ['--mu-palette-sec-pad-top' as string]: `${m.secTop}px`,
    ['--mu-palette-mark-offset' as string]: `${m.markOffset}px`,
    ['--mu-palette-foot-gap' as string]: `${m.footGap}px`,
    ['--mu-palette-foot-pad-top' as string]: `${m.footTop}px`,
    ['--radius-card' as string]: `${m.radius}px`,
    ['--radius-row' as string]: `${m.rowR}px`,
  } as React.CSSProperties;
  const move = (d: number) => rows.length && set({ sel: (s + d + rows.length) % rows.length });
  return (
    <div className={`${P.POPUP} ed-pal-still`} style={vars}>
      <label className={P.FIELD}>
        <span aria-hidden className={P.FIELD_GLYPH}><Icon name="search" size={T['field-glyph']} /></span>
        <input className={P.INPUT} value={m.q} placeholder="Lens or action" aria-label="Palette query" autoComplete="off" spellCheck={false}
          onChange={(e) => set({ q: e.target.value, sel: 0 })}
          onKeyDown={(e) => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); move(e.key === 'ArrowDown' ? 1 : -1); } }} />
        <Kbd size="small" label="Escape closes">⎋</Kbd>
      </label>
      <div className={P.LIST} style={{ maxHeight: 'none', overflow: 'visible' }}>
        {sectionsOf(rows).map((sec) => (
          <div key={sec.name} className="mu-palette-group">
            <div className={P.SEC}><span className={P.ENG}>{sec.name}</span><span className={P.ENG} aria-hidden>{sec.rows.length}</span></div>
            {sec.rows.map((r) => (
              <div key={r.label} className={P.ROW} data-highlighted={r.i === s ? '' : undefined} data-danger={r.danger ? '' : undefined} data-row={r.i} onClick={() => set({ sel: r.i })}>
                <span aria-hidden className={P.ROW_GLYPH}><Icon name={r.icon} size={T['row-glyph']} /></span>
                <span className={P.ROW_TEXT}><Marked text={r.label} query={m.q} /></span>
                {r.key && <span className={P.ROW_HINT}><Kbd size="small">{r.key}</Kbd></span>}
              </div>
            ))}
          </div>
        ))}
      </div>
      {!rows.length && <div className="mu-palette-empty type-ui">Nothing matches</div>}
      <div className={P.FOOT} aria-hidden>
        <span className={P.FOOT_KEYS}><Kbd size="small">↑</Kbd><Kbd size="small">↓</Kbd><span className={P.ENG}>MOVE</span></span>
        <span className={P.FOOT_KEYS}><Kbd size="small">↩</Kbd><span className={P.ENG}>OPEN</span></span>
        {m.pinnable && <span className={P.FOOT_KEYS}><Kbd size="small">⇧↩</Kbd><span className={P.ENG}>PIN</span></span>}
        {m.status && <span className={`${P.ENG} ed-pal-status`}>{STATUS}</span>}
      </div>
    </div>
  );
}

/* ───────────────────────── measuring the still ───────────────────────── */

type Box = { x: number; y: number; w: number; h: number };
const NONE: Box = { x: 0, y: 0, w: 0, h: 0 };

/** Where the still's parts are, in its own (unzoomed) units, re-read whenever it changes. */
function useParts(box: React.RefObject<HTMLDivElement | null>, deps: unknown[]) {
  const [parts, setParts] = React.useState<Record<string, Box | Box[]>>({});
  React.useLayoutEffect(() => {
    const el = box.current; if (!el) return;
    const read = () => {
      const b = el.getBoundingClientRect(); const k = b.width / (el.offsetWidth || 1) || 1;
      const at = (n: Element | null | undefined): Box => { if (!n) return NONE; const r = n.getBoundingClientRect(); return { x: (r.left - b.left) / k, y: (r.top - b.top) / k, w: r.width / k, h: r.height / k }; };
      const q = (s: string) => el.querySelector(s);
      // the first match's baseline: a zero-size probe on it, read and removed at once
      const mk = q('.mu-palette-mark'); let baseline = 0;
      if (mk) { const probe = document.createElement('span'); probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline'; mk.appendChild(probe); baseline = at(probe).y; probe.remove(); }
      setParts({
        plate: at(q('.mu-palette')), field: at(q('.mu-palette-field')), glyph: at(q('.mu-palette-field-glyph')),
        sec: at(q('.mu-palette-sec')), secText: at(q('.mu-palette-sec .mu-palette-eng')), mark: at(q('.mu-palette-mark')),
        foot: at(q('.mu-palette-foot')), keys: [...el.querySelectorAll('.mu-palette-foot > span')].map(at),
        rows: [...el.querySelectorAll('.mu-palette-row')].map(at), baseline: { ...NONE, y: baseline },
      });
    };
    read();
    const ro = new ResizeObserver(read); ro.observe(el);
    return () => ro.disconnect();
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  const one = (n: string) => (parts[n] as Box | undefined) ?? NONE;
  const many = (n: string) => (parts[n] as Box[] | undefined) ?? [];
  return { one, many };
}

/**
 * The palette is a big component: its still is shown at three quarters of the usual
 * magnification, and never so large that the plate would be narrower than its footer
 * of keys. The plate then fills the well, the way the real one fills a narrow window.
 */
const PAL_ZOOM = 0.75, MIN_W = 290;
function useFit() {
  const [well, z0] = useSpecimenZoom();
  const [w, setW] = React.useState(0);
  React.useLayoutEffect(() => {
    const el = well.current; if (!el) return;
    const read = () => setW(el.clientWidth);
    read();
    const ro = new ResizeObserver(read); ro.observe(el);
    return () => ro.disconnect();
  }, [well]);
  const room = Math.max(0, w - 24);
  const zoom = w ? Math.min(z0 * PAL_ZOOM, room / MIN_W) : z0 * PAL_ZOOM;
  const width = w ? Math.min(T.width, Math.floor(room / zoom)) : MIN_W;
  return { well, zoom, width };
}

/* ───────────────────────── a tunable handle ───────────────────────── */

interface Tune {
  name: string; value: number; at: number; min: number; max: number; by?: number;
  /** Which way a drag makes it bigger: 'up' | 'down' | 'left' | 'right' | 'out' (a corner). */
  grow: 'up' | 'down' | 'left' | 'right' | 'out';
  how: string; write: (v: number) => void;
}

/** A hairline handle that moves freely and catches on its token, with a blip when it lands. */
function useTune(t: Tune, ctx: { zoom: number; active: string | null; setActive: (n: string | null) => void; setPeek: (n: string | null) => void; line: () => Element | null }) {
  const by = t.by ?? 1;
  const put = (v: number, caught = true) => { const n = clamp(round(v, by), t.min, t.max); t.write(caught ? near(n, t.at, by * 1.2) : n); };
  const unit = by < 1 ? `${t.value.toFixed(1)}pt` : `${t.value}pt`;
  const gesture: Hint['gesture'] = t.grow === 'out' ? 'corner' : 'sides';
  const keys = t.grow === 'up' || t.grow === 'down' ? '↑↓' : '←→';
  const events = useHandle({
    zoom: ctx.zoom,
    hint: () => ({ gesture, title: t.name, value: ctx.active === t.name ? unit : undefined, how: t.how }),
    keyHint: () => ({ gesture, title: t.name, value: unit, keys: [{ k: keys, say: 'change' }, { k: '⇧', say: 'faster' }] }),
    start: () => t.value,
    move: (v0, dx, dy) => {
      ctx.setActive(t.name);
      const d = { up: -dy, down: dy, left: -dx, right: dx, out: (dx + dy) / 2 }[t.grow];
      put(v0 + d / 2);
    },
    end: () => ctx.setActive(null),
    step: (d) => put(t.value + d * by),
    axis: t.grow === 'up' || t.grow === 'down' ? 'y' : t.grow === 'out' ? 'both' : 'x',
    over: (on) => ctx.setPeek(on ? t.name : null),
    grab: () => blip(ctx.line()),
  });
  useOnLand(ctx.active === t.name && t.value === t.at ? t.name : undefined, () => blip(ctx.line()));
  return { events, put, unit };
}

/** The shared frame of a card: sentence, the still in its well with an overlay of handles, readouts. */
function useCard() {
  const { well, zoom, width } = useFit();
  const box = React.useRef<HTMLDivElement>(null);
  const [active, setActive] = React.useState<string | null>(null);
  const [peek, setPeek] = React.useState<string | null>(null);
  const els = React.useRef<Record<string, HTMLElement | null>>({});
  const lines = React.useRef<Record<string, Element | null>>({});
  const focused = active ?? peek;
  return { well, zoom, box, active, setActive, peek, setPeek, els, lines, width, focused };
}
type Card = ReturnType<typeof useCard>;

/** A hairline handle's hit area and its line; hidden when another handle is pointed at. */
function Hair({ card, t, tune, at, d, heavy, cursor }: { card: Card; t: Tune; tune: ReturnType<typeof useTune>; at: Box; d: string; heavy?: boolean; cursor: string }) {
  const lit = card.focused === t.name;
  return (
    <span ref={(el) => { card.els.current[t.name] = el; }} className="ed-edge ed-pal-hit" style={{ left: at.x, top: at.y, width: at.w, height: at.h, cursor }}
      data-away={card.focused && !lit ? '' : undefined}
      role="slider" tabIndex={0} aria-label={t.name} aria-valuenow={t.value} aria-valuemin={t.min} aria-valuemax={t.max} {...tune.events}>
      <svg className="ed-pal-line" width={at.w} height={at.h} viewBox={`0 0 ${at.w} ${at.h}`} aria-hidden>
        <path ref={(el) => { card.lines.current[t.name] = el; }} className="ed-seg" d={d} data-weight={heavy ? 'heavy' : undefined} data-on={lit ? '' : undefined} />
      </svg>
    </span>
  );
}

/** A corner handle: the arc along the part's own corner. */
function Corner({ card, t, tune, at, r }: { card: Card; t: Tune; tune: ReturnType<typeof useTune>; at: { x: number; y: number }; r: number }) {
  const lit = card.focused === t.name;
  const size = Math.max(r, 6) + 3;
  return (
    <span ref={(el) => { card.els.current[t.name] = el; }} className="ed-corner ed-pal-corner" style={{ left: at.x, top: at.y, width: size, height: size }}
      data-away={card.focused && !lit ? '' : undefined}
      role="slider" tabIndex={0} aria-label={t.name} aria-valuenow={t.value} aria-valuemin={t.min} aria-valuemax={t.max} {...tune.events}>
      <CornerArc r={r} on={lit} arcRef={(el) => { card.lines.current[t.name] = el; }} />
    </span>
  );
}

function Specimen({ card, m, set, children }: { card: Card; m: Model; set: Props['set']; children: React.ReactNode }) {
  return (
    <div ref={card.well} className="ed-specimen ed-pal-well">
      <div style={{ zoom: card.zoom }}>
        <div ref={card.box} className="ed-box ed-pal-box" data-hint-anchor data-live={card.active ?? undefined} data-peek={card.peek ?? undefined} data-shown="corner">
          <Still m={m} set={set} width={card.width} />
          <div className="ed-overlay">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Read({ card, t, tune, snapAt }: { card: Card; t: Tune; tune: ReturnType<typeof useTune>; snapAt?: number }) {
  return <Readout label={t.name} value={(t.by ?? 1) < 1 ? t.value.toFixed(1) : `${t.value}`} snap={token(t.value, snapAt ?? t.at)}
    peek={(on) => card.setPeek(on ? t.name : null)} pick={() => summon(card.els.current[t.name] ?? null)}
    scrub={(d) => tune.put(t.value + d * (t.by ?? 1), false)} />;
}

const ctxOf = (card: Card, name: string) => ({ zoom: card.zoom, active: card.active, setActive: card.setActive, setPeek: card.setPeek, line: () => card.lines.current[name] ?? null });

/* ───────────────────────── the cards ───────────────────────── */

function Field({ m, set }: Props) {
  const card = useCard();
  const parts = useParts(card.box, [m, card.width]);
  const f = parts.one('field'), g = parts.one('glyph');
  const height: Tune = { name: 'Field height', value: m.fieldH, at: T['field-height'], min: 32, max: 60, grow: 'up', how: 'drag up to make the field taller', write: (fieldH) => set({ fieldH, fieldR: Math.min(m.fieldR, fieldH / 2) }) };
  const corners: Tune = { name: 'Field corners', value: m.fieldR, at: T['field-radius'], min: 0, max: Math.floor(m.fieldH / 2), grow: 'out', how: 'drag out to round the corner', write: (fieldR) => set({ fieldR }) };
  const left: Tune = { name: 'Space on the left', value: m.fieldPad, at: T['field-pad-start'], min: 4, max: 32, grow: 'right', how: 'drag right for more space', write: (fieldPad) => set({ fieldPad }) };
  const th = useTune(height, ctxOf(card, height.name)), tc = useTune(corners, ctxOf(card, corners.name)), tl = useTune(left, ctxOf(card, left.name));
  return <>
    <p>The field is a tray sunk into the top of the plate, and the list changes as soon as you type in it. Drag its top edge to make it taller, its corner to round it, or the line before the search glass to give it room on the left.</p>
    <Specimen card={card} m={m} set={set}>
      <Hair card={card} t={height} tune={th} at={{ x: f.x + m.fieldR, y: f.y - 3, w: Math.max(0, f.w - m.fieldR * 2), h: 6 }} d={`M0 4.6H${Math.max(0, f.w - m.fieldR * 2)}`} heavy cursor="ns-resize" />
      <Corner card={card} t={corners} tune={tc} at={{ x: f.x, y: f.y }} r={m.fieldR} />
      <Hair card={card} t={left} tune={tl} at={{ x: g.x - 4, y: f.y + 8, w: 6, h: Math.max(0, f.h - 16) }} d={`M3.5 0V${Math.max(0, f.h - 16)}`} heavy cursor="ew-resize" />
    </Specimen>
    <div className="ed-readouts"><Read card={card} t={height} tune={th} /><Read card={card} t={corners} tune={tc} /><Read card={card} t={left} tune={tl} /></div>
  </>;
}

function Rows({ m, set }: Props) {
  const card = useCard();
  const parts = useParts(card.box, [m, card.width]);
  const rows = rowsFor(m.q);
  const s = chosen(m);
  const boxes = parts.many('rows');
  const cap = boxes[s] ?? NONE;
  const [lean, setLean] = React.useState<number | null>(null);
  const choose = (i: number) => { const n = clamp(i, 0, rows.length - 1); if (n !== s) set({ sel: n }); };
  const height: Tune = { name: 'Row height', value: m.rowH, at: T['row-height'], min: 28, max: 48, grow: 'down', how: 'drag down to make rows taller', write: (rowH) => set({ rowH, rowR: Math.min(m.rowR, rowH / 2) }) };
  const corners: Tune = { name: 'Row corners', value: m.rowR, at: RADIUS.row, min: 0, max: Math.floor(m.rowH / 2), grow: 'out', how: 'drag out to round the corner', write: (rowR) => set({ rowR }) };
  const th = useTune(height, ctxOf(card, height.name)), tc = useTune(corners, ctxOf(card, corners.name));
  const label = rows[s]?.label ?? '–';
  const pick = useHandle({
    zoom: card.zoom,
    hint: () => ({ gesture: 'steps', title: 'Chosen row', value: card.active === 'Chosen row' ? lean !== null ? `→ ${rows[lean]?.label}` : label : undefined, how: 'drag it up or down to another row' }),
    keyHint: () => ({ gesture: 'steps', title: 'Chosen row', value: label, keys: [{ k: '↑↓', say: 'choose' }] }),
    start: () => ({ i: s, at: 0 }),
    move: (st, _dx, dy) => {
      card.setActive('Chosen row');
      const travel = dy - st.at, dir = Math.sign(travel), target = st.i + dir;
      if (target >= 0 && target < rows.length && Math.abs(travel) >= STEP_AT) { choose(target); st.i = target; st.at = dy; setLean(null); }
      else setLean(target >= 0 && target < rows.length && Math.abs(travel) > 2 ? target : null);
    },
    end: () => { card.setActive(null); setLean(null); },
    step: (d) => choose(s - d), axis: 'y',
    over: (on) => card.setPeek(on ? 'Chosen row' : null),
  });
  const ghost = lean !== null ? boxes[lean] : undefined;
  const lit = card.focused === 'Chosen row';
  return <>
    <p>The chosen row is a raised cap with a short green bar, and it jumps from row to row at once, because you scan a list faster than a highlight could follow. Drag it up or down to choose another row, its bottom edge to make rows taller, or its corner to round it.</p>
    <Specimen card={card} m={m} set={set}>
      {ghost && <i className="ed-pal-lean" style={{ left: ghost.x, top: ghost.y, width: ghost.w, height: ghost.h, borderRadius: m.rowR }} aria-hidden />}
      <span ref={(el) => { card.els.current['Chosen row'] = el; }} className="ed-edge ed-pal-cap" style={{ left: cap.x, top: cap.y + 4, width: cap.w, height: Math.max(0, cap.h - 10), borderRadius: m.rowR }}
        data-lit={lit ? '' : undefined} data-away={card.focused && !lit ? '' : undefined}
        role="slider" tabIndex={0} aria-label="Chosen row" aria-valuetext={label} aria-valuenow={s + 1} aria-valuemin={1} aria-valuemax={rows.length} {...pick} />
      <Hair card={card} t={height} tune={th} at={{ x: cap.x + m.rowR, y: cap.y + cap.h - 4, w: Math.max(0, cap.w - m.rowR * 2), h: 6 }} d={`M0 2.4H${Math.max(0, cap.w - m.rowR * 2)}`} cursor="ns-resize" />
      <Corner card={card} t={corners} tune={tc} at={{ x: cap.x, y: cap.y }} r={m.rowR} />
    </Specimen>
    <div className="ed-readouts">
      <Readout label="Chosen row" value={`${s + 1}`} unit={` of ${rows.length}`} snap={{ at: s, name: label }} peek={(on) => card.setPeek(on ? 'Chosen row' : null)} pick={() => summon(card.els.current['Chosen row'] ?? null)} scrub={(d) => choose(s - d)} />
      <Read card={card} t={height} tune={th} /><Read card={card} t={corners} tune={tc} />
    </div>
  </>;
}

function Labels({ m, set }: Props) {
  const card = useCard();
  const parts = useParts(card.box, [m, card.width]);
  const sec = parts.one('secText'), mk = parts.one('mark');
  const above: Tune = { name: 'Space above a section', value: m.secTop, at: T['sec-pad-top'], min: 0, max: 28, grow: 'down', how: 'drag down for more room above the name', write: (secTop) => set({ secTop }) };
  const under: Tune = { name: 'Underline', value: m.markOffset, at: T['mark-offset'], min: 0, max: 6, by: 0.5, grow: 'down', how: 'drag down to lower the underline', write: (markOffset) => set({ markOffset }) };
  const ta = useTune(above, ctxOf(card, above.name)), tu = useTune(under, ctxOf(card, under.name));
  // the underline sits its offset below the word's baseline; the handle is drawn right on it
  const ulY = parts.one('baseline').y + m.markOffset + T['mark-underline'] / 2 - 3;
  return <>
    <p>Rows sit under small engraved section names with a count, and the words you typed are underlined in each row. Type in the field to change them, drag the line over a section name to give it room, or drag the underline down to lower it.</p>
    <Specimen card={card} m={m} set={set}>
      <Hair card={card} t={above} tune={ta} at={{ x: sec.x - 2, y: sec.y - 5, w: sec.w + 4, h: 5 }} d={`M0 2.5H${sec.w + 4}`} heavy cursor="ns-resize" />
      {mk.w > 0 && <Hair card={card} t={under} tune={tu} at={{ x: mk.x, y: ulY, w: mk.w, h: 6 }} d={`M0 3H${mk.w}`} heavy cursor="ns-resize" />}
    </Specimen>
    <div className="ed-readouts"><Read card={card} t={above} tune={ta} /><Read card={card} t={under} tune={tu} /></div>
  </>;
}

function Keys({ m, set }: Props) {
  const card = useCard();
  const parts = useParts(card.box, [m, card.width]);
  const keys = parts.many('keys'), foot = parts.one('foot');
  const a = keys[0] ?? NONE, b = keys[1] ?? NONE;
  const gap: Tune = { name: 'Space between keys', value: m.footGap, at: T['foot-gap'], min: 4, max: 32, grow: 'right', how: 'drag right to spread the keys', write: (footGap) => set({ footGap }) };
  const top: Tune = { name: 'Space above the keys', value: m.footTop, at: T['foot-pad-top'], min: 2, max: 24, grow: 'down', how: 'drag down for more room under the rule', write: (footTop) => set({ footTop }) };
  const tg = useTune(gap, ctxOf(card, gap.name)), tt = useTune(top, ctxOf(card, top.name));
  const gx = a.x + a.w, gw = Math.max(4, b.x - gx);
  return <>
    <p>The bottom line shows every key the palette understands, so you learn them just by using it. Drag the gap between two keys to spread them, or the line above the keys to give them room.</p>
    <Specimen card={card} m={m} set={set}>
      <Hair card={card} t={gap} tune={tg} at={{ x: gx, y: a.y, w: gw, h: a.h }} d={`M${gw / 2} 1V${a.h - 1}`} heavy cursor="ew-resize" />
      <Hair card={card} t={top} tune={tt} at={{ x: foot.x + 4, y: a.y - 5, w: Math.max(0, foot.w - 8), h: 5 }} d={`M0 2.5H${Math.max(0, foot.w - 8)}`} heavy cursor="ns-resize" />
    </Specimen>
    <div className="ed-readouts"><Read card={card} t={gap} tune={tg} /><Read card={card} t={top} tune={tt} /></div>
    <div className="ed-layers">
      <Toggle name="Pin with ⇧↩" on={m.pinnable} set={(pinnable) => set({ pinnable })} />
      <Toggle name="Where answers come from" on={m.status} set={(status) => set({ status })} />
    </div>
  </>;
}

function Toggle({ name, on, set, focus }: { name: string; on: boolean; set: (v: boolean) => void; focus?: (n: string | null) => void }) {
  return (
    <ListRow.Root variant="list" className="ed-layer" data-off={on ? undefined : ''} onPointerEnter={() => focus?.(name)} onPointerLeave={() => focus?.(null)} onClick={(e) => { if (!(e.target as HTMLElement).closest('.mu-switch')) set(!on); }}>
      <ListRow.Text>{name}</ListRow.Text>
      <ListRow.Trail><Switch size="small" aria-label={name} checked={on} onCheckedChange={set} onFocus={() => focus?.(name)} onBlur={() => focus?.(null)} /></ListRow.Trail>
    </ListRow.Root>
  );
}

function Plate({ m, set }: Props) {
  const card = useCard();
  const parts = useParts(card.box, [m, card.width]);
  const p = parts.one('plate');
  const pad: Tune = { name: 'Padding', value: m.pad, at: T.pad, min: 0, max: 20, grow: 'left', how: 'drag left for more padding', write: (v) => set({ pad: v }) };
  const corners: Tune = { name: 'Plate corners', value: m.radius, at: RADIUS.card, min: 0, max: 40, grow: 'out', how: 'drag out to round the corner', write: (radius) => set({ radius }) };
  const tp = useTune(pad, ctxOf(card, pad.name)), tc = useTune(corners, ctxOf(card, corners.name));
  const inner = p.x + p.w - m.pad;
  return <>
    <p>The palette is a frosted plate that floats high over a dimmed page, like a dialog. Drag the line inside its right edge to change the padding, or its corner to round it.</p>
    <Specimen card={card} m={m} set={set}>
      <Hair card={card} t={pad} tune={tp} at={{ x: inner - 3, y: p.y + m.radius, w: 6, h: Math.max(0, p.h - m.radius * 2) }} d={`M3 0V${Math.max(0, p.h - m.radius * 2)}`} heavy cursor="ew-resize" />
      <Corner card={card} t={corners} tune={tc} at={{ x: p.x, y: p.y }} r={m.radius} />
    </Specimen>
    <div className="ed-readouts"><Read card={card} t={pad} tune={tp} /><Read card={card} t={corners} tune={tc} /></div>
  </>;
}

function Layers({ m, set, focus }: Props) {
  const { well, zoom, width } = useFit();
  const toggle = (i: number, v: boolean) => set({ on: m.on.map((x, j) => (j === i ? v : x)) });
  return <>
    <p>The plate is made of nine layers, and the field inside it is a tray like any field. Turn a layer off to see what it adds.</p>
    <div ref={well} className="ed-specimen ed-pal-well"><div style={{ zoom }}><Still m={m} set={set} width={width} /></div></div>
    <div className="ed-layers">{LAYERS.map((l, i) => <Toggle key={l.name} name={l.name} on={m.on[i]} set={(v) => toggle(i, v)} focus={focus} />)}</div>
  </>;
}

export function PaletteSpecimenCard(props: Props) {
  switch (props.spot) {
    case 'well': return <Field {...props} />;
    case 'states': return <Rows {...props} />;
    case 'type': return <Labels {...props} />;
    case 'press': return <Keys {...props} />;
    case 'surface': return <Plate {...props} />;
    case 'layers': return <Layers {...props} />;
  }
}
