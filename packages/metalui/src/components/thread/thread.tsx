'use client';

import * as React from 'react';
import { ChevronIcon } from '../../icons/components.generated';
import { useIsoLayoutEffect } from '../../motion/layout-effect';
import { motionReduced } from '../../motion/reduced';
import { useRowMotion } from '../../motion/rows';
import { Button } from '../button/button';
import { ScrollArea } from '../scroll-area/scroll-area';

/* ─────────────────────────────────────────────────────────
 * THREAD, a conversation that scrolls, newest at the foot
 *
 *   open      starts at the foot
 *   pinned    while you are at the foot (within the follow slop) it follows its content as it grows:
 *             a reply writing, a message arriving (a ResizeObserver: nothing runs at rest)
 *   away      scroll up and it stays put, however much arrives below; Jump to latest rises at the end
 *             edge from one nest below (settle)
 *   jump      Jump to latest glides to the foot (jumps under Reduce Motion) and follows again
 *   pinKey    changes when the person sends: back to the foot, following
 *   arrive    a new message rises one nest from below on the object spring, fading in (the rows'
 *             motion); nothing lands on the first render
 *   narrow    under 28rem (a container query) the gutters narrow
 * Reduce Motion: messages appear in place; Jump to latest jumps and only fades.
 * Semantics: a log (polite): what arrives at its end is said. Jump to latest is inert while at the foot.
 * ───────────────────────────────────────────────────────── */

export interface ThreadProps {
  /** The messages, in the order said, each with a stable key (new keys land as they arrive). */
  children?: React.ReactNode;
  /** Names the log ("Conversation"). */
  'aria-label'?: string;
  /** Change it when the person sends (their newest message's id): the thread goes to the foot and follows. */
  pinKey?: React.Key;
  /** The way back's words ("Jump to latest"). */
  jumpLabel?: string;
  className?: string;
}

const ROOT = 'mu-thread @container/thread relative flex min-h-0 flex-col';
const LOG = 'mu-thread-log thread-rows px-thread-pad-x py-thread-pad-y @max-md/thread:px-thread-narrow-pad-x';
const JUMP_BAR = 'pointer-events-none absolute inset-x-0 bottom-thread-jump-inset flex justify-end px-thread-pad-x @max-md/thread:px-thread-narrow-pad-x';

const slopOf = (el: Element) => parseFloat(getComputedStyle(el).getPropertyValue('--mu-r-thread-self-follow')) || 0;

/** A conversation that stays with the newest message while you are there, and lets you read back. */
export function Thread({ children, 'aria-label': label = 'Conversation', pinKey, jumpLabel = 'Jump to latest', className }: ThreadProps) {
  const viewport = React.useRef<HTMLDivElement>(null);
  const log = React.useRef<HTMLDivElement>(null);
  const pinned = React.useRef(true);
  const jumping = React.useRef(false);
  const [away, setAway] = React.useState(false);

  const rows = React.Children.toArray(children).filter(React.isValidElement);
  useRowMotion(log, rows.map((r) => String(r.key)).join('\u0000'), true, 'below');

  const toFoot = React.useCallback((smooth: boolean) => {
    const v = viewport.current;
    if (v) v.scrollTo({ top: v.scrollHeight, behavior: smooth && !motionReduced(v) ? 'smooth' : 'auto' });
  }, []);

  // Where the person is: at the foot the thread follows; away, it stays put and offers the way back.
  React.useEffect(() => {
    const v = viewport.current;
    const content = log.current;
    if (!v || !content) return;
    const slop = slopOf(v);
    const atFoot = () => v.scrollHeight - v.scrollTop - v.clientHeight <= slop;
    const onScroll = () => {
      const foot = atFoot();
      if (jumping.current) { if (foot) jumping.current = false; else return; }
      pinned.current = foot;
      setAway(!foot);
    };
    // A glide that ended short of a foot that moved on: finish the trip.
    const onScrollEnd = () => { if (jumping.current) { jumping.current = false; toFoot(false); } };
    const onPerson = () => { jumping.current = false; };
    const grow = new ResizeObserver(() => { if (pinned.current && !jumping.current) toFoot(false); });
    v.addEventListener('scroll', onScroll, { passive: true });
    v.addEventListener('scrollend', onScrollEnd);
    v.addEventListener('wheel', onPerson, { passive: true });
    v.addEventListener('touchmove', onPerson, { passive: true });
    grow.observe(content);
    toFoot(false);
    return () => {
      v.removeEventListener('scroll', onScroll);
      v.removeEventListener('scrollend', onScrollEnd);
      v.removeEventListener('wheel', onPerson);
      v.removeEventListener('touchmove', onPerson);
      grow.disconnect();
    };
  }, [toFoot]);

  // The person sent: back to the foot, following.
  const sent = React.useRef(pinKey);
  useIsoLayoutEffect(() => {
    if (sent.current === pinKey) return;
    sent.current = pinKey;
    jumping.current = false;
    pinned.current = true;
    setAway(false);
    toFoot(false);
  }, [pinKey, toFoot]);

  const jump = () => {
    jumping.current = true;
    pinned.current = true;
    setAway(false);
    toFoot(true);
  };

  return (
    <div className={className ? `${ROOT} ${className}` : ROOT}>
      <ScrollArea className="min-h-0 flex-1" viewportRef={viewport}>
        <div ref={log} role="log" aria-label={label} className={LOG}>
          {rows.map((row) => <div key={row.key} data-row={String(row.key)}>{row}</div>)}
        </div>
      </ScrollArea>
      <div className={JUMP_BAR}>
        <Button
          size="compact"
          onClick={jump}
          inert={!away}
          aria-hidden={!away}
          data-away={away ? '' : undefined}
          icon={<ChevronIcon animate={false} />}
          className="mu-thread-jump thread-jump"
        >
          {jumpLabel}
        </Button>
      </div>
    </div>
  );
}
