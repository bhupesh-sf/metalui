import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Button, Form, FormField, PhoneInput, type PhoneCountry, type PhoneDetails } from '@unlocalhosted/metalui';
import reactSource from '../../../../../packages/metalui/src/components/phone-input/phone-input.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalPhoneInput.swift?raw';
import agentSource from '../../../../../packages/metalui/src/components/phone-input/phone-input.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * PHONE INPUT PAGE
 *
 *   playground   a phone number in a form field, its value and details under it; the Phone input
 *                panel (DialKit) sets the default country, the size, disabled and invalid
 *   paste        numbers in the formats people copy them in; the country follows
 *   only         a service in a few countries, with Recent
 *   rules        a market's own rules through `countries`
 *   form         the E.164 value sent with a form; too short is refused on leaving
 * Names come from en-GB on every section, so the page reads the same everywhere.
 * ───────────────────────────────────────────────────────── */

const Readout = ({ children }: { children: React.ReactNode }) => <span className="type-meta text-ink3">{children}</span>;
const said = (value: string | null, d?: PhoneDetails) => `value=${value ? `"${value}"` : 'null'}${d ? ` · ${d.country}${d.kind ? ` · ${d.kind}` : ''}` : ''}`;

function Playground() {
  const d = useDialKit('Phone input', {
    country: { type: 'select', options: ['GB', 'US', 'FR', 'DE', 'IN', 'JP', 'BR'], default: 'GB' },
    size: { type: 'select', options: ['large', 'regular', 'compact'], default: 'regular' },
    disabled: false,
    invalid: false,
  });
  const [value, setValue] = React.useState<string | null>('+447700900123');
  const [details, setDetails] = React.useState<PhoneDetails>();
  // A new default country starts a new, empty field.
  const [country, setCountry] = React.useState(d.country);
  if (country !== d.country) { setCountry(d.country); setValue(null); setDetails(undefined); }
  return (
    <div className="grid w-[300px] gap-12">
      <FormField>
        <FormField.Label>Phone</FormField.Label>
        {/* A new default country is a new field: the key changes only when the person (or a number) changes it. */}
        <PhoneInput
          key={d.country}
          value={value}
          onValueChange={(v, det) => { setValue(v); setDetails(det); }}
          defaultCountry={d.country}
          locale="en-GB"
          size={d.size as 'large' | 'regular' | 'compact'}
          disabled={d.disabled}
          invalid={d.invalid}
        />
        <FormField.Error match="customError" />
      </FormField>
      <Readout>{said(value, details)}</Readout>
    </div>
  );
}

const PASTES = ['+44 (0)7700 900123', '0044 20 7946 0958', '+1 416-555-0132', '+33 6 12 34 56 78', '+7 701 234 5678', '+81 90-1234-5678'];

function Paste() {
  const [value, setValue] = React.useState<string | null>(null);
  const [details, setDetails] = React.useState<PhoneDetails>();
  return (
    <div data-testid="phone-paste" className="grid w-[320px] gap-12">
      <FormField>
        <FormField.Label>Paste a number</FormField.Label>
        <PhoneInput defaultCountry="US" locale="en-GB" onValueChange={(v, d) => { setValue(v); setDetails(d); }} />
        <FormField.Error match="customError" />
      </FormField>
      <ul className="m-0 grid list-none gap-4 p-0">
        {PASTES.map((p) => <li key={p}><code className="type-readout text-ink2 select-all">{p}</code></li>)}
      </ul>
      <Readout>{said(value, details)}</Readout>
    </div>
  );
}

const EU = ['PT', 'ES', 'FR', 'DE', 'IT', 'NL', 'BE', 'IE', 'AT', 'SE', 'DK', 'FI', 'PL'];

function Only() {
  return (
    <div data-testid="phone-only" className="grid w-[300px] gap-12">
      <FormField>
        <FormField.Label>Delivery phone</FormField.Label>
        <PhoneInput only={EU} recent={['PT', 'ES']} defaultCountry="PT" locale="en-GB" />
        <FormField.Description>We deliver in the EU only.</FormField.Description>
        <FormField.Error match="customError" />
      </FormField>
    </div>
  );
}

// Iceland in our table has a dial code only; a host that serves it gives it its grouping and length.
const ICELAND: PhoneCountry[] = [{ code: 'IS', dial: '354', trunk: '', length: [7, 7], mobile: ['6', '7', '8'], formats: [['', '### ####']] }];

