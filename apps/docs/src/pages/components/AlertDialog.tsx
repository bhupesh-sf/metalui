import * as React from 'react';
import { useDialKit } from 'dialkit';
import { AlertDialog, Button } from '@unlocalhosted/metalui';
import { type SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';
import reactSource from '../../../../../packages/metalui/src/components/alert-dialog/alert-dialog.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import agentSource from '../../../../../packages/metalui/src/components/alert-dialog/alert-dialog.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * REFUSAL TUNER: the page's DialKit panel
 *
 *   open     the dialog rises on the surface spring
 *   outside  click the scrim: the plate shakes by the reach on the refusal spring
 * Springs are the system's classes; slow stretches every duration.
 * ───────────────────────────────────────────────────────── */


function Question({ onDelete }: { onDelete: () => void }) {
  return (
    <AlertDialog.Popup>
      <AlertDialog.Title>Delete 3 regions?</AlertDialog.Title>
      <AlertDialog.Description>Their notes move to the past, where you can bring them back for 30 days.</AlertDialog.Description>
      <AlertDialog.Actions>
        <AlertDialog.Cancel />
        <AlertDialog.Confirm onClick={onDelete}>Delete regions</AlertDialog.Confirm>
      </AlertDialog.Actions>
    </AlertDialog.Popup>
  );
}

function RefusalTuner() {
  const [open, setOpen] = React.useState(false);
  const d = useDialKit('Alert refusal', {
    refusal: { type: 'select', options: SPRING_NAMES, default: 'refusal' },
    reach: [6, 0, 24],
    slow: [1, 1, 10],
    open: { type: 'action', label: 'Open it' },
  }, {
    onAction: (action) => { if (action === 'open') setOpen(true); },
  });
  const r = d.refusal as SpringName;
  const vars = {
    ...springVars('refusal', r, d.slow),
    '--mu-motion-nest': `${d.reach}px`,
  } as React.CSSProperties;
  React.useEffect(() => {
    // The dialog is portalled; the tuned values ride on the document while this tuner is mounted.
    const el = document.documentElement;
    for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, String(v));
    return () => { for (const k of Object.keys(vars)) el.style.removeProperty(k); };
  });
  return (
    <div data-testid="alert-refusal-tuner" className="flex min-h-[120px] items-center justify-center">
      <Button onClick={() => setOpen(true)}>Open, then click outside</Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <Question onDelete={() => setOpen(false)} />
      </AlertDialog>
    </div>
  );
}

export default function AlertDialogPage() {
  const [open, setOpen] = React.useState(false);
  const [deleted, setDeleted] = React.useState(false);
  return (
    <ComponentPage
      title="Alert dialog"
      lede="A question that must be answered. It rises like a dialog, starts on Cancel, and refuses a click outside: the plate shakes once instead of closing, because it needs an answer."
      play={{ lede: 'Open it, then try clicking outside. Esc cancels.', caption: deleted ? 'deleted · the regions are in the past' : 'question · consequence · cancel · confirm', node: (
        <div className="flex min-h-[120px] items-center justify-center">
          <Button cap="destructive" onClick={() => { setDeleted(false); setOpen(true); }}>Delete 3 regions…</Button>
          <AlertDialog open={open} onOpenChange={setOpen}>
            <Question onDelete={() => setDeleted(true)} />
          </AlertDialog>
        </div>
      ) }}
      more={[{ id: 'refusal', title: 'Tune the refusal', lede: 'The Alert refusal panel swaps the spring, the reach and the time. Open it and click the scrim.', node: <RefusalTuner /> }]}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'AD1', title: 'The title is the question', body: '"Delete 3 regions?" The confirm button names the act: "Delete regions", never "OK".', origin: 'Ours' },
        { id: 'AD2', title: 'Focus starts on the safe answer', body: 'Cancel holds focus, so a reflexive Enter never loses work.', origin: 'Ours' },
        { id: 'AD3', title: 'Outside is refused, not obeyed', body: 'A click on the scrim shakes the plate once on the refusal spring: it needs an answer.', origin: 'Ours' },
      ]}
    />
  );
}
