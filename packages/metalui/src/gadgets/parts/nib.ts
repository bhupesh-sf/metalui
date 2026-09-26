// The Nib Part: a pen nib seen from above, its origin at its tip. It lies back along its length, turned
// by `angle` from straight up; its outline narrows from its shoulders to the tip; a slit runs from the
// tip to a breather hole; it is brass, lit along its upper edge, its tip wet with ink in the accent; it
// casts a small shadow. The dip mechanism dips it. Canvas units; drawn by the React Part, the gadget
// renderer and SwiftUI (MetalNib) from the same numbers (tokens gadgets.nib).
import { GADGETS } from '../gadgets.generated';
import { pigment } from '../color';
import type { Tier } from '../light';

export interface NibSpec {
  /** Its tip. */
  tip: [number, number];
  /** [length, width], units (default the Part's 70 × 20). */
  size?: [number, number];
  /** Degrees from pointing straight down at its tip (its body lying back up the canvas). */
  angle?: number;
  /** The ink on its tip (the accent). */
  ink: { L: number; C: number; H: number };
}

const K = GADGETS.nib;
const n = (x: number) => +x.toFixed(2);

/** The nib's outline, drawn pointing down at its tip (0, 0) with its body up the canvas. */
export function nibOutline(L: number, W: number): string {
  const [sa, sw] = K.shoulder, sy = -L * sa, hw = (W * sw) / 2, base = -L, r = hw * 0.35;
  return `M0,0 C${n(hw * 0.15)},${n(sy * 0.3)} ${n(hw)},${n(sy * 0.7)} ${n(hw)},${n(sy)} L${n(hw)},${n(base + r)} Q${n(hw)},${n(base)} ${n(hw - r)},${n(base)} L${n(-hw + r)},${n(base)} Q${n(-hw)},${n(base)} ${n(-hw)},${n(base + r)} L${n(-hw)},${n(sy)} C${n(-hw)},${n(sy * 0.7)} ${n(-hw * 0.15)},${n(sy * 0.3)} 0,0 Z`;
}

export interface NibDraw { defs: string; shadow: string; body: string }

export function drawNib(id: string, s: NibSpec, o: { tier?: Tier } = {}): NibDraw {
  const tier = o.tier ?? 'full', [L, W] = s.size ?? (GADGETS.parts.nib.size as unknown as [number, number]), [bl, bc, bh] = GADGETS.beeper.brass;
  const outline = nibOutline(L, W), turn = `translate(${n(s.tip[0])} ${n(s.tip[1])}) rotate(${n(s.angle ?? 0)})`;
  const crown = pigment(Math.min(1, bl + K.crown), bc, bh), brass = pigment(bl, bc, bh), deep = pigment(bl - K.crown, bc, bh);
  const [ha, hr] = K.hole, [wet, wa] = K.wet, [sb, sdx, sdy, sa] = K.shadow, ink = pigment(s.ink.L, s.ink.C, s.ink.H);
  let defs = `<linearGradient id="${id}-brass" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${deep.srgb}"/><stop offset=".35" stop-color="${crown.srgb}"/><stop offset=".6" stop-color="${brass.srgb}"/><stop offset="1" stop-color="${deep.srgb}"/></linearGradient>`
    + `<clipPath id="${id}-clip"><path d="${outline}"/></clipPath>`;
  if (tier !== 'flat') defs += `<filter id="${id}-soft" x="-60%" y="-30%" width="220%" height="160%"><feGaussianBlur stdDeviation="${n(W * sb)}"/></filter>`;
  const shadow = tier === 'flat' ? '' : `<g data-part="nib.shadow" transform="translate(${n(W * sdx)} ${n(W * sdy)}) ${turn}"><path d="${outline}" fill="rgba(30,26,22,${sa})" filter="url(#${id}-soft)"/></g>`;
  const body = `<g data-part="nib" data-angle="${n(s.angle ?? 0)}" transform="${turn}">`
    + `<path d="${outline}" fill="url(#${id}-brass)"/>`
    + `<rect data-part="nib.ink" x="${n(-W)}" y="${n(-L * wet)}" width="${n(2 * W)}" height="${n(L * wet)}" fill="${ink.srgb}" opacity="${wa}" clip-path="url(#${id}-clip)"/>`
    + `<path d="M0,0 V${n(-L * K.slit)}" stroke="rgba(20,16,12,${K.cut[1]})" stroke-width="${n(W * K.cut[0])}"/>`
    + `<circle cx="0" cy="${n(-L * ha)}" r="${n(W * hr)}" fill="rgba(20,16,12,${K.cut[2]})"/></g>`;
  return { defs, shadow, body };
}
