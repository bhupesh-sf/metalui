import * as React from 'react';
import { useDialKit } from 'dialkit';
import { SplitPane } from '@unlocalhosted/metalui';
import { type SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';
import reactSource from '../../../../../packages/metalui/src/components/split-pane/split-pane.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import agentSource from '../../../../../packages/metalui/src/components/split-pane/split-pane.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * DETENT TUNER: the page's DialKit panel
 *
 *   snap     the spring it snaps to a detent on
 *   step     the spring a key step moves on
 *   detent   how close to the default counts as the default (percent)
 * ───────────────────────────────────────────────────────── */

const LIST = ['Trip to Lisbon', 'Weekend in Porto', 'Packing list', 'Tram map', 'Receipts'];

function Workspace({ label, size, onSize }: { label: string; size?: number; onSize?: (n: number) => void }) {
  return (
    <div className="h-[280px] w-full max-w-[640px] overflow-hidden rounded-card recipe-well-field">
      <SplitPane label={label} defaultSize={32} min={20} max={70} collapsible size={size} onSizeChange={onSize}>
        <ul className="m-0 grid list-none gap-2 p-12" aria-label="Notes">
          {LIST.map((n) => <li key={n} className="type-ui text-ink px-8 py-6">{n}</li>)}
        </ul>
        <div className="grid h-full content-start gap-8 p-16">
          <p className="m-0 type-title text-ink">Trip to Lisbon</p>
          <p className="m-0 type-body text-ink2">Tram 28 from Martim Moniz early, before the queue. Pastéis in Belém after the monastery.</p>
        </div>
      </SplitPane>
    </div>
  );
}

function DetentTuner() {
  const d = useDialKit('Split detent', {
    snap: { type: 'select', options: SPRING_NAMES, default: 'part' },
    step: { type: 'select', options: SPRING_NAMES, default: 'settle' },
    detent: [3, 0, 10],
    slow: [1, 1, 10],
  });
  const vars = { ...springVars('part', d.snap as SpringName, d.slow), ...springVars('settle', d.step as SpringName, d.slow), '--mu-r-split-pane-self-detent': String(d.detent) } as React.CSSProperties;
  return <div data-testid="split-detent-tuner" className="flex w-full justify-center" style={vars}><Workspace label="Resize the tuned notes" /></div>;
}

export default function SplitPanePage() {
  const [size, setSize] = React.useState(32);
  return (
    <ComponentPage
      title="Split pane"
      lede="Two places with a divider you can move. The panes follow your hand exactly; let go near the default and it snaps there like a detent, or drag the list nearly shut and it closes."
      play={{ lede: 'Drag the grip, double-click it, or Tab to it and use the arrows, Home and Enter.', caption: `notes ${Math.round(size)} %`, wide: true, node: <div className="flex w-full justify-center"><Workspace label="Resize the notes" size={size} onSize={setSize} /></div> }}
      more={[{ id: 'detent', title: 'Tune the detent', lede: 'The Split detent panel swaps the springs the divider snaps and steps on, sets how close to the default counts as the default, and stretches time.', node: <DetentTuner /> }]}
      usage={`<SplitPane label="Resize the notes" defaultSize={30} min={20} max={70} collapsible>
  <NoteList />
  <NoteDetail />
</SplitPane>`}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'SPL1', title: 'The hand holds it', body: 'While dragged the panes follow one to one; springs only take over on release.', origin: 'Ours' },
        { id: 'SPL2', title: 'A detent at the default', body: 'Let go close to the default and it snaps there, so it is easy to find again.', origin: 'Ours' },
        { id: 'SPL3', title: 'Every pane has a minimum', body: 'Content is never crushed; a pane either keeps its minimum or closes.', origin: 'Ours' },
      ]}
    />
  );
}
