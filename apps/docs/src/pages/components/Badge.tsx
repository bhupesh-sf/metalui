import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Badge, Button, Chip, IconButton, StatusBadge, TabList, Tabs, type BadgeSize, type LedKind } from '@unlocalhosted/metalui';
import { Icon } from '@unlocalhosted/metalui/icons';
import reactSource from '../../../../../packages/metalui/src/components/badge/badge.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import agentGuide from '../../../../../packages/metalui/src/components/badge/badge.agent.md?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalBadge.swift?raw';
import { CodeScreen, PageHeader, Rules, Section, SourceTabs, Stage, TokenTable } from '../../ui/doc';
import { UsageSection } from '../../ui/Usage';
import { Beat, Compare, LayerTrail, SpecLine } from '../../ui/beat';
import { SwiftCapture } from '../../ui/SwiftCapture';
import { tokens } from '../../lib/tokens';

/* ─────────────────────────────────────────────────────────
 * BADGE on the component template
 *
 *   head      title · one line · layer trail · spec line
 *   hero      a kind, a state, a glyph and a count beside real names · usage
 *   details   1 badge, chip or status badge   three pills, three jobs
 *             2 a state that changes          the lamp flickers once
 *             3 counts on the drum            inline, in a tab, on a corner
 *             4 two sizes                     matched to the type beside them
 *   workbench (DialKit) · SwiftUI · api · tokens · platforms · rules
 * ───────────────────────────────────────────────────────── */

const B = tokens.recipes.badge.props;

const USAGE = [
  { id: 'react', label: 'React', file: 'release-row.tsx', lang: 'tsx' as const, code: `import { Badge, IconButton } from '@unlocalhosted/metalui';\n\n<Badge>Beta</Badge>\n<Badge led="failed">Build failed</Badge>\n<Badge glyph={<Icon name="lock" animate={false} />}>Private</Badge>\n<Badge count={unread} label={\`\${unread} unread\`} />\n\n<Badge.Anchor count={unread}>\n  <IconButton label={\`Inbox, \${unread} unread\`} icon={<Icon name="bell" />} />\n</Badge.Anchor>` },
  { id: 'swift', label: 'SwiftUI', file: 'ReleaseRow.swift', lang: 'swift' as const, code: `import MetalUI\n\nMetalBadge("Beta")\nMetalBadge("Build failed", led: .failed)\nMetalBadge("Private", glyph: .lock)\nMetalBadge(count: unread, label: "\\(unread) unread")\n\nMetalIconButton("Inbox, \\(unread) unread", icon: .bell)\n    .metalBadge(count: unread)` },
];

/** A run through a build's states: each change flickers the lamp once. */
const RUN: { led: LedKind; words: string }[] = [
  { led: 'off', words: 'Queued' },
  { led: 'waiting', words: 'Building' },
  { led: 'failed', words: 'Build failed' },
  { led: 'waiting', words: 'Retrying' },
  { led: 'live', words: 'Deployed' },
];

/** A row a badge describes: a name, then the badge, as in a list of releases. */
function Row({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-16 border-b border-rule py-10 last:border-b-0">
      <span className="type-ui text-ink">{name}</span>
      {children}
    </div>
  );
}

function States() {
  const [i, setI] = React.useState(0);
  const s = RUN[i];
  return (
    <div className="flex w-full max-w-[360px] flex-col gap-20" data-testid="badge-states">
      <div className="flex flex-col">
        <Row name="api-gateway"><Badge led={s.led} data-testid="badge-run">{s.words}</Badge></Row>
        <Row name="web-client"><Badge led="live">Deployed</Badge></Row>
        <Row name="billing-worker"><Badge led="live">Deployed</Badge></Row>
      </div>
      <div className="flex justify-center">
        <Button size="compact" onClick={() => setI((n) => (n + 1) % RUN.length)}>Next state</Button>
      </div>
    </div>
  );
}

