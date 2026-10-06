import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Link } from '@unlocalhosted/metalui';
import { type SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';
import reactSource from '../../../../../packages/metalui/src/components/link/link.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import agentSource from '../../../../../packages/metalui/src/components/link/link.agent.md?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalLink.swift?raw';
import { ComponentPage } from '../../ui/ComponentPage';
import { LinkXray } from '../../ui/xray/LinkXray';
import './link-states.css';

/* ─────────────────────────────────────────────────────────
 * LINK PAGE
 *
 *   playground  a paragraph: a plain link, an external one, a download, and one that loads
 *   states      every state at once, held still, in bone and in graphite
 *   x-ray       the real link, handled: states, the line, the hover, the press, the kinds
 *   tuner       the Link line panel: the line at rest, how far it rises, its tint, its spring
 * ───────────────────────────────────────────────────────── */

/** How long the playground's in-app link waits for its route. */
const ROUTE_MS = 1800;

function Paragraph({ label }: { label: string }) {
  const [loading, setLoading] = React.useState(false);
  React.useEffect(() => {
    if (!loading) return;
    const t = window.setTimeout(() => setLoading(false), ROUTE_MS);
    return () => clearTimeout(t);
  }, [loading]);
  return (
    <p className="m-0 max-w-[440px] type-lead text-ink" aria-label={label}>
      Export the region as a PDF, then read <Link href="#export">the export guide</Link> for paper sizes, or see how{' '}
      <Link href="https://www.w3.org/WAI/WCAG22/Understanding/use-of-color" external>links stay visible without colour</Link>. Agents can take{' '}
      <Link href="/AI.md" download fileSize="200 KB">the whole agent guide</Link> with them, or open{' '}
      <Link href="#region" loading={loading} onClick={(e) => { e.preventDefault(); setLoading(true); }}>the Lisbon region</Link>.
    </p>
  );
}

type Still = { name: string; node: React.ReactNode };
/** Every state, held: the pointer states as stills (data-hovered, data-pressed, data-focused). */
const STILLS: Still[] = [
  { name: 'rest', node: <Link href="#rest">the export guide</Link> },
  { name: 'hover', node: <Link href="#hover" data-hovered="">the export guide</Link> },
  { name: 'pressed', node: <Link href="#pressed" data-pressed="">the export guide</Link> },
  { name: 'focus', node: <Link href="#focus" data-focused="">the export guide</Link> },
  // a link to this very page is in the history, so it is really :visited
  { name: 'visited', node: <Link href="/components/link" visited>the export guide</Link> },
  { name: 'current', node: <Link href="/components/link" aria-current="page">Link</Link> },
  { name: 'disabled', node: <Link href="#off" disabled reason="Export is on the Pro plan">the export guide</Link> },
  { name: 'loading', node: <Link href="#loading" loading>the Lisbon region</Link> },
  { name: 'external', node: <Link href="https://www.w3.org/WAI/" external>the WAI notes</Link> },
  { name: 'download', node: <Link href="/AI.md" download fileSize="200 KB">Tram map.pdf</Link> },
  { name: 'quiet', node: <Link href="#quiet" kind="quiet">Lisbon</Link> },
  { name: 'standalone', node: <Link href="#all" kind="standalone">All regions</Link> },
];

/** The strip in one colorway, on that colorway's own page ground. */
function Strip({ colorway }: { colorway: 'bone' | 'graphite' }) {
  return (
    <figure className="m-0 flex flex-col gap-8">
      <div data-mu-colorway={colorway} data-testid={`link-states-${colorway}`} className="link-states rounded-plate type-body text-ink">
        {STILLS.map((s) => (
          <div key={s.name} className="link-state" data-state={s.name}>
            <span className="link-state-specimen">{s.node}</span>
            <span className="type-label text-ink3">{s.name}</span>
          </div>
        ))}
      </div>
      <figcaption className="type-label text-center text-ink2">{colorway}</figcaption>
    </figure>
  );
}

function States() {
  return (
    <div className="grid w-full gap-16 lg:grid-cols-2">
      <Strip colorway="bone" />
      <Strip colorway="graphite" />
    </div>
  );
}

function LineTuner() {
  const d = useDialKit('Link line', {
    rest: [0.3, 0, 1],
    rise: [1.5, 0, 4],
    thickness: [1.5, 1, 3],
    tint: [7, 0, 20],
    spring: { type: 'select', options: SPRING_NAMES, default: 'settle' },
  });
  const vars = {
    ...springVars('settle', d.spring as SpringName),
    '--mu-r-link-underline-ink': `color-mix(in srgb, currentColor ${Math.round(d.rest * 100)}%, transparent)`,
    '--mu-r-link-hover-rise': `${d.rise}px`,
    '--mu-r-link-hover-thickness': `${d.thickness}px`,
    '--mu-r-link-hover-tint': `${d.tint}%`,
  } as React.CSSProperties;
  return <div data-testid="link-line-tuner" style={vars}><Paragraph label="Tuned paragraph" /></div>;
}

export default function LinkPage() {
  return (
    <ComponentPage
      title="Link"
      lede="An inline link in text. It is always underlined, so colour never carries it alone. Hovered, the line rises and darkens over a faint tint; pressed, the words sink a step. An external link's arrow leaves its frame, a download's arrow drops, and a link whose route is on its way runs along its line."
      play={{ lede: 'Hover the links, press them, or Tab to them. The last one waits for its route.', caption: 'in a sentence · external · download · loading', node: <Paragraph label="Example paragraph" /> }}
      xray={<LinkXray />}
      capture="link"
      more={[
        { id: 'states', title: 'States', lede: 'Every state at once, held still, in both colorways. Only current and disabled lose the line; quiet keeps it for hover, where the list around it already says these are links.', node: <States /> },
        { id: 'tune', title: 'Tune the line', lede: 'The Link line panel sets how strong the line is at rest, how far it rises and thickens on hover, the tint behind the words, and the spring it rises on.', node: <LineTuner /> },
      ]}
      usage={`<p>
  Read <Link href="/guides/export">the export guide</Link>.
</p>

// A router's link keeps the look; loading until it lands
<Link render={<RouterLink to="/lisbon" />} loading={pending}>
  Lisbon
</Link>

<Link href="/regions" aria-current="page">Regions</Link>
<Link href="/notes/3" visited>the third note</Link>
<Link href="/export" disabled reason="On the Pro plan">
  Export
</Link>
<Link href="/porto" kind="quiet">Porto</Link>
<Link href="/regions" kind="standalone">All regions</Link>`}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'swift', label: 'SwiftUI', code: swiftSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'LK1', title: 'Always underlined', body: 'Colour alone never marks a link; the hairline is there in every state but current and disabled. Quiet links keep it for hover, and only where the context already says these are links.', origin: 'WCAG 1.4.1' },
        { id: 'LK2', title: 'Say where it goes', body: '"the export guide", never "click here".', origin: 'Ours' },
        { id: 'LK3', title: 'Leaving is marked', body: 'External links carry the external glyph and say they open a new tab.', origin: 'Ours' },
        { id: 'LK4', title: 'A download says so', body: 'A link with the download attribute carries the download glyph and, when known, the file size, outside the underline; assistive tech hears "download" and the size.', origin: 'Owner, 2026-09-30' },
        { id: 'LK5', title: 'Hover is something you see', body: 'The line rises and thickens over a faint tint, not only a colour change; pressed, the words sink a step like a key.', origin: 'Owner, 2026-09-30' },
        { id: 'LK6', title: 'Here is not a link away', body: 'A link to where you are (aria-current) has no line and full ink. An unavailable one says why in a tooltip, and stays focusable so the keyboard can hear it.', origin: 'Owner, 2026-09-30' },
      ]}
    />
  );
}
