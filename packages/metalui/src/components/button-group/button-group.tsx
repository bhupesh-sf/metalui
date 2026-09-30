'use client';

import * as React from 'react';
import { Menu } from '../menu/menu';
import { buttonClasses } from '../button/button';

/* ─────────────────────────────────────────────────────────
 * BUTTON GROUP and SPLIT BUTTON, related actions as one cluster of keys
 *
 *   group     button caps side by side in a sunk tray (the switch track's well); the inner corners
 *             tighten so they read as one set; each key presses on its own (the button's 1 press)
 *             and its neighbours stay still
 *   split     the main action and a chevron key; the chevron opens a menu of the other ways
 *   open      the chevron turns over on the part spring while the menu is open, and back after
 *   focus     each key is its own tab stop with the green ring
 * Reduce Motion: the chevron turns at once.
 * The caps are the button recipe; the button-group recipe adds the tray and the chevron.
 * ───────────────────────────────────────────────────────── */

const TRAY = 'mu-button-group inline-flex items-center gap-button-group-tray-gap p-button-group-tray-pad rounded-pill recipe-switch [&>.mu-button]:rounded-button-group-key-radius [&>.mu-button:first-child]:rounded-l-pill [&>.mu-button:last-child]:rounded-r-pill';
const CHEVRON_KEY = `${buttonClasses('standard')} mu-button w-button-group-chevron-width px-0!`;
const CHEVRON = 'mu-button-group-chevron size-button-group-chevron-glyph button-group-chevron reduced-motion:transition-none';

export interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** What the actions act on, for assistive tech: "Text alignment". */
  'aria-label': string;
}

/** Related actions set together. Put Buttons inside. */
export function ButtonGroup({ className, ...props }: ButtonGroupProps) {
  return <div role="group" className={className ? `${TRAY} ${className}` : TRAY} {...props} />;
}

export interface SplitButtonProps {
  /** The main action's cap: a Button. */
  children: React.ReactElement;
  /** The other ways to do it: MenuItem and MenuSeparator. */
  menu: React.ReactNode;
  /** Names the chevron: "More export options". */
  menuLabel: string;
  /** A heading engraved over the menu's rows. */
  heading?: string;
  disabled?: boolean;
}

/** The main action, and a chevron that opens the other ways to do it. */
export function SplitButton({ children, menu, menuLabel, heading, disabled }: SplitButtonProps) {
  return (
    <div role="group" aria-label={menuLabel} className={TRAY}>
      {children}
      <Menu
        heading={heading}
        align="end"
        trigger={(
          <button type="button" aria-label={menuLabel} disabled={disabled} className={CHEVRON_KEY}>
            <svg aria-hidden viewBox="0 0 12 12" className={CHEVRON} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 4.5 6 7.5l3-3" />
            </svg>
          </button>
        )}
      >
        {menu}
      </Menu>
    </div>
  );
}
