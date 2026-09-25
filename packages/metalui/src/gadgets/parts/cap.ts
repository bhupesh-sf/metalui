// The Cap Part: the fader or knob cap a person moves. Seen from above: a face on its darker side wall
// (showing a few units below it), grip ribs across a fader or a pointer groove on a knob, and its own
// shadow. Pressed, the face sinks toward the body and the shadow tightens, on the release spring.
// Canvas units; drawn by the React Part, the gadget renderer and SwiftUI (MetalCap) from the same
// numbers (tokens gadgets.cap).
import { GADGETS, type GadgetMaterial } from '../gadgets.generated';
import { pigment } from '../color';
import { materialFilter, type Host, type Tier } from '../light';
import { roundedRect } from './slab';

export type CapShape = 'fader' | 'knob' | 'rocker';
export interface CapSpec {
  at: [number, number];
  /** Face width, units (default the Part's); a knob's diameter is its height. */
  size?: [number, number];
  shape?: CapShape;
  ribs?: number;
  /** The face's pigment (OKLCH). */
  color: { L: number; C: number; H: number };
  material?: Extract<GadgetMaterial, 'clay' | 'ceramic'>;
  /** A rocker's tilt: -1, its lower end pressed (off), to 1, its upper end pressed (on). */
  tilt?: number;
}

const K = GADGETS.cap;
const n = (x: number) => +x.toFixed(2);

export interface CapDraw { defs: string; shadow: string; body: string }

export function drawCap(id: string, s: CapSpec, o: { tier?: Tier; host?: Host } = {}): CapDraw {
  if (s.shape === 'rocker') return drawRocker(id, s, o);
  const tier = o.tier ?? 'full', host = o.host ?? 'bone', shape = s.shape ?? 'fader';
  const [cx, cy] = s.at, [W0, H] = s.size ?? (GADGETS.parts.cap.size as unknown as [number, number]);
  // Every length on a cap is at the Part's own size (60 × 44); a bigger cap scales them all.
  const k = H / GADGETS.parts.cap.size[1];
  const W = shape === 'knob' ? H : W0, r = shape === 'knob' ? H / 2 : Math.min(K.radius * k, H / 2);
  const { L, C, H: hue } = s.color;
  const face0 = pigment(L + 0.04, C * 0.9, hue - 4), face1 = pigment(L - 0.03, C, hue + 4), side = pigment(L - K.sideDrop, C * 0.95, hue + 6);
  const [gd, gf, gg, ga, gm] = K.grooveInk, [el, ec] = K.edgeInk;
  const groove = pigment(Math.max(gf, L - gd), Math.min(gm, C * gg + ga), hue), edge = pigment(Math.min(1, L + el), C * ec, hue);
  const [sb, sdx, sdy, sa] = K.shadow;
  let defs = `<linearGradient id="${id}-face" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${face0.srgb}" style="stop-color: ${face0.p3}"/><stop offset="1" stop-color="${face1.srgb}" style="stop-color: ${face1.p3}"/></linearGradient>`;
  if (tier !== 'flat') defs += `<filter id="${id}-soft" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="${n(H * sb)}"/></filter>`
    + materialFilter(`${id}-light`, s.material ?? 'clay', { tier: 'lite', host, part: true });
  const outline = (y: number) => roundedRect([cx, y], [W, H], r);
  const [gw, ga0] = K.groove, [ew, ea, edy] = K.edge;
  const soft = tier === 'flat' ? '' : ` filter="url(#${id}-soft)"`;
  const shadow = `<g data-part="cap.shadow" data-scale="${n(k)}" data-offset="${n(H * sdx)},${n(H * sdy)}"><path d="${roundedRect([cx + H * sdx, cy + H * sdy], [W, H], r)}" fill="rgba(30,26,22,${sa})"${soft}/></g>`;
  let marks = '';
  if (tier !== 'flat' && shape === 'fader') {
    const count = s.ribs ?? K.ribs, half = (W * K.span) / 2;
    const ys = Array.from({ length: count }, (_, i) => cy + (i - (count - 1) / 2) * K.pitch * k);
    marks = `<path d="${ys.map((y) => `M${n(cx - half)},${n(y)}h${n(2 * half)}`).join('')}" stroke="${groove.srgb}" stroke-opacity="${ga0}" stroke-width="${n(gw * k)}" stroke-linecap="round"/>`
      + `<path d="${ys.map((y) => `M${n(cx - half)},${n(y + edy * k)}h${n(2 * half)}`).join('')}" stroke="${edge.srgb}" stroke-opacity="${ea}" stroke-width="${n(ew * k)}" stroke-linecap="round"/>`;
  } else if (tier !== 'flat') {
    const [a, b] = K.pointer;
    marks = `<path d="M${n(cx)},${n(cy - r * b)}V${n(cy - r * a)}" stroke="${groove.srgb}" stroke-opacity="${ga0 * K.pointerScale}" stroke-width="${n(gw * K.pointerScale * k)}" stroke-linecap="round"/>`
      + `<path d="M${n(cx + (edy * k) / 2)},${n(cy - r * b + edy * k)}V${n(cy - r * a + edy * k)}" stroke="${edge.srgb}" stroke-opacity="${ea}" stroke-width="${n(ew * k)}" stroke-linecap="round"/>`;
  }
  const light = tier === 'flat' ? '' : ` filter="url(#${id}-light)"`;
  const body = `<g data-part="cap" data-shape="${shape}"><g${light}>`
    + `<path d="${outline(cy + K.side * k)}" fill="${side.srgb}" data-part="cap.side"/>`
    + `<g data-part="cap.face"><path d="${outline(cy)}" fill="url(#${id}-face)"/>${marks}</g>`
    + '</g></g>';
  return { defs, shadow, body };
}

