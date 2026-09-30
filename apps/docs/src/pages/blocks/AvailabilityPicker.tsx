import * as React from 'react';
import { useDialKit } from 'dialkit';
import { type SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import { AvailabilityPicker } from '../../blocks/availability-picker/availability-picker';
import source from '../../blocks/availability-picker/availability-picker.tsx?raw';
import { BlockPage } from '../../ui/BlockPage';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';

/* ─────────────────────────────────────────────────────────
 * PICKER TUNER: the page's DialKit panel
 *
 *   arrive   the spring the time keys come in on (and the Confirm row opens on)
 *   slow     stretches time, to watch the keys arrive from the side the calendar moved
 * ───────────────────────────────────────────────────────── */

function Tuned() {
  const d = useDialKit('Availability', {
    arrive: { type: 'select', options: SPRING_NAMES, default: 'settle' },
    slow: [1, 1, 10],
  });
  const vars = springVars('settle', d.arrive as SpringName, d.slow) as React.CSSProperties;
  return (
    <div data-testid="availability-tuner" className="w-full" style={vars}>
      <AvailabilityPicker host={{ name: 'Tomás Reis', role: 'Founder', zone: 'Europe/Lisbon', about: 'Twenty minutes on your roadmap, and whether we are a fit.' }} />
    </div>
  );
}

export default function AvailabilityPickerPage() {
  return (
    <BlockPage
      title="Availability picker"
      lede="Book a call with someone: pick a length, a day in the next six weeks, one of their free times in your own time zone, and confirm."
      preview={{
        lede: 'Change the length, choose a day (weekends are off), switch the time zone, pick a time and Confirm. Change takes you back.',
        caption: 'live block · sample free times',
        node: <AvailabilityPicker />,
      }}
      use={[
        { id: 'U1', title: 'Someone else\'s free time', body: 'A person or a room with working hours, booked in fixed lengths: an intro call, office hours, a demo.' },
        { id: 'U2', title: 'A public booking page', body: 'The first and only screen a guest sees before a call; the host is named and the length is theirs to choose.' },
      ]}
      avoid={[
        { id: 'N1', title: 'Finding a time for several people', body: 'Overlapping calendars need a scheduling grid across people, not one host\'s column of times.' },
        { id: 'N2', title: 'Picking any date', body: 'A birthday or a due date is a DatePicker in a form; nothing here is about free time.' },
      ]}
      install={{
        file: 'src/blocks/availability-picker.tsx',
        usage: `import { AvailabilityPicker } from '@/blocks/availability-picker';

export function BookIntro() {
  return (
    <AvailabilityPicker
      host={{ name: 'Ana Rocha', role: 'Design engineer', zone: 'Europe/Lisbon', about: 'A first look at what you are building.' }}
      onBook={async ({ start, end, zone }) => {
        await fetch('/api/bookings', { method: 'POST', body: JSON.stringify({ start, end, zone }) });
      }}
    />
  );
}

// Replace freeHalfHours (the seeded sample) with the host's real free time: the half hours
// still open on a day, in their own zone. Lengths, the month's quiet days and the times follow.`,
      }}
      builtFrom={[
        { label: 'Avatar', to: '/components/avatar' },
        { label: 'Switcher', to: '/components/switcher' },
        { label: 'Calendar', to: '/components/calendar' },
        { label: 'Select', to: '/components/select' },
        { label: 'Toggle (the time keys)', to: '/components/toggle' },
        { label: 'Radio group (Base UI)', to: '/components/radio' },
        { label: 'Button', to: '/components/button' },
        { label: 'Empty state', to: '/components/empty-state' },
        { label: 'LED', to: '/components/led' },
        { label: 'The drum', to: '/foundations/transitions' },
        { label: 'Icons (morph)', to: '/icons' },
      ]}
      behaviour={[
        {
          title: 'Keyboard',
          rules: [
            { id: 'K1', title: 'Tab', body: 'Moves through the length, the month, the time zone, the times and Confirm.' },
            { id: 'K2', title: 'Arrows, Page Up / Down, Enter in the month', body: 'Move by day and week, turn the month, and choose the day.' },
            { id: 'K3', title: 'Arrows in the times', body: 'Move to the next time and latch it, as in any radio group; Confirm is the next Tab stop.' },
            { id: 'K4', title: 'Next free day', body: 'On a day with nothing free, one key jumps to the next day that has times and puts focus on the first.' },
          ],
        },
        {
          title: 'Accessibility',
          rules: [
            { id: 'A1', title: 'The times are one choice', body: 'A radio group named by the day ("Free times, Thursday 1 October"); each key is a radio named by its time in the chosen zone.' },
            { id: 'A2', title: 'Booking is said', body: 'A polite status says "Booking…" and then what was booked, when, in which zone and with whom.' },
            { id: 'A3', title: 'The booked key stays put', body: 'Once booked, the key reads "Booked" and is aria-disabled, so focus is not lost; the columns behind it are inert until Change.' },
            { id: 'A4', title: 'Empty days are said, not only greyed', body: 'A quiet day in the month is still chosen like any other and says "No times this day".' },
          ],
        },
        {
          title: 'Motion',
          rules: [
            { id: 'M1', title: 'Times come from where you went', body: 'A later day brings its keys in from the right, an earlier one from the left, top to bottom on the settle spring; a new length brings them up one step.' },
            { id: 'M2', title: 'A zone is the same times, re-read', body: 'Nothing moves: each key\'s figures turn on the drum, top to bottom.' },
            { id: 'M3', title: 'The chosen time latches', body: 'Its key sinks and holds with its lamp lit, the one before rises, and the Confirm row opens under the columns.' },
            { id: 'M4', title: 'Confirm holds, then answers', body: 'The key goes down and stays down while it books (calendar → clock, "Booking…"), then turns to a check and "Booked".' },
            { id: 'M5', title: 'Reduce Motion', body: 'Everything changes at once: no key travels or staggers, the row opens in place, the drum crossfades.' },
          ],
        },
        {
          title: 'Responsive',
          rules: [
            { id: 'R1', title: 'It measures itself', body: 'The block is a container: three columns from 56rem; from 36rem the host runs across the top; narrower, everything stacks and the times wrap in rows of keys.' },
          ],
        },
      ]}
      tune={{ lede: 'The Availability panel swaps the spring the time keys arrive on and stretches time, so you can watch them come in from the side the calendar moved.', node: <Tuned /> }}
      source={source}
    />
  );
}
