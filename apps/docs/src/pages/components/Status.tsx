import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Led, StatusBadge, Surface, type LedKind, type StatusTone } from '@unlocalhosted/metalui';
import reactSource from '../../../../../packages/metalui/src/components/status/status.tsx?raw';
import ledSource from '../../../../../packages/metalui/src/components/led/led.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import agentGuide from '../../../../../packages/metalui/src/components/status/status.agent.md?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalStatus.swift?raw';
import { Bench, PageHeader, Rules, Section, SourceTabs, TokenTable } from '../../ui/doc';
import { UsageSection } from '../../ui/Usage';
import { SwiftCapture } from '../../ui/SwiftCapture';
import { StatusXray } from '../../ui/xray/StatusXray';

const KINDS = [['live', 'live · ok'], ['waiting', 'waiting · urgent'], ['failed', 'failed'], ['link', 'link kind'], ['off', 'off']] as const;
const LIT: LedKind[] = ['live', 'waiting', 'failed', 'link'];
/** The page's badges: one per state, each with its own gesture and its own words. */
const BADGES: { led: LedKind; words: string; hint?: string }[] = [
  { led: 'live', words: 'SYNC LIVE' },
  { led: 'waiting', words: 'SYNCING' },
  { led: 'failed', words: 'SYNC OFFLINE · ADD KEY TO KEYCHAIN', hint: 'security add-generic-password -s example-service -a default -w' },
  { led: 'off', words: 'SYNC PAUSED' },
];
const WORDS: Record<LedKind, string> = { live: 'SYNC LIVE', waiting: 'SYNCING', failed: 'SYNC FAILED', link: 'LINKED', off: 'SYNC PAUSED' };
const TONES: StatusTone[] = ['quiet', 'plate', 'strong'];

/** The five lamps, each named in words beside it. */
function Lamps() {
  return (
    <div className="flex flex-wrap items-end justify-center gap-x-32 gap-y-16">
      {KINDS.map(([k, l]) => (
        <figure key={k} className="flex flex-col items-center gap-8" data-lamp={k}><Led kind={k} /><figcaption className="type-label text-ink2">{l}</figcaption></figure>
      ))}
    </div>
  );
}

/* ── Transparent mode: three grounds the parts must hold their own on ── */

export type Ground = 'frost' | 'image' | 'graphite';
const GROUNDS: Ground[] = ['frost', 'image', 'graphite'];
/** Hard stripes and blocks in the lamps' own inks, for the frost to melt into a muddle. */
const BUSY = 'repeating-linear-gradient(90deg, #1f1f1f 0 14px, #ebebeb 14px 28px)';
const BLOCKS = [['8%', '#2FB673'], ['38%', '#F5BF55'], ['68%', '#D5392A']] as const;
/** A painted picture: a dusk sky over water, with a low sun; every lamp ink has a neighbour in it. */
const PICTURE = 'radial-gradient(circle at 80% 34%, #FFF1C2 0 5%, #FFB347 12%, rgba(255,179,71,0) 30%), radial-gradient(ellipse 60% 40% at 18% 100%, #0B2E24 0 40%, rgba(11,46,36,0) 100%), linear-gradient(180deg, #2B4C7E 0%, #7A4C8E 30%, #D8577A 50%, #F28C38 62%, #2E7D6B 63%, #184D40 82%, #0C2A22 100%)';

function GroundBox({ ground, children }: { ground: Ground; children: React.ReactNode }) {
  if (ground === 'frost') {
    return (
      <div className="relative overflow-hidden rounded-plate p-20" data-ground="frost">
        <div aria-hidden className="absolute inset-0" style={{ background: BUSY }} />
        {BLOCKS.map(([left, c]) => <div key={c} aria-hidden className="absolute top-[18%] h-[64%] w-[22%] rounded-plate" style={{ left, background: c }} />)}
        <Surface material="frost" radius="card" className="flex flex-col items-center gap-14 p-16">{children}</Surface>
      </div>
    );
  }
  if (ground === 'image') {
    return <div className="flex flex-col items-center gap-14 rounded-plate p-36" data-ground="image" style={{ background: PICTURE }}>{children}</div>;
  }
  // the graphite colorway, whatever the page's: the parts resolve their graphite recipe here
  return <div data-mu-colorway="graphite" className="flex flex-col items-center gap-14 rounded-plate p-36" data-ground="graphite" style={{ background: 'var(--mu-page-dark)' }}>{children}</div>;
}

