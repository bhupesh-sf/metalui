'use client';

import * as React from 'react';
import { springOf } from '../../motion/rows';
import { useIsoLayoutEffect } from '../../motion/layout-effect';
import { SwapText } from '../../motion/swap';
import { Led, type LedKind } from '../led/led';
import { Skeleton } from '../skeleton/skeleton';

/* ─────────────────────────────────────────────────────────
 * MESSAGE, one turn of a conversation
 *
 *   user       the person's turn at the end, on a raised plate (raise-sm, the card radius), indented
 *              from the start; a header only for a time or an avatar ("You" is said, not shown)
 *   assistant  at the start, plain content type on the page; a header: the speaker, the model after
 *              a dot, the time in tabular figures
 *   avatar     the host's element at the turn's own side, level with the header
 *   status     the header's lamp and its word on the drum:
 *                waiting  the amber lamp breathing, "Thinking"; one sunk skeleton line until words come
 *                writing  the green lamp, "Writing"
 *                stopped  the off lamp, "Stopped"
 *                failed   the red lamp, "Failed"
 *                done     the off lamp, no word
 *   footer     the host's actions or delivery; when it appears after the turn did, it fades in (settle)
 *   files      the host's attachments above the body, on the turn's side
 *   grouped    the same speaker again: no header, the avatar's column kept empty; Thread closes the gap
 *   system     centred meta words in ink2 between two engraved rules, a note
 *   narrow     under 28rem (a container query on the turn) the person's indent narrows
 * Reduce Motion: the footer appears at once; the lamp holds steady.
 * Semantics: an article named by its speaker ("You", "Assistant, Thorough"), busy while a reply thinks or
 * writes, so a reader hears it once it settles. A system message is a note.
 * ───────────────────────────────────────────────────────── */

export type MessageFrom = 'user' | 'assistant' | 'system';
export type MessageStatus = 'waiting' | 'writing' | 'done' | 'stopped' | 'failed';

export interface MessageProps extends Omit<React.HTMLAttributes<HTMLElement>, 'children'> {
  /** Who speaks: the person (end, on a plate), the assistant (start, on the page), or the system (centred). */
  from: MessageFrom;
  /** The speaker's name: written in the header and naming the turn ("Assistant"; the person is "You"). */
  name?: string;
  /** The model that wrote a reply, after the name. */
  model?: string;
  /** When it was said: a short time in the header. */
  time?: Date | string | number;
  /** A reply's state: the header's lamp and word. */
  status?: MessageStatus;
  /** The host's avatar element (`<Avatar size="small" label="" />`), at the turn's side. */
  avatar?: React.ReactElement;
  /** Files sent with the turn (`Attachment`s), above the body. */
  attachments?: React.ReactNode;
  /** Actions or delivery under the body (Copy, Retry, "Sent"). */
  footer?: React.ReactNode;
  /** The same speaker as the turn before: no header, the avatar's column kept. */
  grouped?: boolean;
  children?: React.ReactNode;
}

const stateOf: Record<MessageStatus, { led: LedKind; words: string }> = {
  waiting: { led: 'waiting', words: 'Thinking' },
  writing: { led: 'live', words: 'Writing' },
  done: { led: 'off', words: '' },
  stopped: { led: 'off', words: 'Stopped' },
  failed: { led: 'failed', words: 'Failed' },
};

const ROOT = 'mu-message @container/message';
const ROW = 'flex items-start gap-message-avatar-gap';
const SIDE = 'mu-message-avatar flex flex-none items-center min-h-message-header-height';
const MAIN = 'grid min-w-0 flex-1 gap-message-gap';
const HEADER = 'mu-message-header flex min-h-message-header-height items-center gap-message-header-gap type-meta text-ink2';
const PLATE = 'mu-message-plate max-w-full whitespace-pre-wrap break-words px-message-plate-pad-x py-message-plate-pad-y rounded-card recipe-surface-raise-sm type-content text-ink';
const TEXT = 'mu-message-text min-w-0 whitespace-pre-wrap break-words type-content text-ink';
const FILES = 'mu-message-files flex flex-wrap gap-message-footer-gap';
const FOOTER = 'mu-message-footer flex flex-wrap items-center gap-message-footer-gap';
const SYSTEM = 'mu-message flex items-center gap-message-system-gap type-meta text-ink2';
const SYSTEM_RULE = 'h-rule-thickness min-w-0 flex-1 recipe-rule';

const join = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ');

function clock(time: Date | string | number) {
  const d = time instanceof Date ? time : new Date(time);
  if (Number.isNaN(d.getTime())) return null;
  return <time className="text-ink3 tabular-nums" dateTime={d.toISOString()}>{d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</time>;
}

/** The footer fades in when it appears after the turn did (a reply settling), never on the first render. */
function useFooterFade(on: boolean) {
  const ref = React.useRef<HTMLDivElement>(null);
  const was = React.useRef(on);
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (on && !was.current && el) {
      const { ms, easing } = springOf(el, 'settle');
      if (ms) el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms, easing });
    }
    was.current = on;
  }, [on]);
  return ref;
}

/** One turn of a conversation: the person's on a plate at the end, the assistant's on the page at the start. */
export function Message({ from, name, model, time, status, avatar, attachments, footer, grouped, children, className, ...props }: MessageProps) {
  const footerRef = useFooterFade(footer != null && footer !== false);

  if (from === 'system') {
    return (
      <div role="note" data-from="system" data-grouped={grouped ? '' : undefined} className={join(SYSTEM, className)} {...props}>
        <span aria-hidden className={SYSTEM_RULE} />
        <span className="min-w-0 text-center">{children}</span>
        <span aria-hidden className={SYSTEM_RULE} />
      </div>
    );
  }

  const user = from === 'user';
  const speaker = name ?? (user ? 'You' : 'Assistant');
  const state = status ? stateOf[status] : null;
  const busy = status === 'waiting' || status === 'writing';
  const empty = children == null || children === '' || children === false;
  const when = time != null ? clock(time) : null;
  const header = !grouped && (user ? (when || avatar) : true);

  return (
    <article
      aria-label={model && !user ? `${speaker}, ${model}` : speaker}
      aria-busy={status ? busy : undefined}
      data-from={from}
      data-status={status}
      data-grouped={grouped ? '' : undefined}
      className={join(ROOT, className)}
      {...props}
    >
      <div className={join(ROW, user && 'flex-row-reverse ps-message-user-indent @max-md/message:ps-message-narrow-indent')}>
        {avatar && <span aria-hidden={grouped || undefined} className={join(SIDE, grouped && 'invisible')}>{avatar}</span>}
        <div className={join(MAIN, user && 'justify-items-end')}>
          {header && (
            <header className={join(HEADER, user && 'justify-end')}>
              {state && <Led kind={state.led} size="small" gesture={status === 'waiting' ? 'breathe' : 'steady'} />}
              {!user && <span>{speaker}{model && ` · ${model}`}</span>}
              {when}
              {state && <span className="text-ink3" data-status={status}><SwapText value={state.words} /></span>}
            </header>
          )}
          {attachments && <div className={join(FILES, user && 'justify-end')}>{attachments}</div>}
          {status === 'waiting' && empty
            ? <Skeleton.Text lines={1} width="62%" />
            : !empty && <div className={user ? PLATE : TEXT}>{children}</div>}
          {footer != null && footer !== false && <div ref={footerRef} className={join(FOOTER, user && 'justify-end')}>{footer}</div>}
        </div>
      </div>
    </article>
  );
}
