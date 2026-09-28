import * as React from 'react';
import { Switch } from '@unlocalhosted/metalui';
import { Gadget, renderGadgetSvg, type GadgetSpec } from '@unlocalhosted/metalui/gadgets';
import { createSound } from '@unlocalhosted/metalui/sound';
import inkWell from '../../../../../packages/metalui/src/gadgets/fixtures/ink-well.gadget.json';
import dipSource from '../../../../../packages/metalui/gadgets/src/mechanisms/dip.mjs?raw';
import agentGuide from '../../../../../packages/metalui/src/gadgets/ink-well/ink-well.agent.md?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Gadgets/MetalGadget.swift?raw';
import { Bench, Code, PageHeader, Rules, Section, SourceTabs } from '../../ui/doc';
import { SwiftCapture } from '../../ui/SwiftCapture';

const SPEC = inkWell as unknown as GadgetSpec;

export default function InkWellPage() {
  const sound = React.useMemo(() => createSound(), []);
  const [soundOn, setSoundOn] = React.useState(false);
  const [writing, setWriting] = React.useState(false);
  const [act, setAct] = React.useState(0);
  const still = React.useMemo(() => renderGadgetSvg(SPEC, { size: 96, value: 1 }), []);
  return (
    <>
      <PageHeader
        title="Ink well"
        lede="A gadget for making: a brass nib over a well of ink in a pale pink ceramic slab, and a lamp. Start drawing and the nib dips into the ink, taps the well and lifts, then rests a little lower, writing. It is only a spec: the renderer draws it, and the dip mechanism dips the nib."
      />
      <Section title="Dip it" lede="Press the well to dip the nib: it drops into the ink, taps the ceramic softly and springs back up. Switch writing on and it dips and stays a little lower while you draw. Turn sound on to hear the tap.">
        <Bench caption={`ink-well · make, own · feel .9 .9 .1 → ceramic · dip · ${writing ? 'writing' : 'ready'}`}>
          <div className="flex w-full flex-wrap items-center gap-24">
            <button type="button" aria-label="Dip the nib" data-testid="well-press"
              className="cursor-pointer rounded-card border-0 bg-transparent p-0 outline-none focus-visible:focus-ring" onClick={() => setAct((a) => a + 1)}>
              <Gadget spec={SPEC} value={writing ? 1 : 0} act={act} sound={sound} size={280} data-testid="well" />
            </button>
            <div className="flex flex-col items-start gap-16">
              <label className="flex items-center gap-12 type-ui text-ink">
                <Switch aria-label="Writing" checked={writing} onCheckedChange={setWriting} />Writing
              </label>
              <label className="flex items-center gap-12 type-ui text-ink">
                <Switch aria-label="Sound" checked={soundOn} onCheckedChange={async (n) => { if (n) await sound.enable(); else sound.disable(); setSoundOn(n); }} />Sound
              </label>
            </div>
          </div>
        </Bench>
      </Section>
      <Section title="States" lede="Ready at rest; writing, the nib rests in the ink. On the web and by MetalGadget in SwiftUI from the same JSON.">
        <Bench caption="ready · writing">
          <div className="flex flex-wrap items-end gap-20" data-testid="well-states">
            {[{ label: 'ready', v: 0 }, { label: 'writing', v: 1 }].map((l) => (
              <figure key={l.label} className="m-0 flex flex-col items-center gap-6"><Gadget spec={SPEC} value={l.v} size={128} /><figcaption className="type-label engraved">{l.label}</figcaption></figure>
            ))}
          </div>
        </Bench>
        <SwiftCapture name="gadget-ink-well" maxWidth={760} />
      </Section>
      <Section title="Detail by size">
        <Bench caption="160 · 96 · 64 · 32 px">
          <div className="flex flex-wrap items-end gap-20" data-testid="well-tiers">
            {[160, 96, 64, 32].map((s) => <figure key={s} className="m-0 flex flex-col items-center gap-6"><Gadget spec={SPEC} size={s} /><figcaption className="type-readout text-ink3">{s} px</figcaption></figure>)}
          </div>
        </Bench>
      </Section>
      <Section title="Without a browser">
        <Bench caption="renderGadgetSvg(spec, { size: 96, value: 1 })">
          <div data-testid="well-static" dangerouslySetInnerHTML={{ __html: still }} />
        </Bench>
      </Section>
      <Section title="Rules">
        <Rules
          rules={[
            { id: 'G1', title: 'A soft tap', body: 'Dipping is one soft tap on the ceramic. Drawing itself is silent.' },
            { id: 'G2', title: 'The ink is the accent', body: 'The ink and the wet tip are the one thing that makes a mark, so they wear the accent.' },
            { id: 'G3', title: 'Writing is the host’s', body: 'The host says when drawing starts and stops; the nib dips once as it starts.' },
          ]}
        />
      </Section>
      <Section title="The spec">
        <Code code={JSON.stringify(SPEC, null, 2)} label="ink-well.gadget.json" lang="json" />
      </Section>
      <Section title="Source">
        <SourceTabs tabs={[
          { id: 'dip', label: 'Dip', code: dipSource },
          { id: 'agent', label: 'Agent guide', code: agentGuide },
          { id: 'swift', label: 'SwiftUI', code: swiftSource },
        ]} />
      </Section>
    </>
  );
}