function Grounds() {
  return (
    <div className="grid w-full gap-16 md:grid-cols-3" data-testid="status-grounds">
      {GROUNDS.map((g) => (
        <figure key={g} className="flex flex-col gap-8">
          <GroundBox ground={g}>
            <span className="inline-flex items-center gap-14">{KINDS.map(([k]) => <Led key={k} kind={k} />)}</span>
            <StatusBadge led="live" solid>SYNC LIVE</StatusBadge>
            <StatusBadge led="waiting" tone="quiet" solid>SYNCING</StatusBadge>
            <StatusBadge led="failed" tone="strong" solid gesture="steady">SYNC FAILED</StatusBadge>
          </GroundBox>
          <figcaption className="type-label text-center text-ink2">over {g === 'image' ? 'an image' : g}</figcaption>
        </figure>
      ))}
    </div>
  );
}

/* ── Colour-blind check: the same lamps through simulated deuteranopia and protanopia ── */

// Machado, Oliveira & Fernandes (2009), severity 1, applied in linear RGB (the filter's default space).
const CVD = {
  deuteranopia: '0.367322 0.860646 -0.227968 0 0 0.280085 0.672501 0.047413 0 0 -0.01182 0.04294 0.968881 0 0 0 0 0 1 0',
  protanopia: '0.152286 1.052583 -0.204868 0 0 0.114503 0.786281 0.099216 0 0 -0.003882 -0.048116 1.051998 0 0 0 0 0 1 0',
} as const;

