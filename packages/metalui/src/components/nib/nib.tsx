'use client';

import * as React from 'react';
import { GADGETS } from '../../gadgets/gadgets.generated';
import { drawNib, type NibSpec } from '../../gadgets/parts/nib';
import { tierFor } from '../../gadgets/light';

/* Nib (a Part): a pen nib seen from above, in brass, its tip wet with ink in the accent. It lies back
 * from its tip, turned by `angle` (degrees); in a gadget the dip mechanism dips it into its well.
 * Geometry is canvas units; `size` is drawn pixels. */

export interface NibProps extends Omit<React.SVGProps<SVGSVGElement>, 'color' | 'children'> {
  angle?: number;
  /** The ink on its tip; defaults to the accent. */
  ink?: NibSpec['ink'];
  size?: number;
}

export function Nib({ angle = 0, ink, size = 96, ...props }: NibProps) {
  const uid = React.useId().replace(/:/g, '');
  const tier = tierFor(size);
  const [wL, wC, wH] = GADGETS.accent.warm, [pl, pw] = GADGETS.parts.nib.size, L = GADGETS.nib.alone, W = (L * pw) / pl;
  const d = drawNib(`nib-${uid}`, { tip: [200, 200 + L / 2], size: [L, W], angle, ink: ink ?? { L: wL, C: wC, H: wH } }, { tier });
  return (
    <svg viewBox="0 0 400 400" width={size} height={size} role="img" aria-label={`nib${angle ? `, turned ${Math.round(angle)}°` : ''}`} data-tier={tier} className="overflow-visible" {...props}>
      <defs dangerouslySetInnerHTML={{ __html: d.defs }} />
      <g dangerouslySetInnerHTML={{ __html: d.shadow + d.body }} />
    </svg>
  );
}
