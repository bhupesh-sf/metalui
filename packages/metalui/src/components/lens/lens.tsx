'use client';

import * as React from 'react';
import { GADGETS } from '../../gadgets/gadgets.generated';
import { drawLens, type LensSpec } from '../../gadgets/parts/lens';
import { tierFor } from '../../gadgets/light';

/* Lens (a Part): a camera lens seen head-on. A ring in the accent, knurled, that turns (`turn`,
 * degrees); a domed glass, dark and coated toward its rim; an iris behind it that closes as `iris`
 * runs from 1 to 0. In a gadget the turn mechanism turns its ring. Geometry is canvas units; `size`
 * is drawn pixels. */

export interface LensProps extends Omit<React.SVGProps<SVGSVGElement>, 'color' | 'children'> {
  iris?: number;
  turn?: number;
  ticks?: number;
  /** The ring's pigment; defaults to the accent. */
  color?: LensSpec['color'];
  size?: number;
}

export function Lens({ iris = 0.6, turn = 0, ticks = 24, color, size = 96, ...props }: LensProps) {
  const uid = React.useId().replace(/:/g, '');
  const tier = tierFor(size);
  const [wL, wC, wH] = GADGETS.accent.warm;
  const d = drawLens(`lens-${uid}`, { at: [200, 200], size: GADGETS.lens.alone, iris, turn, ticks, color: color ?? { L: wL, C: wC, H: wH } }, { tier });
  return (
    <svg viewBox="0 0 400 400" width={size} height={size} role="img" aria-label={`lens, iris ${Math.round(iris * 100)}% open`} data-tier={tier} className="overflow-visible" {...props}>
      <defs dangerouslySetInnerHTML={{ __html: d.defs }} />
      <g dangerouslySetInnerHTML={{ __html: d.shadow + d.body }} />
    </svg>
  );
}
