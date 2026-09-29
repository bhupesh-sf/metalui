import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Button, Sheet, Switch } from '@unlocalhosted/metalui';
import { type SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';
import reactSource from '../../../../../packages/metalui/src/components/sheet/sheet.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import agentSource from '../../../../../packages/metalui/src/components/sheet/sheet.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * SLIDE TUNER: the page's DialKit panel
 *
 *   in      the spring it slides in on
 *   home    the spring it settles home on after a short drag
 *   out     the spring it leaves on
 * Springs are the system's classes; slow stretches every duration. The sheet is portalled,
 * so the tuned values ride on the document while this tuner is on the page.
 * ───────────────────────────────────────────────────────── */

function Inspector({ side }: { side: 'right' | 'bottom' }) {
  return (
    <>
      <Sheet.Title>{side === 'right' ? 'Region' : 'Share'}</Sheet.Title>
      <Sheet.Description>{side === 'right' ? 'Trip to Lisbon · 14 notes, 3 photos.' : 'Anyone with the link can view.'}</Sheet.Description>
      <label className="flex items-center justify-between type-ui text-ink">Show on the canvas <Switch aria-label="Show on the canvas" defaultChecked /></label>
      <label className="flex items-center justify-between type-ui text-ink">Keep in the past <Switch aria-label="Keep in the past" /></label>
      <div className="mt-auto flex justify-end"><Sheet.Close render={<Button>Done</Button>} /></div>
    </>
  );
}

function SlideTuner() {
  const d = useDialKit('Sheet slide', {
    in: { type: 'select', options: SPRING_NAMES, default: 'surface' },
    home: { type: 'select', options: SPRING_NAMES, default: 'settle' },
    out: { type: 'select', options: SPRING_NAMES, default: 'release' },
    slow: [1, 1, 10],
  });
  const vars = { ...springVars('surface', d.in as SpringName, d.slow), ...springVars('settle', d.home as SpringName, d.slow), ...springVars('release', d.out as SpringName, d.slow) };
  React.useEffect(() => {
    const el = document.documentElement;
    for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);
    return () => { for (const k of Object.keys(vars)) el.style.removeProperty(k); };
  });
  return (
    <div data-testid="sheet-slide-tuner" className="flex justify-center gap-8">
      <Sheet side="right"><Sheet.Trigger render={<Button>Tuned inspector</Button>} /><Sheet.Popup><Inspector side="right" /></Sheet.Popup></Sheet>
      <Sheet side="bottom"><Sheet.Trigger render={<Button>Tuned sheet</Button>} /><Sheet.Popup><Inspector side="bottom" /></Sheet.Popup></Sheet>
    </div>
  );
}

export default function SheetPage() {
  return (
    <ComponentPage
      title="Sheet"
      lede="A panel that slides in from an edge: an inspector from the right, a phone sheet from the bottom. Drag it and it follows your finger; let go past the edge and it leaves, sooner for a harder flick."
      play={{ lede: 'Open one, then drag it away or press Esc.', caption: 'right: an inspector · bottom: a phone sheet', node: (
        <div className="flex justify-center gap-8">
          <Sheet side="right"><Sheet.Trigger render={<Button>Open inspector</Button>} /><Sheet.Popup><Inspector side="right" /></Sheet.Popup></Sheet>
          <Sheet side="bottom"><Sheet.Trigger render={<Button>Open sheet</Button>} /><Sheet.Popup><Inspector side="bottom" /></Sheet.Popup></Sheet>
        </div>
      ) }}
      more={[{ id: 'slide', title: 'Tune the slide', lede: 'The Sheet slide panel swaps the springs it slides in, settles home and leaves on, and stretches time.', node: <SlideTuner /> }]}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'SH1', title: 'The finger holds it', body: 'While dragged it follows one to one; springs only take over when you let go.', origin: 'Ours' },
        { id: 'SH2', title: 'A flick is a promise', body: 'A harder flick leaves sooner: the release scales with the swipe.', origin: 'Ours' },
        { id: 'SH3', title: 'Keep a way out you can see', body: 'Swipe and Esc are shortcuts; a Close button is always there.', origin: 'Ours' },
      ]}
    />
  );
}
