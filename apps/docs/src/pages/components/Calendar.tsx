import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Calendar, DatePicker, FormField } from '@unlocalhosted/metalui';
import { type SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';
import reactSource from '../../../../../packages/metalui/src/components/calendar/calendar.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import agentSource from '../../../../../packages/metalui/src/components/calendar/calendar.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * MONTH TUNER: the page's DialKit panel
 *
 *   spring   the spring the month's arrival rides (the choice lands on the part spring)
 *   travel   how far a new month comes from
 * ───────────────────────────────────────────────────────── */

const SEP_30 = new Date(2026, 8, 30);

function Month({ label }: { label: string }) {
  const [day, setDay] = React.useState<Date | null>(SEP_30);
  return (
    <div className="grid justify-items-center gap-8">
      <Calendar aria-label={label} value={day} onValueChange={setDay} defaultMonth={SEP_30} locale="en-GB" max={new Date(2027, 11, 31)} />
      <span className="type-meta text-ink3">{day ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'full' }).format(day) : 'No day chosen'}</span>
    </div>
  );
}

function MonthTuner() {
  const d = useDialKit('Calendar month', {
    spring: { type: 'select', options: SPRING_NAMES, default: 'settle' },
    travel: [8, 0, 32],
    slow: [1, 1, 10],
  });
  const vars = { ...springVars('settle', d.spring as SpringName, d.slow), '--mu-motion-content': `${d.travel}px` } as React.CSSProperties;
  return <div data-testid="calendar-month-tuner" className="flex justify-center" style={vars}><Month label="Tuned calendar" /></div>;
}

export default function CalendarPage() {
  const [due, setDue] = React.useState<Date | null>(null);
  return (
    <ComponentPage
      title="Calendar"
      lede="A month to choose a day from. The chosen day lands into a raised thumb; turning the month, the title turns on the drum and the days come in from the side you head to. The date picker opens it from a form field."
      play={{ lede: 'Choose days, turn the month, or Tab in and use the arrow keys and Page Up / Down.', caption: 'September 2026 · weeks start on Monday (en-GB)', node: (
        <div className="flex flex-wrap items-start justify-center gap-40">
          <Month label="Trip day" />
          <div className="w-[240px]">
            <FormField>
              <FormField.Label>Due date</FormField.Label>
              <DatePicker aria-label="Due date" value={due} onValueChange={setDue} locale="en-GB" />
            </FormField>
          </div>
        </div>
      ) }}
      more={[{ id: 'month', title: 'Tune the month', lede: 'The Calendar month panel swaps the spring the thumb and the month ride, sets how far a new month comes from, and stretches time.', node: <MonthTuner /> }]}
      usage={`const [day, setDay] = React.useState<Date | null>(null);

<Calendar aria-label="Trip day" value={day} onValueChange={setDay} min={new Date()} />

<DatePicker aria-label="Due date" value={day} onValueChange={setDay} />`}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'CA1', title: 'Six rows, always', body: 'Every month shows six weeks, so the calendar never changes height.', origin: 'Ours' },
        { id: 'CA2', title: 'The month says which way', body: 'Later months come from the right and the title turns up; earlier ones the other way.', origin: 'Ours' },
        { id: 'CA3', title: 'The reader\'s week', body: 'The week starts where the locale starts it.', origin: 'Ours' },
      ]}
    />
  );
}
