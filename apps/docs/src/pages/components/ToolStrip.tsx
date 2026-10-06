import * as React from 'react';
import { SelectionFrame, SwapText, ToolStrip } from '@unlocalhosted/metalui';
import { Icon } from '@unlocalhosted/metalui/icons';
import reactSource from '../../../../../packages/metalui/src/blocks/tool-strip/tool-strip.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import agentGuide from '../../../../../packages/metalui/src/blocks/tool-strip/tool-strip.agent.md?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Blocks/MetalToolStrip.swift?raw';
import { Bench, PageHeader, Rules, Section, SourceTabs } from '../../ui/doc';
import { SwiftCapture } from '../../ui/SwiftCapture';
import { UsageSection, useOwnCss } from '../../ui/Usage';

export default function ToolStripPage() {
  const ownCss = useOwnCss(cssSource);
  const [said, setSaid] = React.useState('Click a verb');
  const [shown, setShown] = React.useState(true);
  const [listSaid, setListSaid] = React.useState('Pick a verb');
  const verbs = ['Tasks', 'Summarise', 'Gather', 'Region', 'Export'].map((l) => ({ label: l, onSelect: () => setSaid(l) }));
  return (
    <>
      <PageHeader title="Tool strip" lede="Verbs over a selection: a graphite strip that rises above a click selection with Tasks, Summarise, Gather, Region, Export, and Send away set apart. A selection made by finishing is quiet and never raises it. Built on Base UI Toolbar." />
      <Section title="Over a selection" lede="Click the selection to raise the strip again (it rises 4 on the part spring).">
        <Bench caption={said} className="min-h-[260px] flex-col gap-12">
          <div className="h-36">{shown && <ToolStrip label="3 blocks" items={[...verbs, { label: 'Send away', destructive: true, onSelect: () => setSaid('Sent away 3 blocks · Undo') }]} />}</div>
          <button type="button" className="relative mt-12 rounded-card px-24 py-16 text-left material-raised" aria-selected onClick={() => { setShown(false); requestAnimationFrame(() => setShown(true)); }}>
            <span className="type-content text-ink">three blocks, selected</span>
            <SelectionFrame state="selected" radius={24} count={3} entrance={false} />
          </button>
        </Bench>
        <SwiftCapture name="tool-strip" maxWidth={560} />
      </Section>
      <Section title="Over a list" lede="Over rows picked in a list, the strip leads with the count, its verbs carry glyphs, a verb with choices opens its menu above the strip, and a close key ends the selection. This is the task inbox's strip.">
        <Bench caption={listSaid} className="min-h-[160px]">
          <ToolStrip
            label="3 selected tasks"
            count={<SwapText value="3 selected" />}
            items={[
              { label: 'Complete', icon: <Icon name="check" />, shortcut: 'E', onSelect: () => setListSaid('Completed 3 tasks · Undo') },
              { label: 'Snooze', icon: <Icon name="clock" />, menu: { heading: 'Snooze until', items: [
                { label: 'Tomorrow', onSelect: () => setListSaid('Snoozed 3 tasks until tomorrow') },
                { label: 'Next week', onSelect: () => setListSaid('Snoozed 3 tasks until next week') },
              ] } },
              { label: 'Delete', icon: <Icon name="trash" />, destructive: true, onSelect: () => setListSaid('Deleted 3 tasks · Undo') },
              { label: 'Clear selection', icon: <Icon name="close" />, iconOnly: true, shortcut: 'Escape', onSelect: () => setListSaid('Selection cleared') },
            ]}
          />
        </Bench>
      </Section>
      <UsageSection agent={agentGuide} />
      <Section title="Source">
        <SourceTabs tabs={[
          { id: 'react', label: 'React', code: reactSource },
          { id: 'css', label: 'CSS', code: ownCss },
          { id: 'swift', label: 'SwiftUI', code: swiftSource },
          { id: 'agent', label: 'Agent guide', code: agentGuide },
        ]} />
      </Section>
      <Section title="Rules">
        <Rules rules={[
          { id: 'T1', title: 'Only for a click selection', body: 'A selection made by finishing is quiet; never while dragging, resizing, in the past or with the palette open.', origin: 'DS-31' },
          { id: 'T2', title: 'Every verb says what it did', body: 'A toast names the result and offers Undo: Made 3 tasks, Sent away 3 blocks.', origin: 'reference brief' },
          { id: 'T3', title: 'One destructive verb, last', body: 'After the engraved separator, in the warm red. Canvas delete is send away.', origin: 'DS-33' },
        ]} />
      </Section>
    </>
  );
}
