import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Message, Properties, Textarea, Widget, parseWidget, type WidgetAction, type WidgetActionContext } from '@unlocalhosted/metalui';
import reactSource from '../../../../../packages/metalui/src/components/widget/widget.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalWidget.swift?raw';
import agentSource from '../../../../../packages/metalui/src/components/widget/widget.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * WIDGET PAGE · interface a model sent as JSON, rendered with our components
 *
 *   play      an assistant's reply that is a booking: a date, a time, a name and Book; the action it
 *             hands the host is shown under it
 *   edit      DialKit picks a sample (booking, results, status, hostile); the JSON is editable and the
 *             widget follows as you type, with what the parser dropped listed under it
 * ───────────────────────────────────────────────────────── */

const SAMPLES: Record<string, unknown> = {
  booking: {
    type: 'Card',
    title: 'Table for 2, Friday',
    description: 'Casa Lume, Rua das Flores 12. Held for 10 minutes.',
    status: 'waiting',
    children: [
      { type: 'Properties', size: 'compact', items: [{ label: 'Guests', value: 2 }, { label: 'Deposit (€)', value: '20.00' }] },
      { type: 'DatePicker', name: 'day', label: 'Day', defaultValue: '2026-10-09', min: '2026-10-06' },
      { type: 'Select', name: 'time', label: 'Time', defaultValue: '20:30', options: [{ value: '19:00', label: '19:00' }, { value: '20:30', label: '20:30' }, { value: '22:00', label: '22:00' }] },
      { type: 'Field', name: 'guest', label: 'Name on the booking', placeholder: 'Ana Duarte' },
    ],
    footer: [
      { type: 'Button', label: 'Not now', size: 'compact', action: { type: 'action', name: 'dismiss' } },
      { type: 'Button', label: 'Book', cap: 'primary', size: 'compact', action: { type: 'action', name: 'book', payload: { venue: 'casa-lume', hold: 'h_81' } } },
    ],
  },
  results: [
    { type: 'Markdown', text: 'Three flights match **Lisbon → Porto** on Friday. [Fare rules](https://example.com/fares).' },
    {
      type: 'List',
      label: 'Flights',
      children: [
        { type: 'ListItem', text: 'TP 1944 · 07:05', detail: '55 min, direct', badge: '€49', action: { type: 'action', name: 'pick', payload: { flight: 'TP1944' } } },
        { type: 'ListItem', text: 'TP 1946 · 12:40', detail: '55 min, direct', badge: '€62', action: { type: 'action', name: 'pick', payload: { flight: 'TP1946' } } },
        { type: 'ListItem', text: 'FR 8312 · 18:15', detail: '1 h 05, direct', badge: '€38', action: { type: 'action', name: 'pick', payload: { flight: 'FR8312' } } },
      ],
    },
  ],
  status: [
    { type: 'Alert', kind: 'waiting', title: 'Importing 1,204 photos', description: 'You can keep working; the album fills as they arrive.', actions: [{ type: 'Button', label: 'Pause', size: 'compact', action: { type: 'action', name: 'pause' } }] },
    { type: 'Progress', label: 'Imported', value: 38 },
    { type: 'Meter', label: 'Storage', value: 71, max: 100 },
    { type: 'Badge', text: 'Synced', led: 'live' },
  ],
  hostile: [
    { type: 'Script', src: 'https://evil.example/x.js' },
    { type: '__proto__', polluted: true },
    { type: 'Card', title: 'Click me', href: 'javascript:alert(1)', description: '<img src=x onerror=alert(1)>' },
    { type: 'Markdown', text: 'A [relative link](/admin/delete), a [script](javascript:alert(1)) and [data](data:text/html,hi); [this one](https://metalui.dev) stays.' },
    { type: 'Button', label: 'Run', onClick: 'alert(1)', action: { type: 'action', name: 'run', payload: { ok: true } } },
    { type: 'ListItem', text: 'An item outside a list' },
    { type: 'Meter', label: 'No value' },
  ],
};
const text = (key: string) => JSON.stringify(SAMPLES[key], null, 2);

