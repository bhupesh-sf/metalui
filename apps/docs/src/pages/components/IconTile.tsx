import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Avatar, Badge, Button, Card, IconTile, Row, type IconTileSize, type LedKind } from '@unlocalhosted/metalui';
import { BellIcon, CalendarIcon, DocumentIcon, FolderIcon, LinkIcon, LockIcon, PersonIcon, RegionIcon, SettingsIcon } from '@unlocalhosted/metalui/icons';
import reactSource from '../../../../../packages/metalui/src/components/icon-tile/icon-tile.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import agentGuide from '../../../../../packages/metalui/src/components/icon-tile/icon-tile.agent.md?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalIconTile.swift?raw';
import { CodeScreen, PageHeader, Rules, Section, SourceTabs, Stage, TokenTable } from '../../ui/doc';
import { Beat, Compare, LayerTrail, SpecLine } from '../../ui/beat';
import { SwiftCapture } from '../../ui/SwiftCapture';
import { UsageSection } from '../../ui/Usage';
import { tokens } from '../../lib/tokens';

/* ─────────────────────────────────────────────────────────
 * ICON TILE on the component template
 *
 *   head      title · one line · layer trail · spec line
 *   hero      a list of rows, each led by a tile · usage
 *   details   1 sunk or raised                 two materials, not five fills
 *             2 a state that changes           the lamp on the rim flickers once
 *             3 the field ladder, and hero     level with the row; alone above words
 *             4 a feature card, an empty place the tile at large and hero
 *             5 square or round                beside avatars
 *   workbench (DialKit) · SwiftUI · api · tokens · platforms · rules
 * ───────────────────────────────────────────────────────── */

const T = tokens.recipes['icon-tile'].props;

const USAGE = [
  { id: 'react', label: 'React', file: 'project-row.tsx', lang: 'tsx' as const, code: `import { IconTile, Row } from '@unlocalhosted/metalui';\nimport { FolderIcon } from '@unlocalhosted/metalui/icons';\n\n<Row.Root variant="panel">\n  <Row.Lead><IconTile><FolderIcon animate={false} /></IconTile></Row.Lead>\n  <Row.Text>Q3 planning</Row.Text>\n</Row.Root>\n\n<IconTile led="failed"><DocumentIcon animate={false} /></IconTile>  {/* words beside it say "failed" */}\n<IconTile look="raised" size="large">AC</IconTile>` },
  { id: 'swift', label: 'SwiftUI', file: 'ProjectRow.swift', lang: 'swift' as const, code: `import MetalUI\n\nMetalIconTile(.folder)\nMetalIconTile(.document, led: .failed)\nMetalIconTile(text: "AC", look: .raised, size: .large)` },
];

/** A list row led by a tile: the row is the target, the tile only marks it. */
function TileRow({ tile, name, meta, trail }: { tile: React.ReactNode; name: string; meta: string; trail?: React.ReactNode }) {
  return (
    <Row.Root as="li" variant="panel" className="items-center">
      <Row.Lead>{tile}</Row.Lead>
      <Row.Text className="flex flex-col">
        <span className="type-ui text-ink">{name}</span>
        <span className="type-meta text-ink3">{meta}</span>
      </Row.Text>
      {trail && <Row.Trail>{trail}</Row.Trail>}
    </Row.Root>
  );
}

/** A run through a service's states: each change flickers the lamp once. */
const RUN: { led: LedKind; words: string }[] = [
  { led: 'live', words: 'Synced' },
  { led: 'waiting', words: 'Syncing' },
  { led: 'failed', words: 'Sync failed' },
  { led: 'live', words: 'Synced' },
];

function States() {
  const [i, setI] = React.useState(0);
  const s = RUN[i];
  return (
    <div className="flex w-full max-w-[380px] flex-col gap-20" data-testid="icon-tile-states">
      <ul className="m-0 flex list-none flex-col p-0">
        <TileRow tile={<IconTile led={s.led} data-testid="icon-tile-run"><CalendarIcon animate={false} /></IconTile>} name="Calendar sync" meta={s.words} />
        <TileRow tile={<IconTile led="live"><DocumentIcon animate={false} /></IconTile>} name="Docs sync" meta="Synced" />
        <TileRow tile={<IconTile led="off"><LinkIcon animate={false} /></IconTile>} name="Link previews" meta="Paused" />
      </ul>
      <div className="flex justify-center">
        <Button size="compact" onClick={() => setI((n) => (n + 1) % RUN.length)}>Next state</Button>
      </div>
    </div>
  );
}

