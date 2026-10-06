import * as React from 'react';
import { useDialKit } from 'dialkit';
import { DotDisplay, useDotTick, Well, type DotColour, type DotInk } from '@unlocalhosted/metalui';
import source from '../../../../../packages/metalui/src/components/dot-display/dot-display.tsx?raw';
import agentGuide from '../../../../../packages/metalui/src/components/dot-display/dot-display.agent.md?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalDotDisplay.swift?raw';
import { Bench, PageHeader, Rules, Section, SourceTabs } from '../../ui/doc';
import { UsageSection } from '../../ui/Usage';
import { SwiftCapture } from '../../ui/SwiftCapture';

const COLOURS: DotColour[] = ['hz', 'hill', 'sun', 'moon', 'star', 'cloud', 'cloud-dark', 'rain', 'snow'];
const wrap = (v: number, n: number) => ((v % n) + n) % n;

/** One colour as a 3 × 3 block with its unlit neighbours. */
function Ink({ colour }: { colour: DotColour }) {
  const dots = React.useMemo(() => Array.from({ length: 25 }, (_, i) => (i % 5 > 0 && i % 5 < 4 && i > 4 && i < 20 ? 1 : 0)), []);
  return (
    <figure className="m-0 flex flex-col items-center gap-6" data-colour={colour}>
      <Well variant="field" radius="row" className="overflow-hidden"><DotDisplay cols={5} rows={5} dots={dots} inks={['off', colour]} /></Well>
      <figcaption className="type-label engraved">{colour}</figcaption>
    </figure>
  );
}

const SCENE_INKS: DotInk[] = ['off', 'hz', 'hill', 'sun', ['sun', 0.32], 'rain', 'cloud-dark'];
const [, HZ, HILL, SUN, GLOW, RAIN, CLOUD] = SCENE_INKS.map((_, i) => i);

/** A small sky on the clock: a cloud drifts, rain falls from it, the sun sits low in a glow. */
function scene(cols: number, rows: number, tick: number) {
  const dots = new Uint8Array(cols * rows);
  const hz = rows - 1;
  const put = (x: number, y: number, ink: number) => { if (x >= 0 && x < cols && y >= 0 && y < rows) dots[y * cols + x] = ink; };
  for (let y = hz - 2; y < hz; y++) for (let x = 0; x < cols; x++) if ((x + y) % 2 === 0) put(x, y, GLOW);
  for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) if (dx * dx + dy * dy <= 5) put(4 + dx, hz - 4 + dy, SUN);
  const cx = wrap(Math.floor(tick / 2), cols + 12) - 6, cy = 3;
  for (let x = cx; x < cx + 6; x += 2) for (let y = cy + 2; y < hz; y++) if (wrap(y - tick + x * 3, 4) === 0) put(x, y, RAIN);
  for (let x = cx - 1; x <= cx + 5; x++) put(x, cy + 1, CLOUD);
  for (let x = cx; x <= cx + 4; x++) put(x, cy, CLOUD);
  for (let x = cx + 1; x <= cx + 2; x++) put(x, cy - 1, CLOUD);
  for (let x = 0; x < cols; x++) {
    const h = Math.max(0, Math.round(2 - Math.abs(x - cols * 0.75) / 2));
    for (let y = hz - h; y < hz; y++) put(x, y, HILL);
    put(x, hz, HZ);
  }
  return dots;
}

function Scene({ running }: { running: boolean }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const tick = useDotTick(ref, running);
  const dots = React.useMemo(() => scene(21, 13, tick), [tick]);
  return (
    <div ref={ref} data-testid="dot-scene" data-tick={tick}>
      <Well variant="field" radius="region" className="overflow-hidden p-0"><DotDisplay cols={21} rows={13} dots={dots} inks={SCENE_INKS} /></Well>
    </div>
  );
}

export default function DotDisplayPage() {
  const d = useDialKit('Dot display', { running: true });
  return (
    <>
      <PageHeader
        title="Dot display"
        lede="Square dots on one pitch, printed into a well. Each dot is one of ten colours or unlit; nothing glows and nothing sits on black. It is a slow display: six steps a second, each one a whole new picture."
      />
      <Section title="Inks" lede="The px colours. Muted on bone, lifted on graphite, so the same picture reads in both finishes. A dimmer dot is a colour at an alpha, never a new colour.">
        <Bench caption="colorways px-* · pitch 8 · dot 6">
          <div className="flex flex-wrap justify-center gap-16" data-testid="dot-inks">
            {COLOURS.map((c) => <Ink key={c} colour={c} />)}
          </div>
        </Bench>
        <SwiftCapture name="dot-display" maxWidth={720} />
      </Section>
      <UsageSection
        agent={agentGuide}
        example={`// a 3 × 3 sun, row by row; ink 0 is unlit. Put it in a Well.
<DotDisplay cols={3} rows={3} dots={[0, 1, 0, 1, 1, 1, 0, 1, 0]} inks={['off', 'sun']} />`}
      />

      <Section title="On the clock" lede="The picture is drawn again from a frame number that steps every 167 ms. It holds still with reduced motion, in a hidden tab and off screen.">
        <Bench caption="21 × 13 · step 167 ms">
          <Scene running={d.running} />
        </Bench>
      </Section>
      <Section title="Rules">
        <Rules
          rules={[
            { id: 'D1', title: 'Printed, not lit', body: 'Dots sit in the colorway\'s well. No glow, no black screen, no round dots.' },
            { id: 'D2', title: 'One family', body: 'Only the px colours. A dimmer dot is an alpha of one of them.' },
            { id: 'D3', title: 'Steps, never tweens', body: 'Motion is a new picture each step. Reduced motion holds the frame it was on.' },
            { id: 'D4', title: 'Coarse on purpose', body: 'A tile is about 21 dots across and a wide sky 46. More dots make it a screen, not a display.' },
          ]}
        />
      </Section>
      <Section title="Source">
        <SourceTabs tabs={[
          { id: 'react', label: 'React', code: source },
          { id: 'swift', label: 'SwiftUI', code: swiftSource },
          { id: 'agent', label: 'Agent guide', code: agentGuide },
        ]} />
      </Section>
    </>
  );
}
