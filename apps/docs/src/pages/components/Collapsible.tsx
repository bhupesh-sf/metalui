import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Button, Card, Chip, Collapsible, Field, Fieldset, FormField, Rule, Settings, Switch, Switcher } from '@unlocalhosted/metalui';
import { type SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';
import reactSource from '../../../../../packages/metalui/src/components/collapsible/collapsible.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalCollapsible.swift?raw';
import agentSource from '../../../../../packages/metalui/src/components/collapsible/collapsible.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * COLLAPSIBLE PAGE · show and hide where it is used
 *
 *   card      an export card: "Advanced" says what's inside while closed; the footer travels
 *   key       a line that already names what opens, with a ghost key
 *   form      "More options" under a fieldset of fields
 *   more      five tags, "Show 3 more" on the drum
 *   settings  a settings card: the row's own key opens it ("only its control acts"); a nested one inside
 *   tune      DialKit: the springs for opening, closing and the chevron, and time stretched
 * ───────────────────────────────────────────────────────── */

function ExportCard() {
  const [scale, setScale] = React.useState('2');
  const [background, setBackground] = React.useState(true);
  return (
    <Card className="w-full max-w-[380px]">
      <Card.Title>Export Lisbon</Card.Title>
      <Card.Description>Every region of the canvas, as one file.</Card.Description>
      <Collapsible>
        <Collapsible.Trigger summary={`PNG, ${scale}×${background ? '' : ', clear'}`}>Advanced</Collapsible.Trigger>
        <Collapsible.Panel>
          <div className="grid justify-items-start gap-12 pt-8 pb-4">
            <Switcher size="compact" aria-label="Scale" value={scale} onValueChange={setScale} options={[{ value: '1', label: '1×' }, { value: '2', label: '2×' }, { value: '3', label: '3×' }]} />
            <Switch label="Canvas background" checked={background} onCheckedChange={setBackground} />
          </div>
        </Collapsible.Panel>
      </Collapsible>
      <Card.Footer><Button cap="primary">Export</Button></Card.Footer>
    </Card>
  );
}

const REPOS = ['ana/lisbon-sketches', 'ana/tram-map', 'studio/metalui'];

function Starred() {
  return (
    <Collapsible className="w-full max-w-[380px]">
      <div className="flex items-center justify-between gap-8">
        <span className="type-ui text-ink">Ana starred 3 repositories</span>
        <Collapsible.Key label="Show repositories" />
      </div>
      <Collapsible.Panel>
        <ul className="m-0 grid list-none gap-4 p-0 pt-4 type-readout text-ink2">
          {REPOS.map((r) => <li key={r}>{r}</li>)}
        </ul>
      </Collapsible.Panel>
    </Collapsible>
  );
}

function MoreOptions() {
  return (
    <div className="grid w-full max-w-[380px] gap-16">
      <Fieldset>
        <Fieldset.Legend>Send to</Fieldset.Legend>
        <FormField><FormField.Label>Name</FormField.Label><Field size="regular"><Field.Input defaultValue="Ana Duarte" /></Field></FormField>
        <FormField><FormField.Label>Email</FormField.Label><Field size="regular"><Field.Input defaultValue="ana@example.com" /></Field></FormField>
        <Collapsible>
          <Collapsible.Trigger>More options</Collapsible.Trigger>
          <Collapsible.Panel keepMounted>
            <div className="grid gap-12 pt-8">
              <FormField><FormField.Label mark="optional">Subject</FormField.Label><Field size="regular"><Field.Input placeholder="Lisbon, the export" /></Field></FormField>
              <FormField><FormField.Label mark="optional">Copy to</FormField.Label><Field size="regular"><Field.Input placeholder="someone@example.com" /></Field></FormField>
            </div>
          </Collapsible.Panel>
        </Collapsible>
      </Fieldset>
      <div><Button cap="primary">Send</Button></div>
    </div>
  );
}

const TAGS = ['lisbon', 'trams', 'tiles', 'spring', 'sketches', 'alfama', 'river', 'light'];

function Tags({ shown = 5 }: { shown?: number }) {
  const rest = TAGS.slice(shown);
  return (
    <Collapsible className="grid w-full max-w-[380px] justify-items-start gap-8">
      <div className="flex flex-wrap gap-6">{TAGS.slice(0, shown).map((t) => <Chip key={t}>{t}</Chip>)}</div>
      <Collapsible.Panel>
        <div className="flex flex-wrap gap-6">{rest.map((t) => <Chip key={t}>{t}</Chip>)}</div>
      </Collapsible.Panel>
      <Collapsible.More count={rest.length} />
    </Collapsible>
  );
}

const ROW_RULE = 'mx-settings-row-pad-x';

function NetworkSettings() {
  const [offline, setOffline] = React.useState(true);
  return (
    <div className="w-full max-w-[520px]">
      <Settings>
        <Settings.Section title="Sync">
          <Settings.Row id="c-sync" name="Sync this canvas" detail="Your other devices see changes within a second.">
            <Switch aria-labelledby="c-sync" defaultChecked />
          </Settings.Row>
          <Collapsible>
            <Settings.Row name="Network" detail="Offline copies, proxy">
              <Collapsible.Key label="Show network settings" />
            </Settings.Row>
            <Collapsible.Panel>
              <Rule className={ROW_RULE} />
              <Settings.Row id="c-offline" name="Keep an offline copy" detail="Open this canvas without a connection.">
                <Switch aria-labelledby="c-offline" checked={offline} onCheckedChange={setOffline} />
              </Settings.Row>
              <Rule className={ROW_RULE} />
              <Collapsible>
                <Settings.Row name="Proxy" detail="Through the system's proxy">
                  <Collapsible.Key label="Show proxy settings" />
                </Settings.Row>
                <Collapsible.Panel>
                  <Rule className={ROW_RULE} />
                  <Settings.Row name="Host"><Field size="compact" className="w-[160px]"><Field.Input aria-label="Proxy host" defaultValue="proxy.local" /></Field></Settings.Row>
                </Collapsible.Panel>
              </Collapsible>
            </Collapsible.Panel>
          </Collapsible>
        </Settings.Section>
      </Settings>
    </div>
  );
}

/* REVEAL TUNER: the page's DialKit panel. open, close and chevron swap the springs; slow stretches every
 * duration; summary and count change what the closed triggers say. */
function RevealTuner() {
  const d = useDialKit('Collapsible reveal', {
    open: { type: 'select', options: SPRING_NAMES, default: 'settle' },
    close: { type: 'select', options: SPRING_NAMES, default: 'release' },
    chevron: { type: 'select', options: SPRING_NAMES, default: 'part' },
    slow: [1, 1, 10],
    shown: [5, 1, 7],
  });
  const vars = {
    ...springVars('settle', d.open as SpringName, d.slow),
    ...springVars('release', d.close as SpringName, d.slow),
    ...springVars('part', d.chevron as SpringName, d.slow),
  } as React.CSSProperties;
  return (
    <div data-testid="collapsible-tuner" className="grid w-full justify-items-center gap-32" style={vars}>
      <ExportCard />
      <Tags shown={Math.round(d.shown)} />
    </div>
  );
}

export default function CollapsiblePage() {
  return (
    <ComponentPage
      capture="collapsible"
      title="Collapsible"
      lede="Show and hide in place, on its own. The panel is uncovered from its top edge as it slides out on the settle spring, and everything after it travels in step; closing, it slides back on release. Nothing animates height."
      play={{ lede: 'Open Advanced, or the key beside the line; Tab to a trigger and press Space.', caption: 'in a card · beside a line', wide: true, node: (
        <div className="grid w-full justify-items-center gap-32">
          <ExportCard />
          <Starred />
        </div>
      ) }}
      more={[
        { id: 'form', title: 'Under a form', lede: 'Optional fields wait behind "More options"; keepMounted keeps what was typed while it is closed. The Send button travels with it.', node: <div className="flex w-full justify-center"><MoreOptions /></div> },
        { id: 'more', title: 'Show the rest', lede: 'Collapsible.More sits after the panel: what was hidden opens above it and its words turn on the drum.', node: <div className="flex w-full justify-center"><Tags /></div> },
        { id: 'settings', title: 'In settings, nested', lede: 'In a settings card the row\'s own key opens it (only the control acts); Proxy opens inside Network, and the rows after both travel.', node: <div className="flex w-full justify-center"><NetworkSettings /></div> },
        { id: 'tune', title: 'Tune the reveal', lede: 'The Collapsible reveal panel swaps the open, close and chevron springs, stretches time, and sets how many tags show before "Show more".', node: <RevealTuner /> },
      ]}
      usage={`<Collapsible>
  <Collapsible.Trigger summary="PNG, 2×">Advanced</Collapsible.Trigger>
  <Collapsible.Panel>…</Collapsible.Panel>
</Collapsible>

<Collapsible>
  <Collapsible.Panel>{rest}</Collapsible.Panel>
  <Collapsible.More count={3} />
</Collapsible>`}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'swift', label: 'SwiftUI', code: swiftSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'CO1', title: 'Uncover, never grow', body: 'The panel takes its place at once and is uncovered from its top edge; what follows travels. Only clip, transform and opacity move.', origin: 'Ours' },
        { id: 'CO2', title: 'Say what is hidden', body: 'A closed row says what is inside ("PNG, 2×") so nobody opens it just to check.', origin: 'Ours' },
        { id: 'CO3', title: 'One glyph opens', body: 'The set\'s chevron: a quarter turn for a row or a key, a half for "Show more". Never a plus that turns into a minus.', origin: 'Ours' },
      ]}
    />
  );
}
