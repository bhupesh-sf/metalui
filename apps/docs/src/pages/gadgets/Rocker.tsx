import * as React from 'react';
import { Switch } from '@unlocalhosted/metalui';
import { Gadget, renderGadgetSvg, type GadgetSpec } from '@unlocalhosted/metalui/gadgets';
import { createSound } from '@unlocalhosted/metalui/sound';
import rocker from '../../../../../packages/metalui/src/gadgets/fixtures/rocker.gadget.json';
import flipSource from '../../../../../packages/metalui/gadgets/src/mechanisms/flip.mjs?raw';
import agentGuide from '../../../../../packages/metalui/src/gadgets/rocker/rocker.agent.md?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Gadgets/MetalGadget.swift?raw';
import { Bench, Code, PageHeader, Rules, Section, SourceTabs } from '../../ui/doc';
import { SwiftCapture } from '../../ui/SwiftCapture';

const SPEC = rocker as unknown as GadgetSpec;

export default function RockerPage() {
  const sound = React.useMemo(() => createSound(), []);
  const [soundOn, setSoundOn] = React.useState(false);
  const [on, setOn] = React.useState(false);
  const still = React.useMemo(() => renderGadgetSvg(SPEC, { size: 96, value: 1 }), []);
  return (
    <>
      <PageHeader
        title="Rocker"
        lede="A gadget for one setting: a rocker in the accent sunk in a well in a pale clay slab, and a lamp. On, its upper end (I) is pressed and the lamp is lit; off, its lower end (O). It rocks on the hinge spring and clicks each way. It is only a spec: the renderer draws it, and the flip mechanism rocks it."
      />
      <Section title="Rock it" lede="Press the rocker, or focus it and press Space: it rocks to the other end on the hinge spring, the half facing the light brightens, and it clicks against its stop. Turn sound on to hear the clicks.">
        <Bench caption={`rocker · tune, own · feel .6 .4 .2 → clay · flip · ${on ? 'on' : 'off'}`}>
          <div className="flex w-full flex-wrap items-center gap-24">
            <button type="button" role="switch" aria-checked={on} aria-label="Sound" data-testid="rocker-press"
              className="cursor-pointer rounded-card border-0 bg-transparent p-0 outline-none focus-visible:focus-ring" onClick={() => setOn((v) => !v)}>
              <Gadget spec={SPEC} value={on ? 1 : 0} sound={sound} size={280} data-testid="rocker" />
            </button>
            <label className="flex items-center gap-12 type-ui text-ink">
              <Switch aria-label="Hear it" checked={soundOn} onCheckedChange={async (n) => { if (n) await sound.enable(); else sound.disable(); setSoundOn(n); }} />Hear it
            </label>
          </div>
        </Bench>
      </Section>
      <Section title="States" lede="Off at rest; on, the lamp is lit. On the web and by MetalGadget in SwiftUI from the same JSON.">
        <Bench caption="off · on">
          <div className="flex flex-wrap items-end gap-20" data-testid="rocker-states">
            {[{ label: 'off', v: 0 }, { label: 'on', v: 1 }].map((l) => (
              <figure key={l.label} className="m-0 flex flex-col items-center gap-6"><Gadget spec={SPEC} value={l.v} size={128} /><figcaption className="type-label engraved">{l.label}</figcaption></figure>
            ))}
          </div>
        </Bench>
        <SwiftCapture name="gadget-rocker" maxWidth={760} />
      </Section>
      <Section title="Detail by size">
        <Bench caption="160 · 96 · 64 · 32 px">
          <div className="flex flex-wrap items-end gap-20" data-testid="rocker-tiers">
            {[160, 96, 64, 32].map((s) => <figure key={s} className="m-0 flex flex-col items-center gap-6"><Gadget spec={SPEC} value={1} size={s} /><figcaption className="type-readout text-ink3">{s} px</figcaption></figure>)}
          </div>
        </Bench>
      </Section>
      <Section title="Without a browser">
        <Bench caption="renderGadgetSvg(spec, { size: 96, value: 1 })">
          <div data-testid="rocker-static" dangerouslySetInnerHTML={{ __html: still }} />
        </Bench>
      </Section>
      <Section title="Rules">
        <Rules
          rules={[
            { id: 'G1', title: 'One setting', body: 'A rocker stands for one setting that is on or off. Several settings are the fader bank.' },
            { id: 'G2', title: 'I is on', body: 'On, the upper end (I) is pressed; off, the lower (O). The lamp agrees, so the state never rides on the tilt alone.' },
            { id: 'G3', title: 'A click each way', body: 'It clicks as it reaches either end, in clay. Nothing else.' },
          ]}
        />
      </Section>
      <Section title="The spec">
        <Code code={JSON.stringify(SPEC, null, 2)} label="rocker.gadget.json" lang="json" />
      </Section>
      <Section title="Source">
        <SourceTabs tabs={[
          { id: 'flip', label: 'Flip', code: flipSource },
          { id: 'agent', label: 'Agent guide', code: agentGuide },
          { id: 'swift', label: 'SwiftUI', code: swiftSource },
        ]} />
      </Section>
    </>
  );
}
