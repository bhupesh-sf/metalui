// The Lens Part: a camera lens seen head-on. A ring at its rim in the accent, knurled with grip lines,
// that turns; inside, a thin metal bevel and the domed glass, dark at its centre and coated toward its
// rim; behind the glass the iris, dark blades closing to a polygon as `iris` runs from 1 to 0; on the
// dome a soft glare and a small glint. Canvas units; drawn by the React Part, the gadget renderer and
// SwiftUI (MetalLens) from the same numbers (tokens gadgets.lens).
import { GADGETS } from '../gadgets.generated';
import { pigment } from '../color';
import type { Tier } from '../light';

export interface LensSpec {
  at: [number, number];
  /** Across the ring, units (default the Part's 184). */
  size?: number;
  /** Grip lines around the ring (12 to 36). */
  ticks?: number;
  /** How open the iris is, 0 to 1. */
  iris?: number;
  /** The ring's turn, degrees clockwise. */
  turn?: number;
  /** The ring's pigment: the accent. */
  color: { L: number; C: number; H: number };
}

const K = GADGETS.lens;
const n = (x: number) => +x.toFixed(2);
const at = (c: [number, number], r: number, deg: number): [number, number] => { const a = ((deg - 90) * Math.PI) / 180; return [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]; };
const circle = ([x, y]: [number, number], r: number) => `M${n(x - r)},${n(y)} a${n(r)},${n(r)} 0 1 0 ${n(2 * r)},0 a${n(r)},${n(r)} 0 1 0 ${n(-2 * r)},0 Z`;

/** The iris opening's corners for an openness: a polygon of the blades' count, its radius between the
 *  iris's min and max of the dome's. */
export function irisCorners(c: [number, number], dome: number, iris: number): [number, number][] {
  const [lo, hi] = K.iris, r = dome * (lo + (hi - lo) * Math.min(1, Math.max(0, iris)));
  return Array.from({ length: K.blades }, (_, i) => at(c, r, (360 / K.blades) * i));
}

export interface LensDraw { defs: string; shadow: string; body: string }

export function drawLens(id: string, s: LensSpec, o: { tier?: Tier } = {}): LensDraw {
  const tier = o.tier ?? 'full', c = s.at, R = (s.size ?? GADGETS.parts.lens.size[0]) / 2, k = R / (GADGETS.parts.lens.size[0] / 2);
  const ring = K.ring * k, inner = R - ring, dome = inner - K.bevel * k, { L, C, H } = s.color;
  const [cl, rl, rc, ch] = K.dome, [gl, ga] = K.grip, [sb, sdx, sdy, sa] = K.shadow;
  const lit = pigment(Math.min(1, L + 0.1), C, H), deep = pigment(L - 0.1, C, H), [ml, mc, mh] = GADGETS.jack.metal;
  let defs = `<linearGradient id="${id}-ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${lit.srgb}"/><stop offset=".5" stop-color="${pigment(L, C, H).srgb}"/><stop offset="1" stop-color="${deep.srgb}"/></linearGradient>`
    + `<radialGradient id="${id}-dome" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${pigment(cl, 0.02, ch).srgb}"/><stop offset=".7" stop-color="${pigment((cl + rl) / 2, rc / 2, ch).srgb}"/><stop offset="1" stop-color="${pigment(rl, rc, ch).srgb}"/></radialGradient>`;
  if (tier !== 'flat') defs += `<filter id="${id}-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${n(R * sb)}"/></filter>`
    + `<radialGradient id="${id}-glare" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity="${K.glare[3]}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`;
  const shadow = tier === 'flat' ? '' : `<g data-part="lens.shadow"><path d="${circle([c[0] + R * sdx, c[1] + R * sdy], R)}" fill="rgba(30,26,22,${sa})" filter="url(#${id}-soft)"/></g>`;
  // The ring and its grip lines turn together.
  const ticks = s.ticks ?? 24;
  let grip = '';
  for (let i = 0; i < ticks; i++) { const [x0, y0] = at(c, R - ring * gl, (360 / ticks) * i), [x1, y1] = at(c, R - 1.5 * k, (360 / ticks) * i); grip += `M${n(x0)},${n(y0)}L${n(x1)},${n(y1)}`; }
  const ringG = `<g data-part="lens.ring" data-moves transform="rotate(${n(s.turn ?? 0)} ${n(c[0])} ${n(c[1])})">`
    + `<path d="${circle(c, R)} ${circle(c, inner)}" fill="url(#${id}-ring)" fill-rule="evenodd"/>`
    + `<path d="${grip}" stroke="${deep.srgb}" stroke-width="${n(2.2 * k)}" stroke-linecap="round" opacity="${ga}"/></g>`;
  // The iris: blades over the glass with the polygon open between them, and the seams where they meet.
  const corners = irisCorners(c, dome, s.iris ?? 0.6), poly = `M${corners.map(([x, y]) => `${n(x)},${n(y)}`).join('L')}Z`;
  let seams = '';
  corners.forEach(([x, y], i) => {
    const [nx, ny] = corners[(i + 1) % corners.length], dx = nx - x, dy = ny - y, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
    const px = x - c[0], py = y - c[1], b = px * ux + py * uy, t = b + Math.sqrt(b * b - (px * px + py * py - dome * dome));
    seams += `M${n(x)},${n(y)}L${n(x - ux * t)},${n(y - uy * t)}`;
  });
  const [gx, gy, gr] = K.glare, [tx, ty, tr, ta] = K.glint;
  const body = `<g data-part="lens" data-iris="${n(s.iris ?? 0.6)}">${ringG}`
    + `<circle cx="${n(c[0])}" cy="${n(c[1])}" r="${n(inner - K.bevel * k / 2)}" fill="none" stroke="${pigment(ml, mc, mh).srgb}" stroke-width="${n(K.bevel * k)}"/>`
    + `<circle cx="${n(c[0])}" cy="${n(c[1])}" r="${n(dome)}" fill="url(#${id}-dome)"/>`
    + `<g data-part="lens.iris"><path d="${circle(c, dome)} ${poly}" fill="${pigment(K.blade, 0.01, ch).srgb}" fill-rule="evenodd"/><path d="${seams}" stroke="#000" stroke-opacity="${K.seam}" stroke-width="${n(k)}"/></g>`
    + (tier === 'flat' ? '' : `<circle data-part="lens.glare" cx="${n(c[0] - dome + 2 * dome * gx)}" cy="${n(c[1] - dome + 2 * dome * gy)}" r="${n(dome * gr)}" fill="url(#${id}-glare)"/>`)
    + `<circle data-part="lens.glint" cx="${n(c[0] - dome + 2 * dome * tx)}" cy="${n(c[1] - dome + 2 * dome * ty)}" r="${n(dome * tr)}" fill="#fff" fill-opacity="${ta}"/></g>`;
  return { defs, shadow, body };
}

/** Turns a drawn lens's ring (anything under `root`) to `deg` without redrawing it. */
export function turnLens(root: Element, c: [number, number], deg: number) {
  root.querySelector('[data-part="lens.ring"]')?.setAttribute('transform', `rotate(${n(deg)} ${n(c[0])} ${n(c[1])})`);
}
