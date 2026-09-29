import { Key } from '@unlocalhosted/metalui';
import { GADGETS } from '@unlocalhosted/metalui/gadgets';
import { land, react } from '../motion';

/** A key's press, as the library draws it (tokens: gadgets.key.press), stepped by frame: 0 up, 1 down. */
export function PressedKey({ id, down, glyph, accent, size = 150 }: { id: string; down: number; glyph: string; accent?: boolean; size?: number }) {
  const [dy, sx, sy] = GADGETS.key.press as unknown as [number, number, number];
  return (
    <div id={id}>
      <style>{`#${id} [data-part="key.face"]{transform-box:fill-box;transform-origin:center;transform:translateY(${dy * down}px) scale(${1 + (sx - 1) * down},${1 + (sy - 1) * down})}`}</style>
      <Key glyph={glyph} accent={accent} size={size} />
    </div>
  );
}

/** Down on `at`, back up on `up` (the part spring there, the release spring back). */
export const press = (frame: number, at: number, up: number) => Math.max(0, land(frame, at, 'part') - (frame >= up ? react(frame, up, 'release') : 0));
