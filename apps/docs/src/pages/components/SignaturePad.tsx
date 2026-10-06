import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Button, Card, Form, FormField, SignaturePad, signatureToImage, type Signature, type SignatureSizing } from '@unlocalhosted/metalui';
import reactSource from '../../../../../packages/metalui/src/components/signature-pad/signature-pad.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalSignaturePad.swift?raw';
import agentSource from '../../../../../packages/metalui/src/components/signature-pad/signature-pad.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * SIGNATURE PAD PAGE · where a signature is asked for
 *
 *   form       a delivery form: the pad is required; sending it empty shows the error and puts
 *              focus on Type instead; sent, it says what the form posted (SVG, its size)
 *   agreement  a card of terms with initials per clause (compact) and a signature
 *   typed      the keyboard path: a pad that opens on Type instead
 *   proof      read-only: a delivery's signature on its record, and a PNG of it
 *   states     disabled
 *   tune       DialKit: min and max width, the speed for the thinnest ink, sizing
 * ───────────────────────────────────────────────────────── */

const kb = (s: string) => `${(new Blob([s]).size / 1024).toFixed(1)} KB`;

function DeliveryForm() {
  const [sent, setSent] = React.useState<string | null>(null);
  return (
    <Form className="w-full max-w-[440px]" onFormSubmit={(values) => setSent(String(values.signature ?? ''))}>
      <FormField name="signature">
        <FormField.Label>Signature</FormField.Label>
        <SignaturePad required aria-label="Signature" onValueChange={() => setSent(null)} />
        <FormField.Description>Sign with a mouse, finger or pen, or type your name.</FormField.Description>
        <FormField.Error match="valueMissing">Sign, or type your name.</FormField.Error>
      </FormField>
      <div className="flex items-center gap-12">
        <Button type="submit" cap="primary">Confirm delivery</Button>
        {sent && <span data-testid="sent" className="type-meta text-ink3">Sent: SVG, {kb(sent)}</span>}
      </div>
    </Form>
  );
}

const CLAUSES = [
  { id: 'a', text: 'The parcel arrived sealed.' },
  { id: 'b', text: 'Nothing was missing from the list.' },
];

function Agreement() {
  const [initials, setInitials] = React.useState<Record<string, boolean>>({});
  const [signed, setSigned] = React.useState(false);
  const done = CLAUSES.every((c) => initials[c.id]) && signed;
  return (
    <Card className="w-full max-w-[520px]">
      <Card.Title>Receipt of goods</Card.Title>
      <Card.Description>Order 4417 · 3 boxes · delivered Tue 6 Oct</Card.Description>
      <div className="grid gap-16">
        {CLAUSES.map((c) => (
          <div key={c.id} className="grid grid-cols-[1fr_160px] items-start gap-16">
            <p className="m-0 pt-8 type-body text-ink">{c.text}</p>
            <SignaturePad size="compact" hint="Initials" aria-label={`Initials: ${c.text}`} onValueChange={(v) => setInitials((s) => ({ ...s, [c.id]: !!v }))} />
          </div>
        ))}
        <SignaturePad aria-label="Signature for the receipt" onValueChange={(v) => setSigned(!!v)} />
        <p className="m-0 type-meta text-ink3">By signing, you agree to the terms above.</p>
      </div>
      <Card.Footer>
        <Button cap="primary" disabled={!done}>Sign receipt</Button>
      </Card.Footer>
    </Card>
  );
}

// A delivery signed earlier: a few strokes in a 440 × 160 box.
const wave = (x0: number, y0: number, n: number, amp: number, len: number) => Array.from({ length: n }, (_, i): [number, number, number] => {
  const t = i / (n - 1);
  return [x0 + t * len, y0 - Math.sin(t * Math.PI * 3) * amp * (1 - t * 0.4), 1.4 + 1.8 * Math.sin(t * Math.PI)];
});
const DELIVERED: Signature = { kind: 'drawn', width: 440, height: 160, strokes: [wave(40, 100, 60, 26, 170), wave(200, 104, 50, 14, 150), [[60, 120, 1.6], [180, 116, 2.4], [330, 118, 1.4]]] };

