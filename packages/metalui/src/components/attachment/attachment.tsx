'use client';

import * as React from 'react';
import { Progress as BaseProgress } from '@base-ui/react/progress';
import { Avatar as BasePicture } from '@base-ui/react/avatar';
import { IconButton } from '../icon-button/icon-button';
import { Button } from '../button/button';
import { Progress } from '../progress/progress';
import { CloseIcon, RetryIcon, ZoomInIcon } from '../../icons/components.generated';
import { leaveRows } from '../../motion/rows';

/* ─────────────────────────────────────────────────────────
 * ATTACHMENT, a file someone attached, as a small raised plate
 *
 *   rest      its type engraved in a sunk well; its name with the middle cut (the extension stays
 *             readable); a line with its size
 *   arrive    it lands (T5b): from one nest above onto the table on the object spring, with its
 *             small overshoot
 *   upload    a thin track under the name fills with the progress fill on the settle spring; the
 *             line says how far. Before the amount is known (progress null) a lit segment sweeps the
 *             same track and the line says only "Uploading"; the fill takes over once it is known
 *   failed    the line says so in red, with Try again
 *   remove    it leaves as rows do (T9): one nest down, fading, on the release spring, then goes
 *   preview   a picture of an image file fills the type well, fading in over the extension once it
 *             has loaded; a broken one never shows
 *   tile      square, for a grid or a row of pictures: a raised plate with a sunk window cut in it (a
 *             slide in its mount) holding the picture or the extension; the name and size under it
 *             (regular) or the window alone (compact, 52). Uploading, the picture dims and a raised
 *             disc in the middle holds Progress's ring; failed, the disc holds Try again and the
 *             reason is said under it in red. Remove and open sit on raised caps at its top corners;
 *             a click on the picture opens it too (not a button, so a Sortable can lift from it)
 * Reduce Motion: it appears and goes at once; the fill still moves.
 * An object: it stands for a person's file. It uses the raised surface, the well, the progress fill
 * and Progress's ring.
 * ───────────────────────────────────────────────────────── */

const PLATE = 'mu-attachment relative flex w-full items-center gap-attachment-gap h-attachment-height min-w-attachment-min-width p-attachment-pad rounded-attachment-radius recipe-surface-raise-sm attachment-land reduced-motion:animate-none';
const TYPE = 'mu-attachment-type grid flex-none place-items-center size-attachment-type-size rounded-attachment-type-radius recipe-well-field type-label text-ink2 uppercase';
const BODY = 'mu-attachment-body grid flex-1 min-w-0 gap-attachment-body-gap';
const NAME = 'mu-attachment-name flex min-w-0 type-ui text-ink';
const META = 'mu-attachment-meta truncate type-meta tabular-nums text-ink3 data-failed:text-form-field-error-ink';
const TRACK = 'mu-attachment-track relative block h-attachment-track-height rounded-pill overflow-hidden recipe-switch';
// Progress's fill: full width, slid in by transform (never a width), on the settle spring.
const FILL = 'mu-attachment-fill block recipe-switch-on progress-fill';
const SEGMENT = 'mu-attachment-fill block rounded-pill recipe-switch-on progress-segment';
const PICTURE = 'mu-attachment-preview absolute inset-0 size-full object-cover attachment-preview';

