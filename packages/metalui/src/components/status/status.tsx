'use client';

import * as React from 'react';
import { Tooltip } from '../tooltip/tooltip';
import { Led, type LedGesture, type LedKind } from '../led/led';

/* STATUS BADGE (the reference design's .pill.status): an LED part and the state in words.
 *   plate    a raised pill with a defined edge (the default)
 *   quiet    the lamp and the words, no plate: dense places on an opaque ground
 *   strong   a plate tinted in the state's ink, the words in a deep ink of the same hue: alerts
 *   solid    transparent mode (frost, glass, an image): a keyline holds the plate's edge, and a quiet
 *            badge takes its plate back. Reduce Transparency (or low power) turns it on by itself.
 * Never colour alone: each state also has its own gesture (live steady, waiting breathing, failed two
 * blinks, off dark) and the words say it. The badge is not pressable; its hint (the command that fixes
 * it) shows as a tooltip on hover and focus. Styled with the theme's utilities (the status recipe). */

export type StatusTone = 'plate' | 'quiet' | 'strong';

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  led: LedKind;
  /** The state, short, uppercase in the label role: "SYNC LIVE", "OFFLINE · ADD KEY TO KEYCHAIN". */
  children: React.ReactNode;
  /** What fixes it, shown on hover and focus: "security add-generic-password -s example-service …". */
  hint?: string;
  /** plate (default), quiet (no plate, for dense places), strong (tinted in the state's ink, for alerts). */
  tone?: StatusTone;
  /** Transparent mode: on frost, glass or an image the plate keeps a keyline, and a quiet badge gets its plate. */
  solid?: boolean;
  /** How the lamp behaves; by default the state's own: live steady, waiting breathe, failed blink2, link and off steady. */
  gesture?: LedGesture;
}

/** Each state's own gesture, so a state never rests on colour alone. */
const ownGesture: Record<LedKind, LedGesture> = { live: 'steady', waiting: 'breathe', failed: 'blink2', link: 'steady', off: 'steady' };

const BADGE = 'mu-badge inline-flex items-center gap-status-badge-gap h-status-badge-height px-status-badge-pad rounded-pill whitespace-nowrap type-status-badge uppercase cursor-default focus-visible:focus-ring';
const PLATE = 'recipe-status-badge text-ink2';
const STRONG: Record<LedKind, string> = {
  live: 'recipe-status-badge-strong-live text-status-strong-ink-live',
  waiting: 'recipe-status-badge-strong-waiting text-status-strong-ink-waiting',
  failed: 'recipe-status-badge-strong-failed text-status-strong-ink-failed',
  link: 'recipe-status-badge-strong-link text-status-strong-ink-link',
  off: PLATE,
};
// A quiet badge takes its plate back under Reduce Transparency, as `solid` does.
const QUIET = 'px-0 text-ink2 reduce-transparency:px-status-badge-pad reduce-transparency:recipe-status-badge';
const KEYLINE = 'outline -outline-offset-1 outline-status-badge-keyline';
const AUTO_KEYLINE = 'reduce-transparency:outline reduce-transparency:-outline-offset-1 reduce-transparency:outline-status-badge-keyline';

/** A state the system is in, with its LED. Not a button. */
export const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(function StatusBadge({ led, children, hint, tone = 'plate', solid = false, gesture, className, ...props }, ref) {
  const look = tone === 'quiet' && !solid ? QUIET : tone === 'strong' ? STRONG[led] : PLATE;
  const own = `${BADGE} ${look} ${solid ? KEYLINE : AUTO_KEYLINE}`;
  const badge = (
    <span ref={ref} role="status" tabIndex={hint ? 0 : undefined} aria-description={hint} data-tone={tone} data-solid={solid ? '' : undefined} className={className ? `${own} ${className}` : own} {...props}>
      <Led kind={led} gesture={gesture ?? ownGesture[led]} />
      {children}
    </span>
  );
  if (!hint) return badge;
  return (
    <Tooltip label={hint} side="bottom" offset={8} wrap>
      {badge}
    </Tooltip>
  );
});