/** Presses or releases a drawn cap (anything under `root`): the face sinks toward the body and the
 *  shadow tightens, on the release spring; with reduced motion it goes at once. */
export function pressCap(root: Element, pressed: boolean, o: { reduced?: boolean } = {}) {
  const face = root.querySelector<SVGGElement>('[data-part="cap.face"]'), shadow = root.querySelector<SVGGElement>('[data-part="cap.shadow"]');
  const transition = o.reduced ? 'none' : 'transform var(--mu-spring-release-d, .3s) var(--mu-spring-release, ease-out)';
  for (const el of [face, shadow]) if (el) el.style.transition = transition;
  const scale = Number(shadow?.getAttribute('data-scale') ?? 1);
  if (face) face.style.transform = pressed ? `translateY(${n(K.press * scale)}px)` : '';
  // A lower cap casts a nearer shadow: its offset shrinks to press-shadow of itself.
  const [dx, dy] = (shadow?.getAttribute('data-offset') ?? '0,0').split(',').map(Number), k = 1 - K.pressShadow;
  if (shadow) shadow.style.transform = pressed ? `translate(${n(-dx * k)}px, ${n(-dy * k)}px)` : '';
}

// ---------- A rocker: a paddle that tilts about its middle ----------

/** A rocker's overlays for a tilt: how lit and shaded each half is, how deep its fold, where its shadow falls. */
export function rockerLook(tilt: number, k: number) {
  const [light, shade, hinge, shift] = K.rocker, t = Math.max(-1, Math.min(1, tilt)), a = Math.abs(t);
  // On (t > 0): the upper end is pressed, so the upper half faces the light and the lower half turns away.
  return {
    topLit: t > 0 ? light * a : 0, topShade: t < 0 ? shade * a : 0,
    bottomLit: t < 0 ? light * a : 0, bottomShade: t > 0 ? shade * a : 0,
    hinge: hinge * (0.3 + 0.7 * a),
    // The shadow moves toward the raised end: down when on, up when off.
    shadowDy: shift * k * t,
  };
}