function ColourBlind() {
  return (
    <div className="flex w-full flex-col items-center gap-24" data-testid="status-cvd">
      <svg aria-hidden width="0" height="0" className="absolute">
        {Object.entries(CVD).map(([id, m]) => <filter key={id} id={`mu-${id}`}><feColorMatrix type="matrix" values={m} /></filter>)}
      </svg>
      {(['normal', ...Object.keys(CVD)] as const).map((v) => (
        <div key={v} className="grid w-full max-w-[640px] grid-cols-[120px_1fr] items-center gap-16" data-vision={v}>
          <span className="type-label text-ink2">{v === 'normal' ? 'as drawn' : v}</span>
          <div className="flex flex-wrap items-center gap-x-20 gap-y-10" style={v === 'normal' ? undefined : { filter: `url(#mu-${v})` }}>
            {LIT.map((k) => <span key={k} data-lamp={k} className="inline-flex"><Led kind={k} /></span>)}
            {LIT.map((k) => <StatusBadge key={k} led={k} tone="strong" gesture="steady">{k}</StatusBadge>)}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function StatusPage() {
  const d = useDialKit('Status badge', {
    led: { type: 'select', options: KINDS.map(([k]) => k), default: 'waiting' },
    tone: { type: 'select', options: TONES, default: 'plate' },
    solid: false,
    ground: { type: 'select', options: ['page', ...GROUNDS], default: 'image' },
  });
  const kind = d.led as LedKind;
  const one = <StatusBadge led={kind} tone={d.tone as StatusTone} solid={d.solid}>{WORDS[kind]}</StatusBadge>;
  return (
    <>
      <PageHeader title="LED and status badge" lede="A tiny lamp in its own socket, and a badge that names a state beside it. Five meanings, never colour alone: green live, amber waiting, red failed, blue a link, off idle; each state also has its own gesture, and the words always say it. The badge is not a button; hover or focus it to see what fixes it." />
      <Section title="LEDs and badges" lede="The lamp sits in a dark bezel with a light lip under it, so it brings its own ground; lit, it glows in its ink, off it is a dull lens. The badge is a raised plate with a defined edge, and its words are the label type in ink2.">
        <Bench caption="the five LEDs · a badge per state, each with its own gesture (hover the offline one)">
          <div className="flex flex-col items-center gap-28" data-testid="status-bench">
            <Lamps />
            <div className="flex flex-wrap justify-center gap-12">
              {BADGES.map((b) => <StatusBadge key={b.led} led={b.led} hint={b.hint}>{b.words}</StatusBadge>)}
            </div>
          </div>
        </Bench>
        <SwiftCapture name="status" maxWidth={720} />
      </Section>
      <UsageSection
        agent={agentGuide}
        example={`<StatusBadge led="live">SYNC LIVE</StatusBadge>
<StatusBadge led="waiting" tone="quiet">SYNCING</StatusBadge>
<StatusBadge led="failed" hint="Add a key to Keychain">SYNC OFFLINE</StatusBadge>`}
      />

      <Section title="Not colour alone" lede="Colour is the fastest cue and the least reliable one. Each state is also a gesture and always words, so it reads in greyscale, for colour-blind people and at a glance across the room.">
        <TokenTable
          head={['State', 'Lamp', 'Gesture', 'Words say']}
          mono={[0, 2]}
          rows={[
            ['live', 'green, steady glow', 'steady', 'what is on: SYNC LIVE'],
            ['waiting', 'amber', 'breathe, while it lasts', 'what is in progress: SYNCING'],
            ['failed', 'red', 'blink2 once, then lit', 'what stopped and what fixes it'],
            ['link', 'blue', 'steady', 'what it points to'],
            ['off', 'a dark lens, no glow', 'steady', 'that it is idle: SYNC PAUSED'],
          ]}
        />
      </Section>
      <Section title="Tones" lede="Quiet is the lamp and the words with no plate, for dense places (a table, a list). Plate is the default. Strong tints the plate in the state's ink for an alert that has to be seen; use it for one thing at a time.">
        <Bench caption="quiet · plate · strong, for each lit state">
          <div className="grid gap-14" data-testid="status-tones">
            {TONES.map((t) => (
              <div key={t} className="grid grid-cols-[64px_repeat(4,auto)] items-center justify-center gap-12" data-tone-row={t}>
                <span className="type-label text-ink2">{t}</span>
                {LIT.map((k) => <StatusBadge key={k} led={k} tone={t} gesture="steady">{WORDS[k]}</StatusBadge>)}
              </div>
            ))}
          </div>
        </Bench>
      </Section>
      <Section id="transparent" title="Transparent mode" lede="Transparent mode is a status part on a ground that lets what is behind show through: a frosted surface, glass, an image or a video. There the lamp needs nothing (its socket is its ground), and the badge is solid: its plate stays opaque with a keyline round the edge, and a quiet badge takes its plate back. Pass solid on such grounds; Reduce Transparency turns it on everywhere.">
        <Bench caption="solid badges over frost, an image and graphite (plate, quiet, strong)">
          <Grounds />
        </Bench>
        <SwiftCapture name="status-grounds" maxWidth={900} />
      </Section>
      <Section title="Colour-blind check" lede="The lit lamps and the strong badges through simulated deuteranopia and protanopia. Green leans blue, amber leans yellow and red is deep, so they part by lightness where hue fails: every pair of lit states stays at least ΔE 20 apart (CIEDE2000) under both, in both colorways.">
        <Bench caption="Machado 2009, severity 1">
          <ColourBlind />
        </Bench>
      </Section>
      <Section title="Workbench" lede="Pick a state, a tone and a ground in the Status badge panel; turn solid on and off to see what transparent mode adds.">
        <Bench caption={`${d.led} · ${d.tone}${d.solid ? ' · solid' : ''} · on ${d.ground}`}>
          <div data-testid="status-workbench" className="w-full max-w-[420px]">
            {d.ground === 'page' ? <div className="flex justify-center p-36">{one}</div> : <GroundBox ground={d.ground as Ground}>{one}</GroundBox>}
          </div>
        </Bench>
      </Section>
      <Section id="x-ray" title="X-ray" lede="See what the lamp and the badge are made of. Click an icon to learn about one part and change it.">
        <StatusXray />
      </Section>
      <Section title="Source">
        <SourceTabs tabs={[
          { id: 'react', label: 'React', code: reactSource },
          { id: 'led', label: 'LED', code: ledSource },
          { id: 'css', label: 'CSS', code: cssSource },
          { id: 'swift', label: 'SwiftUI', code: swiftSource },
          { id: 'agent', label: 'Agent guide', code: agentGuide },
        ]} />
      </Section>
      <Section title="Rules">
        <Rules rules={[
          { id: 'D1', title: 'Never colour alone', body: 'An LED sits beside the words that name the state, and each state has its own gesture: live steady, waiting breathing, failed two blinks, off dark.', origin: 'reference brief' },
          { id: 'D2', title: 'One LED per object', body: 'Green live, amber waiting or urgent, red failed, blue link, off idle; nothing else, and no new colours.', origin: 'reference brief' },
          { id: 'D3', title: 'Not pressable', body: 'The badge is a state; the fix is its hint, shown on hover and focus.', origin: 'reference design' },
          { id: 'D4', title: 'The lamp brings its ground', body: 'A lamp always sits in its socket: a dark bezel and a light lip. It never relies on the surface under it to be seen.', origin: 'Ours' },
          { id: 'D5', title: 'Solid on see-through grounds', body: 'On frost, glass or an image, the badge is solid (a keyline on an opaque plate). A quiet badge never sits on a see-through ground without its plate.', origin: 'Ours' },
          { id: 'D6', title: 'Strong is for one alert', body: 'A tinted plate shouts. One strong badge in a view; the rest plate or quiet.', origin: 'Ours' },
        ]} />
      </Section>
    </>
  );
}
