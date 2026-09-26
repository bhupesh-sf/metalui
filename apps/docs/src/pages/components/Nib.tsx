import { Nib, type NibProps } from '@unlocalhosted/metalui';
import { GADGETS } from '@unlocalhosted/metalui/gadgets';
import nibSource from '../../../../../packages/metalui/src/components/nib/nib.tsx?raw';
import partSource from '../../../../../packages/metalui/src/gadgets/parts/nib.ts?raw';
import agentGuide from '../../../../../packages/metalui/src/components/nib/nib.agent.md?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalNib.swift?raw';
import { Bench, PageHeader, Rules, Section, SourceTabs } from '../../ui/doc';
import { SwiftCapture } from '../../ui/SwiftCapture';

const LOOKS: { label: string; props: NibProps }[] = [
  { label: 'straight', props: {} },
  { label: '−20°', props: { angle: -20 } },
  { label: '20° · blue-black ink', props: { angle: 20, ink: { L: 0.32, C: 0.08, H: 265 } } },
];

export default function NibPage() {
  return (
    <>
      <PageHeader
        title="Nib"
        lede="A pen nib seen from above: brass, narrowing to its tip, with a slit and a breather hole, its tip wet with ink in the accent. Its origin is its tip, so it turns about the point that touches the page. In a gadget the dip mechanism dips it into its well."
      />
      <Section title="Looks" lede="angle turns it about its tip; ink is the colour on its tip.">
        <Bench caption={`gadgets.nib · ${GADGETS.parts.nib.size.join(' × ')} · slit to ${GADGETS.nib.slit} of its length · wet ${GADGETS.nib.wet[0]} of it`}>
          <div className="flex flex-wrap items-end gap-24" data-testid="nib-looks">
            {LOOKS.map((l) => (
              <figure key={l.label} className="m-0 flex flex-col items-center gap-6">
                <Nib size={180} {...l.props} />
                <figcaption className="type-label engraved">{l.label}</figcaption>
              </figure>
            ))}
          </div>
        </Bench>
        <SwiftCapture name="nib" maxWidth={760} />
      </Section>
      <Section title="Rules">
        <Rules
          rules={[
            { id: 'E1', title: 'Making', body: 'A nib stands for making marks. Picking and moving things are cursors.' },
            { id: 'E2', title: 'The ink is the accent', body: 'The wet tip is the one thing that leaves a mark, so it wears the accent. The brass never does.' },
          ]}
        />
      </Section>
      <Section title="Source">
        <SourceTabs tabs={[
          { id: 'react', label: 'React', code: nibSource },
          { id: 'part', label: 'Drawing', code: partSource },
          { id: 'swift', label: 'SwiftUI', code: swiftSource },
          { id: 'agent', label: 'Agent guide', code: agentGuide },
        ]} />
      </Section>
    </>
  );
}
