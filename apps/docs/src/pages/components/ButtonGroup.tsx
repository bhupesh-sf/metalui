import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Button, ButtonGroup, ButtonGroupReadout, MenuItem, SplitButton, SwapText, Toggle, useWait, type WaitWork } from '@unlocalhosted/metalui';
import { MinusIcon, MorphIcon, PlusIcon, RedoIcon, UndoIcon, ZoomInIcon, ZoomOutIcon, type MorphIconName } from '@unlocalhosted/metalui/icons';
import { type SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';
import reactSource from '../../../../../packages/metalui/src/components/button-group/button-group.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalButtonGroup.swift?raw';
import agentSource from '../../../../../packages/metalui/src/components/button-group/button-group.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';
import { SwiftCapture } from '../../ui/SwiftCapture';

/* ─────────────────────────────────────────────────────────
 * BAR TUNER: the page's DialKit panel
 *
 *   seam    the engraved seam's width (a dark line and its light edge)
 *   window  how far the readout window sits inside the bar
 *   tip     how far a rocker tips toward the pressed end, and the spring it tips on
 * ───────────────────────────────────────────────────────── */

const ROW = 'flex flex-wrap items-center justify-center gap-24';
const STACK = 'grid justify-items-center gap-20';
const ZOOMS = [25, 50, 75, 100, 125, 150, 200, 400];

function History({ onDid, rocker }: { onDid: (s: string) => void; rocker?: boolean }) {
  return (
    <ButtonGroup aria-label="History" rocker={rocker}>
      <Button icon={<UndoIcon />} onClick={() => onDid('Undid')}>Undo</Button>
      <Button icon={<RedoIcon />} onClick={() => onDid('Redid')}>Redo</Button>
    </ButtonGroup>
  );
}

/** − 100 % +: the readout is a window, not a key; each end stops at its limit. */
function Zoom({ size }: { size?: 'compact' }) {
  const [at, setAt] = React.useState(3);
  return (
    <ButtonGroup aria-label="Zoom">
      <Button size={size} icon={<ZoomOutIcon />} aria-label="Zoom out" disabled={at === 0} onClick={() => setAt((i) => Math.max(0, i - 1))} />
      <ButtonGroupReadout>{`${ZOOMS[at]} %`}</ButtonGroupReadout>
      <Button size={size} icon={<ZoomInIcon />} aria-label="Zoom in" disabled={at === ZOOMS.length - 1} onClick={() => setAt((i) => Math.min(ZOOMS.length - 1, i + 1))} />
    </ButtonGroup>
  );
}

const FORMATS = ['PDF', 'PNG', 'SVG'] as const;
type Format = (typeof FORMATS)[number];

/** Export waits (useWait), and the format you last chose becomes the main action: its words turn on the drum. */
function Export({ onDid }: { onDid: (s: string) => void }) {
  const [format, setFormat] = React.useState<Format>('PDF');
  const [work, setWork] = React.useState<WaitWork>('idle');
  const timer = React.useRef(0);
  React.useEffect(() => () => window.clearTimeout(timer.current), []);
  const wait = useWait(work);
  const run = (f: Format) => {
    setFormat(f);
    setWork('working');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { setWork('done'); onDid(`Exported ${f}`); }, 1400);
  };
  const glyph: MorphIconName = wait.phase === 'done' ? 'check' : 'download';
  const words = wait.phase === 'shown' ? 'Exporting…' : wait.phase === 'done' ? 'Exported' : `Export ${format}`;
  return (
    <SplitButton
      menuLabel="More export options"
      heading="EXPORT AS"
      menu={(
        <>
          {FORMATS.filter((f) => f !== format).map((f) => <MenuItem key={f} onSelect={() => run(f)}>{f}</MenuItem>)}
          <MenuItem onSelect={() => onDid('Copied the link')}>Copy link</MenuItem>
        </>
      )}
    >
      <Button cap="primary" state={wait.busy ? 'waiting' : wait.phase === 'done' ? 'done' : 'ready'} icon={<MorphIcon name={glyph} />} onClick={() => run(format)}>
        <SwapText value={words} />
      </Button>
    </SplitButton>
  );
}

function Align() {
  const [align, setAlign] = React.useState(['left']);
  return (
    <ButtonGroup aria-label="Alignment" latch="one" value={align} onValueChange={(v) => v.length && setAlign(v)}>
      <Toggle value="left">Left</Toggle>
      <Toggle value="centre">Centre</Toggle>
      <Toggle value="right">Right</Toggle>
    </ButtonGroup>
  );
}

function Marks() {
  return (
    <ButtonGroup aria-label="Text marks" latch="several" defaultValue={['bold']}>
      <Toggle value="bold">Bold</Toggle>
      <Toggle value="italic">Italic</Toggle>
      <Toggle value="underline">Underline</Toggle>
    </ButtonGroup>
  );
}

function States() {
  return (
    <div className={STACK} data-testid="button-group-states">
      <div className={ROW}>
        <ButtonGroup aria-label="Clipboard">
          <Button>Cut</Button>
          <Button>Copy</Button>
          <Button disabled>Paste</Button>
        </ButtonGroup>
        <ButtonGroup aria-label="Locked history" disabled>
          <Button icon={<UndoIcon />}>Undo</Button>
          <Button icon={<RedoIcon />}>Redo</Button>
        </ButtonGroup>
      </div>
      <div className={ROW}>
        <ButtonGroup aria-label="Compact history">
          <Button size="compact" icon={<UndoIcon />}>Undo</Button>
          <Button size="compact" icon={<RedoIcon />}>Redo</Button>
        </ButtonGroup>
        <Zoom size="compact" />
        <SplitButton menuLabel="More share options" menu={<><MenuItem>Copy link</MenuItem><MenuItem>Email</MenuItem></>}>
          <Button>Share</Button>
        </SplitButton>
      </div>
    </div>
  );
}

