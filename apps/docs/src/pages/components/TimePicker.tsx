import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Button, DatePicker, Form, FormField, TimePicker, type TimeGranularity } from '@unlocalhosted/metalui';
import reactSource from '../../../../../packages/metalui/src/components/time-picker/time-picker.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalTimePicker.swift?raw';
import agentSource from '../../../../../packages/metalui/src/components/time-picker/time-picker.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * TIME PICKER PAGE
 *
 *   playground   a start time in a form field; the Time picker panel (DialKit) sets the clock,
 *                the granularity, the step, the hours, the zone, the size and the booked slots
 *   sections     a start and an end, opening hours with booked slots, across midnight, a date and
 *                a time together, in a form
 * The page's clock is the reader's; the e2e slice fixes it at 30 September 2026, 10:00.
 * ───────────────────────────────────────────────────────── */

const Readout = ({ children }: { children: React.ReactNode }) => <span className="type-meta text-ink3">{children}</span>;
const lunch = (t: string) => t >= '12:00' && t < '13:00';
const HOURS = { any: {}, 'opening hours': { min: '09:00', max: '17:30' }, 'night shift': { min: '22:00', max: '06:00' } } as const;
const ZONES = { none: undefined, Lisbon: 'Europe/Lisbon', 'New York': 'America/New_York', Tokyo: 'Asia/Tokyo' } as const;

function Playground() {
  const d = useDialKit('Time picker', {
    clock: { type: 'select', options: ['locale', '12 hour', '24 hour'], default: 'locale' },
    granularity: { type: 'select', options: ['hour', 'minute', 'second'], default: 'minute' },
    step: { type: 'select', options: ['5', '10', '15', '30', '60'], default: '15' },
    hours: { type: 'select', options: Object.keys(HOURS), default: 'any' },
    zone: { type: 'select', options: Object.keys(ZONES), default: 'none' },
    size: { type: 'select', options: ['regular', 'compact'], default: 'regular' },
    booked: false,
  });
  const [start, setStart] = React.useState<string | null>('09:30');
  return (
    <div className="grid w-[240px] gap-12">
      <FormField>
        <FormField.Label>Start</FormField.Label>
        <TimePicker
          value={start}
          onValueChange={setStart}
          locale="en-GB"
          hourCycle={d.clock === '12 hour' ? 12 : d.clock === '24 hour' ? 24 : undefined}
          granularity={d.granularity as TimeGranularity}
          step={Number(d.step)}
          timeZone={ZONES[d.zone as keyof typeof ZONES]}
          size={d.size as 'regular' | 'compact'}
          isTimeUnavailable={d.booked ? lunch : undefined}
          {...HOURS[d.hours as keyof typeof HOURS]}
        />
        <FormField.Error match="customError" />
      </FormField>
      <Readout>{start ? `value="${start}"` : 'value=null'}</Readout>
    </div>
  );
}

const shift = (t: string, minutes: number) => {
  const [h, m] = t.split(':').map(Number);
  const n = (((h * 60 + m + minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
};
const minutesOf = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

function Pair() {
  const [start, setStart] = React.useState<string | null>('14:00');
  const [end, setEnd] = React.useState<string | null>('15:00');
  // Moving the start keeps the length.
  const move = (next: string | null) => {
    if (start && end && next) setEnd(shift(next, minutesOf(end) - minutesOf(start)));
    setStart(next);
  };
  return (
    <div className="flex flex-wrap items-start justify-center gap-8">
      <FormField className="w-[160px]">
        <FormField.Label>Starts</FormField.Label>
        <TimePicker value={start} onValueChange={move} locale="en-US" />
      </FormField>
      <span className="type-ui text-ink3 pt-[28px] leading-[32px]" aria-hidden>–</span>
      <FormField className="w-[160px]">
        <FormField.Label>Ends</FormField.Label>
        <TimePicker value={end} onValueChange={setEnd} from={start} locale="en-US" />
        <FormField.Error match="customError" />
      </FormField>
    </div>
  );
}

function OpeningHours() {
  const [time, setTime] = React.useState<string | null>(null);
  return (
    <div className="grid w-[240px] gap-12">
      <FormField>
        <FormField.Label>Collection</FormField.Label>
        <FormField.Description>Open 09:00 to 17:30; lunch is booked.</FormField.Description>
        <TimePicker value={time} onValueChange={setTime} min="09:00" max="17:30" step={30} isTimeUnavailable={lunch} timeZone="Europe/Lisbon" locale="en-GB" />
        <FormField.Error match="customError" />
      </FormField>
    </div>
  );
}

function Night() {
  const [time, setTime] = React.useState<string | null>('23:00');
  return (
    <div className="grid w-[240px] gap-12">
      <FormField>
        <FormField.Label>Handover</FormField.Label>
        <TimePicker value={time} onValueChange={setTime} min="22:00" max="06:00" step={30} locale="en-GB" />
        <FormField.Error match="customError" />
      </FormField>
    </div>
  );
}

function DateAndTime() {
  const [when, setWhen] = React.useState<Date | null>(null);
  return (
    <div className="grid w-[352px] gap-12">
      <FormField>
        <FormField.Label>Reminder</FormField.Label>
        <DatePicker value={when} onValueChange={setWhen} time={{ step: 30 }} locale="en-GB" />
      </FormField>
      <Readout>{when ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeStyle: 'short' }).format(when) : 'No reminder'}</Readout>
    </div>
  );
}

function InAForm() {
  const [sent, setSent] = React.useState<string | null>(null);
  return (
    <Form className="w-full max-w-[352px]" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); setSent(`opens=${f.get('opens')} at=${f.get('at')}`); }}>
      <FormField>
        <FormField.Label>Opens</FormField.Label>
        <TimePicker name="opens" required locale="en-GB" />
        <FormField.Error match="valueMissing">Choose an opening time.</FormField.Error>
        <FormField.Error match="customError" />
      </FormField>
      <FormField>
        <FormField.Label>Delivery</FormField.Label>
        <DatePicker name="at" time defaultValue={new Date(2026, 9, 7, 8, 30)} locale="en-GB" />
      </FormField>
      <div className="flex items-center gap-12">
        <Button type="submit" cap="primary">Save</Button>
        {sent != null && <span className="type-meta text-ink3" role="status">{`Sent ${sent}`}</span>}
      </div>
    </Form>
  );
}

