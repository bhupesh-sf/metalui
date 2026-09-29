import type { CSSProperties } from 'react';

/* ─────────────────────────────────────────────────────────
 * THE WORDMARK: a badge, after appliance lettering
 *
 *   METAL   polished chrome capitals, tracked wide, raised off a glossy red enamel plate
 *   UI      the same chrome on a graphite key beside it
 *   chrome  banded like a curved mirror: a bright top, a dark horizon at the middle, a lit
 *           lower edge; a hairline highlight over each letter and a short cast shadow under it
 *   enamel  deep and glossy: a window highlight along the top, deepening toward the base
 * Sized in em: set font-size to the cap height you want (13 in the masthead, 72 in the film).
 * One source for the site's logo and the launch film.
 * ───────────────────────────────────────────────────────── */

const CHROME: CSSProperties = {
  background: 'linear-gradient(180deg, #ffffff 0%, #dfe0e2 24%, #8f9196 46%, #f6f6f7 53%, #bcbec2 72%, #74767b 100%)',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
  filter: 'drop-shadow(0 0.018em 0 rgba(255,255,255,.55)) drop-shadow(0 0.035em 0.02em rgba(0,0,0,.45))',
};

const PLATE: CSSProperties = {
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  height: '1.62em',
  borderRadius: '0.3em',
  overflow: 'hidden',
};

const SHEEN: CSSProperties = {
  position: 'absolute',
  left: '0.1em',
  right: '0.1em',
  top: '0.06em',
  height: '42%',
  borderRadius: '0.24em',
  background: 'linear-gradient(180deg, rgba(255,255,255,.34), rgba(255,255,255,0))',
  pointerEvents: 'none',
};

const RED = 'linear-gradient(180deg, #e2362b 0%, #c41e17 55%, #9e140f 100%)';
const GRAPHITE = 'linear-gradient(180deg, #3a3a3e 0%, #232326 60%, #161618 100%)';
const DEPTH = 'inset 0 0.02em 0 rgba(255,255,255,.35), inset 0 -0.09em 0.2em rgba(0,0,0,.3)';

function Plate({ text, fill, glow, track, rim = '' }: { text: string; fill: string; glow: string; track: number; rim?: string }) {
  return (
    <span style={{ ...PLATE, background: fill, boxShadow: `${rim}${DEPTH}, 0 0.16em 0.34em ${glow}, 0 0.03em 0.07em rgba(0,0,0,.2)`, padding: `0 ${0.36 - track / 2}em 0 0.36em` }}>
      <span style={SHEEN} />
      {/* Tracking adds space after the last letter too; the right padding takes it back. */}
      <span style={{ ...CHROME, position: 'relative', fontWeight: 560, letterSpacing: `${track}em`, lineHeight: 1 }}>{text}</span>
    </span>
  );
}

export function Wordmark({ size = 13, style, className }: { size?: number; style?: CSSProperties; className?: string }) {
  return (
    <span
      role="img"
      aria-label="MetalUI"
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.14em', fontFamily: '"Geist Variable", "Geist", system-ui, sans-serif', fontSize: size, textTransform: 'uppercase', ...style }}
    >
      <Plate text="Metal" fill={RED} glow="rgba(140,20,10,.28)" track={0.42} />
      {/* A faint light rim keeps the graphite key apart from a graphite page. */}
      <Plate text="UI" fill={GRAPHITE} glow="rgba(0,0,0,.24)" track={0.3} rim="0 0 0 0.045em rgba(255,255,255,.16), " />
    </span>
  );
}
