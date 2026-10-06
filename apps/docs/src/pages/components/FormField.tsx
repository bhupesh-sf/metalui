import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Button, CheckboxGroup, Combobox, Field, Fieldset, Form, FormField, NumberField, Radio, RadioGroup, Textarea } from '@unlocalhosted/metalui';
import { Icon } from '@unlocalhosted/metalui/icons';
import { type SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';
import reactSource from '../../../../../packages/metalui/src/components/form-field/form-field.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalFormField.swift?raw';
import agentSource from '../../../../../packages/metalui/src/components/form-field/form-field.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * ERROR TUNER: the page's DialKit panel
 *
 *   in    the spring the error's row grows open on
 *   out   the spring it closes on
 *   flip  make the field invalid, then valid again
 * ───────────────────────────────────────────────────────── */

const CITIES = ['Amsterdam', 'Berlin', 'Lisbon', 'Paris', 'Porto', 'Rome', 'Vienna'];

function ErrorTuner() {
  const [invalid, setInvalid] = React.useState(false);
  const d = useDialKit('Form error', {
    in: { type: 'select', options: SPRING_NAMES, default: 'settle' },
    out: { type: 'select', options: SPRING_NAMES, default: 'release' },
    slow: [1, 1, 10],
    flip: { type: 'action', label: 'Invalid / valid' },
  }, {
    onAction: (action) => { if (action === 'flip') setInvalid((v) => !v); },
  });
  const vars = { ...springVars('settle', d.in as SpringName, d.slow), ...springVars('release', d.out as SpringName, d.slow) } as React.CSSProperties;
  return (
    <div data-testid="form-error-tuner" className="grid w-full max-w-[360px] gap-12" style={vars}>
      <FormField invalid={invalid}>
        <FormField.Label>Tuned name</FormField.Label>
        <Field size="regular"><Field.Input /></Field>
        <FormField.Error>Give the region a name.</FormField.Error>
      </FormField>
      <p className="m-0 type-meta text-ink3">The field below moves down as the error opens.</p>
    </div>
  );
}

function RegionForm() {
  const [sent, setSent] = React.useState(false);
  return (
    <Form className="w-full max-w-[380px]" onFormSubmit={() => setSent(true)}>
      <FormField name="name" validate={(v) => {
        const text = String(v ?? '').trim();
        return text && text.length < 3 ? 'Use at least 3 letters.' : null;
      }}>
        <FormField.Label>Region name</FormField.Label>
        <Field size="regular"><Field.Input required placeholder="Trip to Lisbon" /></Field>
        <FormField.Description>Shown on its edge and in search.</FormField.Description>
        <FormField.Error match="valueMissing">Give the region a name.</FormField.Error>
        <FormField.Error match="customError" />
      </FormField>
      <FormField name="notes">
        <FormField.Label mark="optional">Notes</FormField.Label>
        <Textarea size="regular" minRows={2} maxLength={140} />
      </FormField>
      <FormField name="city">
        <FormField.Label>City</FormField.Label>
        <Combobox items={CITIES} placeholder="Choose a city" />
      </FormField>
      <FormField name="copies">
        <NumberField label="Copies" defaultValue={1} min={1} max={9} />
      </FormField>
      <Fieldset>
        <Fieldset.Legend>Export as</Fieldset.Legend>
        <RadioGroup defaultValue="pdf" orientation="horizontal" aria-label="Export as">
          <Radio value="png">PNG</Radio>
          <Radio value="pdf">PDF</Radio>
        </RadioGroup>
      </Fieldset>
      <Fieldset>
        <Fieldset.Legend>Include</Fieldset.Legend>
        <CheckboxGroup defaultValue={['notes']} aria-label="Include">
          <CheckboxGroup.Item value="notes">Notes</CheckboxGroup.Item>
          <CheckboxGroup.Item value="photos">Photos</CheckboxGroup.Item>
        </CheckboxGroup>
      </Fieldset>
      <div className="flex items-center gap-12">
        <Button cap="primary" type="submit">Save region</Button>
        {sent && <span className="type-meta text-ink2">Saved.</span>}
      </div>
    </Form>
  );
}

/* ─────────────────────────────────────────────────────────
 * TIMING: a username checked by a (pretend) server when you leave the field
 * ───────────────────────────────────────────────────────── */

const TAKEN = ['admin', 'studio', 'metal'];
const pause = (ms: number) => new Promise((done) => setTimeout(done, ms));

function Username() {
  const [available, setAvailable] = React.useState(false);
  const check = React.useRef(0);
  return (
    <Form className="w-full max-w-[360px]">
      <FormField name="username" validate={async (v) => {
        const mine = ++check.current;
        const name = String(v ?? '').trim();
        if (!name) return null;
        if (!/^[a-z0-9-]+$/i.test(name)) return 'Use letters, digits and dashes.';
        await pause(350);
        if (TAKEN.includes(name.toLowerCase())) return `“${name}” is taken. Try another.`;
        if (mine === check.current) setAvailable(true);
        return null;
      }}>
        <FormField.Label>Username</FormField.Label>
        <Field size="regular">
          <Field.Prefix>@</Field.Prefix>
          <Field.Input placeholder="your-name" onChange={() => { check.current += 1; setAvailable(false); }} />
          <Field.Trail><Field.Check shown={available} label="Name available"><Icon name="check" act /></Field.Check></Field.Trail>
        </Field>
        <FormField.Description>Checked when you leave the field.</FormField.Description>
        <FormField.Error />
      </FormField>
    </Form>
  );
}

/* ─────────────────────────────────────────────────────────
 * BESIDE: labels in a column, in a box you can narrow by its corner
 * ───────────────────────────────────────────────────────── */

function Beside() {
  return (
    <div data-testid="beside-box" className="w-full max-w-[560px] min-w-[240px] resize-x overflow-hidden rounded-[12px] border border-dashed border-ink3/40 p-16">
      <div className="grid gap-16">
        <FormField orientation="horizontal">
          <FormField.Label>Studio name</FormField.Label>
          <Field size="regular"><Field.Input defaultValue="North light" /></Field>
        </FormField>
        <FormField orientation="horizontal">
          <FormField.Label>Email</FormField.Label>
          <Field size="regular"><Field.Input type="email" placeholder="you@studio.com" /></Field>
          <FormField.Description>Where invoices go.</FormField.Description>
        </FormField>
        <FormField orientation="horizontal">
          <FormField.Label mark="optional">About the studio</FormField.Label>
          <Textarea size="regular" minRows={2} />
        </FormField>
      </div>
    </div>
  );
}

function Marks() {
  return (
    <div className="grid w-full max-w-[640px] gap-24 sm:grid-cols-2">
      <div className="grid content-start gap-16">
        <p className="m-0 type-meta text-ink3">Most are required: mark the optional one.</p>
        <FormField><FormField.Label>Name</FormField.Label><Field size="regular"><Field.Input required /></Field></FormField>
        <FormField><FormField.Label>Email</FormField.Label><Field size="regular"><Field.Input type="email" required /></Field></FormField>
        <FormField><FormField.Label mark="optional">Phone</FormField.Label><Field size="regular"><Field.Input type="tel" /></Field></FormField>
      </div>
      <div className="grid content-start gap-16">
        <p className="m-0 type-meta text-ink3">Most are optional: mark the required one.</p>
        <FormField><FormField.Label mark="required">Display name</FormField.Label><Field size="regular"><Field.Input required /></Field></FormField>
        <FormField><FormField.Label>Pronouns</FormField.Label><Field size="regular"><Field.Input /></Field></FormField>
        <FormField><FormField.Label>Website</FormField.Label><Field size="regular"><Field.Prefix>https://</Field.Prefix><Field.Input /></Field></FormField>
      </div>
    </div>
  );
}

function Changes() {
  const [saved, setSaved] = React.useState({ name: 'North light', hours: '40' });
  const [draft, setDraft] = React.useState(saved);
  const changed = (k: keyof typeof saved) => draft[k] !== saved[k];
  const count = (Object.keys(saved) as (keyof typeof saved)[]).filter(changed).length;
  return (
    <div className="grid w-full max-w-[360px] gap-16 pl-12">
      <FormField changed={changed('name')}>
        <FormField.Label>Studio name</FormField.Label>
        <Field size="regular"><Field.Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
      </FormField>
      <FormField changed={changed('hours')}>
        <FormField.Label>Hours a week</FormField.Label>
        <Field size="regular" chars={3}><Field.Input inputMode="numeric" value={draft.hours} onChange={(e) => setDraft({ ...draft, hours: e.target.value })} /><Field.Suffix>h</Field.Suffix></Field>
      </FormField>
      <div className="flex items-center gap-8">
        <Button cap="primary" disabled={!count} onClick={() => setSaved(draft)}>Save</Button>
        <Button disabled={!count} onClick={() => setDraft(saved)}>Revert</Button>
        <span className="type-meta text-ink3">{count ? `${count} changed` : 'All saved'}</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
 * READBACK: what was understood, from words and sums
 * ───────────────────────────────────────────────────────── */

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

/** "tomorrow 8am", "fri 18:30", "today": a day and maybe a time, said back as "Tue 8 Oct, 08:00". */
function readWhen(text: string, now = new Date()) {
  const m = text.trim().toLowerCase().match(/^(today|tonight|tomorrow|(?:next\s+)?(sun|mon|tue|wed|thu|fri|sat)[a-z]*)(?:\s+(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?$/);
  if (!m) return '';
  const day = new Date(now);
  if (m[1] === 'tomorrow') day.setDate(day.getDate() + 1);
  else if (m[2]) day.setDate(day.getDate() + ((DAYS.indexOf(m[2]) - day.getDay() + 7) % 7 || 7));
  let hour = m[3] ? Number(m[3]) : m[1] === 'tonight' ? 20 : null;
  if (hour != null && m[5] === 'pm' && hour < 12) hour += 12;
  if (hour != null && m[5] === 'am' && hour === 12) hour = 0;
  const minute = Number(m[4] ?? 0);
  if (hour != null && (hour > 23 || minute > 59)) return '';
  const date = DAY.format(day).replace(',', '');
  return hour == null ? date : `${date}, ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** "12*8", "(40 - 2.5) / 3": a sum, said back as "= 96". A plain number has nothing to read back. */
function readSum(text: string) {
  const t = text.trim();
  if (!/^[\d\s.+\-*/()]+$/.test(t) || !/\d\s*[+\-*/]/.test(t)) return '';
  try {
    const n = Number(new Function(`return (${t})`)());
    return Number.isFinite(n) ? `= ${Number(n.toFixed(4)).toLocaleString('en-GB')}` : '';
  } catch {
    return '';
  }
}

function Readbacks() {
  const [when, setWhen] = React.useState('tomorrow 8am');
  const [sum, setSum] = React.useState('');
  return (
    <div className="grid w-full max-w-[360px] gap-16">
      <FormField>
        <FormField.Label>Remind me</FormField.Label>
        <Field size="regular"><Field.Icon><Icon name="calendar" /></Field.Icon><Field.Input value={when} onChange={(e) => setWhen(e.target.value)} placeholder="tomorrow 8am" /></Field>
        <FormField.Readback>{readWhen(when)}</FormField.Readback>
      </FormField>
      <FormField>
        <FormField.Label>Budget</FormField.Label>
        <Field size="regular"><Field.Prefix>$</Field.Prefix><Field.Input value={sum} onChange={(e) => setSum(e.target.value)} placeholder="12 * 8" inputMode="decimal" /></Field>
        <FormField.Readback>{readSum(sum)}</FormField.Readback>
      </FormField>
    </div>
  );
}

export default function FormFieldPage() {
  return (
    <ComponentPage
      title="Form field"
      lede="A control with its words: a label, a hint, and an error that says why a value is not accepted. The error comes out from under the control, so the form moves instead of jumping. Fieldsets group fields under a legend."
      play={{ lede: 'Type two letters in the name and move on, or save with the name empty.', caption: 'label · description · error · fieldset', node: <RegionForm /> }}
      capture="form-field"
      more={[
        { id: 'timing', title: 'Errors at the right moment', lede: 'A field checks when you leave it, or when the form is sent, and its error goes the moment you change the value: no error while you are still typing. A check that needs a server ("is this name free?") shows a tick when it passes. Try "admin", then your own name.', node: <Username /> },
        { id: 'beside', title: 'Labels beside the field', lede: 'orientation="horizontal" puts the label in a column beside the control, on its baseline. Drag the box\'s corner: when the field gets narrow, the label goes back above it.', node: <Beside /> },
        { id: 'marks', title: 'Required or optional', lede: 'Mark whichever is rarer. When most fields are required, say "Optional" on the few that are not; when most are optional, put a dot on the few that are required. Never both in one form.', node: <Marks /> },
        { id: 'changed', title: 'Changed', lede: 'A small engraved dot before the label says the value is changed since it was saved, so you can look over what you touched before you save. Change a value, then save or revert.', node: <Changes /> },
        { id: 'readback', title: 'Readback', lede: 'A line under the field says what was understood, in the readout type, turning as it changes: a date in words, a sum. Try "fri 6pm" or "40 * 1.5".', node: <Readbacks /> },
        { id: 'error', title: 'Tune the error', lede: 'The Form error panel swaps the springs the error opens and closes on, and stretches time. Flip it invalid and valid.', node: <ErrorTuner /> },
      ]}
      usage={`<Form onFormSubmit={save}>
  <FormField name="name" changed={name !== saved.name}>
    <FormField.Label>Region name</FormField.Label>
    <Field size="regular"><Field.Input required /></Field>
    <FormField.Description>Shown on its edge and in search.</FormField.Description>
    <FormField.Error match="valueMissing">Give the region a name.</FormField.Error>
  </FormField>
  <Button cap="primary" type="submit">Save</Button>
</Form>`}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'swift', label: 'SwiftUI', code: swiftSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'FF1', title: 'Every control has a visible label', body: 'Placeholder text is a hint, never the label.', origin: 'Ours' },
        { id: 'FF2', title: 'Say what to do', body: '"Give the region a name", not "Invalid".', origin: 'Ours' },
        { id: 'FF3', title: 'The form moves, it does not jump', body: 'An error grows its row open on the settle spring and pushes what is below it gently.', origin: 'Ours' },
        { id: 'FF4', title: 'Check when they leave', body: 'Never show an error on the first keystroke. Check on blur or submit, and take the error away as soon as the value changes.', origin: 'Geist' },
        { id: 'FF5', title: 'Mark the minority', body: '"Optional" when most fields are required, a dot when most are optional; never both.', origin: 'Ours' },
        { id: 'FF6', title: 'Only a server earns a tick', body: 'A valid field shows nothing. A tick is for a check the person could not see happen, like a free username.', origin: 'Ours' },
      ]}
    />
  );
}
