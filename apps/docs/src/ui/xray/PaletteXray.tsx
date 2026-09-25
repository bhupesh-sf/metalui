import * as React from 'react';
import { Kbd, paletteParts as P } from '@unlocalhosted/metalui';
import { Icon } from '@unlocalhosted/metalui/icons';
import { tokens } from '../../lib/tokens';
import { Exploded, IsoCap, IsoTray, XrayFrame, capTop, scalePx, useStateLayers, type SpotDef } from './kit';
import { HintLayer } from '../edit';
import { INITIAL, LAYERS, PaletteSpecimenCard, STATUS, chosen, rowsFor, sectionsOf, usePlate, type Model, type Spot } from './PaletteSpecimens';

/* ─────────────────────────────────────────────────────────
 * X-RAY · COMMAND PALETTE (a block: a plate, a field, rows and a footer of keys)
 *
 *   solid     a still of the palette
 *   x-ray     a frosted plate high over a dimmed page; a field sunk into its top, rows under it,
 *             the chosen row raised with a green bar, keys along the bottom
 *   card      a still of the real palette (PaletteSpecimens), handled, not slid:
 *             Field   type in it; its top edge, corner and the line before the glass
 *             Rows    drag the chosen row to another (it snaps); its bottom edge and corner
 *             Labels  the line over a section name; the underline under a match
 *             Keys    the gap between keys, the line above them; pinning and status switches
 *             Plate   the line inside its right edge (padding) and its corner
 *             Layers  a switch per layer; hover lights the slice on the bench
 * ───────────────────────────────────────────────────────── */

const S = 1.2;
const PW = 360;
const T = tokens.palette;
/** The bench draws engraved labels and footer keys at these heights (the still measures its own). */
const LABEL = 10, KEY = 18;

const SPOTS: SpotDef<Spot>[] = [
  { id: 'well', title: 'Field', word: 'Where you type' },
  { id: 'states', title: 'Rows', word: 'The chosen row' },
  { id: 'type', title: 'Labels', word: 'Sections and matches' },
  { id: 'press', title: 'Keys', word: 'Shown at the bottom' },
  { id: 'surface', title: 'Plate', word: 'Over a dimmed page' },
  { id: 'layers', title: 'Layers', word: 'What it is made of' },
];
const SIDE: Record<Spot, ['left' | 'right', number]> = {
  surface: ['left', 0.2], well: ['left', 0.48], type: ['left', 0.76],
  layers: ['right', 0.2], states: ['right', 0.48], press: ['right', 0.76],
};

const mark = (text: string, q: string, offset: number) => {
  const t = q.trim(); if (!t) return text;
  const i = text.toLowerCase().indexOf(t.toLowerCase()); if (i < 0) return text;
  const style: React.CSSProperties = { background: 'none', color: 'inherit', fontWeight: T['mark-weight'], textDecoration: 'underline', textDecorationColor: T['mark-color'], textDecorationThickness: T['mark-underline'] * S, textUnderlineOffset: offset * S };
  return <>{text.slice(0, i)}<mark className="xr-pmark" style={style}>{text.slice(i, i + t.length)}</mark>{text.slice(i + t.length)}</>;
};

