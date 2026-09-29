'use client';

import * as React from 'react';
import { Combobox as BaseCombobox } from '@base-ui/react/combobox';
import { menuParts, ListGlide } from '../menu/menu';

/* ─────────────────────────────────────────────────────────
 * COMBOBOX, type to find one of many, on Base UI Combobox
 *
 *   rest      a field well with a placeholder
 *   type      the menu's frosted plate opens (fades in on settle); rows filter at once, never
 *             lagging the fingers, while the plate's height settles to the new count on the
 *             settle spring, so it never snaps size
 *   move      ↑ ↓ or the pointer: the one highlight glides row to row (the menu's live list)
 *   choose    ↩ or a click fills the field; the plate fades out on release
 *   clear     a clear mark fades in once a value is chosen; it takes the choice away
 *   nothing   one quiet row: "No matches"
 *   focus     the flush green ring on the well
 * Reduce Motion: the height snaps; fades stay.
 * The well is the field look, the plate and rows the menu recipe; combobox adds size and fit.
 * ───────────────────────────────────────────────────────── */

const GROUP = 'mu-combobox flex items-center gap-combobox-gap h-combobox-height min-w-combobox-min-width pl-combobox-pad-left pr-combobox-pad-right rounded-combobox-radius box-border recipe-well-field focus-within:focus-ring-flush data-disabled:opacity-combobox-disabled';
const INPUT = 'mu-combobox-input flex-1 min-w-0 h-full p-0 border-0 outline-none bg-transparent type-ui text-field-field-ink caret-field-field-caret placeholder:text-field-field-hint';
const CLEAR = 'mu-combobox-clear inline-grid place-items-center flex-none size-combobox-clear-size rounded-full border-0 bg-transparent text-ink3 hover:text-ink cursor-pointer transition-opacity duration-settle ease-settle data-starting-style:opacity-0 data-ending-style:opacity-0 focus-visible:focus-ring';
const POSITIONER = 'mu-menu-positioner z-menu-z';
const POP = `${menuParts.PLATE} relative mu-combobox-pop combobox-pop-width`;
const FIT = 'mu-combobox-fit combobox-fit';
const LIST = 'mu-combobox-list overflow-y-auto outline-none';
const EMPTY = 'mu-combobox-empty px-menu-row-pad py-menu-heading-pad-bottom type-ui text-ink3 empty:hidden';

function offset() {
  if (typeof window === 'undefined') return 6;
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--mu-menu-offset')) || 6;
}

/** The plate's height follows its content on the settle spring. */
function Fit({ children }: { children: React.ReactNode }) {
  const inner = React.useRef<HTMLDivElement>(null);
  const [height, setHeight] = React.useState<number>();
  React.useLayoutEffect(() => {
    const el = inner.current;
    if (!el) return;
    setHeight(el.offsetHeight);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return <div className={FIT} style={{ height }}><div ref={inner}>{children}</div></div>;
}

export interface ComboboxProps<Item extends string = string> {
  /** Everything that can be found. */
  items: Item[];
  value?: Item | null;
  defaultValue?: Item | null;
  onValueChange?: (value: Item | null) => void;
  placeholder?: string;
  /** Names the field for assistive tech when there is no visible label. */
  'aria-label'?: string;
  disabled?: boolean;
  /** Said in the one quiet row when nothing matches. */
  emptyText?: string;
  className?: string;
}

/** Type to find one of many. */
export function Combobox<Item extends string = string>({ items, value, defaultValue, onValueChange, placeholder, disabled, emptyText = 'No matches', className, ...aria }: ComboboxProps<Item>) {
  return (
    <BaseCombobox.Root<Item> items={items} value={value} defaultValue={defaultValue} onValueChange={(v) => onValueChange?.(v as Item | null)} disabled={disabled}>
      <BaseCombobox.InputGroup className={className ? `${GROUP} ${className}` : GROUP}>
        <BaseCombobox.Input className={INPUT} placeholder={placeholder} aria-label={aria['aria-label']} />
        <BaseCombobox.Clear className={CLEAR} aria-label="Clear">
          <svg aria-hidden viewBox="0 0 10 10" className="size-combobox-clear-glyph" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"><path d="M2 2l6 6M8 2 2 8" /></svg>
        </BaseCombobox.Clear>
      </BaseCombobox.InputGroup>
      <BaseCombobox.Portal>
        <BaseCombobox.Positioner className={POSITIONER} sideOffset={offset()} collisionPadding={8}>
          <BaseCombobox.Popup className={POP}>
            <Fit>
              <ListGlide />
              <BaseCombobox.Empty className={EMPTY}>{emptyText}</BaseCombobox.Empty>
              <BaseCombobox.List className={LIST} style={{ maxHeight: 'calc(var(--mu-r-combobox-self-max-rows) * var(--mu-r-menu-row-height))' }}>
                {(item: Item) => (
                  <BaseCombobox.Item key={item} value={item} className={menuParts.LIVE_ROW}>
                    <span className={menuParts.LABEL}>{item}</span>
                  </BaseCombobox.Item>
                )}
              </BaseCombobox.List>
            </Fit>
          </BaseCombobox.Popup>
        </BaseCombobox.Positioner>
      </BaseCombobox.Portal>
    </BaseCombobox.Root>
  );
}