function Counts() {
  const [n, setN] = React.useState(3);
  const tabs = [
    { value: 'inbox', label: <span className="inline-flex items-center gap-6">Inbox <Badge size="compact" count={n} label={`${n} unread`} /></span> },
    { value: 'done', label: 'Done' },
  ];
  return (
    <div className="flex w-full flex-col items-center gap-28 pt-12" data-testid="badge-counts">
      <div className="flex flex-wrap items-center justify-center gap-x-40 gap-y-20">
        <span className="type-ui flex items-center gap-8 text-ink">Unread <Badge count={n} label={`${n} unread`} data-testid="badge-inline-count" /></span>
        <Tabs defaultValue="inbox"><TabList aria-label="Mail" size="compact" items={tabs} /></Tabs>
        <Badge.Anchor count={n} data-testid="badge-anchor">
          <IconButton label={n > 0 ? `Inbox, ${n} unread` : 'Inbox'} icon={<Icon name="bell" />} />
        </Badge.Anchor>
      </div>
      <div className="flex items-center gap-8">
        <Button size="compact" onClick={() => setN((v) => Math.max(0, v - 1))}>One read</Button>
        <Button size="compact" onClick={() => setN((v) => v + 1)}>One more</Button>
        <Button size="compact" onClick={() => setN((v) => (v > 99 ? 3 : 120))}>{n > 99 ? 'Back to 3' : 'Lots'}</Button>
      </div>
    </div>
  );
}

const GLYPHS = { none: null, lock: 'lock', tag: 'tag', person: 'person' } as const;
const WORDS = ['Beta', 'v2.4', 'Admin', 'Build failed', 'Deployed'];

function Workbench() {
  const d = useDialKit('Badge', {
    words: { type: 'select', options: WORDS, default: 'Beta' },
    led: { type: 'select', options: ['none', 'live', 'waiting', 'failed', 'link', 'off'], default: 'none' },
    glyph: { type: 'select', options: Object.keys(GLYPHS), default: 'none' },
    size: { type: 'select', options: ['regular', 'compact'], default: 'regular' },
    count: false,
    value: [12, 0, 150],
  });
  const glyph = GLYPHS[d.glyph as keyof typeof GLYPHS];
  const size = d.size as BadgeSize;
  const n = Math.round(d.value);
  return (
    <div data-testid="badge-workbench" className="flex flex-col items-center gap-16" style={{ zoom: 2 }}>
      {d.count ? (
        <Badge size={size} count={n} />
      ) : (
        <Badge size={size} led={d.led === 'none' ? undefined : (d.led as LedKind)} glyph={glyph ? <Icon name={glyph} animate={false} /> : undefined}>{d.words}</Badge>
      )}
    </div>
  );
}

