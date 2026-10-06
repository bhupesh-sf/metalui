import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Field, FormField, Stepper, Switch, Switcher, type StepperStep } from '@unlocalhosted/metalui';
import { type SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';
import reactSource from '../../../../../packages/metalui/src/components/stepper/stepper.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalStepper.swift?raw';
import agentSource from '../../../../../packages/metalui/src/components/stepper/stepper.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * STEPPER PAGE · a wizard's steps, where they are used
 *
 *   checkout  four steps with panels: Shipping refuses Continue until it has an address (the step
 *             rings and says why); Payment waits (the step's ring and the key agree); Review lets
 *             you jump back, and what you typed is still there
 *   inline    a dialog-sized header, titles beside their indicators
 *   vertical  a setup whose panels open in the list, under their step
 *   states    done, a problem, current, not reached yet, unavailable
 *   narrow    the checkout in a phone-width column: one line under the row
 *   tune      DialKit: the thumb's and the groove's springs, time stretched; flip error, waiting, linear
 * ───────────────────────────────────────────────────────── */

const ROW = 'flex items-center justify-between gap-12';

function Checkout({ label = 'Checkout steps' }: { label?: string }) {
  const [value, setValue] = React.useState(0);
  const [address, setAddress] = React.useState('');
  const [missing, setMissing] = React.useState(false);
  const [paying, setPaying] = React.useState(false);
  const [placed, setPlaced] = React.useState(false);
  const timer = React.useRef(0);
  React.useEffect(() => () => window.clearTimeout(timer.current), []);
  const steps: StepperStep[] = [
    { title: 'Cart', description: '3 prints' },
    { title: 'Shipping', description: address ? address : 'Where to send them', error: missing ? 'Add an address' : undefined },
    { title: 'Payment', description: 'Card ending 4242', waiting: paying },
    { title: 'Review', complete: placed },
  ];
  const next = (e: React.MouseEvent) => {
    if (value === 1 && !address.trim()) { e.preventDefault(); setMissing(true); return; }
    if (value === 2) {
      e.preventDefault();
      setPaying(true);
      timer.current = window.setTimeout(() => { setPaying(false); setValue(3); }, 1600);
    }
    if (value === 3) setPlaced(true);
  };
  return (
    <Stepper steps={steps} value={value} onValueChange={setValue} className="w-full max-w-[560px]">
      <Stepper.List aria-label={label} />
      <div className="min-h-[96px] px-6">
        <Stepper.Panel index={0}>
          <ul className="m-0 grid list-none gap-6 p-0 type-ui text-ink">
            <li className={ROW}><span>Tram 28, Alfama</span><span className="type-meta tabular-nums text-ink2">€24</span></li>
            <li className={ROW}><span>Tiles, Rua da Rosa</span><span className="type-meta tabular-nums text-ink2">€18</span></li>
            <li className={ROW}><span>River light</span><span className="type-meta tabular-nums text-ink2">€18</span></li>
          </ul>
        </Stepper.Panel>
        <Stepper.Panel index={1}>
          <FormField invalid={missing}>
            <FormField.Label>Address</FormField.Label>
            <Field size="regular"><Field.Input value={address} placeholder="Rua da Rosa 12, Lisbon" onChange={(e) => { setAddress(e.target.value); setMissing(false); }} /></Field>
            <FormField.Error match={missing}>Add an address, so the prints can find you.</FormField.Error>
          </FormField>
        </Stepper.Panel>
        <Stepper.Panel index={2}>
          <FormField>
            <FormField.Label>Name on card</FormField.Label>
            <Field size="regular"><Field.Input defaultValue="Ana Duarte" /></Field>
          </FormField>
        </Stepper.Panel>
        <Stepper.Panel index={3}>
          <p className="m-0 type-ui text-ink">{placed ? 'Order placed. The prints leave Lisbon on Monday.' : `3 prints to ${address || '…'}, €60. Press a step to change it.`}</p>
        </Stepper.Panel>
      </div>
      <div className="flex justify-between gap-8 px-6">
        <Stepper.Back disabled={paying} />
        <Stepper.Next finish={placed ? 'Placed' : 'Place order'} state={paying ? 'waiting' : placed ? 'done' : 'ready'} onClick={next} />
      </div>
    </Stepper>
  );
}

function NewRegion() {
  return (
    <Stepper steps={[{ title: 'Name' }, { title: 'Place' }, { title: 'Share' }]} className="w-full max-w-[440px]">
      <Stepper.List aria-label="New region steps" layout="inline" />
      <div className="px-6">
        <Stepper.Panel index={0}><Field size="regular"><Field.Input aria-label="Region name" defaultValue="Alfama sketches" /></Field></Stepper.Panel>
        <Stepper.Panel index={1}><Switcher aria-label="Where it goes" defaultValue="canvas" options={[{ value: 'canvas', label: 'On the canvas' }, { value: 'board', label: 'On a board' }]} /></Stepper.Panel>
        <Stepper.Panel index={2}><Switch label="Anyone with the link can view" defaultChecked /></Stepper.Panel>
      </div>
      <div className="flex justify-end gap-8 px-6"><Stepper.Back /><Stepper.Next finish="Create" /></div>
    </Stepper>
  );
}

function SyncSetup() {
  const keys = <div className="flex gap-8 pt-12"><Stepper.Back size="compact" /><Stepper.Next size="compact" finish="Start syncing" /></div>;
  return (
    <Stepper orientation="vertical" className="w-full max-w-[420px]" steps={[
      { title: 'Sign in', description: 'ana@example.com' },
      { title: 'This device', description: 'Name it for the others' },
      { title: 'Folders', description: 'What to keep in step' },
    ]}>
      <Stepper.List aria-label="Sync setup steps">
        <Stepper.Panel index={0}><p className="m-0 type-ui text-ink2">Signed in with the account that owns the canvas.</p>{keys}</Stepper.Panel>
        <Stepper.Panel index={1}><Field size="regular"><Field.Input aria-label="Device name" defaultValue="Ana's studio Mac" /></Field>{keys}</Stepper.Panel>
        <Stepper.Panel index={2}><div className="grid gap-8"><Switch label="Canvases" defaultChecked /><Switch label="Boards" /></div>{keys}</Stepper.Panel>
      </Stepper.List>
    </Stepper>
  );
}

const STATES: StepperStep[] = [
  { title: 'Account', description: 'Done' },
  { title: 'Profile', error: 'Add a photo' },
  { title: 'Plan', description: 'You are here' },
  { title: 'Import', description: 'Not reached yet' },
  { title: 'Invite', description: 'Owners only', disabled: true },
];

/* STEPPER TUNER: the page's DialKit panel. thumb, fill and drain swap the springs; slow stretches every
 * duration; error, waiting and linear flip the second and third steps and the reach rule. */
function Tuner() {
  const d = useDialKit('Stepper', {
    thumb: { type: 'select', options: SPRING_NAMES, default: 'part' },
    fill: { type: 'select', options: SPRING_NAMES, default: 'settle' },
    drain: { type: 'select', options: SPRING_NAMES, default: 'release' },
    slow: [1, 1, 10],
    layout: { type: 'select', options: ['stacked', 'inline', 'vertical'], default: 'stacked' },
    error: false,
    waiting: false,
    linear: true,
  });
  const vars = {
    ...springVars('part', d.thumb as SpringName, d.slow),
    ...springVars('settle', d.fill as SpringName, d.slow),
    ...springVars('release', d.drain as SpringName, d.slow),
  } as React.CSSProperties;
  const steps: StepperStep[] = [
    { title: 'Upload' },
    { title: 'Crop', error: d.error ? 'Pick an area' : undefined },
    { title: 'Caption', waiting: d.waiting },
    { title: 'Publish' },
  ];
  const vertical = d.layout === 'vertical';
  return (
    <div data-testid="stepper-tuner" className="flex w-full justify-center" style={vars}>
      <Stepper steps={steps} linear={d.linear} orientation={vertical ? 'vertical' : 'horizontal'} className="w-full max-w-[520px]">
        <Stepper.List aria-label="Publishing steps" layout={vertical ? 'stacked' : d.layout as 'stacked' | 'inline'} />
        <div className="flex justify-between gap-8 px-6"><Stepper.Back /><Stepper.Next finish="Publish" /></div>
      </Stepper>
    </div>
  );
}

export default function StepperPage() {
  return (
    <ComponentPage
      capture="stepper"
      title="Stepper"
      lede="The steps of a wizard: where you are, what's done, what's left, which step has a problem and which one waits. Going back keeps what you typed; the thumb glides to the step you're on."
      play={{ lede: 'Continue to Shipping and press Continue with no address; then Payment waits. Press a step you have reached to go back.', caption: 'a checkout', wide: true, node: <div className="flex w-full justify-center"><Checkout /></div> }}
      more={[
        { id: 'inline', title: 'Inline, in a dialog', lede: 'layout="inline" puts each title beside its indicator, for a dialog\'s header or a short flow.', node: <div className="flex w-full justify-center"><NewRegion /></div> },
        { id: 'vertical', title: 'Vertical, panels in the list', lede: 'orientation="vertical" stands the groove up; Stepper.Panels placed in the list open under their step, and the groove runs beside them.', node: <div className="flex w-full justify-center"><SyncSetup /></div> },
        { id: 'states', title: 'Every state', lede: 'Done (the checkbox\'s on look), a problem (the invalid ring and its words), current (the thumb), not reached yet (text, not a button), unavailable (40 %).', node: <div className="flex w-full justify-center"><Stepper steps={STATES} defaultValue={2} className="w-full max-w-[640px]"><Stepper.List aria-label="Account steps" /></Stepper></div> },
        { id: 'narrow', title: 'Out of width', lede: 'Under 480 px the titles stay for readers only and one line under the row says where you are; it turns on the drum.', node: <div className="flex w-full justify-center"><div className="w-full max-w-[340px]"><Checkout label="Narrow checkout steps" /></div></div> },
        { id: 'tune', title: 'Tune the steps', lede: 'The Stepper panel swaps the thumb\'s and the groove\'s springs, stretches time, flips a problem and a wait, and frees the order.', node: <Tuner /> },
      ]}
      usage={`<Stepper steps={[{ title: 'Cart' }, { title: 'Shipping', error }, { title: 'Payment', waiting }]}>
  <Stepper.List aria-label="Checkout steps" />
  <Stepper.Panel index={0}>…</Stepper.Panel>
  <Stepper.Panel index={1}>…</Stepper.Panel>
  <Stepper.Panel index={2}>…</Stepper.Panel>
  <Stepper.Back />
  <Stepper.Next finish="Place order" onClick={(e) => { if (!valid) e.preventDefault(); }} />
</Stepper>`}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'swift', label: 'SwiftUI', code: swiftSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'ST1', title: 'Back keeps everything', body: 'Panels stay mounted while hidden, so going back and forward never loses what was typed.', origin: 'Ours' },
        { id: 'ST2', title: 'A problem has words', body: 'An invalid step rings its indicator and says why under its title; colour never says it alone.', origin: 'Ours' },
        { id: 'ST3', title: 'Steps are not tabs', body: 'An ordered list with aria-current="step": steps you can\'t reach yet are not buttons, and arrow keys never skip ahead.', origin: 'USWDS' },
      ]}
    />
  );
}
