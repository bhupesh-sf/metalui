import * as React from 'react';
import { Button, Segmented, Switch } from '@unlocalhosted/metalui';
import { Rig, type GadgetSpec, type RigHop, type RigSpec, type Value } from '@unlocalhosted/metalui/gadgets';
import { createSound } from '@unlocalhosted/metalui/sound';
import syncHealth from '../../../../../packages/metalui/src/gadgets/fixtures/sync-health.rig.json';
import storage from '../../../../../packages/metalui/src/gadgets/fixtures/storage.rig.json';
import capture from '../../../../../packages/metalui/src/gadgets/fixtures/capture.rig.json';
import canvasStatus from '../../../../../packages/metalui/src/gadgets/fixtures/canvas-status.rig.json';
import settings from '../../../../../packages/metalui/src/gadgets/fixtures/settings.rig.json';
import patchBay from '../../../../../packages/metalui/src/gadgets/fixtures/patch-bay.gadget.json';
import counterDrum from '../../../../../packages/metalui/src/gadgets/fixtures/counter-drum.gadget.json';
import drawer from '../../../../../packages/metalui/src/gadgets/fixtures/drawer.gadget.json';
import liddedBin from '../../../../../packages/metalui/src/gadgets/fixtures/lidded-bin.gadget.json';
import shutterLens from '../../../../../packages/metalui/src/gadgets/fixtures/shutter-lens.gadget.json';
import cellGrid from '../../../../../packages/metalui/src/gadgets/fixtures/cell-grid.gadget.json';
import scope from '../../../../../packages/metalui/src/gadgets/fixtures/scope.gadget.json';
import thumbwheel from '../../../../../packages/metalui/src/gadgets/fixtures/thumbwheel.gadget.json';
import faderBank from '../../../../../packages/metalui/src/gadgets/fixtures/fader-bank.gadget.json';
import rocker from '../../../../../packages/metalui/src/gadgets/fixtures/rocker.gadget.json';
import keycapChord from '../../../../../packages/metalui/src/gadgets/fixtures/keycap-chord.gadget.json';
import { Bench, Code, PageHeader, Rules, Section } from '../../ui/doc';

const CATALOG = Object.fromEntries([patchBay, counterDrum, drawer, liddedBin, shutterLens, cellGrid, scope, thumbwheel, faderBank, rocker, keycapChord]
  .map((g) => [g.name, g])) as unknown as Record<string, GadgetSpec>;
// ms: how long a picture shows as taken, or a find as found, before the gadget rests again.
const MOMENT = 1200;

/** The last value that travelled, said in words. */
function Log({ id, hops }: { id: string; hops: RigHop[] }) {
  const h = hops[hops.length - 1];
  return (
    <output data-testid={`${id}-log`} className="type-readout text-ink3" aria-live="polite">
      {h ? `${h.from} → ${h.to}: ${JSON.stringify(h.value)}` : 'Nothing has travelled yet.'}
    </output>
  );
}

/** A rig on a bench with its controls, its log and its spec. */
function RigBench({ id, spec, caption, values, states, sound, width, children }: {
  id: string; spec: RigSpec; caption: string; values?: Record<string, Record<string, Value>>; states?: Record<string, string>;
  sound: ReturnType<typeof createSound>; width: number; children: React.ReactNode;
}) {
  const [hops, setHops] = React.useState<RigHop[]>([]);
  return (
    <>
      <Bench caption={caption}>
        <div className="flex w-full flex-col gap-16">
          <Rig spec={spec} catalog={CATALOG} values={values} states={states} sound={sound} width={width} data-testid={id} onPropagate={(h) => setHops((l) => [...l, h])} />
          <div className="flex flex-wrap items-center gap-16">{children}<Log id={id} hops={hops} /></div>
        </div>
      </Bench>
      <Code code={JSON.stringify(spec, null, 2)} label={`${spec.name}.rig.json`} lang="json" />
    </>
  );
}

/** A state held for a moment, then back to rest: a picture taken, a find found. */
function useMoment(): [string | undefined, () => void] {
  const [on, setOn] = React.useState(false);
  React.useEffect(() => { if (!on) return; const t = window.setTimeout(() => setOn(false), MOMENT); return () => window.clearTimeout(t); }, [on]);
  return [on ? 'on' : undefined, () => setOn(true)];
}

