import * as React from 'react';
import { Field, SearchField } from '@unlocalhosted/metalui';
import { Icon, MorphIcon } from '@unlocalhosted/metalui/icons';
import { useDialKit } from 'dialkit';
import { type SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';
import { FieldXray } from '../../ui/xray/FieldXray';
import reactSource from '../../../../../packages/metalui/src/components/field/field.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalField.swift?raw';
import agentSource from '../../../../../packages/metalui/src/components/field/field.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

const COLUMN = 'grid w-full max-w-[320px] gap-12';

function Affixes() {
  return (
    <div className={COLUMN}>
      <Field size="regular">
        <Field.Prefix>https://</Field.Prefix>
        <Field.Input placeholder="studio" aria-label="Website" />
        <Field.Suffix>.metalui.dev</Field.Suffix>
      </Field>
      <Field size="regular">
        <Field.Prefix>$</Field.Prefix>
        <Field.Input inputMode="decimal" defaultValue="1,200" aria-label="Budget" />
        <Field.Suffix>a month</Field.Suffix>
      </Field>
      <Field size="compact" chars={6}>
        <Field.Input inputMode="decimal" defaultValue="12.5" aria-label="Weight" />
        <Field.Suffix>kg</Field.Suffix>
      </Field>
    </div>
  );
}

function Keys() {
  const [q, setQ] = React.useState('north light');
  return (
    <div className={COLUMN}>
      <Field size="regular">
        <Field.Icon><Icon name="search" /></Field.Icon>
        <Field.Input placeholder="Filter regions" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter regions" />
        <Field.Trail>
          <Field.Clear icon={<Icon name="close" />} />
          <Field.Shortcut keys="/" />
        </Field.Trail>
      </Field>
      <p className="m-0 type-meta text-ink3">Filtering by “{q}”. Press / anywhere on the page to come back to it.</p>
    </div>
  );
}

function CopyAndReveal() {
  return (
    <div className={COLUMN}>
      <Field size="regular">
        <Field.Input readOnly defaultValue="mu_live_7Hq2v9KcX4" aria-label="API key" />
        <Field.Trail><Field.Copy icon={<Icon name="copy" />} copiedIcon={<Icon name="check" />} /></Field.Trail>
      </Field>
      <Field size="regular">
        <Field.Input defaultValue="north-light-42" autoComplete="new-password" aria-label="Password" />
        <Field.Trail><Field.Reveal icon={<MorphIcon name="eye" />} hideIcon={<MorphIcon name="eye-off" />} /></Field.Trail>
      </Field>
    </div>
  );
}

/* KEY TUNER: the page's DialKit panel. in / out swap the springs a key that comes and goes rides;
 * slow stretches time; flip types into the field and clears it. */
function KeyTuner() {
  const [text, setText] = React.useState('');
  const d = useDialKit('Field keys', {
    in: { type: 'select', options: SPRING_NAMES, default: 'settle' },
    out: { type: 'select', options: SPRING_NAMES, default: 'release' },
    slow: [1, 1, 10],
    flip: { type: 'action', label: 'Text / empty' },
  }, {
    onAction: (action) => { if (action === 'flip') setText((t) => (t ? '' : 'Lisbon, May')); },
  });
  const vars = { ...springVars('settle', d.in as SpringName, d.slow), ...springVars('release', d.out as SpringName, d.slow) } as React.CSSProperties;
  return (
    <div data-testid="field-key-tuner" className={COLUMN} style={vars}>
      <Field size="regular">
        <Field.Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Trip name" aria-label="Tuned trip name" />
        <Field.Trail><Field.Clear icon={<Icon name="close" />} /></Field.Trail>
      </Field>
    </div>
  );
}

function Sizing() {
  return (
    <div className={COLUMN}>
      <Field size="regular">
        <Field.Input placeholder="Display name" maxLength={24} defaultValue="Morning pages, kitchen" aria-label="Display name" />
      </Field>
      <div className="flex flex-wrap items-center gap-12">
        <Field size="regular" chars={8}><Field.Input placeholder="SW1A 1AA" aria-label="Postcode" /></Field>
        <Field size="regular" chars={4}><Field.Input inputMode="numeric" placeholder="2026" aria-label="Year" /></Field>
        <Field size="regular" chars={3}><Field.Input inputMode="numeric" placeholder="CVC" aria-label="Card check" /></Field>
      </div>
    </div>
  );
}

export default function FieldPage() {
  const [q, setQ] = React.useState('');
  return (
    <ComponentPage
      title={"Field"}
      lede={"A shallow tray you type in, with an icon at the start and small keys at the end. The search field looks the same but is a button that opens search."}
      play={{ lede: "Press ⌘K (or Ctrl K) to reach the field: its key turns to Esc while you type, and Esc clears it, then leaves. The search field under it is a button: it opens search, it does not take text.", caption: "field · search field", node: (
          <div className="flex flex-col items-center gap-20" style={{ width: 320 }}>
            <Field style={{ width: '100%' }}>
              <Field.Icon><Icon name="search" size={15} /></Field.Icon>
              <Field.Input placeholder="Lens or action" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Lens or action" />
              <Field.Trail><Field.Clear icon={<Icon name="close" />} /><Field.Shortcut keys="⌘K" /></Field.Trail>
            </Field>
            <SearchField placeholder="Search" tone="light" icon={<Icon name="search" size={14} />} />
          </div>
        ) }}
      xray={<FieldXray />}
      capture="field"
      more={[
        { id: 'form', title: 'Form sizes and states', lede: 'In a form, the field comes in the select\'s sizes and shows the focus ring. Invalid draws the one invalid ring every form control shares; disabled dims it.', node: (
          <div className={COLUMN}>
            <Field size="regular"><Field.Input placeholder="Region name" aria-label="Region name" /></Field>
            <Field size="compact"><Field.Input placeholder="Tag" aria-label="Tag" /></Field>
            <Field size="regular" invalid><Field.Input defaultValue="Trip to" aria-label="Invalid region name" /></Field>
            <Field size="regular" disabled><Field.Input defaultValue="Locked" aria-label="Locked region name" /></Field>
          </div>
        ) },
        { id: 'affixes', title: 'Fixed parts of the value', lede: 'A prefix or suffix is part of what the value means but not part of what you type: "https://", "$", "kg". It is engraved into the tray, you cannot select it, and pressing it puts the caret at its end of the input. A screen reader hears it with the field.', node: <Affixes /> },
        { id: 'keys', title: 'Keys inside the field', lede: 'The trail holds small raised keys. Clear shows while there is text and takes it away; the shortcut key says how to come back to the field, and turns to Esc while you are in it. Pressing a key leaves the caret where it was.', node: <Keys /> },
        { id: 'copy-reveal', title: 'Copy and show password', lede: 'Copy takes the whole value; its glyph turns on the drum to a check for a moment, then back, and a screen reader hears "Copied". With a show-password key the input is a password: the key shows the text and says it is pressed, and its eye morphs shut while the text shows.', node: <CopyAndReveal /> },
        { id: 'tune', title: 'Tune the keys', lede: 'The Field keys panel swaps the springs a key pops in and leaves on, and stretches time. Flip the field between text and empty.', node: <KeyTuner /> },
        { id: 'length', title: 'How much to type', lede: 'With a limit, the counter shows near the end of it, turns red at the limit, and shakes if you type past it. chars sizes a field to what goes in it, so a postcode box looks like a postcode.', node: <Sizing /> },
      ]}
      usage={`<Field size="regular">
  <Field.Prefix>https://</Field.Prefix>
  <Field.Input aria-label="Website" maxLength={40} />
  <Field.Trail><Field.Clear icon={<Icon name="close" />} /></Field.Trail>
</Field>`}
      sources={[
        { id: 'react', label: "React", code: reactSource },
        { id: 'css', label: "CSS", code: cssSource },
        { id: 'swift', label: "SwiftUI", code: swiftSource },
        { id: 'agent', label: "Agent guide", code: agentSource },
      ]}
      rules={[
        { id: "FD1", title: "A tray says \"type here\"", body: "The field is sunk into the page, so you know it takes text before you read it.", origin: 'Ours' },
        { id: "FD2", title: "Focus you can see", body: "In a form the field shows the green ring; only the palette's large field, which always holds focus, lets the caret say it.", origin: 'Ours' },
        { id: "FD3", title: "Keys stand up inside", body: "A key inside the field is raised, so it never looks like text you could type over.", origin: 'Ours' },
        { id: "FD4", title: "Fixed parts live in the tray", body: "A prefix or suffix is engraved inside the well, never printed outside it, so a column of fields stays a column of wells.", origin: 'Geist' },
        { id: "FD5", title: "The box says how much", body: "Size a field for a short, known value with chars instead of stretching it across the form.", origin: 'HIG' },
      ]}
    />
  );
}

