'use client';

import * as React from 'react';
import { AlertDialog as BaseAlertDialog } from '@base-ui/react/alert-dialog';
import { Surface } from '../surface/surface';
import { Button } from '../button/button';
import { refuse } from '../../motion/refuse';
import { TrashIcon } from '../../icons/components.generated';

/* ─────────────────────────────────────────────────────────
 * ALERT DIALOG, a question that must be answered, on Base UI AlertDialog
 *
 *   open      the scrim fades and the plate rises a step on the surface spring (the dialog's
 *             own motion); focus starts on Cancel, the safe answer
 *   outside   a click on the scrim does not close it: the plate shakes once on the refusal
 *             spring, one nest (6) aside, ringing out against where it stands
 *   answer    Cancel or Esc closes with nothing done; the confirm button runs the thing and closes
 *   hold      (Confirm hold, an act that can't be undone) the confirm is held for the hold time, its
 *             trash lid lifting with the fill; letting go early runs nothing, and the first time a
 *             line fades in under the actions ("Hold to confirm", said once as a status)
 *   close     the plate leaves on the release spring; focus returns to what opened it
 * Reduce Motion: no shake (the refusal travel is zero); the rise is a crossfade.
 * The plate, scrim and layout are the dialog recipe's; this adds only the refusal and the answers.
 * Slots: AlertDialog.Root, Popup, Title, Description, Actions, Cancel, Confirm.
 * ───────────────────────────────────────────────────────── */

const SCRIM = 'mu-alert-dialog-scrim fixed inset-0 z-dialog-scrim-z bg-dialog-scrim-color backdrop-dialog-scrim-blur reduce-transparency:bg-dialog-scrim-opaque reduce-transparency:backdrop-blur-none transition-opacity ease-surface duration-surface data-starting-style:opacity-0 data-ending-style:opacity-0';
const POPUP = 'mu-alert-dialog mu-dialog dialog-frame fixed z-dialog-scrim-z dialog-top left-1/2 -translate-x-1/2 outline-none transition-dialog data-starting-style:dialog-enter data-ending-style:dialog-enter data-ending-style:duration-release data-ending-style:ease-release';
const HINT = 'mu-alert-dialog-hint alert-dialog-description type-meta text-ink3 text-end transition-opacity ease-surface duration-surface starting:opacity-0';
const DESCRIPTION = 'mu-alert-dialog-description alert-dialog-description type-body text-ink2';

interface Ctx {
  cancel: React.RefObject<HTMLButtonElement | null>;
  popup: React.RefObject<HTMLDivElement | null>;
  hint: string | null;
  setHint: (hint: string) => void;
}
const AlertCtx = React.createContext<Ctx | null>(null);

export interface AlertDialogRootProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

function Root({ open, onOpenChange, children }: AlertDialogRootProps) {
  const cancel = React.useRef<HTMLButtonElement>(null);
  const popup = React.useRef<HTMLDivElement>(null);
  const [hint, setHint] = React.useState<string | null>(null);
  // Each asking starts without the hint; it stays while the dialog leaves.
  React.useEffect(() => { if (open) setHint(null); }, [open]);
  return (
    <AlertCtx.Provider value={{ cancel, popup, hint, setHint }}>
      <BaseAlertDialog.Root open={open} onOpenChange={(o) => onOpenChange(o)}>
        <BaseAlertDialog.Portal>
          <BaseAlertDialog.Backdrop className={SCRIM} onPointerDown={() => refuse(popup.current)} />
          {children}
        </BaseAlertDialog.Portal>
      </BaseAlertDialog.Root>
    </AlertCtx.Provider>
  );
}

/** `finalFocus`: where focus goes when it closes (Base UI's), e.g. the row after a deleted one. */
function Popup({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement> & Pick<BaseAlertDialog.Popup.Props, 'finalFocus'>) {
  const ctx = React.useContext(AlertCtx)!;
  return (
    <BaseAlertDialog.Popup ref={ctx.popup} initialFocus={ctx.cancel} {...props} className={className ? `${POPUP} ${className}` : POPUP} render={<Surface material="plate" radius="card" />}>
      {children}
    </BaseAlertDialog.Popup>
  );
}

/** The question, in the title role: "Delete 3 regions?" */
function Title({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <BaseAlertDialog.Title {...props} className={className ? `mu-dialog-title type-title text-ink ${className}` : 'mu-dialog-title type-title text-ink'} />;
}

/** What happens if you say yes: "Their notes move to the past for 30 days." */
function Description({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <BaseAlertDialog.Description {...props} className={className ? `${DESCRIPTION} ${className}` : DESCRIPTION} />;
}

/** Cancel, then the confirm. A hold confirm's hint fades in under them the first time it is let go early. */
function Actions({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { hint } = React.useContext(AlertCtx)!;
  return (
    <>
      <div {...props} className={className ? `mu-dialog-actions dialog-actions ${className}` : 'mu-dialog-actions dialog-actions'} />
      {hint ? <p aria-hidden className={HINT}>{hint}</p> : null}
      <span role="status" className="sr-only">{hint}</span>
    </>
  );
}

/** The safe answer: closes with nothing done. Focus starts here. */
function Cancel({ children = 'Cancel' }: { children?: React.ReactNode }) {
  const ctx = React.useContext(AlertCtx)!;
  return <BaseAlertDialog.Close ref={ctx.cancel} render={<Button />}>{children}</BaseAlertDialog.Close>;
}

export interface AlertDialogConfirmProps {
  children: React.ReactNode;
  onClick: () => void;
  /** destructive (the default) for a loss; primary for a weighty but safe yes. */
  tone?: 'destructive' | 'primary';
  /**
   * Hold to confirm (destructive only), for an act that can't be undone: deleting for good, not moving
   * to the past. The button leads with the trash glyph, whose lid rides the hold.
   */
  hold?: boolean;
  /** The hold's hint and the end of the button's name. */
  holdHint?: string;
  /** The confirm's glyph; a hold confirm leads with the trash. */
  icon?: React.ReactNode;
}

/** The answer that does the thing, last; it closes after it runs. */
function Confirm({ children, onClick, tone = 'destructive', hold = false, holdHint = 'Hold to confirm', icon }: AlertDialogConfirmProps) {
  const ctx = React.useContext(AlertCtx)!;
  const holds = hold && tone === 'destructive';
  const button = holds
    ? <Button cap={tone} icon={icon ?? <TrashIcon />} hold holdHint={holdHint} onHoldHint={() => ctx.setHint(holdHint)} />
    : <Button cap={tone} icon={icon} />;
  return <BaseAlertDialog.Close render={button} onClick={onClick}>{children}</BaseAlertDialog.Close>;
}

export const AlertDialog = Object.assign(Root, { Popup, Title, Description, Actions, Cancel, Confirm, Root });