function BarTuner() {
  const d = useDialKit('Button bar', {
    seam: [2, 1, 4],
    window: [4, 2, 8],
    tip: [1, 0, 4],
    spring: { type: 'select', options: SPRING_NAMES, default: 'part' },
  });
  const vars = {
    ...springVars('part', d.spring as SpringName),
    '--mu-r-button-group-seam-width': `${d.seam}px`,
    '--mu-r-button-group-window-inset': `${d.window}px`,
    '--mu-r-button-group-rocker-tip': `${d.tip}deg`,
  } as React.CSSProperties;
  return (
    <div data-testid="button-bar-tuner" className={STACK} style={{ ...vars, zoom: 1.4 }}>
      <History onDid={() => {}} rocker />
      <Zoom />
    </div>
  );
}

export default function ButtonGroupPage() {
  const [did, setDid] = React.useState<string | null>(null);
  return (
    <ComponentPage
      title="Button group"
      lede="Related actions as one machined bar: a single raised cap, its keys cut apart by engraved seams. Press a key and only that key sinks; the seams and the rest of the bar stay put. A split button is the main action and a chevron behind a seam, in one material."
      play={{
        lede: 'Press the keys, step the zoom, or export and open the chevron.',
        caption: did ?? 'history · zoom · split export',
        node: (
          <div className={STACK}>
            <History onDid={setDid} />
            <Zoom />
            <Export onDid={setDid} />
          </div>
        ),
      }}
      more={[
        { id: 'states', title: 'Every state', lede: 'Hover lifts one key\'s light; a disabled key fades alone, and a disabled bar fades whole. Compact keys make a compact bar, and the bar takes the keys\' material.', node: <States /> },
        { id: 'readout', title: 'Readouts are windows', lede: 'A value between steppers is a sunk window cut into the bar, in tabular figures, turning on the drum. It can\'t be pressed; each stepper stops at its limit.', node: <div className={ROW}><Zoom /></div> },
        { id: 'rocker', title: 'A pair as a rocker', lede: 'Undo and Redo, or − and +, as one cap with a seam in the middle: press an end and the whole cap tips toward it on the part spring.', node: (
          <div className={ROW} data-testid="button-group-rocker">
            <History onDid={setDid} rocker />
            <ButtonGroup aria-label="Size" rocker>
              <Button icon={<MinusIcon />} aria-label="Smaller" />
              <Button icon={<PlusIcon />} aria-label="Larger" />
            </ButtonGroup>
          </div>
        ) },
        { id: 'split', title: 'Split button', lede: 'One bar in the main action\'s material. While the menu is open the chevron key stays down and the chevron turns over; the format you choose becomes the main action, and export waits in the key.', node: <div className={ROW}><Export onDid={setDid} /></div> },
        { id: 'latched', title: 'Latched keys', lede: 'Toggles in the bar (latch): a latched key stays sunk with its lamp lit. One at a time for alignment, any number for marks.', node: <div className={ROW} data-testid="button-group-latched"><Align /><Marks /></div> },
        { id: 'swift', title: 'SwiftUI', lede: 'MetalButtonGroup draws the same bar, seams, window and pressed keys from the same recipe; MetalSplitButton holds its chevron down while the menu is open.', node: <SwiftCapture name="button-group" maxWidth={560} /> },
        { id: 'tune', title: 'Tune the bar', lede: 'The Button bar panel sets the seam, the window\'s inset, and how far and on which spring a rocker tips.', node: <BarTuner /> },
      ]}
      usage={`<ButtonGroup aria-label="History">
  <Button icon={<UndoIcon />} onClick={undo}>Undo</Button>
  <Button icon={<RedoIcon />} onClick={redo}>Redo</Button>
</ButtonGroup>

<ButtonGroup aria-label="Zoom">
  <Button icon={<ZoomOutIcon />} aria-label="Zoom out" onClick={out} />
  <ButtonGroupReadout>{\`\${zoom} %\`}</ButtonGroupReadout>
  <Button icon={<ZoomInIcon />} aria-label="Zoom in" onClick={zoomIn} />
</ButtonGroup>

<ButtonGroup aria-label="Alignment" latch="one" value={align} onValueChange={setAlign}>
  <Toggle value="left">Left</Toggle>
  <Toggle value="right">Right</Toggle>
</ButtonGroup>

<SplitButton menuLabel="More export options" menu={
  <>
    <MenuItem onSelect={exportPng}>PNG</MenuItem>
    <MenuItem onSelect={exportSvg}>SVG</MenuItem>
  </>
}>
  <Button cap="primary" icon={<DownloadIcon />} onClick={exportPdf}>Export PDF</Button>
</SplitButton>`}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'swift', label: 'SwiftUI', code: swiftSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'BG1', title: 'One bar, separate keys', body: 'The bar is one part; a key sinks alone and the seams never move.', origin: 'Ours' },
        { id: 'BG2', title: 'Readouts are windows', body: 'A value in the bar is a sunk window, never a key that can\'t be pressed.', origin: 'Ours' },
        { id: 'BG3', title: 'Actions, or latches', body: 'A plain bar runs actions; a choice that stays is a latched bar of Toggles.', origin: 'Ours' },
        { id: 'BG4', title: 'The main action first', body: 'A split button leads with what most people want; the chevron holds the rest, and a choice that becomes the main action turns its words on the drum.', origin: 'Ours' },
      ]}
    />
  );
}
