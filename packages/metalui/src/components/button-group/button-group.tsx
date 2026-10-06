'use client';

import * as React from 'react';
import { ToggleGroup as BaseToggleGroup } from '@base-ui/react/toggle-group';
import { Menu } from '../menu/menu';
import { Button, type ButtonProps } from '../button/button';
import { Well } from '../well/well';
import { Icon } from '../../icons/Icon';
import { SwapText } from '../../motion/swap';

/* ─────────────────────────────────────────────────────────
 * BUTTON GROUP and SPLIT BUTTON, related actions as one machined bar (storyboard)
 *
 *   rest      one raised cap in the keys' material (standard, compact or primary), the outer pill
 *             radius only; the keys are cut apart by engraved seams (a dark line, a light edge)
 *   hover     that segment's light lifts; the bar and the seams stay as they are
 *   press     only that segment sinks: its shading goes to the button's pressed look and it travels
 *             the button's 1 in 50 ms, linear; the seams and the rest of the bar stay put
 *   release   it springs back on the release spring (the button's own motion)
 *   window    a readout between steppers is a sunk window in the bar, tabular; it turns on the drum
 *   rocker    a pair as one cap: it tips toward the pressed end on the part spring, and back
 *   split     the main action, a seam, the chevron; while the menu is open the chevron segment stays
 *             pressed and the set's chevron turns over on the part spring; back when it closes
 *   latched   toggles in the bar (`latch`) stay sunk with their lamp lit
 *   focus     the ring inside the segment, within the bar's shape
 *   disabled  a key at 40 %; the whole bar at 40 % (`disabled`)
 * Reduce Motion: the rocker and the chevron turn at once; the drum cross-fades.
 * The keys are Buttons (or Toggles); the button-group recipe adds the bar, seams, window and rocker.
 * ───────────────────────────────────────────────────────── */

const BAR = 'mu-button-group button-group-bar';
const SEAM = <span aria-hidden className="mu-button-group-seam button-group-seam" />;
const WINDOW = 'mu-button-group-window button-group-window type-ui text-ink';
const CHEVRON = 'w-button-group-chevron-width px-0!';

/** A seam between every two parts: the bar draws them, so they stay put when a key sinks. */
function seamed(children: React.ReactNode) {
  return React.Children.toArray(children).flatMap((child, i) => (i ? [React.cloneElement(SEAM, { key: `seam-${i}` }), child] : [child]));
}

interface BarProps {
  /** What the actions act on, for assistive tech: "History", "Zoom". */
  'aria-label': string;
  /** The bar and every key in it at 40 %, refusing presses. */
  disabled?: boolean;
  className?: string;
  /** The keys: Buttons (or Toggles with `latch`), and a ButtonGroupReadout between steppers. */
  children: React.ReactNode;
}

export interface ButtonGroupProps extends BarProps {
  /**
   * A pair as one rocker cap: pressing either end tips the whole cap toward it on the part spring (two
   * keys only: Undo / Redo, − / +).
   */
  rocker?: boolean;
  /** The keys latch (Toggles in the bar): `one` lets one stay down at a time, `several` any number. */
  latch?: 'one' | 'several';
  /** With `latch`: the values of the latched Toggles (controlled). */
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
}

/** Related actions as one machined bar: put Buttons inside (or Toggles, with `latch`). */
export function ButtonGroup({ className, children, rocker, latch, value, defaultValue, onValueChange, disabled, ...props }: ButtonGroupProps) {
  const cls = className ? `${BAR} ${className}` : BAR;
  if (latch) {
    return (
      <BaseToggleGroup
        className={cls}
        multiple={latch === 'several'}
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange ? (v) => onValueChange(v.map(String)) : undefined}
        disabled={disabled}
        {...props}
      >
        {seamed(children)}
      </BaseToggleGroup>
    );
  }
  // A fieldset is the group: `disabled` disables every key in it at once.
  return <fieldset className={cls} disabled={disabled} data-rocker={rocker ? '' : undefined} {...props}>{seamed(children)}</fieldset>;
}

export interface ButtonGroupReadoutProps {
  /** The value shown, as words: "100 %". A change turns it on the drum. */
  children: string;
  className?: string;
}

/** A value between steppers (the zoom's 100 %): a sunk window in the bar, not a key. Announced politely. */
export function ButtonGroupReadout({ children, className }: ButtonGroupReadoutProps) {
  return (
    <Well as="span" variant="field" role="status" className={className ? `${WINDOW} ${className}` : WINDOW}>
      <SwapText value={children} className="tabular-nums" />
    </Well>
  );
}

export interface SplitButtonProps {
  /** The main action's cap: a Button. Its cap and size dress the whole bar. */
  children: React.ReactElement<ButtonProps>;
  /** The other ways to do it: MenuItem and MenuSeparator. */
  menu: React.ReactNode;
  /** Names the chevron: "More export options". */
  menuLabel: string;
  /** A heading engraved over the menu's rows. */
  heading?: string;
  disabled?: boolean;
}

/** The main action, a seam, and a chevron that opens the other ways to do it, in one material. */
export function SplitButton({ children, menu, menuLabel, heading, disabled }: SplitButtonProps) {
  const { cap, size } = children.props;
  return (
    <ButtonGroup aria-label={menuLabel} disabled={disabled}>
      {children}
      <Menu
        heading={heading}
        align="end"
        trigger={<Button cap={cap} size={size} aria-label={menuLabel} className={CHEVRON} icon={<Icon name="chevron" className="button-group-chevron" />} />}
      >
        {menu}
      </Menu>
    </ButtonGroup>
  );
}
