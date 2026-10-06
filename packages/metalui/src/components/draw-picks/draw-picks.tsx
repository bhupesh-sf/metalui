'use client';

import * as React from 'react';
import { Toolbar as BaseToolbar } from '@base-ui/react/toolbar';
import { Toggle } from '@base-ui/react/toggle';
import { Tooltip } from '../tooltip/tooltip';

/* ─────────────────────────────────────────────────────────
 * DRAW PICKS: the ink and width choices in the drawing group (inside a Toolbar)
 *
 *   ink      a 14 glossy bead in its colour, on a 28 round cap
 *   width    a short stroke of its weight (3, 6, 10) in the current ink, as it will draw
 *   hover    the bead or dot lifts to 1.14 on the part spring
 *   press    squeezes to .88, fast
 *   chosen   sits in a sunk well, like a latched tool; changes at once
 *   names    each pick says its group: "Ink: red", "Width: fine" (tooltip and accessible name)
 *   focus    the 1.5 ring with no offset; arrows move along the strip
 *   disabled 40 % (the eraser has no ink or width)
 * Five inks and three widths, fixed. Never a free colour picker.
 * ───────────────────────────────────────────────────────── */

export type Ink = 'ink' | 'red' | 'blue' | 'green' | 'amber';
export type InkWidth = 'fine' | 'regular' | 'bold';

export const INKS: { value: Ink; label: string }[] = [
  { value: 'ink', label: 'Plain' },
  { value: 'red', label: 'Red' },
  { value: 'blue', label: 'Blue' },
  { value: 'green', label: 'Green' },
  { value: 'amber', label: 'Amber' },
];
export const INK_WIDTHS: { value: InkWidth; label: string }[] = [
  { value: 'fine', label: 'Fine' },
  { value: 'regular', label: 'Regular' },
  { value: 'bold', label: 'Bold' },
];

/** The CSS colour of an ink, for drawing with it. */
export const inkColor = (ink: Ink) => `var(--mu-r-draw-ink-${ink})`;

const PICKS = 'mu-draw-picks draw-picks';
const PICK = 'mu-draw-pick draw-pick tap-highlight-none';
const BEAD = 'mu-draw-bead draw-bead draw-lift reduced-motion:transition-none';
const DOT = { fine: 'draw-w-fine', regular: 'draw-w-regular', bold: 'draw-w-bold' };
const DOT_BASE = 'mu-draw-dot draw-dot draw-lift reduced-motion:transition-none';

/** A stroke of one width in one ink: the width picks' face, and a tray cap that shows the pen as it is set. */
export function InkStroke({ ink = 'ink', width = 'regular' }: { ink?: Ink; width?: InkWidth }) {
  return <span aria-hidden className={`${DOT_BASE} ${DOT[width]}`} style={{ '--mu-self': inkColor(ink) } as React.CSSProperties} />;
}

function Pick({ label, chosen, onChoose, disabled, children }: { label: string; chosen: boolean; onChoose: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <Tooltip label={label}>
      <BaseToolbar.Button
        render={<Toggle pressed={chosen} onPressedChange={() => onChoose()} />}
        className={PICK}
        aria-label={label}
        disabled={disabled}
      >
        {children}
      </BaseToolbar.Button>
    </Tooltip>
  );
}

export interface InkPicksProps {
  value: Ink;
  onValueChange: (ink: Ink) => void;
  disabled?: boolean;
}

/** The five inks. */
export function InkPicks({ value, onValueChange, disabled }: InkPicksProps) {
  return (
    <BaseToolbar.Group className={PICKS} aria-label="Ink">
      {INKS.map((k) => (
        <Pick key={k.value} label={`Ink: ${k.label.toLowerCase()}`} chosen={value === k.value} onChoose={() => onValueChange(k.value)} disabled={disabled}>
          <span aria-hidden className={BEAD} style={{ '--mu-self': inkColor(k.value) } as React.CSSProperties} />
        </Pick>
      ))}
    </BaseToolbar.Group>
  );
}

export interface WidthPicksProps {
  value: InkWidth;
  onValueChange: (width: InkWidth) => void;
  /** The ink the dots are drawn in. */
  ink?: Ink;
  disabled?: boolean;
}

/** The three widths, as strokes in the current ink. */
export function WidthPicks({ value, onValueChange, ink = 'ink', disabled }: WidthPicksProps) {
  return (
    <BaseToolbar.Group className={PICKS} aria-label="Width">
      {INK_WIDTHS.map((w) => (
        <Pick key={w.value} label={`Width: ${w.label.toLowerCase()}`} chosen={value === w.value} onChoose={() => onValueChange(w.value)} disabled={disabled}>
          <InkStroke ink={ink} width={w.value} />
        </Pick>
      ))}
    </BaseToolbar.Group>
  );
}
