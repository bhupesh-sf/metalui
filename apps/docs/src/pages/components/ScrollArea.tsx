import * as React from 'react';
import { useDialKit } from 'dialkit';
import { ScrollArea } from '@unlocalhosted/metalui';
import { type SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';
import reactSource from '../../../../../packages/metalui/src/components/scroll-area/scroll-area.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import agentSource from '../../../../../packages/metalui/src/components/scroll-area/scroll-area.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * BAR TUNER: the page's DialKit panel
 *
 *   idle     how long the bar waits after you stop
 *   reach    the thumb's width when the bar is hovered, and its spring
 *   fade     the size of the edge fades
 * ───────────────────────────────────────────────────────── */

const NOTES = Array.from({ length: 24 }, (_, i) => `Note ${i + 1}: ${['Pick up the prints', 'Call about the lease', 'Two copies of the plan', 'Bring the negatives', 'Book the train', 'Ask about matte paper'][i % 6]}`);

function List({ label }: { label: string }) {
  return (
    <ScrollArea aria-label={label} className="h-[240px] w-full max-w-[380px] rounded-card recipe-well-field">
      <ul className="m-0 grid list-none gap-2 p-12">
        {NOTES.map((n) => <li key={n} className="type-ui text-ink px-4 py-6">{n}</li>)}
      </ul>
    </ScrollArea>
  );
}

function BarTuner() {
  const d = useDialKit('Scroll bar', {
    idle: [600, 0, 2000],
    reach: [8, 4, 12],
    reachSpring: { type: 'select', options: SPRING_NAMES, default: 'part' },
    fade: [20, 0, 60],
  });
  const vars = {
    ...springVars('part', d.reachSpring as SpringName),
    '--mu-r-scroll-area-bar-idle': `${d.idle}ms`,
    '--mu-r-scroll-area-thumb-hover': `${d.reach}px`,
    '--mu-r-scroll-area-fade-size': `${d.fade}px`,
  } as React.CSSProperties;
  return <div data-testid="scroll-bar-tuner" className="flex justify-center" style={vars}><List label="Tuned notes" /></div>;
}

export default function ScrollAreaPage() {
  return (
    <ComponentPage
      title="Scroll area"
      lede="A region that scrolls with the system's own scrollbar. The thumb fades in while you scroll and widens when you reach for it; the edges fade only where there is more to see."
      play={{ lede: 'Scroll the list, reach for the bar, or Tab in and use the arrow keys.', caption: '24 notes in a 240 frame', node: <div className="flex w-full justify-center"><List label="Notes" /></div> }}
      more={[{ id: 'bar', title: 'Tune the bar', lede: 'The Scroll bar panel sets how long the bar waits after you stop, how wide the thumb grows when reached for, and the size of the edge fades.', node: <BarTuner /> }]}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'SA1', title: 'The fade says there is more', body: 'An edge fades only when content continues beyond it, and grows as you move away.', origin: 'Ours' },
        { id: 'SA2', title: 'The bar comes when you need it', body: 'It shows while scrolling or hovered and leaves after a pause.', origin: 'Ours' },
        { id: 'SA3', title: 'Bigger when reached for', body: 'The thumb widens under the pointer: a target sized for the hand that is coming.', origin: 'Ours' },
      ]}
    />
  );
}