export function PaletteXray({ startOpen = false }: { startOpen?: boolean }) {
  const [xray, setXray] = React.useState(startOpen);
  const [spot, setSpot] = React.useState<Spot>('well');
  const [m, setM] = React.useState<Model>(INITIAL);
  const [focus, setFocus] = React.useState<string | null>(null);
  const set = React.useCallback((p: Partial<Model>) => setM((o) => ({ ...o, ...p })), []);
  const { on } = m;
  const plate = usePlate(on);
  const well = useStateLayers('well', 'field');
  const cw = plate.colorway;
  const rows = rowsFor(m.q);
  const s = chosen(m);

  const sections = sectionsOf(rows);
  const secH = m.secTop + LABEL + T['sec-pad-bottom'];
  const footH = T['foot-margin-top'] + m.footTop + KEY + T['foot-pad-bottom'];
  const PH = m.pad * 2 + m.fieldH + T['list-pad-top'] + sections.length * secH + rows.length * m.rowH + T['list-pad-bottom'] + footH;
  const W = PW * S, H = PH * S;
  const z = 40, top = capTop(z, 3);
  const exploded = spot === 'layers';
  const shadow = scalePx(plate.all.shadows.slice(0, 7).filter((_, i) => on[i + 1]).join(', ') || 'none', S);
  const inset = m.pad * S;

  const face = (
    <div className="xr-paletteface" style={{ padding: `${inset}px ${inset}px ${inset}px` }}>
      <div style={{ height: m.fieldH * S, position: 'relative', flex: 'none' }}>
        <IsoTray w={W - 2 * inset} h={m.fieldH * S} r={m.fieldR * S} depth={3} fill={well.fill} shadow={scalePx(well.shadows.join(', '), S)} colorway={cw} />
        <span className="xr-pfield" style={{ height: m.fieldH * S, gap: T['field-gap'] * S, paddingLeft: m.fieldPad * S, paddingRight: T['field-pad-end'] * S, fontSize: 15 * S }}>
          <span style={{ display: 'grid', color: 'var(--ink3)' }}><Icon name="search" size={T['field-glyph'] * S} /></span>
          <span>{m.q || <span style={{ color: 'var(--ink3)' }}>Lens or action</span>}</span><i className="xr-caret" style={{ background: '#3FB97A', height: 18 * S }} />
        </span>
      </div>
      <div style={{ paddingTop: T['list-pad-top'] * S, flex: 1 }}>
        {sections.map((sec) => (
          <div key={sec.name}>
            <div className="xr-psec" style={{ height: secH * S, alignItems: 'flex-end', padding: `0 ${T['row-pad'] * S}px ${T['sec-pad-bottom'] * S}px`, boxSizing: 'border-box', fontSize: 9 * S }}><span>{sec.name}</span><span>{sec.rows.length}</span></div>
            {sec.rows.map((r) => (
              <div key={r.label} className={r.i === s ? 'xr-prow is-on' : 'xr-prow'} onClick={() => set({ sel: r.i })} style={{ height: m.rowH * S, gap: T['row-gap'] * S, padding: `0 ${T['row-pad'] * S}px`, borderRadius: m.rowR * S, fontSize: 13 * S, color: r.danger ? 'var(--mu-red, #D5392A)' : 'var(--ink)' }}>
                {r.i === s && <i className="xr-pbar" style={{ width: T['bar-width'] * S, height: (m.rowH - 2 * T['bar-inset']) * S }} />}
                <span style={{ display: 'grid', color: r.danger ? 'inherit' : 'var(--ink2)' }}><Icon name={r.icon} size={T['row-glyph'] * S} /></span>
                <span style={{ flex: 1 }}>{mark(r.label, m.q, m.markOffset)}</span>
                {r.key && <span style={{ font: `500 ${9 * S}px/1 var(--mono)`, color: 'var(--ink3)' }}>{r.key}</span>}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className={spot === 'press' ? 'xr-pfoot is-lit' : 'xr-pfoot'} style={{ marginTop: T['foot-margin-top'] * S, height: 'auto', gap: m.footGap * S, fontSize: 9 * S, padding: `${m.footTop * S}px ${T['row-pad'] * S}px ${T['foot-pad-bottom'] * S}px` }}>
        <span style={{ lineHeight: `${KEY * S}px` }}>↑ ↓ MOVE</span><span>↩ OPEN</span>{m.pinnable && <span>⇧↩ PIN</span>}{m.status && <span style={{ marginLeft: 'auto' }}>{STATUS}</span>}
      </div>
    </div>
  );

  const scene = (
    <>
      <div className="xr-face is-flat" style={{ left: -30 * S, top: -20 * S, width: W + 60 * S, height: H + 40 * S, borderRadius: 18 * S, transform: 'translateZ(0.5px)', background: cw === 'graphite' ? 'rgba(14,14,15,.25)' : 'rgba(243,243,241,.25)', boxShadow: '0 0 0 1px color-mix(in srgb, var(--ink) 8%, transparent)' }} />
      {exploded
        ? <Exploded layers={LAYERS} on={on} fill={plate.all.fill} shadows={plate.all.shadows} w={W} h={H} r={m.radius * S} z0={10} gap={14} focus={focus} scale={S} />
        : (
          <>
            {on[8] && <div className="xr-shadow" style={{ width: W, height: H, borderRadius: m.radius * S, filter: 'blur(22px)', opacity: 0.2, transform: 'translate(12px, 26px)' }} />}
            <IsoCap w={W} h={H} r={m.radius * S} z={z} wall={3} fill={plate.fill} shadow={shadow} wallTone={cw === 'graphite' ? '#1c1c1f' : '#e4e2dc'}>{face}</IsoCap>
          </>
        )}
    </>
  );

  const rowY = (i: number) => { let y = m.pad + m.fieldH + T['list-pad-top']; for (const sec of sections) { y += secH; for (const r of sec.rows) { if (r.i === i) return y + m.rowH / 2; y += m.rowH; } } return y; };
  const anchors: Record<Spot, [number, number, number]> = {
    well: [40 * S, (m.pad + m.fieldH / 2) * S, top],
    states: [W - 20 * S, rowY(s) * S, top + 1],
    type: [30 * S, (m.pad + m.fieldH + T['list-pad-top'] + secH / 2) * S, top + 1],
    press: [W * 0.7, H - (m.pad + KEY / 2 + T['foot-pad-bottom']) * S, top + 1],
    surface: [W * 0.05, H * 0.9, top],
    layers: exploded ? [W * 0.9, 20, 10 + (LAYERS.length - 1) * 14] : [W - 12, 12, top],
  };

  return (
    <HintLayer><XrayFrame
      xray={xray} setXray={setXray} spots={SPOTS} side={SIDE} spot={spot} setSpot={setSpot}
      solid={<div className="xr-palette-solid" style={{ width: W, height: H, borderRadius: m.radius * S, background: plate.all.fill, boxShadow: scalePx(plate.all.shadows.join(', '), S), zoom: 0.75 }}>{face}</div>}
      W={W} H={H} scene={scene} anchors={anchors}
      onReset={() => setM(INITIAL)} deps={[spot, m]}
      card={<PaletteSpecimenCard spot={spot} m={m} set={set} focus={setFocus} />}
    /></HintLayer>
  );
}

/** A small still of the palette, drawn with its own classes (the live one lives in a dialog). */
export function PaletteStill() {
  return (
    <div className={P.POPUP} style={{ position: 'static', transform: 'none', translate: 'none', margin: 0, width: 300, opacity: 1 }}>
      <label className={P.FIELD}><span className={P.FIELD_GLYPH}><Icon name="search" size={15} /></span><span className={P.INPUT}>tidy</span></label>
      <div className={P.LIST} style={{ maxHeight: 'none' }}>
        <div className={P.SEC}><span className={P.ENG}>ACTIONS</span><span className={P.ENG}>1</span></div>
        <div className={P.ROW} data-highlighted=""><span className={P.ROW_GLYPH}><Icon name="tidy" size={14} /></span><span className={P.ROW_TEXT}><mark className={P.MARK}>Tidy</mark> the canvas</span><span className={P.ROW_HINT}><Kbd size="small">⌘T</Kbd></span></div>
      </div>
      <div className={P.FOOT}><span className={P.FOOT_KEYS}><Kbd size="small">↩</Kbd><span className={P.ENG}>OPEN</span></span></div>
    </div>
  );
}
