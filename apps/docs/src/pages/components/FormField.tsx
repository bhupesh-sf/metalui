import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Button, CheckboxGroup, Combobox, Field, Fieldset, Form, FormField, NumberField, Radio, RadioGroup, Textarea } from '@unlocalhosted/metalui';
import { type SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';
import reactSource from '../../../../../packages/metalui/src/components/form-field/form-field.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
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
      <FormField name="name" validationMode="onBlur" validate={(v) => {
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
        <FormField.Label>Notes</FormField.Label>
        <Textarea minRows={2} maxLength={140} />
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

export default function FormFieldPage() {
  return (
    <ComponentPage
      title="Form field"
      lede="A control with its words: a label, a hint, and an error that says why a value is not accepted. The error comes out from under the control, so the form moves instead of jumping. Fieldsets group fields under a legend."
      play={{ lede: 'Type two letters in the name and move on, or save with the name empty.', caption: 'label · description · error · fieldset', node: <RegionForm /> }}
      more={[{ id: 'error', title: 'Tune the error', lede: 'The Form error panel swaps the springs the error opens and closes on, and stretches time. Flip it invalid and valid.', node: <ErrorTuner /> }]}
      usage={`<Form onFormSubmit={save}>
  <FormField name="name">
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
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'FF1', title: 'Every control has a visible label', body: 'Placeholder text is a hint, never the label.', origin: 'Ours' },
        { id: 'FF2', title: 'Say what to do', body: '"Give the region a name", not "Invalid".', origin: 'Ours' },
        { id: 'FF3', title: 'The form moves, it does not jump', body: 'An error grows its row open on the settle spring and pushes what is below it gently.', origin: 'Ours' },
      ]}
    />
  );
}