function drawRocker(id: string, s: CapSpec, o: { tier?: Tier; host?: Host }): CapDraw {
  const tier = o.tier ?? 'full', host = o.host ?? 'bone', [cx, cy] = s.at, [W, H] = s.size ?? (K.rockerSize as unknown as [number, number]);
  const k = W / GADGETS.parts.cap.size[0], r = K.radius * k, { L, C, H: hue } = s.color, look = rockerLook(s.tilt ?? -1, k);
  const face0 = pigment(L + 0.04, C * 0.9, hue - 4), face1 = pigment(L - 0.03, C, hue + 4), side = pigment(L - K.sideDrop, C * 0.95, hue + 6);
  const [gd, gf, gg, ga, gm] = K.grooveInk, groove = pigment(Math.max(gf, L - gd), Math.min(gm, C * gg + ga), hue);
  const [sb, sdx, sdy, sa] = K.shadow, [gw, ga0] = K.groove, glyph = H * K.rocker[4];
  const outline = roundedRect([cx, cy], [W, H], r);
  let defs = `<linearGradient id="${id}-face" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${face0.srgb}"/><stop offset="1" stop-color="${face1.srgb}"/></linearGradient>`
    + `<clipPath id="${id}-clip"><path d="${outline}"/></clipPath>`;
  if (tier !== 'flat') defs += `<filter id="${id}-soft" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="${n(W * sb)}"/></filter>`
    + materialFilter(`${id}-light`, s.material ?? 'clay', { tier: 'lite', host, part: true });
  const soft = tier === 'flat' ? '' : ` filter="url(#${id}-soft)"`, light = tier === 'flat' ? '' : ` filter="url(#${id}-light)"`;
  const shadow = `<g data-part="cap.shadow" data-dy="${n(look.shadowDy)}" transform="translate(0 ${n(look.shadowDy)})"><path d="${roundedRect([cx + W * sdx, cy + W * sdy], [W, H], r)}" fill="rgba(30,26,22,${sa})"${soft}/></g>`;
  const half = (top: boolean) => `x="${n(cx - W / 2)}" y="${n(top ? cy - H / 2 : cy)}" width="${n(W)}" height="${n(H / 2)}"`;
  const body = `<g data-part="cap" data-shape="rocker" data-tilt="${n(s.tilt ?? -1)}" data-k="${n(k)}"><g${light}>`
    + `<path d="${roundedRect([cx, cy + K.side * k], [W, H], r)}" fill="${side.srgb}" data-part="cap.side"/>`
    + `<path d="${outline}" fill="url(#${id}-face)"/></g>`
    + `<g clip-path="url(#${id}-clip)">`
    + `<rect data-rocker="top-lit" ${half(true)} fill="#fff" opacity="${n(look.topLit)}"/><rect data-rocker="top-shade" ${half(true)} fill="#000" opacity="${n(look.topShade)}"/>`
    + `<rect data-rocker="bottom-lit" ${half(false)} fill="#fff" opacity="${n(look.bottomLit)}"/><rect data-rocker="bottom-shade" ${half(false)} fill="#000" opacity="${n(look.bottomShade)}"/></g>`
    + `<path data-rocker="hinge" d="M${n(cx - W / 2 + r / 2)},${n(cy)}H${n(cx + W / 2 - r / 2)}" stroke="${groove.srgb}" stroke-width="${n(gw * k)}" opacity="${n(look.hinge)}"/>`
    + `<g stroke="${groove.srgb}" stroke-opacity="${ga0 * K.pointerScale}" stroke-width="${n(gw * K.pointerScale * k)}" stroke-linecap="round" fill="none">`
    + `<path data-rocker="on" d="M${n(cx)},${n(cy - H / 4 - glyph / 2)}V${n(cy - H / 4 + glyph / 2)}"/><circle data-rocker="off" cx="${n(cx)}" cy="${n(cy + H / 4)}" r="${n(glyph / 2)}"/></g>`
    + '</g>';
  return { defs, shadow, body };
}

/** Tilts a drawn rocker (anything under `root`) without redrawing it: what the flip moves every frame. */
export function tiltRocker(root: Element, tilt: number) {
  const cap = root.querySelector('[data-part="cap"][data-shape="rocker"]');
  if (!cap) return;
  const shadow = root.querySelector('[data-part="cap.shadow"]'), look = rockerLook(tilt, Number(cap.getAttribute('data-k') ?? 1));
  cap.setAttribute('data-tilt', String(n(tilt)));
  for (const [key, v] of [['top-lit', look.topLit], ['top-shade', look.topShade], ['bottom-lit', look.bottomLit], ['bottom-shade', look.bottomShade], ['hinge', look.hinge]] as const) cap.querySelector(`[data-rocker="${key}"]`)?.setAttribute('opacity', String(n(v)));
  shadow?.setAttribute('transform', `translate(0 ${n(look.shadowDy)})`);
}