export default function BadgePage() {
  return (
    <>
      <PageHeader title="Badge" lede="One short fact about a thing: its kind, its version, its state, or how many are waiting. A stamp cut into the surface, never raised, never pressed.">
        <LayerTrail
          down={[{ label: 'the LED', to: '/components/led' }, { label: 'the well', to: '/foundations/materials' }, { label: 'the label role', to: '/foundations/typography' }]}
          here="Badge"
          up={[{ label: 'Tabs', to: '/components/tabs' }, { label: 'Table', to: '/components/table' }, { label: 'Icon button', to: '/components/icon-button' }]}
        />
        <SpecLine
          items={[
            { label: 'React', value: 'import { Badge }', href: '#hero', mono: true },
            { label: 'Swift', value: 'MetalBadge', href: '#platforms', mono: true },
            { label: 'Sizes', value: '2', href: '#sizes' },
            { label: 'Leads', value: 'LED · glyph', href: '#hero' },
          ]}
        />
      </PageHeader>

      <section id="hero" className="flex scroll-mt-80 flex-col gap-24">
        <Stage caption="A kind, a state, a glyph and a count, each beside the name it describes.">
          <div className="flex w-full max-w-[380px] flex-col" data-testid="badge-hero">
            <Row name="Spatial canvas"><Badge>Beta</Badge></Row>
            <Row name="api-gateway"><Badge led="failed">Build failed</Badge></Row>
            <Row name="Q3 planning"><Badge glyph={<Icon name="lock" animate={false} />}>Private</Badge></Row>
            <Row name="Release notes"><Badge>v2.4</Badge></Row>
            <Row name="Review requests"><Badge count={7} label="7 waiting" /></Row>
          </div>
        </Stage>
        <CodeScreen tabs={USAGE} />
      </section>

      <UsageSection
        agent={agentGuide}
        example={`<Badge>Beta</Badge>
<Badge led="failed">Build failed</Badge>
<Badge count={7} label="7 waiting" />`}
      />

      <Section id="details" title="Details">
        <div className="flex flex-col gap-56">
          <Beat
            id="badge-chip-status"
            title="Badge, chip or status badge"
            setup="Three pills, three jobs. A badge describes a thing. A chip is something you act on: accept it, dismiss it, remove it. A status badge is the system speaking: it is announced when it changes and carries the fix as its hint. So a badge is stamped in, a chip carries its keys, and a status badge stands raised."
            caption="Ask one question: does it describe (badge), do you act on it (chip), or is the system speaking (status badge)?"
          >
            <Compare
              zoom={1.5}
              items={[
                { label: 'badge', note: 'describes a thing', lit: true, node: <Badge led="failed">Build failed</Badge> },
                {
                  label: 'chip', note: 'you act on it',
                  node: (
                    <Chip variant="suggestion">
                      <Chip.Text>Design</Chip.Text>
                      <Chip.Actions><IconButton variant="mini" label="Remove Design" icon={<Icon name="close" animate={false} className="size-attachment-remove-glyph" />} /></Chip.Actions>
                    </Chip>
                  ),
                },
                { label: 'status badge', note: 'the system speaking', node: <StatusBadge led="failed" gesture="steady">SYNC FAILED</StatusBadge> },
              ]}
            />
          </Beat>

          <Beat
            id="state-changes"
            title="A state that changes"
            setup="The lamp holds steady, so a table of them is quiet. When a thing's state changes, its lamp flickers once and settles lit: the row that changed catches your eye once, then goes still. Nothing flickers on first paint. The words always say the state; the lamp is never the only cue."
            caption="Press Next state: only the first row's lamp flickers, once per change."
            cost="none at rest: the flicker is one short opacity run, then nothing."
          >
            <States />
          </Beat>

          <Beat
            id="counts"
            title="Counts on the drum"
            setup="A count turns on the drum, up as it grows and down as it shrinks, and its footprint settles to the new width. One digit is a circle; past 99 it reads 99+. On another control's corner it is a small readout cap in the other colorway, ringed in the surface, and it goes when the count reaches zero, so it never says 0."
            caption="One read, one more, lots: the same count after a word, in a tab and on a bell's corner."
          >
            <Counts />
          </Beat>

          <Beat
            id="sizes"
            title="Two sizes, matched to the type"
            setup={`A badge sits on a line of text, not level with a field, so its sizes follow the type: regular ${B.regular.height} beside ui and body text, compact ${B.compact.height} beside meta text, in dense rows and on corners.`}
            caption="Regular by a 12.5 name; compact by an 11 detail line."
          >
            <div className="flex flex-col items-start gap-14" data-testid="badge-sizes">
              <span className="type-ui flex items-center gap-8 text-ink">Spatial canvas <Badge>Beta</Badge> <Badge led="live">Live</Badge> <Badge count={12} /></span>
              <span className="type-meta flex items-center gap-6 text-ink3">Updated 2 h ago · <Badge size="compact">Draft</Badge> <Badge size="compact" led="waiting">Review</Badge> <Badge size="compact" count={4} /></span>
            </div>
          </Beat>
        </div>
      </Section>

      <Section id="workbench" title="Workbench" lede="Pick words, a lead, a size or a count in the Badge panel. Slide the count to see the drum turn both ways and 99+ past the max.">
        <Stage caption="the badge, magnified 2×">
          <Workbench />
        </Stage>
      </Section>

      <Section id="variants" title="SwiftUI">
        <SwiftCapture name="badge" maxWidth={560} />
      </Section>

      <Section id="api" title="API">
        <TokenTable
          head={['Prop', 'Type', 'Default', 'Notes']}
          mono={[0, 1, 2]}
          rows={[
            ['children', 'ReactNode', '–', 'The words: one to three, a version or a role. Shown uppercase.'],
            ['led', "'live' | 'waiting' | 'failed' | 'link' | 'off'", '–', 'The LED before the words; steady, a flicker on each later change.'],
            ['glyph', 'ReactNode', '–', 'A glyph before the words; ignored when led is set.'],
            ['count', 'number', '–', 'A count in place of words, on the drum.'],
            ['max', 'number', '99', 'Past it the count reads max+.'],
            ['label', 'string', '–', 'What the count means for assistive tech ("3 unread").'],
            ['size', "'regular' | 'compact'", "'regular'", `${B.regular.height} tall by ui text, ${B.compact.height} by meta text.`],
            ['Badge.Anchor count max', 'number', '–', 'A count on the child control’s corner; gone at zero. Say the count in the control’s label.'],
          ]}
        />
      </Section>

      <Section id="tokens" title="Tokens">
        <TokenTable
          rows={[
            ['--mu-r-badge-regular-height · -pad · -gap', `${B.regular.height} · ${B.regular.pad} · ${B.regular.gap}`, 'regular size'],
            ['--mu-r-badge-compact-height · -pad · -gap', `${B.compact.height} · ${B.compact.pad} · ${B.compact.gap}`, 'compact size'],
            ['--mu-r-badge-regular-font', B.regular.font, 'the words, uppercase, with the engraved lip'],
            ['--mu-r-badge-count-font', B.count.font, 'a count, tabular'],
            ['recipe-badge', 'recipe', 'the stamp: the well’s light, cut shallow'],
            ['recipe-badge-corner', 'recipe', 'the corner cap, in the other colorway'],
            ['--mu-r-badge-corner-ring · -offset · -from', `${B.corner.ring} · ${B.corner.offset} · ${B.corner.from}`, 'the ring of the surface, how far past the corner, where it scales in from'],
          ]}
        />
      </Section>

      <Section id="platforms" title="Platforms">
        <SourceTabs
          tabs={[
            { id: 'react', label: 'React', code: reactSource },
            { id: 'css', label: 'CSS', code: cssSource },
            { id: 'swift', label: 'SwiftUI', code: swiftSource },
            { id: 'agent', label: 'Agent guide', code: agentGuide },
          ]}
        />
      </Section>

      <Section id="rules" title="Rules">
        <Rules
          rules={[
            { id: 'B1', title: 'Describes, never pressed', body: 'A badge says something about a thing. Something you remove or act on is a chip; a link is a link.', origin: 'Ours' },
            { id: 'B2', title: 'Stamped in', body: 'Raised at this size is a keycap or the system speaking. A badge is cut into the surface it describes.', origin: 'Ours' },
            { id: 'B3', title: 'No tones', body: 'Meaning lives in the words and the LED: green live, amber waiting or urgent, red failed, blue a link’s kind, off idle. Never colour alone.', origin: 'Adapted · ReUI tones, restated as the LED' },
            { id: 'B4', title: 'One lead', body: 'An LED or a glyph before the words, not both.', origin: 'Ours' },
            { id: 'B5', title: 'A corner count is said by its control', body: 'The cap on a corner is hidden from assistive tech; the control’s label carries the number ("Inbox, 3 unread").', origin: 'Ours' },
          ]}
        />
      </Section>
    </>
  );
}
