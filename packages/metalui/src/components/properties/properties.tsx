'use client';

import * as React from 'react';

/* ─────────────────────────────────────────────────────────
 * PROPERTIES, label and value pairs (a dl): a receipt, a details panel, a spec sheet
 *
 *   rest      engraved labels in a column as wide as the longest (up to 200), values beside them in
 *             ui type and ink; each pair parted by the rule's hairline, the last one open
 *   size      regular (pairs at least 32 tall) or compact (24)
 *   values    text, or any of the table's cell looks: pass a TableCell (status, person, code, money)
 *   narrow    under 280 wide the label stands above its value (its own container, @container/properties)
 * Nothing moves. Two columns and no header: not a table.
 * A part: a look with no job of its own. Slots: Properties.Root, Properties.Item.
 * ───────────────────────────────────────────────────────── */

export type PropertiesSize = 'regular' | 'compact';

export interface PropertiesRootProps extends React.HTMLAttributes<HTMLDListElement> {
  /** regular (pairs at least 32 tall, the default) or compact (24). */
  size?: PropertiesSize;
}

export interface PropertiesItemProps extends React.HTMLAttributes<HTMLDivElement> {
  /** What the value is: engraved. */
  label: React.ReactNode;
  /** The value: text, or a TableCell in its kind's look. */
  children?: React.ReactNode;
}

const FRAME = 'mu-properties-frame properties-frame min-w-0';
const LIST = 'mu-properties properties-grid properties-stack';
const LABEL = 'mu-properties-label type-label engraved';
const VALUE = 'mu-properties-value type-ui text-ink tabular-nums';

function Root({ size = 'regular', className, ...props }: PropertiesRootProps) {
  return (
    <div className={size === 'compact' ? `${FRAME} properties-compact` : FRAME} data-size={size}>
      <dl className={className ? `${LIST} ${className}` : LIST} {...props} />
    </div>
  );
}

function Item({ label, children, ...props }: PropertiesItemProps) {
  return (
    <div {...props}>
      <dt className={LABEL}>{label}</dt>
      <dd className={VALUE}>{children ?? <span className="text-ink3">—<span className="sr-only">none</span></span>}</dd>
    </div>
  );
}

/** Label and value pairs. */
export const Properties = Object.assign(Root, { Root, Item });
export type PropertiesProps = PropertiesRootProps;