export default function RigsPage() {
  const sound = React.useMemo(() => createSound(), []);
  const [soundOn, setSoundOn] = React.useState(false);
  const [sync, setSync] = React.useState('connected');
  const [cards, setCards] = React.useState(4);
  const [taken, take] = useMoment();
  const [firstRun, setFirstRun] = React.useState(false);
  const [found, find] = useMoment();
  const [back, setBack] = React.useState(0);
  const [soundSetting, setSoundSetting] = React.useState(false);
  return (
    <>
      <PageHeader
        title="Rigs"
        lede="Five rigs from the catalog, each wired by patch cables and each proving a kind of map on its cable: a switch selected into a number, a count stepped down, a share scaled, a pulse counted, a switch inverted. Every one is only a spec naming catalog gadgets; the renderer lays it out and the rig engine carries the values, the same on the web and in SwiftUI."
      />
      <label className="flex items-center gap-12 type-ui text-ink">
        <Switch aria-label="Sound" checked={soundOn} onCheckedChange={async (n) => { if (n) await sound.enable(); else sound.disable(); setSoundOn(n); }} />Sound
      </label>
      <Section id="sync-health" title="Sync health" lede="The patch bay's health selects a number for the gauge (select: false → 10, true → 90); each finished sync counts one off what is pending (count −1). Fail it: the plug comes out, the needle drops. Finish it: the needle rises and the pending drum rolls back a day.">
        <RigBench id="sync-rig" spec={syncHealth as unknown as RigSpec} caption={`sync-health · link · ${sync}`} values={{ sync: { state: sync } }} sound={sound} width={520}>
          <Segmented aria-label="Sync" value={sync} onValueChange={setSync} options={['connected', 'syncing', 'done', 'failed'].map((s) => ({ value: s, label: s }))} />
        </RigBench>
      </Section>
      <Section id="storage" title="Storage" lede="How full the drawer is, scaled onto the used gauge (scale: 0..1 → 0..100); past 90 the gauge is above its line and arms the bin (a switch, straight through). File cards until it is full and watch the bin lift its lid.">
        <RigBench id="storage-rig" spec={storage as unknown as RigSpec} caption={`storage · keep · ${cards} of 10 cards`} values={{ local: { fill: cards / 10 } }} sound={sound} width={720}>
          <Button onClick={() => setCards((c) => Math.min(10, c + 1))} disabled={cards >= 10}>File a card</Button>
          <Button onClick={() => setCards(0)} disabled={cards === 0}>Clear it out</Button>
        </RigBench>
      </Section>
      <Section id="capture" title="Capture" lede="Each picture taken counts one more for today (count +1), and today's count, scaled onto the cells (scale: 0..20 → 0..1), lights another cell of memory. A first run raises the whole grid.">
        <RigBench id="capture-rig" spec={capture as unknown as RigSpec} caption={`capture · take · ${taken ? 'taken' : 'ready'}`}
          states={{ take: taken ? 'taken' : 'rest', memory: firstRun ? 'first-run' : 'filling' }} sound={sound} width={720}>
          <Button onClick={take} disabled={!!taken}>Take</Button>
          <label className="flex items-center gap-12 type-ui text-ink"><Switch aria-label="First run" checked={firstRun} onCheckedChange={setFirstRun} />First run</label>
        </RigBench>
      </Section>
      <Section id="canvas-status" title="Canvas status" lede="What the scope finds is counted onto the blocks drum (a count, straight through); looking back in time turns the scope's query off (select: true → false), so it stops searching and dims.">
        <RigBench id="canvas-rig" spec={canvasStatus as unknown as RigSpec} caption={`canvas-status · find · ${back ? `${back} days back` : 'now'}`}
          states={{ find: found ? 'found' : back ? 'rest' : 'searching' }} values={{ when: { offset: -back } }} sound={sound} width={720}>
          <Button onClick={find} disabled={!!found || back > 0}>Find</Button>
          <Button onClick={() => setBack((b) => Math.min(30, b + 3))}>Look back</Button>
          <Button onClick={() => setBack(0)} disabled={back === 0}>Back to now</Button>
        </RigBench>
      </Section>
      <Section id="settings" title="Settings" lede="The rocker sets the mood of the faders: off selects a low mix, on a high one (select: false → 0.2, true → 0.8). The keycap chord sits beside them, unwired.">
        <RigBench id="settings-rig" spec={settings as unknown as RigSpec} caption={`settings · tune · sound ${soundSetting ? 'on' : 'off'}`} values={{ sound: { on: soundSetting } }} sound={sound} width={520}>
          <label className="flex items-center gap-12 type-ui text-ink"><Switch aria-label="Sound setting" checked={soundSetting} onCheckedChange={setSoundSetting} />Sound setting</label>
        </RigBench>
      </Section>
      <Section title="Rules">
        <Rules
          rules={[
            { id: 'W1', title: 'A map says how', body: 'A cable carries a value as it is, or through one map: threshold, scale, match, count or select. Nothing else changes on the way.' },
            { id: 'W2', title: 'Inputs set states', body: 'A state port sets the state; a pulse plays the gadget’s act; a switch that names no state holds its act’s state, and off, it rests.' },
            { id: 'W3', title: 'Side by side', body: 'Every pair of gadgets in a rig passes the set rules: a rig is what a person sees together.' },
          ]}
        />
      </Section>
    </>
  );
}
