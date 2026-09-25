import * as React from 'react';
import { Toolbar, ToolButton, ToolbarSeparator } from '@unlocalhosted/metalui';
import { Icon } from '@unlocalhosted/metalui/icons';
import { Exploded, IsoCap, XrayFrame, capTop, scalePx, type SpotDef } from './kit';
import { HintLayer } from '../edit';
import { INITIAL, LAYERS, P, STRIP_BG, STRIP_SH, TOOLS, ToolbarSpecimenCard, outerRadius, pick, type Model, type Spot } from './ToolbarSpecimens';

/* ─────────────────────────────────────────────────────────
 * X-RAY · TOOLBAR (a block: a strip, tool caps and a separator)
 *
 *   solid     the dark toolbar with four tools
 *   x-ray     a dark glass strip floating high over the page; round tool caps stand on it,
 *             the chosen one pressed down with a green light; a thin groove splits the groups
 *   card      the real graphite toolbar, handled (ToolbarSpecimens):
 *             Strip      its right end sets the space around the tools
 *             Tools      drag the pressed tool onto another; the gap between two tools
 *             Groove     the space beside it; the groove on or off
 *             Shape      the corner arc; corners follow the caps
 *             Shadow     drag the strip up: how high it floats
 *             Layers     the strip's layers, each switchable
 * ───────────────────────────────────────────────────────── */

const TOOL_BG = pick('tool', 'background')[0], TOOL_SH = pick('tool', 'shadow');
const DOWN_BG = pick('tool', 'background', 'pressed')[0], DOWN_SH = pick('tool', 'shadow', 'pressed');
const LED_BG = pick('led', 'background')[0], LED_SH = pick('led', 'shadow')[0];
const SEP_BG = pick('sep', 'background')[0], SEP_SH = pick('sep', 'shadow')[0];
const S = 2.2;

const SPOTS: SpotDef<Spot>[] = [
  { id: 'surface', title: 'Strip', word: 'Dark glass' },
  { id: 'press', title: 'Tools', word: 'The one you are using' },
  { id: 'well', title: 'Groove', word: 'Splitting the groups' },
  { id: 'shape', title: 'Shape', word: 'Corners that match' },
  { id: 'shadow', title: 'Shadow', word: 'Floating high' },
  { id: 'layers', title: 'Layers', word: 'What it is made of' },
];
const SIDE: Record<Spot, ['left' | 'right', number]> = {
  surface: ['left', 0.2], press: ['left', 0.48], shape: ['left', 0.76],
  layers: ['right', 0.2], well: ['right', 0.48], shadow: ['right', 0.76],
};