function Rules() {
  const [details, setDetails] = React.useState<PhoneDetails>();
  return (
    <div data-testid="phone-rules" className="grid w-[300px] gap-12">
      <FormField>
        <FormField.Label>Reykjavík office</FormField.Label>
        <PhoneInput countries={ICELAND} defaultCountry="IS" locale="en-GB" onValueChange={(_, d) => setDetails(d)} />
        <FormField.Error match="customError" />
      </FormField>
      <Readout>{details ? `${details.country} · ${details.valid ? 'complete' : 'incomplete'}` : 'type 7 digits: “611 2345”'}</Readout>
    </div>
  );
}

function InAForm() {
  const [sent, setSent] = React.useState<string>();
  return (
    <Form className="w-full max-w-[320px]" onSubmit={(e) => { e.preventDefault(); setSent(`phone=${new FormData(e.currentTarget).get('phone')}`); }}>
      <FormField>
        <FormField.Label>Phone for the courier</FormField.Label>
        <PhoneInput name="phone" required defaultCountry="GB" locale="en-GB" />
        <FormField.Error match="valueMissing">Add a number the courier can call.</FormField.Error>
        <FormField.Error match="customError" />
      </FormField>
      <div className="flex items-center gap-12">
        <Button type="submit" cap="primary">Save</Button>
        {sent && <Readout>{sent}</Readout>}
      </div>
    </Form>
  );
}

export default function PhoneInputPage() {
  return (
    <ComponentPage
      title="Phone input"
      lede="A phone number the way you'd say it, with its country. The digits group as you type and the caret stays where you put it; paste a number in any format and the country follows. The value is E.164, once the number is whole."
      play={{
        lede: 'Type “07700 900123”, or “+33612345678”, or paste one. Choose a country with the key: search by name, “+44” or “gb”. Leave it short to see the message. The Phone input panel sets the default country, the size, disabled and invalid.',
        caption: 'en-GB names · E.164 value',
        node: <div className="flex min-h-[260px] items-start justify-center pt-16"><Playground /></div>,
      }}
      capture="phone-input"
      more={[
        { id: 'paste', title: 'Paste any format', lede: 'Copy one of these into the field (it starts in the US). The code moves into the engraved prefix, “(0)” and “00” go, and shared codes go by area: +1 416 is Canada, +7 701 Kazakhstan.', node: <div className="flex w-full justify-center"><Paste /></div> },
        { id: 'only', title: 'Only some countries', lede: 'only lists just those countries and refuses a number from elsewhere in words; recent puts the likely ones first.', node: <div className="flex min-h-[200px] w-full justify-center"><Only /></div> },
        { id: 'rules', title: 'A market’s own rules', lede: 'Our table knows every dial code and the rules of 52 countries. countries adds the rest, or corrects ours: a trunk prefix, the length, mobile leads and the grouping.', node: <div className="flex w-full justify-center"><Rules /></div> },
        { id: 'form', title: 'In a form', lede: 'name sends the E.164 value; required and the length check reach FormField.Error through the input’s validity, on leaving or on submit.', node: <div className="flex w-full justify-center"><InAForm /></div> },
      ]}
      usage={`const [phone, setPhone] = React.useState<string | null>(null);

<FormField>
  <FormField.Label>Phone</FormField.Label>
  <PhoneInput value={phone} onValueChange={setPhone} defaultCountry="GB" name="phone" required />
  <FormField.Error />
</FormField>`}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'swift', label: 'SwiftUI', code: swiftSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'PH1', title: 'The caret is kept by digits', body: 'A regroup never moves the caret: it sits after the same digits it followed, and Backspace beside a space takes the digit beyond it.', origin: 'Ours, after libphonenumber’s as-you-type' },
        { id: 'PH2', title: 'The number decides the country', body: 'A pasted or typed “+” code moves the country; area codes split shared codes. The key is for when there is no code.', origin: 'Ours' },
        { id: 'PH3', title: 'A value you can dial, or nothing', body: 'E.164 once complete, null before; the reason is said in words when you leave.', origin: 'Ours' },
        { id: 'PH4', title: 'Lengths, not number plans', body: 'The field catches typos; reaching the phone is the server’s check. No 200 KB of metadata in a form.', origin: 'Ours' },
      ]}
    />
  );
}
