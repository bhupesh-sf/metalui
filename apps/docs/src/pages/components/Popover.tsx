import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Button, Popover, QuickEdit, ToastProvider, useToast } from '@unlocalhosted/metalui';
import { PenIcon } from '@unlocalhosted/metalui/icons';
import { type SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';
import reactSource from '../../../../../packages/metalui/src/components/popover/popover.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import agentSource from '../../../../../packages/metalui/src/components/popover/popover.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * RISE TUNER: the page's DialKit panel
 *
 *   open    the plate rises from its trigger by the reach, on the open spring
 *   close   it fades out on the close spring, no travel back
 * Springs are the system's classes; slow stretches every duration.
 *
 * THE RENAME: a Quick edit in the body. The name opens selected; Rename (pen) is off until it
 * changes; a taken or long name is refused with the reason; done, the key morphs to check and says
 * Renamed, the plate closes after the hold, and a toast offers Undo (⌘Z too).
 * ───────────────────────────────────────────────────────── */

const SIDES = ['bottom', 'top', 'right', 'left'] as const;
const TAKEN = ['Inbox', 'Someday', 'Reading list'];

/** Taken, or too long: the reason under the field. */
function nameProblem(next: string) {
  if (TAKEN.some((t) => t.toLowerCase() === next.toLowerCase())) return `A region is already called ${next}.`;
  if (next.length > 40) return 'Keep it to 40 characters.';
  return null;
}

// The region's name, shared by the playground and the tuner.
const NameCtx = React.createContext<[string, (n: string) => void]>(['Trip to Lisbon', () => {}]);

function Rename({ label, onClose }: { label: string; onClose: () => void }) {
  const [name, setName] = React.useContext(NameCtx);
  const toast = useToast();
  return (
    <>
      <Popover.Title>Rename region</Popover.Title>
      <Popover.Description>The name shows on its edge and in search.</Popover.Description>
      <Popover.Body>
        <QuickEdit
          label={label}
          value={name}
          validate={nameProblem}
          onCommit={(next) => {
            const was = name;
            setName(next);
            toast.show({ title: `Renamed to ${next}`, undo: () => setName(was) });
          }}
          onClose={onClose}
        />
      </Popover.Body>
    </>
  );
}

function Play() {
  const [open, setOpen] = React.useState(false);
  const close = React.useCallback(() => setOpen(false), []);
  return (
    <div className="flex min-h-[240px] items-start justify-center pt-24">
      <Popover open={open} onOpenChange={setOpen}>
        <Popover.Trigger><Button icon={<PenIcon />}>Rename…</Button></Popover.Trigger>
        <Popover.Content>
          <Rename label="Region name" onClose={close} />
        </Popover.Content>
      </Popover>
    </div>
  );
}

function RiseTuner() {
  const [open, setOpen] = React.useState(false);
  const close = React.useCallback(() => setOpen(false), []);
  const d = useDialKit('Popover rise', {
    open: { type: 'select', options: SPRING_NAMES, default: 'surface' },
    close: { type: 'select', options: SPRING_NAMES, default: 'release' },
    side: { type: 'select', options: [...SIDES], default: 'bottom' },
    reach: [6, 0, 24],
    scale: [0.97, 0.8, 1],
    slow: [1, 1, 10],
    toggle: { type: 'action', label: 'Open / close' },
  }, {
    onAction: (action) => { if (action === 'toggle') setOpen((o) => !o); },
  });
  const o = d.open as SpringName;
  const c = d.close as SpringName;
  const vars = {
    ...springVars('surface', o, d.slow),
    ...springVars('release', c, d.slow),
    '--mu-motion-nest': `${d.reach}px`,
    '--mu-r-popover-self-enter-scale': String(d.scale),
  } as React.CSSProperties;
  return (
    <div data-testid="popover-rise-tuner" className="flex min-h-[260px] items-center justify-center">
      <Popover open={open} onOpenChange={setOpen}>
        <Popover.Trigger><Button icon={<PenIcon />}>Rename…</Button></Popover.Trigger>
        <Popover.Content side={d.side as (typeof SIDES)[number]} style={vars}>
          <Rename label="Tuned region name" onClose={close} />
        </Popover.Content>
      </Popover>
    </div>
  );
}

export default function PopoverPage() {
  const name = React.useState('Trip to Lisbon');
  return (
    <ToastProvider>
      <NameCtx.Provider value={name}>
        <ComponentPage
          title="Popover"
          lede="A small panel that comes out of its trigger. It rises one nest from the trigger's side on the surface spring and fades in; closing, it fades where it is and does not travel back."
          play={{ lede: 'Open it and rename: the name is selected and Enter renames. Try a taken name (Inbox), or press Esc.', caption: 'from a button · title · description · a quick edit · Undo in a toast', node: <Play /> }}
          more={[{ id: 'rise', title: 'Tune the rise', lede: 'The Popover rise panel swaps the open and close springs, the side, the reach and the starting scale, and stretches time.', node: <RiseTuner /> }]}
          usage={`<Popover open={open} onOpenChange={setOpen}>
  <Popover.Trigger><Button icon={<PenIcon />}>Rename…</Button></Popover.Trigger>
  <Popover.Content>
    <Popover.Title>Rename region</Popover.Title>
    <Popover.Description>The name shows on its edge and in search.</Popover.Description>
    <Popover.Body>
      <QuickEdit label="Region name" value={name} validate={why} onCommit={rename} onClose={() => setOpen(false)} />
    </Popover.Body>
  </Popover.Content>
</Popover>`}
          sources={[
            { id: 'react', label: 'React', code: reactSource },
            { id: 'css', label: 'CSS', code: cssSource },
            { id: 'agent', label: 'Agent guide', code: agentSource },
          ]}
          rules={[
            { id: 'PO1', title: 'It comes from its trigger', body: 'It grows from the trigger\'s side and rises one nest away from it, so you can see where it came from.', origin: 'Ours' },
            { id: 'PO2', title: 'Leaving is quieter than arriving', body: 'It fades on the release spring where it stands; it never flies back into the trigger.', origin: 'Ours' },
            { id: 'PO3', title: 'Small, or it is a dialog', body: 'A title, a line, a few controls. Anything that scrolls or must be answered first is a dialog.', origin: 'Ours' },
            { id: 'PO4', title: 'A confirm says what it did', body: 'A popover that commits a small edit holds a Quick edit: the key leads with its glyph, stays off until something changed, refuses with a reason, shows done on the key, then the plate closes and a toast offers Undo.', origin: 'Ours' },
          ]}
        />
      </NameCtx.Provider>
    </ToastProvider>
  );
}
