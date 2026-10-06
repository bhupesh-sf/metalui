import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Rating, type RatingSize } from '@unlocalhosted/metalui';
import reactSource from '../../../../../packages/metalui/src/components/rating/rating.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalRating.swift?raw';
import agentSource from '../../../../../packages/metalui/src/components/rating/rating.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * RATING PAGE · how good something is, where it is used
 *
 *   review    a place's average with its count, and your own rating under it; yours moves the
 *             average and the count, so the read-only one sweeps too
 *   list      a playlist's rows, compact, rated in place
 *   sizes     compact, regular, large
 *   states    decimals (4.3, 2.5, 0.8), none, disabled
 *   tune      DialKit: the ghost, the dip, the sweep's stagger and fade, max and size
 * ───────────────────────────────────────────────────────── */

const WORDS = ['Poor', 'Fair', 'Good', 'Very good', 'Excellent'];
const ROW = 'flex items-center justify-between gap-16';

function Review() {
  const [mine, setMine] = React.useState<number | null>(null);
  // 1,284 earlier ratings averaging 4.3; yours joins them.
  const total = 4.3 * 1284 + (mine ?? 0);
  const count = 1284 + (mine == null ? 0 : 1);
  return (
    <div className="grid w-full max-w-[360px] gap-16">
      <div className={ROW}>
        <span className="type-ui text-ink">Tram 28 café</span>
        <Rating readOnly value={total / count} count={count} aria-label="Average" />
      </div>
      <div className={ROW}>
        <span className="type-ui text-ink2">Your rating</span>
        <Rating value={mine} onValueChange={setMine} labels={WORDS} aria-label="Your rating" />
      </div>
    </div>
  );
}

const SONGS = [
  { title: 'Fado do mar', time: '3:41', rating: 4 },
  { title: 'Lisboa à noite', time: '4:05', rating: null },
  { title: 'Tejo azul', time: '2:58', rating: 2 },
];

function Playlist() {
  return (
    <ul className="m-0 grid w-full max-w-[420px] list-none gap-2 p-0">
      {SONGS.map((s) => (
        <li key={s.title} className={`${ROW} type-ui text-ink`}>
          <span className="min-w-0 flex-1 truncate">{s.title}</span>
          <span className="type-meta tabular-nums text-ink3">{s.time}</span>
          <Rating size="compact" defaultValue={s.rating} showValue={false} aria-label={`Rate ${s.title}`} />
        </li>
      ))}
    </ul>
  );
}

const SIZES: RatingSize[] = ['compact', 'regular', 'large'];

function States() {
  return (
    <div className="grid w-full max-w-[360px] gap-12">
      {[4.3, 2.5, 0.8].map((v) => (
        <div key={v} className={ROW}><span className="type-meta text-ink3">read-only {v}</span><Rating readOnly value={v} aria-label="Average" /></div>
      ))}
      <div className={ROW}><span className="type-meta text-ink3">none</span><Rating readOnly value={null} aria-label="Average" /></div>
      <div className={ROW}><span className="type-meta text-ink3">disabled</span><Rating defaultValue={3} disabled aria-label="Rating, closed" /></div>
    </div>
  );
}

/* RATING TUNER: the page's DialKit panel. ghost and dip set the hover preview and the press; stagger
 * and fade the sweep (the meter's); max and size reshape it; jump swings the value end to end. */
function Tuner() {
  const [value, setValue] = React.useState<number | null>(3);
  const d = useDialKit('Rating', {
    ghost: [0.38, 0, 1],
    dip: [0.86, 0.6, 1],
    stagger: [16, 0, 120],
    fade: [90, 0, 400],
    max: [5, 3, 10],
    size: { type: 'select', options: SIZES, default: 'regular' },
    jump: { type: 'action', label: 'Jump end to end' },
  }, {
    onAction: (action) => { if (action === 'jump') setValue((v) => (v === 1 ? Math.round(d.max) : 1)); },
  });
  const vars = {
    '--mu-r-rating-ghost-opacity': d.ghost,
    '--mu-r-rating-press-scale': d.dip,
    '--mu-r-meter-lamp-stagger': `${d.stagger}ms`,
    '--mu-r-meter-lamp-fade': `${d.fade}ms`,
  } as React.CSSProperties;
  return (
    <div data-testid="rating-tuner" className="flex w-full justify-center" style={vars}>
      <Rating value={value} onValueChange={setValue} max={Math.round(d.max)} size={d.size as RatingSize} aria-label="Tuned rating" />
    </div>
  );
}

export default function RatingPage() {
  return (
    <ComponentPage
      capture="rating"
      title="Rating"
      lede="How good something is, on a short scale. Not stars: the slider's groove cut into one detent per point and filled with its green, so a 4.3 fills exactly a third of the fifth. Read it at a glance, or press a detent to rate; press it again to clear."
      play={{ lede: 'Hover your rating to see what a press would change, then press. Press the same detent again to clear it. The average moves with you.', caption: 'a review', node: <Review /> }}
      more={[
        { id: 'list', title: 'In a list', lede: 'Compact detents in a playlist\'s rows, rated in place; the row\'s title says what each one rates.', node: <Playlist /> },
        { id: 'sizes', title: 'Sizes', lede: 'compact 28, regular 32 and large 44: the row\'s height is the hit area, and each detent\'s runs into the next.', node: <div className="grid justify-items-center gap-12">{SIZES.map((s) => <Rating key={s} size={s} defaultValue={4} aria-label={`${s} rating`} />)}</div> },
        { id: 'states', title: 'Every state', lede: 'A decimal fills that share of its detent, cut square. None reads "Not rated"; disabled is 40 %.', node: <States /> },
        { id: 'tune', title: 'Tune the detents', lede: 'The Rating panel sets the hover ghost, the press dip, the sweep\'s stagger and fade (the meter\'s), the scale and the size. Jump swings it end to end.', node: <Tuner /> },
      ]}
      usage={`<Rating readOnly value={4.3} count={1284} aria-label="Average" />
<Rating value={mine} onValueChange={setMine} labels={['Poor', 'Fair', 'Good', 'Very good', 'Excellent']} aria-label="Your rating" />`}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'swift', label: 'SwiftUI', code: swiftSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'RA1', title: 'An amount, not a sticker', body: 'Detents fill like the slider they are cut from, so a decimal is shown exactly instead of rounded to half a star.', origin: 'Ours' },
        { id: 'RA2', title: 'Hover shows the change', body: 'Only the detents a press would change turn to a ghost, and the readout says what you would set.', origin: 'Ours' },
        { id: 'RA3', title: 'A radio group', body: 'Each point is a named choice; a press sets the detent under the finger, and arrows move and choose.', origin: 'WAI-ARIA APG' },
        { id: 'RA4', title: 'One colour', body: 'A low rating is not a fault: no amber, no red, and the number always says the value.', origin: 'Ours' },
      ]}
    />
  );
}
