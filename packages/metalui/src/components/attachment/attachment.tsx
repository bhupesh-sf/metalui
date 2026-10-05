'use client';

import * as React from 'react';
import { Progress as BaseProgress } from '@base-ui/react/progress';
import { IconButton } from '../icon-button/icon-button';
import { Button } from '../button/button';
import { motionReduced } from '../../motion/reduced';

/* ─────────────────────────────────────────────────────────
 * ATTACHMENT, a file someone attached, as a small raised plate
 *
 *   rest      its type engraved in a sunk well; its name with the middle cut (the extension stays
 *             readable); a line with its size
 *   arrive    it lands (T5b): from one nest above onto the table on the object spring, with its
 *             small overshoot
 *   upload    a thin track under the name fills with the progress fill on the settle spring; the
 *             line says how far
 *   failed    the line says so in red, with Try again
 *   remove    it leaves as rows do (T9): one nest down, fading, on the release spring, then goes
 * Reduce Motion: it appears and goes at once; the fill still moves.
 * An object: it stands for a person's file. It uses the raised surface, the well and the progress fill.
 * ───────────────────────────────────────────────────────── */

const PLATE = 'mu-attachment relative flex w-full items-center gap-attachment-gap h-attachment-height min-w-attachment-min-width max-w-attachment-max-width p-attachment-pad rounded-attachment-radius recipe-surface-raise-sm attachment-land data-leaving:attachment-leave reduced-motion:animate-none';
const TYPE = 'mu-attachment-type grid flex-none place-items-center size-attachment-type-size rounded-attachment-type-radius recipe-well-field type-label text-ink2 uppercase';
const BODY = 'mu-attachment-body grid flex-1 min-w-0 gap-attachment-body-gap';
const NAME = 'mu-attachment-name flex min-w-0 type-ui text-ink';
const META = 'mu-attachment-meta type-meta tabular-nums text-ink3 data-failed:text-form-field-error-ink';
const TRACK = 'mu-attachment-track block h-attachment-track-height rounded-pill overflow-hidden recipe-switch';
const FILL = 'block h-full rounded-pill recipe-switch-on transition-progress-fill';

/** "12.4 MB" from bytes. */
export function formatBytes(bytes: number, locale?: string) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let n = bytes, u = 0;
  while (n >= 1000 && u < units.length - 1) { n /= 1000; u++; }
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: n < 10 && u > 0 ? 1 : 0 }).format(n)} ${units[u]}`;
}

export interface AttachmentProps {
  name: string;
  /** Size in bytes. */
  size?: number;
  /** 0–100 while uploading; leave it out once done. */
  progress?: number;
  /** The upload failed: say why in a few words ("Too large"). */
  error?: string;
  onRetry?: () => void;
  /** Shows the remove key; called after the file has left. */
  onRemove?: () => void;
  className?: string;
}

/** A file someone attached. (Named Attachment so it never shadows the browser's File.) */
export function Attachment({ name, size, progress, error, onRetry, onRemove, className }: AttachmentProps) {
  const [leaving, setLeaving] = React.useState(false);
  const plate = React.useRef<HTMLDivElement>(null);
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  const type = ext.slice(1, 5) || 'file';
  const uploading = progress != null && !error;
  const meta = error ? error : uploading ? `Uploading · ${Math.round(progress)} %` : size != null ? formatBytes(size) : '';

  const remove = () => {
    const el = plate.current;
    const ms = el ? parseFloat(getComputedStyle(el).getPropertyValue('--mu-spring-release-d')) * 1000 : 0;
    const reduced = motionReduced(el);
    if (!ms || reduced) return onRemove?.();
    setLeaving(true);
    window.setTimeout(() => onRemove?.(), ms);
  };

  return (
    <div ref={plate} role="group" aria-label={name} data-leaving={leaving ? '' : undefined} className={className ? `${PLATE} ${className}` : PLATE}>
      <span aria-hidden className={TYPE}>{type}</span>
      <span className={BODY}>
        <span className={NAME} title={name}><span className="truncate">{base}</span><span className="flex-none">{ext}</span></span>
        {uploading && (
          <BaseProgress.Root value={progress} aria-label={`Uploading ${name}`}>
            <BaseProgress.Track className={TRACK}><BaseProgress.Indicator className={FILL} /></BaseProgress.Track>
          </BaseProgress.Root>
        )}
        <span className={META} data-failed={error ? '' : undefined} role={error ? 'alert' : undefined}>{meta}</span>
      </span>
      {error && onRetry && <Button size="compact" onClick={onRetry}>Try again</Button>}
      {onRemove && (
        <IconButton
          variant="mini"
          label={`Remove ${name}`}
          onClick={remove}
          icon={<svg aria-hidden viewBox="0 0 10 10" className="size-attachment-remove-glyph" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"><path d="M2.5 2.5l5 5M7.5 2.5l-5 5" /></svg>}
        />
      )}
    </div>
  );
}
