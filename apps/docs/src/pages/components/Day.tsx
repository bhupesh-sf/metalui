import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Day, DayTile } from '@unlocalhosted/metalui';
import reactSource from '../../../../../packages/metalui/src/blocks/day/day.tsx?raw';
import agentSource from '../../../../../packages/metalui/src/blocks/day/day.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

function Playground() {
  const d = useDialKit('Day', { page: { weekendInk: true, clock: true, seconds: true }, motion: { animate: true } });
  const [torn, setTorn] = React.useState<Date | null>(null);
  const widget = (cw: 'bone' | 'graphite') => (
    <div key={cw} data-mu-colorway={cw} data-testid={`day-${cw}`} className="flex flex-wrap items-start justify-center gap-32 rounded-card bg-page p-24">
      <Day.Root weekendInk={d.page.weekendInk} animate={d.motion.animate} onTear={setTorn}>
        <Day.Page clock={d.page.clock} seconds={d.page.seconds} />
        <Day.Year />
        <Day.Line />
      </Day.Root>
      <DayTile weekendInk={d.page.weekendInk} />
    </div>
  );
  return (
    <div className="flex w-full flex-col gap-12">
      <div className="grid w-full gap-16 xl:grid-cols-2">{widget('bone')}{widget('graphite')}</div>
      <p className="type-meta text-ink2" aria-live="polite">{torn ? `Torn off; now showing ${torn.toDateString()}.` : 'Tap a page to tear it off.'}</p>
    </div>
  );
}

export default function DayPage() {
  return (
    <ComponentPage
      title="Day"
      lede="The day as an object: a tear-off page with the date in dots, the clock down its side and the minute filling along its foot; the year so far, one dot a day; and one line for the day."
      play={{ lede: 'Tap the page to tear it off. The Day panel turns the weekend inks, the clock, the seconds and the motion on and off.', node: <Playground /> }}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'D1', title: 'Tearing is the only control', body: 'The page is one real button; everything else is read, not operated.', origin: 'Ours' },
        { id: 'D2', title: 'The year in dots', body: 'Each dot is a day; the lit ones are gone. The days left are said in words too.', origin: 'Ours' },
        { id: 'D3', title: 'Compose the parts', body: 'Day.Root holds the day; Day.Page, Day.Year and Day.Line can be left out or reordered.', origin: 'Ours' },
      ]}
    />
  );
}
