import * as React from 'react';
import { Region, Surface } from '@unlocalhosted/metalui';
import tokens from '../../../../tokens/tokens.json';

export type SpatialFoundationState = 'rest' | 'carry' | 'target';

const recipe = tokens['spatial-field'];
const target = { x: 348, y: 20, width: 280, height: 180 };
const carried = { x: 302, y: 148, width: 118, height: 38 };

function distanceToRect(x: number, y: number, r: typeof carried) {
  return Math.hypot(Math.max(r.x - x, 0, x - r.x - r.width), Math.max(r.y - y, 0, y - r.y - r.height));
}

function isInside(x: number, y: number, r: typeof target) {
  return x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height;
}

/** Foundation review only: fixed host geometry, no gesture or second placement rule. */
export function SpatialFieldFoundation({ state }: { state: SpatialFoundationState }) {
  const marks: React.ReactNode[] = [];
  if (state !== 'rest') {
    const spacing = recipe['mark-spacing'];
    for (let y = spacing / 2; y < 240; y += spacing) {
      for (let x = spacing / 2; x < 660; x += spacing) {
        const clearance = distanceToRect(x, y, carried);
        if (clearance <= recipe.clearance) continue;
        const carry = Math.max(0, 1 - (clearance - recipe.clearance) / recipe['carry-reach']) * recipe['carry-opacity'];
        const targetEdge = state === 'target' && !isInside(x, y, target)
          ? Math.max(0, 1 - distanceToRect(x, y, target) / recipe['target-reach']) * recipe['target-opacity']
          : 0;
        const opacity = Math.max(carry, targetEdge);
        if (opacity < 0.025) continue;
        marks.push(<circle key={`${x}:${y}`} cx={x} cy={y} r={recipe['mark-radius']}
          fill={targetEdge > carry ? 'var(--mu-spatial-field-target)' : 'var(--mu-spatial-field-mark)'} opacity={opacity} />);
      }
    }
  }

  return (
    <div className="max-w-full overflow-x-auto" data-testid="spatial-field-foundation" data-state={state}>
      <div className="relative h-[240px] w-[660px]" role="group" aria-label={`Spatial response ${state} specimen`}>
        <svg viewBox="0 0 660 240" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">{marks}</svg>
        <div className="absolute left-[22px] top-[20px]">
          <Region name="To do" rule="makes tasks" width={280} height={180} />
        </div>
        <div className="absolute left-[348px] top-[20px]">
          <Region name="Done" rule="marks tasks done" dropRule="drop to mark tasks done" over={state === 'target'} width={280} height={180} />
        </div>
        <Surface material="raise-lite" radius="card"
          className="absolute px-14 py-8 type-content text-ink"
          style={{ left: state === 'rest' ? 265 : carried.x, top: state === 'rest' ? 188 : carried.y }}>
          send the poster
        </Surface>
      </div>
    </div>
  );
}
