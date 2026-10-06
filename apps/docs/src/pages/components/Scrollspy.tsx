import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Scrollspy, type ScrollspyItem } from '@unlocalhosted/metalui';
import { type SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';
import reactSource from '../../../../../packages/metalui/src/components/scrollspy/scrollspy.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalScrollspy.swift?raw';
import agentSource from '../../../../../packages/metalui/src/components/scrollspy/scrollspy.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * SCROLLSPY PAGE · the section being read, where it is used
 *
 *   rail     a travel guide in its own scroll pane, its table of contents beside it (a scroller
 *            other than the window); Sintra has two subsections (level 2)
 *   strip    the same guide with the contents as a strip of tabs above it, compact
 *   page     this site's own "On this page", on the right: the window, the masthead's offset, the hash
 *   tune     DialKit: orientation, size, the marker's spring and time, the offset line
 * ───────────────────────────────────────────────────────── */

const GUIDE: { id: string; title: string; level?: 2; body: string }[] = [
  { id: 'arrival', title: 'Arrival', body: 'The airport is twenty minutes from the centre by metro; the red line meets the green at Alameda. Buy a Viva Viagem card at the machines and load it with zapping credit: it works on trams, buses and the ferries too.' },
  { id: 'alfama', title: 'Alfama', body: 'The oldest quarter survived the 1755 earthquake, so its streets still follow the hill, not a plan. Walk down from the castle in the late afternoon, when the light comes across the river and the tiles warm up.' },
  { id: 'tram', title: 'Tram 28', body: 'The yellow tram climbs from Martim Moniz to Campo de Ourique through Graça, Alfama and Chiado. Board at the first stop before nine, or after six, to get a seat by the window.' },
  { id: 'belem', title: 'Belém', body: 'Take the 15 along the river. The monastery opens at ten; the custard tarts are next door and the queue moves faster than it looks. The tower is best seen from the water side.' },
  { id: 'sintra', title: 'Sintra', body: 'Forty minutes by train from Rossio. Go on a weekday, start early, and keep the afternoon for the walk between the palaces through the forest.' },
  { id: 'pena', title: 'Pena Palace', level: 2, body: 'Painted red and yellow on the highest hill. The terrace walk goes all the way round; the clouds come and go below it.' },
  { id: 'regaleira', title: 'Quinta da Regaleira', level: 2, body: 'A garden of grottoes and a well you walk down into, nine landings deep. Bring a torch for the tunnels at the bottom.' },
  { id: 'leaving', title: 'Leaving', body: 'Leave an hour for the airport on a weekday morning. The last ferry back from Cacilhas is just before midnight.' },
];

function Guide({ prefix, label, orientation = 'vertical', size = 'regular', offset }: { prefix: string; label: string; orientation?: 'vertical' | 'horizontal'; size?: 'regular' | 'compact'; offset?: number }) {
  const pane = React.useRef<HTMLDivElement>(null);
  const items: ScrollspyItem[] = GUIDE.map((s) => ({ id: `${prefix}-${s.id}`, label: s.title, level: s.level }));
  const spy = <Scrollspy aria-label={label} items={items} root={pane} orientation={orientation} size={size} offset={offset} className={orientation === 'vertical' ? 'w-[180px] flex-none' : 'min-w-0'} />;
  return (
    <div className={orientation === 'vertical' ? 'flex w-full max-w-[640px] items-start gap-20' : 'grid w-full max-w-[560px] gap-12'}>
      {orientation === 'horizontal' && spy}
      <div ref={pane} tabIndex={0} aria-label={`${label}: the guide`} role="region" className="h-[320px] min-w-0 flex-1 overflow-y-auto rounded-card recipe-well-field px-20 pb-20 outline-none focus-visible:focus-ring">
        {GUIDE.map((s) => (
          <section key={s.id} id={`${prefix}-${s.id}`} className="pt-16 outline-none">
            <h3 className={s.level ? 'm-0 mb-4 type-ui text-ink2' : 'm-0 mb-4 type-title text-ink'}>{s.title}</h3>
            <p className="m-0 type-body text-ink2">{s.body}</p>
          </section>
        ))}
        <div className="h-[120px]" aria-hidden />
      </div>
      {orientation === 'vertical' && spy}
    </div>
  );
}

function SpyTuner() {
  const d = useDialKit('Scrollspy', {
    orientation: { type: 'select', options: ['vertical', 'horizontal'], default: 'vertical' },
    size: { type: 'select', options: ['regular', 'compact'], default: 'regular' },
    spring: { type: 'select', options: SPRING_NAMES, default: 'settle' },
    slow: [1, 1, 10],
    offset: [0, 0, 120],
  });
  const vertical = d.orientation === 'vertical';
  // The rail's marker travels on settle, the strip's thumb on part: the dial plays the one in use.
  const vars = springVars(vertical ? 'settle' : 'part', d.spring as SpringName, d.slow) as React.CSSProperties;
  return (
    <div data-testid="scrollspy-tuner" className="flex justify-center" style={vars}>
      <Guide key={`${d.orientation}`} prefix="tuned" label="Tuned guide" orientation={vertical ? 'vertical' : 'horizontal'} size={d.size === 'compact' ? 'compact' : 'regular'} offset={d.offset} />
    </div>
  );
}

export default function ScrollspyPage() {
  return (
    <ComponentPage
      title="Scrollspy"
      capture="scrollspy"
      lede="Marks the section being read in a table of contents. As you scroll, one marker glides to the section at the top; pick an entry and the page scrolls there, landing clear of a sticky header. This page's own On this page, on the right, is one."
      play={{ lede: 'Scroll the guide and watch the marker follow, or pick Sintra and the guide scrolls there while the marker waits for it.', caption: 'a guide in its own scroll pane, its contents beside it', node: <div className="flex w-full justify-center"><Guide prefix="spy" label="Guide contents" /></div> }}
      more={[
        { id: 'strip', title: 'A strip of tabs', lede: 'Lying across, the contents are the switcher\'s track and thumb, the Tabs look. A strip wider than its box scrolls itself to keep the current entry in view; it never scrolls the page.', node: <div className="flex w-full justify-center"><Guide prefix="strip" label="Guide strip" orientation="horizontal" size="compact" /></div> },
        { id: 'tune', title: 'Tune the marker', lede: 'The Scrollspy panel turns the contents across or upright, sets the entry size, the spring the marker travels on and its time, and the offset line a section must cross (0 here: the pane has no header).', node: <SpyTuner /> },
      ]}
      usage={`<Scrollspy
  aria-label="On this page"
  items={[
    { id: 'install', label: 'Install' },
    { id: 'usage', label: 'Usage' },
    { id: 'props', label: 'Props', level: 2 },
  ]}
  hash
/>`}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'swift', label: 'SwiftUI', code: swiftSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'SS1', title: 'One marker travels', body: 'The current entry is one plate (or the strip\'s thumb) that glides; nothing blinks on and off.', origin: 'Ours' },
        { id: 'SS2', title: 'A jump travels once', body: 'Pick an entry and the marker goes straight there and waits for the scroll, instead of ticking through every section passed.', origin: 'Ours' },
        { id: 'SS3', title: 'Land clear of the header', body: 'The offset is the scroller\'s scroll-padding-top unless you set one: one fact, used by native jumps and this.', origin: 'CSS Scroll Snap' },
        { id: 'SS4', title: 'A place, not a page', body: 'The current entry says aria-current="location"; the hash is replaced, never pushed, so Back still leaves the page.', origin: 'WAI-ARIA' },
      ]}
    />
  );
}
