'use client';

import * as React from 'react';

/* ─────────────────────────────────────────────────────────
 * SKELETON, where content will be before it arrives
 *
 *     0 ms   mounted, invisible: a fast load never flashes it
 *   300 ms   the shapes fade in on the settle spring: blocks, lines, circles in the field well's
 *            sunk look, laid out where the content will stand
 *   always   a soft light passes across the wells (1.6 s, linear): a sheen on metal, not a pulse
 *   arrive   Skeleton.Swap: the shapes fade out and the content fades in on the settle spring,
 *            in the same place, so nothing below moves
 * Reduce Motion: no sheen; the fades stay.
 * A part: it has a look and no job. Slots: Skeleton (a block), Skeleton.Text, Skeleton.Circle,
 * Skeleton.Swap.
 * ───────────────────────────────────────────────────────── */

const SHAPE = 'mu-skeleton block recipe-well-field skeleton-sheen skeleton-arrive';

export interface SkeletonProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** The size of what will be there (any CSS length); the host knows it. */
  width?: number | string;
  height?: number | string;
}

/** A block where something will be: an image, a card, a control. */
function Block({ width = '100%', height, className, style, ...props }: SkeletonProps) {
  const own = `${SHAPE} rounded-skeleton-radius`;
  return <span aria-hidden className={className ? `${own} ${className}` : own} style={{ width, height: height ?? 'var(--mu-r-skeleton-self-line)', ...style }} {...props} />;
}

/** Lines of text; the last one is shorter, as text is. */
function Text({ lines = 3, width = '100%', className }: { lines?: number; width?: number | string; className?: string }) {
  return (
    <span aria-hidden className={className ? `mu-skeleton-text grid gap-skeleton-line-gap ${className}` : 'mu-skeleton-text grid gap-skeleton-line-gap'} style={{ width }}>
      {Array.from({ length: lines }, (_, i) => (
        <span key={i} className={`${SHAPE} h-skeleton-line rounded-pill`} style={{ width: i === lines - 1 && lines > 1 ? 'calc(var(--mu-r-skeleton-self-last) * 100%)' : '100%' }} />
      ))}
    </span>
  );
}

/** A circle where an avatar or a glyph will be. */
function Circle({ size = 32, className }: { size?: number; className?: string }) {
  const own = `${SHAPE} rounded-full flex-none`;
  return <span aria-hidden className={className ? `${own} ${className}` : own} style={{ width: size, height: size }} />;
}

export interface SkeletonSwapProps {
  /** While true, the fallback (the shapes) stands where the content will be. */
  loading: boolean;
  /** The shapes: Skeleton, Skeleton.Text, Skeleton.Circle laid out like the content. */
  fallback: React.ReactNode;
  children: React.ReactNode;
  /** What is loading, for assistive tech: "Loading notes". */
  label?: string;
}

/** Shapes while loading; the content, faded in on the settle spring, once it arrives. */
function Swap({ loading, fallback, children, label = 'Loading' }: SkeletonSwapProps) {
  const was = React.useRef(loading);
  const arrived = was.current && !loading;
  React.useEffect(() => { if (loading) was.current = true; }, [loading]);
  if (loading) return <div role="status" aria-busy aria-label={label} className="mu-skeleton-swap">{fallback}</div>;
  return <div className={arrived ? 'mu-skeleton-swap skeleton-swap-in' : 'mu-skeleton-swap'}>{children}</div>;
}

export const Skeleton = Object.assign(Block, { Text, Circle, Swap });
