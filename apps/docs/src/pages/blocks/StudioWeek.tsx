import * as React from 'react';
import { useDialKit } from 'dialkit';
import { type SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import { StudioWeek } from '../../blocks/studio-week/studio-week';
import source from '../../blocks/studio-week/studio-week.tsx?raw';
import { BlockPage } from '../../ui/BlockPage';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';

/* ─────────────────────────────────────────────────────────
 * STUDIO WEEK TUNER: the page's DialKit panel
 *
 *   scan     the spring whose duration the matrix's redraw scan takes
 *   slow     stretches time, to watch the scan and the drum
 * ───────────────────────────────────────────────────────── */

function Tuned() {
  const d = useDialKit('Studio week', {
    scan: { type: 'select', options: SPRING_NAMES, default: 'settle' },
    slow: [1, 1, 10],
  });
  const vars = springVars('settle', d.scan as SpringName, d.slow) as React.CSSProperties;
  return <div data-testid="studio-week-tuner" className="w-full" style={vars}><StudioWeek studio="Tuned studio" /></div>;
}

export default function StudioWeekPage() {
  return (
    <BlockPage
      title="Studio week"
      lede="One week of a workspace on the canvas, read on the studio's own instruments: how much was written, formed, confirmed and revisited, hour by hour, and how well the recognizer read each kind of cue."
      play={{
        lede: 'Press a readout to put it on the matrix, step back a week with ‹, and read any hour with the pointer or the arrow keys. The dark hours on the right are still to come; the amber dot is now.',
        caption: 'live block · a sample studio',
        node: <StudioWeek />,
      }}
      usage={{
        file: 'src/blocks/studio-week.tsx',
        code: `import { StudioWeek } from '@/blocks/studio-week';

export function Review() {
  return <StudioWeek studio="Acme Studio" />;
}

// weekOf(offset) builds the sample week. Replace it with your workspace's events grouped by
// day and hour: notes written, regions formed, cues recognised and confirmed, minutes spent
// in the past. The readouts, matrix, sparklines and meters all derive from that one shape.`,
      }}
      madeOf={[
        { label: 'Dot display', to: '/components/dot-display' },
        { label: 'Meter', to: '/components/meter' },
        { label: 'LED', to: '/components/led' },
        { label: 'Icon button', to: '/components/icon-button' },
        { label: 'Tooltip', to: '/components/tooltip' },
        { label: 'Radio (Base UI)', to: '/components/radio' },
        { label: 'The drum', to: '/foundations/transitions' },
      ]}
      more={[{ id: 'tune', title: 'Tune it', lede: 'The Studio week panel picks the spring whose duration the matrix scan takes, and stretches time.', node: <Tuned /> }]}
      source={source}
      rules={[
        { id: 'SW1', title: 'A week, looked back on', body: 'A team or a person reviewing how a workspace was used: when the writing happened, what came of it, how well cues were read.', origin: 'Use it for' },
        { id: 'SW2', title: 'Not a live monitor', body: 'It shows finished and passing hours; for what is happening now, use the status lamps where the work is.', origin: 'Not for' },
        { id: 'SW3', title: 'One measure on the matrix', body: 'The readouts are a radio group: one is on the matrix at a time, pressed with its lamp lit.', origin: 'Ours' },
        { id: 'SW4', title: 'Change is said in words', body: 'Each readout says how it moved on last week ("12 more than last week"); the lamp beside it is extra. Time in the past has a blue lamp: it is neither good nor bad.', origin: 'Accessibility' },
        { id: 'SW5', title: 'Every hour can be read', body: 'The matrix is an image with a name; focused, the arrows move a frame hour by hour and the line under it says what happened, politely.', origin: 'Keyboard' },
        { id: 'SW6', title: 'A display redraws, it does not tween', body: 'A new measure or week re-plots the matrix as a left-to-right scan over the settle spring\'s duration; figures turn on the drum.', origin: 'Motion' },
        { id: 'SW7', title: 'Reduce Motion', body: 'The matrix re-plots at once, the drum crossfades and lamps change without a gesture.', origin: 'Motion' },
        { id: 'SW8', title: 'It measures itself', body: 'A named container (@container/block): readouts go two by two under 34rem, and the recognizer moves under the matrix under 44rem.', origin: 'Layout' },
      ]}
    />
  );
}
