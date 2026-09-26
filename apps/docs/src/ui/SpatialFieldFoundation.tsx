import * as React from 'react';
import { Region, Surface } from '@unlocalhosted/metalui';
import tokens from '../../../../tokens/tokens.json';

export type SpatialFoundationState = 'rest' | 'carry' | 'target';

const recipe = tokens['spatial-field'];
const first = { x: 22, y: 20, width: 280, height: 180 };
const target = { x: 348, y: 20, width: 280, height: 180 };
const carried = { x: 302, y: 148, width: 118, height: 38 };
const atRest = { x: 265, y: 188, width: 118, height: 38 };

function distanceToRect(x: number, y: number, r: typeof carried) {
  return Math.hypot(Math.max(r.x - x, 0, x - r.x - r.width), Math.max(r.y - y, 0, y - r.y - r.height));
}

function isInside(x: number, y: number, r: typeof target) {
  return x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height;
}

/** Fixed cross-platform appearance specimen; the Region board above owns the live gesture. */
export function SpatialFieldFoundation({ state }: { state: SpatialFoundationState }) {
  const marks: React.ReactNode[] = [];
  const object = state === 'rest' ? atRest : carried;
  const spacing = recipe['mark-spacing'];
  for (let y = spacing / 2; y < 240; y += spacing) {
    for (let x = spacing / 2; x < 660; x += spacing) {
      if (isInside(x, y, first) || isInside(x, y, target)) continue;
      const distance = distanceToRect(x, y, object);
      if (distance <= recipe.clearance) continue;
      const response = state === 'rest' ? 0 : Math.max(0, 1 - (distance - recipe.clearance) / recipe['carry-reach']) ** 2;
      const targetEdge = state === 'target'
        ? Math.max(0, 1 - distanceToRect(x, y, target) / recipe['target-reach']) * recipe['target-opacity']
        : 0;
      const opacity = Math.min(1, recipe['base-opacity'] + response * recipe['carry-opacity'] + targetEdge);
      let drawX = x, drawY = y;
      if (response > 0) {
        const nearestX = Math.max(object.x, Math.min(x, object.x + object.width));
        const nearestY = Math.max(object.y, Math.min(y, object.y + object.height));
        drawX += (x - nearestX) / distance * recipe.push * response;
        drawY += (y - nearestY) / distance * recipe.push * response;
      }
      marks.push(<circle key={`${x}:${y}`} cx={drawX} cy={drawY} r={recipe['mark-radius']}
        fill={targetEdge > response ? 'var(--mu-spatial-field-target)' : 'var(--mu-spatial-field-mark)'} opacity={opacity} />);
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
          style={{ left: object.x, top: object.y }}>
          send the poster
        </Surface>
      </div>
    </div>
  );
}
