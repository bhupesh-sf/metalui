import { Lens, type LensProps } from '@unlocalhosted/metalui';
import { GADGETS } from '@unlocalhosted/metalui/gadgets';
import lensSource from '../../../../../packages/metalui/src/components/lens/lens.tsx?raw';
import partSource from '../../../../../packages/metalui/src/gadgets/parts/lens.ts?raw';
import agentGuide from '../../../../../packages/metalui/src/components/lens/lens.agent.md?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalLens.swift?raw';
import { Bench, PageHeader, Rules, Section, SourceTabs } from '../../ui/doc';
import { SwiftCapture } from '../../ui/SwiftCapture';

const LOOKS: { label: string; props: LensProps }[] = [
  { label: 'iris open', props: { iris: 1 } },
  { label: 'iris 0.6', props: { iris: 0.6 } },
  { label: 'iris 0.1', props: { iris: 0.1 } },
  { label: 'turned 45° · 12 grips', props: { iris: 0.6, turn: 45, ticks: 12 } },
];

export default function LensPage() {
  return (
    <>
      <PageHeader
        title="Lens"
        lede="A camera lens seen head-on: a knurled ring in the accent that turns, a domed glass dark at its centre and coated toward its rim, and an iris behind it that closes to a hexagon. In a gadget the turn mechanism clicks its ring round a detent and back when something is taken."
      />
      <Section title="Looks" lede="iris is how open the blades are; turn is the ring's angle.">
        <Bench caption={`gadgets.lens · ring ${GADGETS.lens.ring} wide · ${GADGETS.lens.blades} blades · opening ${GADGETS.lens.iris.join(' to ')} of the glass`}>
          <div className="flex flex-wrap items-end gap-24" data-testid="lens-looks">
            {LOOKS.map((l) => (
              <figure key={l.label} className="m-0 flex flex-col items-center gap-6">
                <Lens size={180} {...l.props} />
                <figcaption className="type-label engraved">{l.label}</figcaption>
              </figure>
            ))}
          </div>
        </Bench>
        <SwiftCapture name="lens" maxWidth={760} />
      </Section>
      <Section title="Rules">
        <Rules
          rules={[
            { id: 'E1', title: 'Taking in', body: 'A lens stands for taking something in: a capture, a scan. Searching is the scope.' },
            { id: 'E2', title: 'The ring is the accent', body: 'The ring is what a hand would turn, so it wears the accent. The glass never does.' },
            { id: 'E3', title: 'Clicks, never whirs', body: 'The ring turns clean between detents and clicks at each.' },
          ]}
        />
      </Section>
      <Section title="Source">
        <SourceTabs tabs={[
          { id: 'react', label: 'React', code: lensSource },
          { id: 'part', label: 'Drawing', code: partSource },
          { id: 'swift', label: 'SwiftUI', code: swiftSource },
          { id: 'agent', label: 'Agent guide', code: agentGuide },
        ]} />
      </Section>
    </>
  );
}