const SIZES: IconTileSize[] = ['compact', 'regular', 'large', 'hero'];
const GLYPHS = { folder: FolderIcon, document: DocumentIcon, calendar: CalendarIcon, lock: LockIcon, bell: BellIcon, settings: SettingsIcon } as const;

function Workbench() {
  const d = useDialKit('Icon tile', {
    look: { type: 'select', options: ['sunk', 'raised'], default: 'sunk' },
    size: { type: 'select', options: SIZES, default: 'large' },
    shape: { type: 'select', options: ['square', 'round'], default: 'square' },
    mark: { type: 'select', options: ['glyph', 'characters'], default: 'glyph' },
    glyph: { type: 'select', options: Object.keys(GLYPHS), default: 'folder' },
    characters: { type: 'select', options: ['AC', 'JS', 'Q3', 'K'], default: 'AC' },
    led: { type: 'select', options: ['none', 'live', 'waiting', 'failed', 'link', 'off'], default: 'none' },
  });
  const Glyph = GLYPHS[d.glyph as keyof typeof GLYPHS];
  return (
    <div data-testid="icon-tile-workbench" className="flex items-center gap-16" style={{ zoom: 2 }}>
      <IconTile look={d.look as 'sunk' | 'raised'} size={d.size as IconTileSize} shape={d.shape as 'square' | 'round'} led={d.led === 'none' ? undefined : (d.led as LedKind)}>
        {d.mark === 'glyph' ? <Glyph animate={false} /> : d.characters}
      </IconTile>
    </div>
  );
}

