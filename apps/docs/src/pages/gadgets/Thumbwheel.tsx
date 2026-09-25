import * as React from 'react';
import { Button, Switch } from '@unlocalhosted/metalui';
import { Gadget, driveRange, renderGadgetSvg, type GadgetSpec } from '@unlocalhosted/metalui/gadgets';
import { createSound } from '@unlocalhosted/metalui/sound';
import thumbwheel from '../../../../../packages/metalui/src/gadgets/fixtures/thumbwheel.gadget.json';
import turnSource from '../../../../../packages/metalui/gadgets/src/mechanisms/turn.mjs?raw';
import agentGuide from '../../../../../packages/metalui/src/gadgets/thumbwheel/thumbwheel.agent.md?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Gadgets/MetalGadget.swift?raw';
import { Bench, Code, PageHeader, Rules, Section, SourceTabs } from '../../ui/doc';
import { SwiftCapture } from '../../ui/SwiftCapture';

const SPEC = thumbwheel as unknown as GadgetSpec;
const RANGE = driveRange(SPEC);
// Pixels of drag, on the page's wheel, that turn it a day.
const PER_DAY = 14;

/** Roll the wheel with your thumb: drag it up or down, scroll it, or use the arrow keys; a day a click. */
function RolledWheel({ sound, value, onValue }: { sound: ReturnType<typeof createSound>; value: number; onValue: (v: number) => void }) {
  const latest = React.useRef(value), drag = React.useRef<{ y: number; v: number } | null>(null);
  latest.current = value;
  const set = (v: number) => { const c = Math.min(RANGE.max, Math.max(RANGE.min, Math.round(v))); latest.current = c; onValue(c); };
  return (
    <div role="slider" tabIndex={0} aria-label="Days back" aria-valuemin={RANGE.min} aria-valuemax={RANGE.max} aria-valuenow={value} aria-valuetext={value === 0 ? 'now' : value === -1 ? '1 day ago' : `${-value} days ago`}
      data-testid="wheel-point" className="cursor-ns-resize touch-none select-none rounded-card outline-none focus-visible:focus-ring"
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = { y: e.clientY, v: latest.current }; }}
      onPointerMove={(e) => { if (drag.current) set(drag.current.v - (e.clientY - drag.current.y) / PER_DAY); }}
      onPointerUp={() => { drag.current = null; }}
      onWheel={(e) => set(latest.current - Math.sign(e.deltaY))}
      onKeyDown={(e) => {
        const step: Record<string, number> = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 7, PageDown: -7, Home: RANGE.min, End: RANGE.max };
        if (!(e.key in step)) return;
        e.preventDefault();
        set(e.key === 'Home' || e.key === 'End' ? step[e.key] : latest.current + step[e.key]);
      }}>
      <Gadget spec={SPEC} value={value} sound={sound} size={280} data-testid="wheel" />
    </div>
  );
}

export default function ThumbwheelPage() {
  const sound = React.useMemo(() => createSound(), []);
  const [soundOn, setSoundOn] = React.useState(false);
  const [days, setDays] = React.useState(0);
  const still = React.useMemo(() => renderGadgetSvg(SPEC, { size: 96, value: -3 }), []);
  return (
    <>
      <PageHeader
        title="Thumbwheel"
        lede="A gadget for the past: a knurled wheel seen edge-on in a slot in a stone slab, under an engraved NOW, and a lamp. Roll it back and it clicks once a day; off now, the lamp goes amber, and more than a week back it breathes. It is only a spec: the renderer draws it, and the turn mechanism rolls the wheel."
      />
      <Section title="Roll it back" lede="Drag the wheel down with your thumb, scroll it, or use the arrow keys (Page keys go a week): it clicks at every day, and stops hard at now and at thirty days back. Turn sound on to hear the stone detents.">
        <Bench caption={`thumbwheel · keep, own · feel .6 .3 .5 → stone · turn · ${days === 0 ? 'now' : days === -1 ? '1 day ago' : `${-days} days ago`}`}>
          <div className="flex w-full flex-wrap items-center gap-24">
            <RolledWheel sound={sound} value={days} onValue={setDays} />
            <div className="flex flex-col items-start gap-16">
              <Button onClick={() => setDays(0)} disabled={days === 0}>Back to now</Button>
              <label className="flex items-center gap-12 type-ui text-ink">
                <Switch aria-label="Sound" checked={soundOn} onCheckedChange={async (n) => { if (n) await sound.enable(); else sound.disable(); setSoundOn(n); }} />Sound
              </label>
            </div>
          </div>
        </Bench>
      </Section>
      <Section title="States" lede="Now at rest; a few days back it is in the past; more than a week back, far. On the web and by MetalGadget in SwiftUI from the same JSON.">
        <Bench caption="0 · −3 · −12 days">
          <div className="flex flex-wrap items-end gap-20" data-testid="wheel-states">
            {[{ label: 'now', v: 0 }, { label: '3 days ago', v: -3 }, { label: '12 days ago', v: -12 }].map((l) => (
              <figure key={l.label} className="m-0 flex flex-col items-center gap-6"><Gadget spec={SPEC} value={l.v} size={128} /><figcaption className="type-label engraved">{l.label}</figcaption></figure>
            ))}
          </div>
        </Bench>
        <SwiftCapture name="gadget-thumbwheel" maxWidth={760} />
      </Section>
      <Section title="Detail by size">
        <Bench caption="160 · 96 · 64 · 32 px">
          <div className="flex flex-wrap items-end gap-20" data-testid="wheel-tiers">
            {[160, 96, 64, 32].map((s) => <figure key={s} className="m-0 flex flex-col items-center gap-6"><Gadget spec={SPEC} value={-3} size={s} /><figcaption className="type-readout text-ink3">{s} px</figcaption></figure>)}
          </div>
        </Bench>
      </Section>
      <Section title="Without a browser">
        <Bench caption="renderGadgetSvg(spec, { size: 96, value: -3 })">
          <div data-testid="wheel-static" dangerouslySetInnerHTML={{ __html: still }} />
        </Bench>
      </Section>
      <Section title="Rules">
        <Rules
          rules={[
            { id: 'G1', title: 'A day a click', body: 'The wheel clicks once for every day it turns. Hours are not its business.' },
            { id: 'G2', title: 'Now is a stop', body: 'It stops hard at now: the future is not on the wheel.' },
            { id: 'G3', title: 'The past is amber', body: 'Off now, the lamp says so: amber, and breathing more than a week back.' },
          ]}
        />
      </Section>
      <Section title="The spec">
        <Code code={JSON.stringify(SPEC, null, 2)} label="thumbwheel.gadget.json" lang="json" />
      </Section>
      <Section title="Source">
        <SourceTabs tabs={[
          { id: 'turn', label: 'Turn', code: turnSource },
          { id: 'agent', label: 'Agent guide', code: agentGuide },
          { id: 'swift', label: 'SwiftUI', code: swiftSource },
        ]} />
      </Section>
    </>
  );
}
