import * as React from 'react';
import { Button, Dialog, QuickEdit, ToastProvider, useToast } from '@unlocalhosted/metalui';
import { PenIcon } from '@unlocalhosted/metalui/icons';
import { DialogXray } from '../../ui/xray/DialogXray';
import reactSource from '../../../../../packages/metalui/src/components/dialog/dialog.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import agentSource from '../../../../../packages/metalui/src/components/dialog/dialog.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* RENAME CANVAS: a Quick edit in the dialog. The name opens selected; Rename (pen) is off until it
 * changes; a taken name is refused with the reason; done, the key morphs to check and says Renamed,
 * the dialog closes after the hold, and a toast offers Undo (⌘Z too). */

const TAKEN = ['Inbox', 'Someday'];

function nameProblem(next: string) {
  if (TAKEN.some((t) => t.toLowerCase() === next.toLowerCase())) return `A canvas is already called ${next}.`;
  if (next.length > 40) return 'Keep it to 40 characters.';
  return null;
}

function RenameCanvas() {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('Trip notes');
  const toast = useToast();
  const close = React.useCallback(() => setOpen(false), []);
  return (
    <>
      <Button icon={<PenIcon />} onClick={() => setOpen(true)}>Rename canvas…</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <Dialog.Popup aria-label="Rename canvas">
          <Dialog.Title>Rename canvas</Dialog.Title>
          <QuickEdit
            label="Name"
            value={name}
            validate={nameProblem}
            onCommit={(next) => {
              const was = name;
              setName(next);
              toast.show({ title: `Renamed to ${next}`, undo: () => setName(was) });
            }}
            onClose={close}
          />
        </Dialog.Popup>
      </Dialog>
    </>
  );
}

export default function DialogPage() {
  return (
    <ToastProvider>
      <ComponentPage
        title={"Dialog"}
        lede={"A plate that floats over a dimmed page and asks for one thing. Tab stays inside it. Escape or a click outside closes it."}
        play={{ lede: "Open it, press Tab a few times, then press Escape. Or rename it: the name is selected and Enter renames.", node: <RenameCanvas /> }}
        xray={<DialogXray />}
        sources={[
          { id: 'react', label: "React", code: reactSource },
          { id: 'css', label: "CSS", code: cssSource },
          { id: 'agent', label: "Agent guide", code: agentSource },
        ]}
        rules={[
          { id: "DG1", title: "One question at a time", body: "A dialog asks for one thing. Anything longer belongs on a page.", origin: 'Ours' },
          { id: "DG2", title: "Focus stays inside", body: "Tab moves only between the things in the dialog, and focus goes back to the opener when it closes.", origin: 'Ours' },
          { id: "DG3", title: "Near the top", body: "It sits 16% down the window, near where your eyes already are.", origin: 'Ours' },
          { id: "DG4", title: "A small edit is a Quick edit", body: "Rename, tag, a label: the key leads with its glyph, stays off until something changed, refuses with a reason, shows done on the key, then the dialog closes and a toast offers Undo.", origin: 'Ours' },
        ]}
      />
    </ToastProvider>
  );
}