// The tile: a raised plate with a sunk window; the caption under it (regular only).
const TILE = 'mu-attachment mu-attachment-tile relative grid content-start recipe-surface-raise-sm attachment-land reduced-motion:animate-none';
const TILE_SIZE: Record<AttachmentSize, string> = {
  regular: 'w-full min-w-attachment-tile-min-width gap-attachment-tile-gap p-attachment-tile-pad rounded-attachment-tile-radius',
  compact: 'size-attachment-compact-size p-attachment-compact-pad rounded-attachment-tile-radius',
};
const WINDOW = 'mu-attachment-window relative grid place-items-center overflow-hidden aspect-square recipe-well-field type-label text-ink2 uppercase';
const WINDOW_SIZE: Record<AttachmentSize, string> = {
  regular: 'w-full rounded-attachment-tile-window-radius',
  compact: 'size-full rounded-attachment-compact-window-radius',
};
const DISC = 'mu-attachment-disc absolute inset-0 m-auto grid place-items-center size-attachment-tile-disc rounded-full recipe-surface-raise-sm text-ink';
const CAP = 'mu-attachment-cap absolute grid place-items-center rounded-full recipe-surface-raise-sm';
const CAP_AT: Record<AttachmentSize, { start: string; end: string }> = {
  regular: { start: 'size-attachment-tile-cap top-attachment-tile-inset left-attachment-tile-inset', end: 'size-attachment-tile-cap top-attachment-tile-inset right-attachment-tile-inset' },
  compact: { start: 'size-attachment-compact-cap top-attachment-compact-inset left-attachment-compact-inset', end: 'size-attachment-compact-cap top-attachment-compact-inset right-attachment-compact-inset' },
};
const TILE_NAME = 'mu-attachment-name flex min-w-0 type-meta text-ink';
const CAPTION = 'mu-attachment-caption grid min-w-0 gap-attachment-tile-caption-gap px-attachment-tile-caption-pad pb-attachment-tile-caption-pad';
const GLYPH = 'size-attachment-remove-glyph';

export type AttachmentKind = 'row' | 'tile';
type AttachmentSize = 'regular' | 'compact';

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
  /** 0–100 while uploading; null while uploading before the amount is known; leave it out once done. */
  progress?: number | null;
  /** The upload failed: say why in a few words ("Too large"). */
  error?: string;
  onRetry?: () => void;
  /** Shows the remove key; called after the file has left. */
  onRemove?: () => void;
  /** Fill the row: no max width, for a list as wide as its panel. */
  fill?: boolean;
  /** A picture of the file (an object URL or a thumbnail's address): shown in place of the extension. */
  preview?: string;
  /** row (default): the 52 plate. tile: square, for a grid of pictures or a row of thumbnails. */
  kind?: AttachmentKind;
  /** Tiles only: 52 square, the window alone (a row of thumbnails). Otherwise a tile fills its grid column, with the name and size under it. */
  compact?: boolean;
  /** Tiles only: shows the open key, and a click on the picture opens it (show it bigger, in a Dialog). */
  onOpen?: () => void;
  className?: string;
}

/** The picture when it has loaded, the extension until then (and for good when it can't load). */
function Face({ type, preview }: { type: string; preview?: string }) {
  if (!preview) return <>{type}</>;
  return (
    <BasePicture.Root render={<span />} className="contents">
      <BasePicture.Fallback>{type}</BasePicture.Fallback>
      <BasePicture.Image src={preview} alt="" className={PICTURE} />
    </BasePicture.Root>
  );
}


/** A file someone attached. (Named Attachment so it never shadows the browser's File.) */
export function Attachment(props: AttachmentProps) {
  return props.kind === 'tile' ? <Tile {...props} /> : <Row {...props} />;
}