/** The last action a widget handed back, as the host sees it. */
function useActionLog() {
  const [last, setLast] = React.useState<{ action: WidgetAction; values: Record<string, string> }>();
  const onAction = React.useCallback((action: WidgetAction, { values }: WidgetActionContext) => setLast({ action, values }), []);
  const log = (
    <p data-testid="widget-log" aria-live="polite" className="m-0 type-meta text-ink2 break-words">
      {last ? <>onAction <code>{JSON.stringify(last.action)}</code> values <code>{JSON.stringify(last.values)}</code></> : 'Press a key in the widget: its action shows here.'}
    </p>
  );
  return { onAction, log };
}

function Reply() {
  const { onAction, log } = useActionLog();
  return (
    <div className="grid w-full max-w-[480px] gap-12">
      <Message from="assistant" model="Fast">
        <div className="grid gap-8">
          <span>Casa Lume has a table on Friday. Pick a time and I'll book it.</span>
          <Widget data-testid="widget-reply" widget={SAMPLES.booking} onAction={onAction} />
        </div>
      </Message>
      {log}
    </div>
  );
}

/* EDITOR: the page's DialKit panel picks a sample; the JSON is yours to change. */
function Editor() {
  const d = useDialKit('Widget', { sample: { type: 'select', options: Object.keys(SAMPLES), default: 'booking' } });
  const [json, setJson] = React.useState(() => text('booking'));
  React.useEffect(() => setJson(text(d.sample as string)), [d.sample]);
  const { onAction, log } = useActionLog();
  const { issues } = React.useMemo(() => parseWidget(json), [json]);
  return (
    <div data-testid="widget-editor" className="grid w-full gap-16 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start">
      <Textarea data-testid="widget-json" aria-label="Widget JSON" size="compact" minRows={12} maxRows={24} spellCheck={false} value={json} onChange={(e) => setJson(e.currentTarget.value)} />
      <div className="grid gap-12 min-w-0">
        <Widget data-testid="widget-live" widget={json} onAction={onAction} />
        {log}
        {issues.length > 0 && (
          <Properties size="compact" aria-label="Dropped" data-testid="widget-issues">
            {issues.map((i, k) => <Properties.Item key={k} label={i.path || 'widget'}>{i.message}</Properties.Item>)}
          </Properties>
        )}
      </div>
    </div>
  );
}

export default function WidgetPage() {
  return (
    <ComponentPage
      title="Widget"
      lede="Interface a model sends as JSON: a booking to confirm, flights to pick from, an import to watch. Rendered with the components on this site, checked against one published schema, and never trusted: its keys hand an action back to the host and run nothing."
      play={{ lede: 'Change the day or the time and press Book: the host receives the action and the values.', caption: 'an assistant reply that is a booking', node: <Reply /> }}
      more={[{ id: 'edit', title: 'Edit the JSON', lede: 'The Widget panel picks a sample; change the JSON and the widget follows. What the parser dropped is listed under it. Try the hostile sample: unknown nodes, a javascript: link, a prototype key and a function in a prop.', node: <Editor /> }]}
      usage={`// The schema for the model: https://metalui.dev/widgets.schema.json
<Widget widget={json} onAction={(action, { values }) => {
  if (action.name === 'book') book(action.payload, values.day, values.time);
}} />`}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'swift', label: 'SwiftUI', code: swiftSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'WG1', title: 'The schema is the contract', body: 'One spec makes the JSON Schema, the checks and the guide; a model is given the schema, not prose about it.', origin: 'Ours' },
        { id: 'WG2', title: 'Keys hand back, never act', body: 'A key gives the host an action and the fields\' values; the host decides what happens. No URL or code in a widget runs.', origin: 'ChatKit' },
        { id: 'WG3', title: 'Show what you can', body: 'A node that can\'t be shown says so quietly in its place; the rest of the widget still renders, and nothing throws.', origin: 'Ours' },
      ]}
    />
  );
}
