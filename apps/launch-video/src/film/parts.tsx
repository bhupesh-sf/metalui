import { useLayoutEffect, useRef } from 'react';
import { Kbd } from '@unlocalhosted/metalui';
import { Icon, ICON_CATALOG, type IconName } from '@unlocalhosted/metalui/icons';
import { land, react } from '../motion';

/** A keycap (Kbd) scaled up to fill its box, dipping under a press, stepped by frame: 0 up, 1 down. `accent` wears the primary cap. */
export function PressedKey({ down, glyph, accent, size = 150 }: { down: number; glyph: string; accent?: boolean; size?: number }) {
  const fit = size / 20;
  return (
    <div style={{ width: size, height: size, display: 'grid', placeItems: 'center' }}>
      <div style={{ transform: `translateY(${down * fit * 1.5}px) scale(${fit * (1 - 0.05 * down)})` }}>
        <Kbd surface={accent ? 'plain' : 'default'} className={accent ? 'recipe-button-primary text-white' : undefined}>{glyph}</Kbd>
      </div>
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