function Row({ name, size, progress, error, onRetry, onRemove, fill, preview, className }: AttachmentProps) {
  const plate = React.useRef<HTMLDivElement>(null);
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  const type = ext.slice(1, 5) || 'file';
  const uploading = progress !== undefined && !error;
  const meta = error ? error : uploading ? (progress == null ? 'Uploading' : `Uploading · ${Math.round(progress)} %`) : size != null ? formatBytes(size) : '';

  // It leaves as rows do; a host list that moves its rows with useRowMotion closes up after it.
  const remove = () => leaveRows([plate.current], () => onRemove?.());

  return (
    <div ref={plate} role="group" aria-label={name} className={[PLATE, !fill && 'max-w-attachment-max-width', className].filter(Boolean).join(' ')}>
      <span aria-hidden className={preview ? `${TYPE} relative overflow-hidden attachment-window` : TYPE}><Face type={type} preview={preview} /></span>
      <span className={BODY}>
        <span className={NAME} title={name}><span className="truncate">{base}</span><span className="flex-none">{ext}</span></span>
        {uploading && (
          <BaseProgress.Root value={progress} aria-label={`Uploading ${name}`}>
            <BaseProgress.Track className={TRACK}>
              {progress == null
                ? <span className={SEGMENT} data-indeterminate="" />
                : <span className={FILL} style={{ '--mu-progress-value': Math.max(0, Math.min(100, progress)) } as React.CSSProperties} />}
            </BaseProgress.Track>
          </BaseProgress.Root>
        )}
        {/* One line beside Try again; the whole reason is in the title and in the alert. */}
        <span className={META} title={meta || undefined} data-failed={error ? '' : undefined} role={error ? 'alert' : undefined}>{meta}</span>
      </span>
      {error && onRetry && <Button size="compact" onClick={onRetry}>Try again</Button>}
      {onRemove && (
        <IconButton
          variant="mini"
          label={`Remove ${name}`}
          onClick={remove}
          icon={<CloseIcon className={GLYPH} />}
        />
      )}
    </div>
  );
}

function Tile({ name, size: bytes, progress, error, onRetry, onRemove, onOpen, preview, compact, className }: AttachmentProps) {
  const size: AttachmentSize = compact ? 'compact' : 'regular';
  const plate = React.useRef<HTMLDivElement>(null);
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  const type = ext.slice(1, 5) || 'file';
  const uploading = progress !== undefined && !error;
  const meta = error ? error : uploading ? (progress == null ? 'Uploading' : `Uploading · ${Math.round(progress)} %`) : bytes != null ? formatBytes(bytes) : '';
  const remove = () => leaveRows([plate.current], () => onRemove?.());

  return (
    <div ref={plate} role="group" aria-label={name} title={compact ? (meta ? `${name} · ${meta}` : name) : undefined} data-size={size} className={[TILE, TILE_SIZE[size], className].filter(Boolean).join(' ')}>
      {/* The picture opens on click for a pointer; the open key is the way in for keys and readers. */}
      <span
        className={[WINDOW, WINDOW_SIZE[size], preview && 'attachment-window', onOpen && 'cursor-zoom-in'].filter(Boolean).join(' ')}
        data-dim={uploading || error ? '' : undefined}
        onClick={onOpen}
      >
        <span aria-hidden className="mu-attachment-face absolute inset-0 grid place-items-center attachment-dim"><Face type={type} preview={preview} /></span>
        {uploading && (
          <span className={DISC}>
            <Progress shape="ring" size={compact ? 'compact' : 'regular'} value={progress} label={`Uploading ${name}`} />
          </span>
        )}
        {error && onRetry && (
          <span className={DISC}>
            <IconButton label={`Try again ${name}`} icon={<RetryIcon />} onClick={(e) => { e.stopPropagation(); onRetry(); }} />
          </span>
        )}
      </span>
      {onOpen && (
        <span className={`${CAP} ${CAP_AT[size].start}`}>
          <IconButton variant="mini" label={`Open ${name}`} onClick={onOpen} icon={<ZoomInIcon className={GLYPH} />} />
        </span>
      )}
      {onRemove && (
        <span className={`${CAP} ${CAP_AT[size].end}`}>
          <IconButton variant="mini" label={`Remove ${name}`} onClick={remove} icon={<CloseIcon className={GLYPH} />} />
        </span>
      )}
      {compact
        ? error && <span role="alert" className="sr-only">{`${name}: ${error}`}</span>
        : (
          <span className={CAPTION}>
            <span className={TILE_NAME} title={name}><span className="truncate">{base}</span><span className="flex-none">{ext}</span></span>
            <span className={META} title={meta || undefined} data-failed={error ? '' : undefined} role={error ? 'alert' : undefined}>{meta}</span>
          </span>
        )}
    </div>
  );
}
