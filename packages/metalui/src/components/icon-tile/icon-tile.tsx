'use client';

import * as React from 'react';
import { Led, type LedKind } from '../led/led';

/* ICON TILE: a mark for what a row, a card or an empty place is about, beside the words that name it.
 *   sunk      the glyph (or one to three characters) engraved in a well: the window Alert draws (default)
 *   raised    the small raised plate, where the tile stands out of a flat card (an app, an integration)
 *   size      the field ladder: compact 28, regular 32, large 44; hero 56 for an empty state or a feature card
 *   shape     square (radius from the window's 9 at 28) or round (beside avatars)
 *   led       a thing's state, the LED part seated on the top-right rim; steady, flickering once when the
 *             state changes (never on first paint); the words beside it always say the state
 * Never pressed (the row or card around it is) and never tinted (a state is the lamp plus words).
 * Decorative unless `label` names it. Styled with the theme's utilities (the icon-tile recipe). */

export type IconTileSize = 'compact' | 'regular' | 'large' | 'hero';

export interface IconTileProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** A glyph element (`<FolderIcon />`), or one to three characters ("AC", "JS"). */
  children: React.ReactNode;
  /** sunk (a window in the surface, default) or raised (a small plate standing out of it). */
  look?: 'sunk' | 'raised';
  size?: IconTileSize;
  shape?: 'square' | 'round';
  /** The thing's state, seated on the top-right rim. The words beside the tile must say it too. */
  led?: LedKind;
  /** Names the tile for assistive tech when no words beside it do; otherwise it is hidden. */
  label?: string;
}

const BASE = 'mu-icon-tile relative inline-grid flex-none place-items-center select-none text-ink2 uppercase tabular-nums';
const LOOK = { sunk: 'recipe-well-field', raised: 'recipe-surface-raise-sm' };
const SIZE: Record<IconTileSize, string> = {
  compact: 'size-icon-tile-compact-size [&>svg]:size-icon-tile-compact-glyph type-icon-tile-compact',
  regular: 'size-icon-tile-regular-size [&>svg]:size-icon-tile-regular-glyph type-icon-tile-regular',
  large: 'size-icon-tile-large-size [&>svg]:size-icon-tile-large-glyph type-icon-tile-large',
  hero: 'size-icon-tile-hero-size [&>svg]:size-icon-tile-hero-glyph type-icon-tile-hero',
};
const SQUARE: Record<IconTileSize, string> = {
  compact: 'rounded-icon-tile-compact-radius',
  regular: 'rounded-icon-tile-regular-radius',
  large: 'rounded-icon-tile-large-radius',
  hero: 'rounded-icon-tile-hero-radius',
};
const ROUND = 'rounded-full';
// Characters carry the engraved label's lip; a glyph keeps its own drawing.
const ENGRAVED = 'recipe-label-engraved icon-tile-centre';
const SEAT = 'mu-icon-tile-lamp absolute -top-icon-tile-lamp-inset -right-icon-tile-lamp-inset inline-grid leading-none';

/** A glyph or a few characters in a tile, marking what the words beside it are about. */
export const IconTile = React.forwardRef<HTMLSpanElement, IconTileProps>(function IconTile(
  { children, look = 'sunk', size = 'regular', shape = 'square', led, label, className, ...props },
  ref,
) {
  // The lamp holds steady on first paint and flickers once on each later change of state.
  const firstLed = React.useRef(led);
  const changed = React.useRef(false);
  if (led !== firstLed.current) changed.current = true;

  const text = typeof children === 'string' || typeof children === 'number';
  const own = `${BASE} ${LOOK[look]} ${SIZE[size]} ${shape === 'round' ? ROUND : SQUARE[size]}${text ? ` ${ENGRAVED}` : ''}`;
  const named = label !== undefined && label !== '';
  return (
    <span
      ref={ref}
      role={named ? 'img' : undefined}
      aria-label={named ? label : undefined}
      aria-hidden={named ? undefined : true}
      data-look={look}
      data-size={size}
      data-shape={shape}
      data-led={led}
      className={className ? `${own} ${className}` : own}
      {...props}
    >
      {children}
      {led && (
        <span className={SEAT}>
          <Led kind={led} size={size === 'compact' ? 'small' : 'default'} gesture={changed.current ? 'flicker' : 'steady'} />
        </span>
      )}
    </span>
  );
});