export function ToolbarXray({ startOpen = false }: { startOpen?: boolean }) {
  const [xray, setXray] = React.useState(startOpen);
  const [spot, setSpot] = React.useState<Spot>('press');
  const [m, setM] = React.useState<Model>(INITIAL);
  const [focus, setFocus] = React.useState<string | null>(null);
  const set = React.useCallback((p: Partial<Model>) => setM((o) => ({ ...o, ...p })), []);

  const T = P.tool.size, sepW = P.sep.width + m.sepMargin * 2;
  const items = TOOLS.map((t) => (t ? T : m.sep ? sepW : 0));
  const Wp = m.pad * 2 + items.reduce((a, b) => a + b, 0) + m.gap * (items.filter(Boolean).length - 1);
  const Hp = T + m.pad * 2;
  const W = Wp * S, H = Hp * S;
  const radius = outerRadius(m);
  const lift = 2 + m.lift * 8;
  const stripTop = capTop(lift, 5);
  const exploded = spot === 'layers';
  const stripShadow = scalePx(STRIP_SH.slice(0, 4).filter((_, i) => m.on[i + 1]).join(', ') || 'none', S);

  let cx = m.pad;
  const placed = TOOLS.map((t, i) => { const x = cx; if (items[i]) cx += items[i] + m.gap; return { t, x }; });

  const scene = exploded ? (
    <Exploded layers={LAYERS} on={m.on} fill={STRIP_BG} shadows={STRIP_SH} w={W} h={H} r={radius * S} z0={2} gap={14} focus={focus} scale={S} />
  ) : (
    <>
      {m.on[7] && <div className="xr-shadow" style={{ width: W, height: H, borderRadius: radius * S, filter: `blur(${14 + m.lift * 14}px)`, opacity: 0.3, transform: `translate(${m.lift * 10}px, ${m.lift * 22}px)` }} />}
      {m.on[6] && <div className="xr-shadow" style={{ width: W, height: H, borderRadius: radius * S, filter: `blur(${6 + m.lift * 6}px)`, opacity: 0.3, transform: `translate(${m.lift * 4}px, ${m.lift * 10}px)` }} />}
      {m.on[5] && <div className="xr-shadow" style={{ width: W, height: H, borderRadius: radius * S, filter: 'blur(2px)', opacity: 0.2 }} />}
      <IsoCap w={W} h={H} r={radius * S} z={lift} wall={5} fill={m.on[0] ? STRIP_BG : 'transparent'} shadow={stripShadow} wallTone="#161618" />
      <div className="xr-thumb" style={{ transform: `translateZ(${stripTop}px)` }}>
        {placed.map(({ t, x }, i) => {
          if (!t) return m.sep ? <i key={i} className="xr-face is-flat" data-part="groove" style={{ left: (x + m.sepMargin) * S, top: (Hp - P.sep.height) / 2 * S, width: P.sep.width * S, height: P.sep.height * S, background: SEP_BG, boxShadow: scalePx(SEP_SH, S), transform: 'translateZ(0.5px)' }} /> : null;
          const down = m.active === t.id;
          return (
            <div key={t.id} className="xr-tool" data-tool={t.id} data-down={down ? '' : undefined} onClick={() => set({ active: t.id })}>
              <IsoCap x={x * S} y={m.pad * S} w={T * S} h={T * S} r={P.tool.radius * S} z={down ? 0.2 : 2.4} wall={3}
                fill={(down ? DOWN_BG : TOOL_BG)} shadow={scalePx((down ? DOWN_SH : TOOL_SH).join(', '), S)} wallTone="#141416"
                transition="transform 50ms linear, box-shadow 90ms ease-out">
                <span style={{ color: P.tool.ink, display: 'grid' }}><Icon name={t.id} size={P.tool.glyph * S} /></span>
                {down && <span className="xr-led" style={{ top: P.led.inset * S, right: P.led.inset * S, width: P.led.size * S, height: P.led.size * S, background: LED_BG, boxShadow: scalePx(LED_SH, S) }} />}
              </IsoCap>
            </div>
          );
        })}
      </div>
      {spot === 'shape' && (
        <svg className="xr-dims" viewBox={`-40 -40 ${W + 80} ${H + 80}`} style={{ width: W + 80, height: H + 80, left: -40, top: -40, transform: `translateZ(${stripTop + 8}px)` }} aria-hidden>
          <path d={`M0 ${H + 16}H${m.pad * S}M0 ${H + 10}V${H + 22}M${m.pad * S} ${H + 10}V${H + 22}`} />
          <text x={(m.pad * S) / 2} y={H + 34} textAnchor="middle">{m.pad}</text>
          <path d={`M${radius * S} 0A${radius * S} ${radius * S} 0 0 0 0 ${radius * S}`} className="is-arc" />
          <text x={radius * S + 6} y={-8}>r {Number(radius.toFixed(1))}</text>
        </svg>
      )}
    </>
  );

  const first = placed[0].x * S, sepX = (placed[3].x + m.sepMargin) * S;
  const anchors: Record<Spot, [number, number, number]> = {
    surface: [W * 0.08, H * 0.85, stripTop],
    press: [first + T * S * 0.5, m.pad * S + 4, stripTop + 6],
    well: [sepX, H * 0.3, stripTop + 1],
    shape: [radius * S * 0.3, H - radius * S * 0.3, stripTop],
    shadow: [W * 0.85, H + 30, 0],
    layers: exploded ? [W * 0.9, H * 0.3, 2 + (LAYERS.length - 1) * 14] : [W * 0.97, H * 0.5, stripTop],
  };

  const real = (
    <Toolbar variant="graphite" aria-label="Tools">
      {TOOLS.map((t, i) => t
        ? <ToolButton key={t.id} label={t.label} icon={<Icon name={t.id} size={P.tool.glyph} />} pressed={m.active === t.id} onPressedChange={(p) => p && set({ active: t.id })} />
        : m.sep ? <ToolbarSeparator key={i} /> : null)}
    </Toolbar>
  );

  const card = <ToolbarSpecimenCard spot={spot} m={m} set={set} focus={setFocus} />;

  return (
    <HintLayer><XrayFrame
      xray={xray} setXray={setXray} spots={SPOTS} side={SIDE} spot={spot} setSpot={setSpot}
      solid={<div style={{ zoom: 1.8 }} onClick={(e) => e.stopPropagation()}>{real}</div>}
      W={W} H={H} scene={scene} anchors={anchors}
      hint={spot === 'press' ? 'Click a cap to pick that tool' : undefined}
      onReset={() => setM(INITIAL)} deps={[spot, m]}
      card={card}
    /></HintLayer>
  );
}
