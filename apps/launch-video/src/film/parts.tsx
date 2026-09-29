import { useLayoutEffect, useRef } from 'react';
import { Key } from '@unlocalhosted/metalui';
import { Icon, ICON_CATALOG, type IconName } from '@unlocalhosted/metalui/icons';
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

/**
 * A library icon playing its authored act (docs/ICON-MOTION.md), posed at `t` ms into it. The act's
 * keyframes (Web Animations, per data-part) are made paused and seeked to the frame's time, so
 * each frame of video shows the act exactly where it should be; nothing runs on a clock.
 */
export function IconAct({ name, t, size = 24 }: { name: IconName; t: number; size?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const svg = ref.current?.querySelector('svg');
    const icon = ICON_CATALOG[name];
    const act = 'motion' in icon ? icon.motion : undefined;
    if (!svg || !act) return;
    const at = Math.max(0, Math.min(act.duration, t));
    const running = act.tracks.flatMap((track) =>
      [...svg.querySelectorAll(`[data-part="${track.part}"]`)].map((el) => {
        const a = el.animate(track.keyframes as Keyframe[], { duration: act.duration, fill: 'both' });
        a.pause();
        a.currentTime = at;
        return a;
      }),
    );
    return () => running.forEach((a) => a.cancel());
  });
  return (
    <span ref={ref} style={{ display: 'inline-flex', width: size, height: size }}>
      <Icon name={name} size={size} animate={false} />
    </span>
  );
}

/** How far into an act at `frame`, for one that starts on frame `from`. */
export const actTime = (frame: number, from: number, fps = 60) => ((frame - from) / fps) * 1000;