export default function IconTilePage() {
  return (
    <>
      <PageHeader title="Icon tile" lede="A mark for what a row, a card or an empty place is about: a glyph, or a few characters, in a window beside the words that name it. Never pressed, never tinted.">
        <LayerTrail
          down={[{ label: 'the well', to: '/foundations/materials' }, { label: 'the LED', to: '/components/led' }, { label: 'the icons', to: '/icons' }]}
          here="Icon tile"
          up={[{ label: 'Alert', to: '/components/alert' }, { label: 'Card', to: '/components/card' }, { label: 'Empty state', to: '/components/empty-state' }]}
        />
        <SpecLine
          items={[
            { label: 'React', value: 'import { IconTile }', href: '#hero', mono: true },
            { label: 'Swift', value: 'MetalIconTile', href: '#platforms', mono: true },
            { label: 'Sizes', value: '28 · 32 · 44 · 56', href: '#sizes' },
            { label: 'Looks', value: 'sunk · raised', href: '#looks' },
          ]}
        />
      </PageHeader>

      <section id="hero" className="flex scroll-mt-80 flex-col gap-24">
        <Stage caption="Each row led by a tile. The row is what you press; the tile only marks what it is.">
          <ul className="m-0 flex w-full max-w-[420px] list-none flex-col p-0" data-testid="icon-tile-hero" aria-label="Projects">
            <TileRow tile={<IconTile><FolderIcon animate={false} /></IconTile>} name="Q3 planning" meta="12 notes · edited today" trail={<Badge glyph={<LockIcon animate={false} />}>Private</Badge>} />
            <TileRow tile={<IconTile><CalendarIcon animate={false} /></IconTile>} name="Offsite" meta="3 days · 14 people" />
            <TileRow tile={<IconTile led="failed"><DocumentIcon animate={false} /></IconTile>} name="Contract draft" meta="Upload failed · retry" trail={<Badge led="failed">Failed</Badge>} />
            <TileRow tile={<IconTile>AC</IconTile>} name="Acme Corp" meta="Workspace · 8 members" />
          </ul>
        </Stage>
        <CodeScreen tabs={USAGE} />
      </section>

      <UsageSection
        agent={agentGuide}
        example={`import { FolderIcon } from '@unlocalhosted/metalui/icons';

<IconTile><FolderIcon /></IconTile>
<IconTile led="failed">AC</IconTile>
<IconTile size="hero" shape="round" look="raised"><FolderIcon /></IconTile>`}
      />

      <Section id="details" title="Details">
        <div className="flex flex-col gap-56">
          <Beat
            id="looks"
            title="Sunk or raised"
            setup="Two of our materials, not five fills. Sunk is the default: the mark is cut into the thing it belongs to, the window an alert draws. Raised is the small plate, for a tile that must stand out of a flat card, such as an app or an integration you pick. There is no keycap look: raised at key height with a cap says press me, and a tile is never pressed."
            caption="Same glyph, two materials. In one list, keep one look, or some rows look pressable."
          >
            <Compare
              zoom={1.5}
              items={[
                { label: 'sunk', note: 'marks the thing it is cut into', lit: true, node: <IconTile size="large"><FolderIcon animate={false} /></IconTile> },
                { label: 'raised', note: 'stands out of a flat card', node: <IconTile size="large" look="raised"><FolderIcon animate={false} /></IconTile> },
              ]}
            />
          </Beat>

          <Beat
            id="state-changes"
            title="A state that changes"
            setup="A thing's state is the LED seated on the tile's top-right rim, where an alert seats its lamp; lower right stays a person's presence. The lamp holds steady, so a list of them is quiet. When the state changes it flickers once and settles lit. The words beside the tile always say the state."
            caption="Press Next state: only the first row's lamp flickers, once per change, and its line says the state."
            cost="none at rest: the flicker is one short opacity run, then nothing."
          >
            <States />
          </Beat>

          <Beat
            id="sizes"
            title="The field ladder, and hero"
            setup={`A tile stands level with the row or field beside it, so it takes the field's heights: compact ${T.compact.size}, regular ${T.regular.size}, large ${T.large.size}. Hero ${T.hero.size} is the one place a mark stands alone above words: an empty place, a feature card. The glyph grows with it (${T.compact.glyph} · ${T.regular.glyph} · ${T.large.glyph} · ${T.hero.glyph}); characters set in the engraved mono.`}
            caption="Compact, regular, large and hero, with a glyph and with characters."
          >
            <div className="flex flex-col items-center gap-20" data-testid="icon-tile-sizes">
              <div className="flex items-end gap-16">{SIZES.map((s) => <IconTile key={s} size={s}><FolderIcon animate={false} /></IconTile>)}</div>
              <div className="flex items-end gap-16">{SIZES.map((s) => <IconTile key={s} size={s} look="raised">AC</IconTile>)}</div>
            </div>
          </Beat>

          <Beat
            id="card-and-empty"
            title="A feature card and an empty place"
            setup="Above a title the tile leads: large on a card, hero in an empty place. Nothing else draws a picture there; one mark and a sentence say what a layered illustration would. The empty state's well is this tile at hero."
            caption="A feature card with a large tile; an empty place with a hero tile, what would be here, and how to start."
          >
            <div className="grid w-full max-w-[640px] grid-cols-1 items-start gap-24 sm:grid-cols-2" data-testid="icon-tile-uses">
              <Card data-testid="icon-tile-card">
                <IconTile size="large" look="raised"><RegionIcon animate={false} /></IconTile>
                <Card.Title>Regions</Card.Title>
                <Card.Description>Draw a box around notes to keep them together. A region moves, folds and filters as one.</Card.Description>
              </Card>
              <div role="status" className="grid justify-items-center gap-8 p-24 text-center" data-testid="icon-tile-empty">
                <IconTile size="hero"><BellIcon animate={false} /></IconTile>
                <p className="m-0 type-title text-ink">No reminders yet</p>
                <p className="m-0 type-body text-ink2">Pin a note to a time and it will wait here.</p>
                <div className="mt-8"><Button cap="primary">Add a reminder</Button></div>
              </div>
            </div>
          </Beat>

          <Beat
            id="round"
            title="Square or round"
            setup="Square is the window. Round sits in a list beside avatars, so a service or a team among people lines up with them. A person is still an avatar: their initials, their photo, their presence."
            caption="A round tile for a service in a list of people."
          >
            <ul className="m-0 flex w-full max-w-[360px] list-none flex-col p-0" data-testid="icon-tile-round">
              <TileRow tile={<Avatar name="Ana Rocha" presence="live" />} name="Ana Rocha" meta="Editor" />
              <TileRow tile={<IconTile shape="round"><SettingsIcon animate={false} /></IconTile>} name="Build bot" meta="Posts when a build ends" />
              <TileRow tile={<Avatar name="Marta Lind" />} name="Marta Lind" meta="Viewer" />
            </ul>
          </Beat>
        </div>
      </Section>

      <Section id="workbench" title="Workbench" lede="Pick a look, a size, a shape, a glyph or characters, and a lamp in the Icon tile panel.">
        <Stage caption="the tile, magnified 2×">
          <Workbench />
        </Stage>
      </Section>

      <Section id="variants" title="SwiftUI">
        <SwiftCapture name="icon-tile" maxWidth={560} />
      </Section>

      <Section id="api" title="API">
        <TokenTable
          head={['Prop', 'Type', 'Default', 'Notes']}
          mono={[0, 1, 2]}
          rows={[
            ['children', 'ReactNode', '–', 'A glyph element (static: animate={false}), or one to three characters.'],
            ['look', "'sunk' | 'raised'", "'sunk'", 'The well’s window, or the small raised plate.'],
            ['size', "'compact' | 'regular' | 'large' | 'hero'", "'regular'", `${T.compact.size} · ${T.regular.size} · ${T.large.size} · ${T.hero.size}`],
            ['shape', "'square' | 'round'", "'square'", 'Round beside avatars.'],
            ['led', "'live' | 'waiting' | 'failed' | 'link' | 'off'", '–', 'The thing’s state on the top-right rim; a flicker on each later change. The words must say it too.'],
            ['label', 'string', '–', 'Names a tile that stands alone; otherwise it is hidden.'],
          ]}
        />
      </Section>

      <Section id="tokens" title="Tokens">
        <TokenTable
          rows={[
            ['--mu-r-icon-tile-<size>-size', `${T.compact.size} · ${T.regular.size} · ${T.large.size} · ${T.hero.size}`, 'the field ladder, and hero'],
            ['--mu-r-icon-tile-<size>-radius', `${T.compact.radius} · ${T.regular.radius} · ${T.large.radius} · ${T.hero.radius}`, 'square corners (round is a circle)'],
            ['--mu-r-icon-tile-<size>-glyph', `${T.compact.glyph} · ${T.regular.glyph} · ${T.large.glyph} · ${T.hero.glyph}`, 'the glyph inside'],
            ['--mu-r-icon-tile-<size>-font', `${T.compact.font} … ${T.hero.font}`, 'characters, engraved mono, uppercase'],
            ['--mu-r-icon-tile-lamp-inset', String(T.lamp.inset), 'how far the lamp sits past the top-right corner'],
            ['recipe-well-field · recipe-surface-raise-sm', 'recipe', 'the two looks'],
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
            { id: 'IT1', title: 'Marks, never pressed', body: 'The row, card or link around a tile is the target. A lone glyph you press is an icon button.', origin: 'Ours' },
            { id: 'IT2', title: 'No tones', body: 'A state is the lamp on the rim plus words: green live, amber waiting or urgent, red failed, blue a link’s kind, off idle. A brand’s logo keeps its own colours inside a neutral tile.', origin: 'Adapted · ReUI tones, restated as the LED' },
            { id: 'IT3', title: 'Level with its row', body: 'Sizes are the field ladder, so a tile lines up with the row or field beside it; hero only where a mark stands alone above words.', origin: 'Adapted · ReUI xs–xl' },
            { id: 'IT4', title: 'One mark, then words', body: 'An empty place, a feature or an onboarding step gets one engraved mark and a sentence, not a layered illustration.', origin: 'Ours · drops the icon stack' },
            { id: 'IT5', title: 'A person is an avatar', body: 'Initials of a person are an avatar, with presence lower right; a tile’s characters name a thing (a workspace, a file type).', origin: 'Ours' },
          ]}
        />
      </Section>
    </>
  );
}
