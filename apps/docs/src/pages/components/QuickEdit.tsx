import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Button, Dialog, Popover, QuickEdit, ToastProvider, useToast } from '@unlocalhosted/metalui';
import { PenIcon } from '@unlocalhosted/metalui/icons';
import reactSource from '../../../../../packages/metalui/src/components/quick-edit/quick-edit.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalQuickEdit.swift?raw';
import agentSource from '../../../../../packages/metalui/src/components/quick-edit/quick-edit.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * QUICK EDIT PAGE
 *
 *   playground  Rename… opens a popover with the name selected; the Quick edit panel sets how long
 *               the sample save takes and whether it fails
 *   more        a save over the network (the key waits, the arc after 400 ms), a save that fails once
 *               (sync-error, Try again), a file name (its extension stays out of the selection),
 *               the same edit in a dialog
 * Every rename lands with a toast: "Renamed to … · Undo" (⌘Z undoes it too).
 * ───────────────────────────────────────────────────────── */

const TAKEN = ['Inbox', 'Someday', 'Reading list'];
const LIMIT = 40;

/** The sample's reasons: taken, or too long. */
function nameProblem(next: string, taken: readonly string[] = TAKEN) {
  if (taken.some((t) => t.toLowerCase() === next.toLowerCase())) return `A region is already called ${next}.`;
  if (next.length > LIMIT) return `Keep it to ${LIMIT} characters.`;
  return null;
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

interface Save { ms: number; fails: () => boolean }

/** A renamed thing with its save: it toasts the rename with Undo once the save lands. */
function useRename(initial: string, save?: Save) {
  const [name, setName] = React.useState(initial);
  const toast = useToast();
  const commit = React.useCallback(async (next: string) => {
    if (save) {
      await wait(save.ms);
      if (save.fails()) throw new Error('The save did not reach the server.');
    }
    const was = name;
    setName(next);
    toast.show({ title: `Renamed to ${next}`, undo: () => setName(was) });
  }, [name, save, toast]);
  return { name, commit };
}

function RenamePopover({ id, initial, title, label, save, extension }: { id: string; initial: string; title: string; label: string; save?: Save; extension?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const { name, commit } = useRename(initial, save);
  const close = React.useCallback(() => setOpen(false), []);
  return (
    <div data-testid={id} className="flex min-h-[200px] flex-col items-center justify-start gap-12 pt-24">
      <span className="type-meta text-ink2">Called <b className="text-ink" data-testid={`${id}-name`}>{name}</b></span>
      <Popover open={open} onOpenChange={setOpen}>
        <Popover.Trigger><Button icon={<PenIcon />}>Rename…</Button></Popover.Trigger>
        <Popover.Content>
          <Popover.Title>{title}</Popover.Title>
          <Popover.Body>
            <QuickEdit label={label} value={name} extension={extension} validate={extension ? undefined : nameProblem} onCommit={commit} onClose={close} />
          </Popover.Body>
        </Popover.Content>
      </Popover>
    </div>
  );
}

function Playground() {
  const d = useDialKit('Quick edit', { wait: [0, 0, 3000], fails: false });
  const save = React.useMemo<Save | undefined>(() => (d.wait || d.fails ? { ms: d.wait, fails: () => d.fails } : undefined), [d.wait, d.fails]);
  return <RenamePopover id="quick-edit-play" initial="Trip to Lisbon" title="Rename region" label="Region name" save={save} />;
}

/** The first save fails; Try again lands. */
function FailsOnce() {
  const tries = React.useRef(0);
  const save = React.useMemo<Save>(() => ({ ms: 900, fails: () => ++tries.current === 1 }), []);
  return <RenamePopover id="quick-edit-fails" initial="Trip to Lisbon" title="Rename region" label="Region name" save={save} />;
}

function InDialog() {
  const [open, setOpen] = React.useState(false);
  const { name, commit } = useRename('Trip notes');
  const close = React.useCallback(() => setOpen(false), []);
  return (
    <div data-testid="quick-edit-dialog" className="flex min-h-[120px] flex-col items-center justify-center gap-12">
      <span className="type-meta text-ink2">Called <b className="text-ink">{name}</b></span>
      <Button icon={<PenIcon />} onClick={() => setOpen(true)}>Rename canvas…</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <Dialog.Popup aria-label="Rename canvas">
          <Dialog.Title>Rename canvas</Dialog.Title>
          <QuickEdit label="Canvas name" value={name} validate={nameProblem} onCommit={commit} onClose={close} />
        </Dialog.Popup>
      </Dialog>
    </div>
  );
}

export default function QuickEditPage() {
  return (
    <ToastProvider>
      <ComponentPage
        title="Quick edit"
        lede="One short value edited where it stands and committed with one key. It opens with the name selected, refuses a name it can't take with the reason, waits while it saves, and shows it's done on the key before the plate closes."
        play={{ lede: 'Rename it, try a taken name (Inbox), or press Esc. The Quick edit panel makes the save slow or fail.', caption: 'in a popover · selected on open · Enter and Esc · the reason under the field · done on the key · Undo in a toast', node: <Playground /> }}
        more={[
          { id: 'saving', title: 'Saving', lede: 'The save takes a moment: the key holds down and says Renaming…, the field locks, and after 400 ms the glyph turns into the arc.', node: <RenamePopover id="quick-edit-slow" initial="Trip to Lisbon" title="Rename region" label="Region name" save={{ ms: 1500, fails: () => false }} /> },
          { id: 'failed', title: 'When the save fails', lede: 'The first save here fails: the glyph morphs to sync-error and the key says Try again. The text stays; pressing it again lands.', node: <FailsOnce /> },
          { id: 'file', title: 'A file name', lede: 'For a file the extension stays out of the selection, so typing replaces the name and keeps .pdf.', node: <RenamePopover id="quick-edit-file" initial="Itinerary.pdf" title="Rename file" label="File name" extension /> },
          { id: 'dialog', title: 'In a dialog', lede: 'The same edit in a dialog: Rename canvas.', node: <InDialog /> },
        ]}
        usage={`const toast = useToast();

<Popover open={open} onOpenChange={setOpen}>
  <Popover.Trigger><Button icon={<PenIcon />}>Rename…</Button></Popover.Trigger>
  <Popover.Content>
    <Popover.Title>Rename region</Popover.Title>
    <Popover.Body>
      <QuickEdit
        label="Region name"
        value={name}
        validate={(next) => (taken.has(next) ? \`A region is already called \${next}.\` : null)}
        onCommit={async (next) => {
          const was = name;
          await save(next); // a rejection: sync-error, Try again
          setName(next);
          toast.show({ title: \`Renamed to \${next}\`, undo: () => setName(was) });
        }}
        onClose={() => setOpen(false)}
      />
    </Popover.Body>
  </Popover.Content>
</Popover>`}
        sources={[
          { id: 'react', label: 'React', code: reactSource },
          { id: 'css', label: 'CSS', code: cssSource },
          { id: 'swift', label: 'SwiftUI', code: swiftSource },
          { id: 'agent', label: 'Agent guide', code: agentSource },
        ]}
        rules={[
          { id: 'QE1', title: 'The key names the act', body: 'It leads with the act\'s glyph (pen for Rename) and stays off while nothing changed, so Enter can\'t commit the same name.', origin: 'Ours' },
          { id: 'QE2', title: 'Refuse with a reason, never close', body: 'A name it can\'t take keeps the plate open with the invalid ring and says what to do under the field. The person\'s text stays.', origin: 'Ours' },
          { id: 'QE3', title: 'Done is shown where you pressed', body: 'The glyph morphs to check and the word turns to Renamed on the key, then the plate closes; the toast offers Undo.', origin: 'Ours' },
          { id: 'QE4', title: 'A failure stays on the key', body: 'sync-error and Try again, with the text kept. Nothing closes and nothing is lost.', origin: 'Ours' },
        ]}
      />
    </ToastProvider>
  );
}
