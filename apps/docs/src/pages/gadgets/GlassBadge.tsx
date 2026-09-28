import * as React from 'react';
import { Switch } from '@unlocalhosted/metalui';
import { Gadget, renderGadgetSvg, type GadgetSpec } from '@unlocalhosted/metalui/gadgets';
import glassBadge from '../../../../../packages/metalui/src/gadgets/fixtures/glass-badge.gadget.json';
import glowSource from '../../../../../packages/metalui/gadgets/src/mechanisms/glow.mjs?raw';
import agentGuide from '../../../../../packages/metalui/src/gadgets/glass-badge/glass-badge.agent.md?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Gadgets/MetalGadget.swift?raw';
import { Bench, Code, PageHeader, Rules, Section, SourceTabs } from '../../ui/doc';
import { SwiftCapture } from '../../ui/SwiftCapture';

const SPEC = glassBadge as unknown as GadgetSpec;

export default function GlassBadgePage() {
  const [signedIn, setSignedIn] = React.useState(false);
  const [expired, setExpired] = React.useState(false);
  const still = React.useMemo(() => renderGadgetSvg(SPEC, { size: 96, value: 1 }), []);
  const state = expired ? 'expired' : signedIn ? 'signed in' : 'signed out';
  return (
    <>
      <PageHeader
        title="Glass badge"
        lede="A gadget for who you are: a person printed on a square of cool glass in a heavy steel bezel, lit from behind, and a lamp. Signed in, the light behind the glass rises and the person stands dark against it; signed out, the glass is nearly dark. It makes no sound. It is only a spec: the renderer draws it, and the glow mechanism lights it."
      />
      <Section title="Sign in" lede="Sign in and the light behind the glass rises on the settle spring, and the lamp rises green; sign out and it falls. A sign-in that has run out keeps the light and turns the lamp amber.">
        <Bench caption={`glass-badge · identify, others · feel .6 .2 .9 → glass · glow · ${state}`}>
          <div className="flex w-full flex-wrap items-center gap-24">
            <Gadget spec={SPEC} value={signedIn ? 1 : 0} state={expired ? 'expired' : undefined} size={280} data-testid="badge" />
            <div className="flex flex-col items-start gap-16">
              <label className="flex items-center gap-12 type-ui text-ink">
                <Switch aria-label="Signed in" checked={signedIn} onCheckedChange={(n) => { setSignedIn(n); if (!n) setExpired(false); }} />Signed in
              </label>
              <label className="flex items-center gap-12 type-ui text-ink">
                <Switch aria-label="Expired" checked={expired} disabled={!signedIn} onCheckedChange={setExpired} />Expired
              </label>
            </div>
          </div>
        </Bench>
      </Section>
      <Section title="States" lede="Signed out at rest; signed in; expired. On the web and by MetalGadget in SwiftUI from the same JSON.">
        <Bench caption="signed out · signed in · expired">
          <div className="flex flex-wrap items-end gap-20" data-testid="badge-states">
            {[{ label: 'signed out', v: 0 }, { label: 'signed in', v: 1 }, { label: 'expired', v: 1, state: 'expired' }].map((l) => (
              <figure key={l.label} className="m-0 flex flex-col items-center gap-6"><Gadget spec={SPEC} value={l.v} state={l.state} size={128} /><figcaption className="type-label engraved">{l.label}</figcaption></figure>
            ))}
          </div>
        </Bench>
        <SwiftCapture name="gadget-glass-badge" maxWidth={760} />
      </Section>
      <Section title="Detail by size">
        <Bench caption="160 · 96 · 64 · 32 px">
          <div className="flex flex-wrap items-end gap-20" data-testid="badge-tiers">
            {[160, 96, 64, 32].map((s) => <figure key={s} className="m-0 flex flex-col items-center gap-6"><Gadget spec={SPEC} value={1} size={s} /><figcaption className="type-readout text-ink3">{s} px</figcaption></figure>)}
          </div>
        </Bench>
      </Section>
      <Section title="Without a browser">
        <Bench caption="renderGadgetSvg(spec, { size: 96, value: 1 })">
          <div data-testid="badge-static" dangerouslySetInnerHTML={{ __html: still }} />
        </Bench>
      </Section>
      <Section title="Rules">
        <Rules
          rules={[
            { id: 'G1', title: 'Others see it', body: 'A badge is how you look to others: heavy glass, cool and still. It never wears the accent.' },
            { id: 'G2', title: 'Silent', body: 'Signing in is shown, never sounded: the light rises and the lamp rises green.' },
            { id: 'G3', title: 'Expired is the host’s', body: 'The switch says signed in; the host says when that has run out.' },
          ]}
        />
      </Section>
      <Section title="The spec">
        <Code code={JSON.stringify(SPEC, null, 2)} label="glass-badge.gadget.json" lang="json" />
      </Section>
      <Section title="Source">
        <SourceTabs tabs={[
          { id: 'glow', label: 'Glow', code: glowSource },
          { id: 'agent', label: 'Agent guide', code: agentGuide },
          { id: 'swift', label: 'SwiftUI', code: swiftSource },
        ]} />
      </Section>
    </>
  );
}
