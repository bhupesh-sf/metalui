import * as React from 'react';
import { Button, Switch } from '@unlocalhosted/metalui';
import { Gadget, renderGadgetSvg, type GadgetSpec } from '@unlocalhosted/metalui/gadgets';
import { createSound } from '@unlocalhosted/metalui/sound';
import shutterLens from '../../../../../packages/metalui/src/gadgets/fixtures/shutter-lens.gadget.json';
import turnSource from '../../../../../packages/metalui/gadgets/src/mechanisms/turn.mjs?raw';
import agentGuide from '../../../../../packages/metalui/src/gadgets/shutter-lens/shutter-lens.agent.md?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Gadgets/MetalGadget.swift?raw';
import { Bench, Code, PageHeader, Rules, Section, SourceTabs } from '../../ui/doc';
import { SwiftCapture } from '../../ui/SwiftCapture';

const SPEC = shutterLens as unknown as GadgetSpec;
// ms: how long a capture shows before the lens is ready again.
const TAKEN = 1200;
// One detent of the ring: an eighth of its turn.
const DETENT = 1 / 8;

/** Turn the ring with your hand: drag round it, scroll, or use the arrow keys; it clicks a detent at a time. */
function TurnedLens({ sound, taken, onZoom }: { sound: ReturnType<typeof createSound>; taken: boolean; onZoom: (v: number) => void }) {
  const [zoom, setZoom] = React.useState(0.5);
  const latest = React.useRef(0.5), ref = React.useRef<HTMLDivElement>(null), drag = React.useRef<number | null>(null);
  const set = (v: number) => { const c = Math.min(1, Math.max(0, Math.round(v / DETENT) * DETENT)); latest.current = c; setZoom(c); onZoom(c); };
  const angle = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return (Math.atan2(e.clientX - r.left - r.width / 2, r.top + r.height * (196 / 400) - e.clientY) * 180) / Math.PI;
  };
  return (
    <div ref={ref} role="slider" tabIndex={0} aria-label="Zoom ring" aria-valuemin={0} aria-valuemax={8} aria-valuenow={Math.round(zoom / DETENT)}
      data-testid="lens-point" className="cursor-grab touch-none select-none rounded-card outline-none focus-visible:focus-ring"
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = angle(e); }}
      onPointerMove={(e) => {
        if (drag.current === null) return;
        const a = angle(e), d = ((a - drag.current + 540) % 360) - 180;
        if (Math.abs(d) >= 45 * 0.5) { drag.current = a; set(latest.current + Math.sign(d) * DETENT); }
      }}
      onPointerUp={() => { drag.current = null; }}
      onWheel={(e) => set(latest.current + Math.sign(e.deltaY) * DETENT)}
      onKeyDown={(e) => {
        const step: Record<string, number> = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, Home: -8, End: 8 };
        if (e.key in step) { e.preventDefault(); set(latest.current + step[e.key] * DETENT); }
      }}>
      <Gadget spec={SPEC} value={zoom} state={taken ? 'taken' : undefined} sound={sound} size={280} data-testid="lens" />
    </div>
  );
}

export default function ShutterLensPage() {
  const sound = React.useMemo(() => createSound(), []);
  const [soundOn, setSoundOn] = React.useState(false);
  const [taken, setTaken] = React.useState(false);
  const [zoom, setZoom] = React.useState(0.5);
  React.useEffect(() => {
    if (!taken) return;
    const t = window.setTimeout(() => setTaken(false), TAKEN);
    return () => window.clearTimeout(t);
  }, [taken]);
  const still = React.useMemo(() => renderGadgetSvg(SPEC, { size: 96, state: 'taken' }), []);
  return (
    <>
      <PageHeader
        title="Shutter lens"
        lede="A gadget for capture: a lens with a knurled ring in the accent, in a warm clay bezel around glass lit from behind, and a lamp. Take a picture and the ring clicks round a detent and back, the glass flashes, and the lamp rises. It is only a spec: the renderer draws it, and the turn mechanism turns the ring."
      />
      <Section title="Take one" lede="Take: the ring clicks round one detent and back while the glass behind the lens flashes. Turn the ring yourself: drag round it, scroll on it or use the arrow keys, and it clicks at every eighth of a turn. Turn sound on to hear the detents.">
        <Bench caption={`shutter-lens · take, world · feel .8 .9 .2 · turn · zoom ${Math.round(zoom * 8)} of 8 · ${taken ? 'taken' : 'rest'}`}>
          <div className="flex w-full flex-wrap items-center gap-24">
            <TurnedLens sound={sound} taken={taken} onZoom={setZoom} />
            <div className="flex flex-col items-start gap-16">
              <Button onClick={() => setTaken(true)} disabled={taken}>Take</Button>
              <label className="flex items-center gap-12 type-ui text-ink">
                <Switch aria-label="Sound" checked={soundOn} onCheckedChange={async (n) => { if (n) await sound.enable(); else sound.disable(); setSoundOn(n); }} />Sound
              </label>
            </div>
          </div>
        </Bench>
      </Section>
      <Section title="States" lede="Ready, the glass is faintly lit; taken, it flashes. On the web and by MetalGadget in SwiftUI from the same JSON.">
        <Bench caption="rest · taken">
          <div className="flex flex-wrap items-end gap-20" data-testid="lens-states">
            {[{ label: 'rest' }, { label: 'taken', state: 'taken' }].map((l) => (
              <figure key={l.label} className="m-0 flex flex-col items-center gap-6"><Gadget spec={SPEC} state={l.state} size={128} /><figcaption className="type-label engraved">{l.label}</figcaption></figure>
            ))}
          </div>
        </Bench>
        <SwiftCapture name="gadget-shutter-lens" maxWidth={760} />
      </Section>
      <Section title="Detail by size">
        <Bench caption="160 · 96 · 64 · 32 px">
          <div className="flex flex-wrap items-end gap-20" data-testid="lens-tiers">
            {[160, 96, 64, 32].map((s) => <figure key={s} className="m-0 flex flex-col items-center gap-6"><Gadget spec={SPEC} size={s} /><figcaption className="type-readout text-ink3">{s} px</figcaption></figure>)}
          </div>
        </Bench>
      </Section>
      <Section title="Without a browser">
        <Bench caption="renderGadgetSvg(spec, { size: 96, state: 'taken' })">
          <div data-testid="lens-static" dangerouslySetInnerHTML={{ __html: still }} />
        </Bench>
      </Section>
      <Section title="Rules">
        <Rules
          rules={[
            { id: 'G1', title: 'A click, not a beep', body: 'A capture is the ring clicking round and the glass flashing. It needs no earcon.' },
            { id: 'G2', title: 'The ring is the accent', body: 'The ring is what a hand turns; it wears the accent. The bezel stays the job’s own warm clay.' },
            { id: 'G3', title: 'Zoom is an angle', body: 'The ring’s angle is a value (zoom); taking a picture never changes it.' },
          ]}
        />
      </Section>
      <Section title="The spec">
        <Code code={JSON.stringify(SPEC, null, 2)} label="shutter-lens.gadget.json" lang="json" />
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