export default function TimePickerPage() {
  return (
    <ComponentPage
      title="Time picker"
      lede="A time of day you type, dial or choose from slots; the date picker's sibling. Typed times are read back with their part of the day, so 02:30 and 14:30 can't be mixed up; the clock key opens latching keys every step minutes, inside the hours you keep."
      play={{ lede: 'Type “930”, “2.30pm” or “14h30”, put the caret on the minutes and press ↑ ↓, or open the slots with the clock key (Alt ↓). The Time picker panel sets the clock, the granularity, the step, the hours, the zone, the size and a booked lunch.', caption: 'en-GB · 24 hours unless the panel says 12', node: <Playground /> }}
      capture="time-picker"
      more={[
        { id: 'pair', title: 'A start and an end', lede: 'Two pickers and a dash. The end takes from={start}: its slots begin after the start and each says how long the meeting would be. Moving the start keeps the length (the host does it, in four lines). en-US, so the clock is 12 hours.', node: <Pair /> },
        { id: 'hours', title: 'Opening hours', lede: 'min and max keep the slots inside the day you are open, and refuse a typed time outside them in words. isTimeUnavailable makes booked slots quiet (and says so); they can still be chosen, as Calendar\'s quiet days can. The zone is engraved after the time.', node: <div className="flex w-full justify-center"><OpeningHours /></div> },
        { id: 'night', title: 'Across midnight', lede: 'min after max is one window across midnight: a night shift runs 22:00 … 06:00, and the slots run on past 23:30 into the morning.', node: <div className="flex w-full justify-center"><Night /></div> },
        { id: 'date', title: 'A date and a time', lede: 'DatePicker takes time (true, or the time picker\'s options): a time field beside the date, one Date. Choosing or typing the day keeps the time; a time typed first waits for the day.', node: <div className="flex w-full justify-center"><DateAndTime /></div> },
        { id: 'form', title: 'In a form', lede: 'name sends ISO 8601 (“14:30”, or “2026-10-07T08:30” from a DatePicker with a time); required and the refusals reach FormField.Error through the input\'s validity.', node: <div className="flex w-full justify-center"><InAForm /></div> },
      ]}
      usage={`const [start, setStart] = React.useState<string | null>('09:30');

<FormField>
  <FormField.Label>Start</FormField.Label>
  <TimePicker value={start} onValueChange={setStart} min="09:00" max="17:30" step={15} />
  <FormField.Error />
</FormField>

<TimePicker aria-label="Ends" value={end} onValueChange={setEnd} from={start} />
<DatePicker name="at" time={{ step: 30 }} value={when} onValueChange={setWhen} />`}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'swift', label: 'SwiftUI', code: swiftSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'TP1', title: 'Read it back with the part of the day', body: 'A typed time is said back as “2:30 in the afternoon”, so a wrong half of the day is seen before it is kept.', origin: 'Ours' },
        { id: 'TP2', title: 'Slots are the offer, typing is free', body: 'The slots and the minute dial follow the step; a typed 10:07 is kept, because real times aren\'t on a grid.', origin: 'Ours' },
        { id: 'TP3', title: 'The reader\'s clock', body: '12 or 24 hours and where AM/PM goes come from the locale; hourCycle only for a house style.', origin: 'Ours' },
        { id: 'TP4', title: 'Say the hours first', body: 'Outside min and max nothing is offered and a typed time is refused in words; quiet slots stay choosable.', origin: 'Ours' },
      ]}
    />
  );
}