function Proof() {
  const [png, setPng] = React.useState<string | null>(null);
  React.useEffect(() => () => { if (png) URL.revokeObjectURL(png); }, [png]);
  return (
    <div className="grid w-full max-w-[440px] gap-12">
      <SignaturePad readOnly defaultValue={DELIVERED} aria-label="Signature on delivery" />
      <div className="flex items-center gap-12">
        <Button size="compact" onClick={() => signatureToImage(DELIVERED).then((b) => setPng(URL.createObjectURL(b)))}>Make a PNG</Button>
        {png && <img src={png} alt="The delivery signature as a PNG" className="h-40 rounded-[6px] bg-white" />}
      </div>
    </div>
  );
}

const SIZINGS: SignatureSizing[] = ['auto', 'pressure', 'velocity'];

/* SIGNATURE TUNER: the page's DialKit panel. min and max bound the ink; speed is how fast (px per ms) a stroke
 * must go to thin to min; sizing picks what sets the width. A new pad on each change, so it starts empty. */
function Tuner() {
  const d = useDialKit('Signature pad', {
    min: [1.2, 0.4, 4],
    max: [3.6, 1, 10],
    speed: [2.4, 0.4, 8],
    sizing: { type: 'select', options: SIZINGS, default: 'auto' },
  });
  const vars = { '--mu-r-signature-pad-ink-velocity': d.speed } as React.CSSProperties;
  return (
    <div data-testid="signature-tuner" className="w-full max-w-[440px]" style={vars}>
      <SignaturePad minWidth={d.min} maxWidth={Math.max(d.min, d.max)} sizing={d.sizing as SignatureSizing} aria-label="Tuned signature" />
    </div>
  );
}

export default function SignaturePadPage() {
  return (
    <ComponentPage
      capture="signature-pad"
      title="Signature pad"
      lede="A form field that captures a signature. The field's well is the paper, with an engraved line to sign on; the ink is your own text's ink, follows the pen's pressure or speed, and settles smooth when you lift. Type instead is the way in for a keyboard or a screen reader."
      play={{ lede: 'Sign, then lift and watch the line settle. Undo takes back a stroke; Clear is undoable too. Confirm with the pad empty to see the form refuse it.', caption: 'a delivery form', node: <DeliveryForm /> }}
      more={[
        { id: 'agreement', title: 'On an agreement', lede: 'Initials per clause on compact pads, and the signature under the terms. The card says what signing means; the pad only captures the mark.', node: <Agreement /> },
        { id: 'typed', title: 'Type your name', lede: 'The keyboard and screen-reader path: the name sits on the baseline in ink. Switching back to drawing keeps what each mode holds.', node: <div className="w-full max-w-[440px]"><SignaturePad defaultMode="type" aria-label="Typed signature" /></div> },
        { id: 'proof', title: 'Proof of delivery', lede: 'Read-only: the mark on the paper, no keys. Exports are dark ink whatever the colorway.', node: <Proof /> },
        { id: 'states', title: 'Disabled', lede: 'At 40 %, with no ink and no keys.', node: <div className="w-full max-w-[440px]"><SignaturePad disabled aria-label="Signature, closed" /></div> },
        { id: 'tune', title: 'Tune the ink', lede: 'The Signature pad panel sets the thinnest and widest ink, the speed at which a stroke thins all the way, and what sets the width.', node: <Tuner /> },
      ]}
      usage={`<FormField name="signature">
  <FormField.Label>Signature</FormField.Label>
  <SignaturePad required onValueChange={setSignature} />
  <FormField.Error match="valueMissing">Sign, or type your name.</FormField.Error>
</FormField>
// signatureToSvg(signature) · await signatureToImage(signature, { type: 'image/png' })`}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'swift', label: 'SwiftUI', code: swiftSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'SP1', title: 'Typing is signing too', body: 'Drawing has no keyboard path, so Type instead comes first in the pad and takes focus when an empty pad is refused.', origin: 'WCAG 2.1.1' },
        { id: 'SP2', title: 'Exact, then calm', body: 'The live line is raw and under the pen; it settles only when you lift, so it never lags or moves away from your hand.', origin: 'Ours' },
        { id: 'SP3', title: 'A mark, not a verdict', body: 'The pad captures a mark. What signing means, and whether it binds, is said by the host and its record.', origin: 'Ours' },
        { id: 'SP4', title: 'Dark ink on paper', body: 'On screen the ink is the text\'s ink; exported, it is dark ink on paper whatever the colorway.', origin: 'Ours' },
      ]}
    />
  );
}
