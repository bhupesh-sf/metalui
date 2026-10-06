import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Properties, TableCell, type PropertiesSize } from '@unlocalhosted/metalui';
import reactSource from '../../../../../packages/metalui/src/components/properties/properties.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalProperties.swift?raw';
import agentSource from '../../../../../packages/metalui/src/components/properties/properties.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * PROPERTIES PAGE · label and value pairs where they are used
 *
 *   details    an opened deployment's fields, values in the table's cell looks
 *   receipt    compact: line items and a total
 *   narrow     a side panel under 280: each label stands above its value
 *   tune       DialKit: the size of the details
 * ───────────────────────────────────────────────────────── */

const NOW = new Date(2026, 9, 6, 12, 0);

function Deployment({ size = 'regular' }: { size?: PropertiesSize }) {
  return (
    <section aria-label="Deployment a41f9c2" className="grid w-full max-w-[440px] gap-8">
      <h3 className="m-0 type-title text-ink">Deployment</h3>
      <Properties size={size} aria-label="Deployment details">
        <Properties.Item label="Status"><TableCell kind="status" value="waiting" words={{ waiting: 'Building' }} /></Properties.Item>
        <Properties.Item label="Commit"><TableCell kind="code" value="a41f9c2" /></Properties.Item>
        <Properties.Item label="Branch">fix/sync-retry</Properties.Item>
        <Properties.Item label="By"><TableCell kind="person" value={{ name: 'Kenji Mori' }} /></Properties.Item>
        <Properties.Item label="Started"><TableCell kind="date" value={new Date(NOW.getTime() - 7 * 60_000)} now={NOW} /></Properties.Item>
        <Properties.Item label="Tags"><TableCell kind="tags" value={['web', 'canary', 'eu-west']} /></Properties.Item>
        <Properties.Item label="Rollback" />
      </Properties>
    </section>
  );
}

function Receipt() {
  return (
    <section aria-label="Receipt" className="grid w-full max-w-[320px] gap-8">
      <h3 className="m-0 type-title text-ink">Receipt</h3>
      <Properties size="compact" aria-label="Receipt lines">
        <Properties.Item label="Studio, October (€)"><TableCell kind="currency" value={1200} /></Properties.Item>
        <Properties.Item label="Print room (€)"><TableCell kind="currency" value={86.4} /></Properties.Item>
        <Properties.Item label="Credit (€)"><TableCell kind="currency" value={-40} /></Properties.Item>
        <Properties.Item label="VAT 23 % (€)"><TableCell kind="currency" value={286.67} /></Properties.Item>
        <Properties.Item label="Total (€)"><TableCell kind="currency" value={1533.07} /></Properties.Item>
      </Properties>
    </section>
  );
}

function Narrow() {
  return (
    <div data-testid="properties-narrow" className="w-[240px] p-12 rounded-surface-radius-card recipe-well-field">
      <Properties aria-label="Region details">
        <Properties.Item label="Region">Lisbon, spring sketches</Properties.Item>
        <Properties.Item label="Owner"><TableCell kind="person" value={{ name: 'Ana Duarte' }} /></Properties.Item>
        <Properties.Item label="Updated"><TableCell kind="date" value={new Date(NOW.getTime() - 3 * 3_600_000)} now={NOW} /></Properties.Item>
      </Properties>
    </div>
  );
}

/* SIZE TUNER: the page's DialKit panel. size sets the details' pair height and padding. */
function SizeTuner() {
  const d = useDialKit('Properties', { size: { type: 'select', options: ['regular', 'compact'], default: 'regular' } });
  return <div data-testid="properties-tuner" className="flex w-full justify-center"><Deployment size={d.size as PropertiesSize} /></div>;
}

export default function PropertiesPage() {
  return (
    <ComponentPage
      capture="properties"
      title="Properties"
      lede="Label and value pairs: a receipt, a details panel, a spec sheet. Two columns and no header, so it is a list of terms, not a table; its values take the table's cell looks."
      play={{ lede: 'Hover the commit for its copy key; hover the start time for the exact time.', caption: 'a deployment · a receipt · a narrow panel', wide: true, node: (
        <div className="grid w-full justify-items-center gap-32">
          <Deployment />
          <Receipt />
          <Narrow />
        </div>
      ) }}
      more={[{ id: 'tune', title: 'Tune the size', lede: 'The Properties panel switches the details between regular (pairs 32) and compact (24).', node: <SizeTuner /> }]}
      usage={`<Properties>
  <Properties.Item label="Status"><TableCell kind="status" value="live" /></Properties.Item>
  <Properties.Item label="Owner"><TableCell kind="person" value={{ name: 'Kenji Mori' }} /></Properties.Item>
  <Properties.Item label="Branch">main</Properties.Item>
</Properties>`}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'swift', label: 'SwiftUI', code: swiftSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'PR1', title: 'Pairs, not a table', body: 'Two columns with no header are a description list: each label is read with its value.', origin: 'Ours' },
        { id: 'PR2', title: 'The same looks as the table', body: 'A status, a person or a sum looks the same in the details as in the row it came from.', origin: 'Ours' },
        { id: 'PR3', title: 'Narrow stacks', body: 'Under 280 the label stands above its value instead of squeezing it.', origin: 'Ours' },
      ]}
    />
  );
}
