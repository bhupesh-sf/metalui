import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Button } from '@unlocalhosted/metalui';
import { Icon } from '@unlocalhosted/metalui/icons';
import { type SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import { SharePanel } from '../../blocks/share-panel/share-panel';
import source from '../../blocks/share-panel/share-panel.tsx?raw';
import { BlockPage } from '../../ui/BlockPage';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';

/* ─────────────────────────────────────────────────────────
 * SHARE TUNER: the page's DialKit panel
 *
 *   land     the spring a new person and a new file land on
 *   leave    the spring a removed person leaves on
 *   travel   the spring the rows under them travel up on
 *   slow     stretches time, to watch a row leave and the rest close up
 * ───────────────────────────────────────────────────────── */

/** The panel as it is used: a Share key opens it, its close key and ⎋ put it away. */
function Opened({ folder, testId }: { folder?: string; testId?: string }) {
  const [open, setOpen] = React.useState(true);
  const [reopened, setReopened] = React.useState(false);
  const key = React.useRef<HTMLElement>(null);
  const close = () => { setOpen(false); requestAnimationFrame(() => key.current?.focus()); };
  return (
    <div data-testid={testId} className="flex w-full justify-center">
      {open
        ? <SharePanel folder={folder} onClose={close} autoFocus={reopened} />
        : <Button ref={key} icon={<Icon name="share" />} onClick={() => { setReopened(true); setOpen(true); }}>Share {folder ?? 'Lisbon trip'}</Button>}
    </div>
  );
}

function Tuned() {
  const d = useDialKit('Share', {
    land: { type: 'select', options: SPRING_NAMES, default: 'object' },
    leave: { type: 'select', options: SPRING_NAMES, default: 'release' },
    travel: { type: 'select', options: SPRING_NAMES, default: 'settle' },
    slow: [1, 1, 10],
  });
  const vars = {
    ...springVars('object', d.land as SpringName, d.slow),
    ...springVars('release', d.leave as SpringName, d.slow),
    ...springVars('settle', d.travel as SpringName, d.slow),
  } as React.CSSProperties;
  return <div data-testid="share-tuner" className="w-full" style={vars}><Opened folder="Porto weekend" /></div>;
}

export default function SharePanelPage() {
  return (
    <BlockPage
      title="Share panel"
      lede="Share a folder with people: drop in its files and watch them upload, invite people by email with what they may do, and turn on a link anyone can open."
      play={{
        lede: 'Drop or choose files, try the failed upload again, invite someone, change what a person can do or remove them, then turn on the link and copy it.',
        caption: 'live block · sample data · simulated uploads',
        node: <Opened />,
      }}
      usage={{
        file: 'src/blocks/share-panel.tsx',
        code: `import { SharePanel } from '@/blocks/share-panel';

export function ShareSheet({ onClose }: { onClose: () => void }) {
  return <SharePanel folder="Lisbon trip" onClose={onClose} autoFocus />;
}

// Replace PEOPLE and FILES (the sample data) with your folder's, the upload tick with your
// uploader's progress events, and LINK with the folder's real share link.`,
      }}
      madeOf={[
        { label: 'Drop zone', to: '/components/drop-zone' },
        { label: 'Attachment', to: '/components/attachment' },
        { label: 'Field', to: '/components/field' },
        { label: 'Form field', to: '/components/form-field' },
        { label: 'Select', to: '/components/select' },
        { label: 'Button', to: '/components/button' },
        { label: 'Avatar', to: '/components/avatar' },
        { label: 'Switch', to: '/components/switch' },
        { label: 'Icon button', to: '/components/icon-button' },
        { label: 'Tooltip', to: '/components/tooltip' },
        { label: 'The drum', to: '/foundations/transitions' },
        { label: 'Icons (morph)', to: '/icons' },
      ]}
      more={[{ id: 'tune', title: 'Tune it', lede: 'The Share panel swaps the springs a row lands, leaves and travels on, and stretches time.', node: <Tuned /> }]}
      source={source}
      rules={[
        { id: 'U1', title: 'Sharing one thing with a few people', body: 'A folder, a trip, a project: its files, who has it and whether a link opens it, in one place.', origin: 'Use it for' },
        { id: 'U2', title: 'Inside a sheet or a popover', body: 'It measures itself, so it fits a side sheet, a dialog or the page.', origin: 'Use it for' },
        { id: 'N1', title: 'Managing a whole team', body: 'Roles, groups and many people need a members table with search, not a list in a panel.', origin: 'Not for' },
        { id: 'N2', title: 'Only a link', body: 'If nobody is invited by name, a Copy link button on its own is enough.', origin: 'Not for' },
        { id: 'K1', title: 'Tab', body: 'Moves through close, the drop zone, each file’s keys, the invite row, each person’s permission and ×, the switch, the link and Copy link.', origin: 'Keyboard' },
        { id: 'K2', title: 'Space or ↩ on the drop zone', body: 'Opens the file picker.', origin: 'Keyboard' },
        { id: 'K3', title: '↩ in the email field', body: 'Invites; the field empties and keeps focus for the next one.', origin: 'Keyboard' },
        { id: 'K4', title: '⎋', body: 'Closes the panel from anywhere in it (a select’s open list closes first).', origin: 'Keyboard' },
        { id: 'A1', title: 'Results are said', body: 'A polite status says who was invited, what was uploaded or removed, what a person can do now, and that the link was copied.', origin: 'Accessibility' },
        { id: 'A2', title: 'Every control is named', body: 'The email field has a label, each person’s select and × say whose they are, and the switch is named by its words.', origin: 'Accessibility' },
        { id: 'A3', title: 'Focus never falls to the page', body: 'Removing a person moves focus to the next ×; closing returns it to the key that opened the panel.', origin: 'Accessibility' },
        { id: 'M1', title: 'Arrivals land', body: 'A new file or person drops one nest into place on the object spring: it was put there.', origin: 'Motion' },
        { id: 'M2', title: 'Leaving closes the gap', body: 'A removed row steps down and fades on the release spring, then the rows under it travel up.', origin: 'Motion' },
        { id: 'M3', title: 'A state change morphs', body: 'Copy link morphs paste → check and turns to “Copied” on the drum; it turns back after 1.6 s.', origin: 'Motion' },
        { id: 'M4', title: 'Reduce Motion', body: 'Everything changes at once; the drum crossfades; upload tracks still fill.', origin: 'Motion' },
        { id: 'R1', title: 'It measures itself', body: 'The block is a container: under 28rem the invite row wraps, with the email on its own line.', origin: 'Responsive' },
      ]}
    />
  );
}
