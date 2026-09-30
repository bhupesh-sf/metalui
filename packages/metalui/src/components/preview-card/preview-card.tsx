'use client';

import * as React from 'react';
import { PreviewCard as BaseCard } from '@base-ui/react/preview-card';
import { popoverParts } from '../popover/popover';

/* ─────────────────────────────────────────────────────────
 * PREVIEW CARD, what is behind a link, seen by resting on it, on Base UI Preview Card
 *
 *   rest      the link, as it is
 *   wait      a steady hover of 600 ms: passing over a link never flashes the card
 *   open      the popover's frosted plate rises one nest out of the link on the surface spring:
 *             an optional image, the title, a line of description, where it goes
 *   linger    the pointer can move onto the card; it stays 300 ms after the pointer leaves
 *   close     it fades on the release spring
 * Reduce Motion: a crossfade.
 * The plate, rise and text are the popover's; the preview-card recipe adds the width and timing.
 * ───────────────────────────────────────────────────────── */

const POSITIONER = 'mu-preview-card-positioner z-menu-z';
const PLATE = `${popoverParts.PLATE} mu-preview-card w-preview-card-width grid gap-preview-card-gap`;
const IMAGE = 'mu-preview-card-image block w-full h-preview-card-image object-cover rounded-preview-card-radius';
// The popover's description look; the card's own gap spaces it.
const DESCRIPTION = 'mu-preview-card-description m-0 type-body text-ink2';
const HOST = 'mu-preview-card-host type-meta text-ink3';

export interface Preview {
  title: string;
  description?: string;
  /** Where it goes, shown small at the end: "w3.org". */
  host?: string;
  /** An image of the destination. */
  image?: string;
}

export interface PreviewCardProps {
  /** The link it previews (it keeps its own look and behaviour). */
  children: React.ReactElement;
  preview: Preview;
  side?: 'bottom' | 'top';
}

function timing(name: 'delay' | 'close', fallback: number) {
  if (typeof window === 'undefined') return fallback;
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue(`--mu-r-preview-card-self-${name}`)) || fallback;
}

/** Shows what is behind a link after a steady hover. */
export function PreviewCard({ children, preview, side = 'bottom' }: PreviewCardProps) {
  return (
    <BaseCard.Root>
      <BaseCard.Trigger render={children} delay={timing('delay', 600)} closeDelay={timing('close', 300)} />
      <BaseCard.Portal>
        <BaseCard.Positioner className={POSITIONER} side={side} sideOffset={6} collisionPadding={8}>
          <BaseCard.Popup className={PLATE}>
            {preview.image && <img src={preview.image} alt="" className={IMAGE} />}
            <p className={popoverParts.TITLE}>{preview.title}</p>
            {preview.description && <p className={DESCRIPTION}>{preview.description}</p>}
            {preview.host && <span className={HOST}>{preview.host}</span>}
          </BaseCard.Popup>
        </BaseCard.Positioner>
      </BaseCard.Portal>
    </BaseCard.Root>
  );
}
