import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Button, Calendar, DatePicker, DateSelector, Form, FormField, Switcher, matchesDate, type CalendarPeriod, type DateCondition, type DateOperator, type DateRange, type DayMark } from '@unlocalhosted/metalui';
import { type SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';
import reactSource from '../../../../../packages/metalui/src/components/calendar/calendar.tsx?raw';
import pickerSource from '../../../../../packages/metalui/src/components/calendar/date-picker.tsx?raw';
import selectorSource from '../../../../../packages/metalui/src/components/calendar/date-selector.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalCalendar.swift?raw';
import agentSource from '../../../../../packages/metalui/src/components/calendar/calendar.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * CALENDAR PAGE
 *
 *   playground   a month and a date picker in a form field; the Calendar panel (DialKit) sets the
 *                playground calendar's mode, period, pages, week and limits
 *   sections     ranges, several days, periods, weeks, marked days, min and max, far dates,
 *                a controlled month, in a form, quiet days, and the month's motion (its own panel);
 *                date conditions (the Date selector panel), in a dialog, two months in a narrow
 *                container (the Calendar width panel), and other languages and right to left
 * The page's clock is the reader's; the e2e slices fix it at 30 September 2026.
 * ───────────────────────────────────────────────────────── */

const DAY = 864e5;
const today = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
const plus = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const weekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;
const long = (d: Date) => new Intl.DateTimeFormat('en-GB', { dateStyle: 'full' }).format(d);
const short = (d: Date) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
const Readout = ({ children }: { children: React.ReactNode }) => <span className="type-meta text-ink3 text-center">{children}</span>;

type Limit = 'none' | 'next 60 days' | 'this year';
const limits = (l: Limit) => {
  const t = today();
  if (l === 'next 60 days') return { min: t, max: plus(t, 60) };
  if (l === 'this year') return { min: new Date(t.getFullYear(), 0, 1), max: new Date(t.getFullYear(), 11, 31) };
  return { min: undefined, max: undefined };
};

/** The playground calendar, set from the Calendar panel. */
function Playground() {
  const d = useDialKit('Calendar', {
    mode: { type: 'select', options: ['single', 'range', 'multiple'], default: 'single' },
    period: { type: 'select', options: ['day', 'month', 'quarter', 'half', 'year'], default: 'day' },
    months: [1, 1, 3],
    week: { type: 'select', options: ['locale', 'Sunday', 'Monday', 'Saturday'], default: 'locale' },
    weekNumbers: false,
    limits: { type: 'select', options: ['none', 'next 60 days', 'this year'], default: 'none' },
  });
  const [single, setSingle] = React.useState<Date | null>(today());
  const [range, setRange] = React.useState<DateRange | null>(null);
  const [several, setSeveral] = React.useState<Date[]>([]);
  const [due, setDue] = React.useState<Date | null>(null);
  const shared = {
    'aria-label': 'Trip day',
    locale: 'en-GB',
    period: d.period as CalendarPeriod,
    months: Math.round(d.months),
    weekStartsOn: ({ Sunday: 0, Monday: 1, Saturday: 6 } as const)[d.week as 'Sunday'],
    weekNumbers: d.weekNumbers,
    ...limits(d.limits as Limit),
  };
  const said = d.mode === 'range'
    ? range ? `${short(range.start)} – ${range.end ? short(range.end) : '…'}` : 'No range chosen'
    : d.mode === 'multiple' ? several.length ? `${several.length} chosen` : 'None chosen'
      : single ? long(single) : 'No day chosen';
  return (
    <div className="flex flex-wrap items-start justify-center gap-40">
      <div className="grid justify-items-center gap-8">
        {d.mode === 'range' ? <Calendar {...shared} mode="range" value={range} onValueChange={setRange} />
          : d.mode === 'multiple' ? <Calendar {...shared} mode="multiple" value={several} onValueChange={setSeveral} />
            : <Calendar {...shared} value={single} onValueChange={setSingle} />}
        <Readout>{said}</Readout>
      </div>
      <div className="w-[240px]">
        <FormField>
          <FormField.Label>Due date</FormField.Label>
          <DatePicker value={due} onValueChange={setDue} locale="en-GB" {...limits(d.limits as Limit)} />
        </FormField>
      </div>
    </div>
  );
}

function Ranges() {
  const [stay, setStay] = React.useState<DateRange | null>(null);
  const [period, setPeriod] = React.useState<DateRange | null>(null);
  const t = today();
  const presets = [
    { label: 'Last 7 days', value: { start: plus(t, -6), end: t } },
    { label: 'Last 30 days', value: { start: plus(t, -29), end: t } },
    { label: 'This month', value: { start: new Date(t.getFullYear(), t.getMonth(), 1), end: new Date(t.getFullYear(), t.getMonth() + 1, 0) } },
    { label: 'Last month', value: { start: new Date(t.getFullYear(), t.getMonth() - 1, 1), end: new Date(t.getFullYear(), t.getMonth(), 0) } },
  ];
  const nights = stay?.end ? Math.round((stay.end.getTime() - stay.start.getTime()) / DAY) : 0;
  return (
    <div className="grid justify-items-center gap-24">
      <div className="grid justify-items-center gap-8">
        <Calendar aria-label="Stay" mode="range" months={2} minDays={2} maxDays={15} min={t} value={stay} onValueChange={setStay} locale="en-GB" />
        <Readout>{stay ? stay.end ? `${short(stay.start)} – ${short(stay.end)} · ${nights} nights` : `From ${short(stay.start)}: choose the last day (2 to 15 days)` : 'Choose the first day'}</Readout>
      </div>
      <div className="w-[280px]">
        <FormField>
          <FormField.Label>Report period</FormField.Label>
          <DatePicker mode="range" value={period} onValueChange={setPeriod} presets={presets} months={2} max={t} locale="en-GB" />
        </FormField>
      </div>
    </div>
  );
}

function Several() {
  const [days, setDays] = React.useState<Date[]>([]);
  return (
    <div className="grid justify-items-center gap-8">
      <Calendar aria-label="Shoot days" mode="multiple" value={days} onValueChange={setDays} locale="en-GB" />
      <Readout>{days.length ? days.map((d) => d.getDate()).join(', ') + ` · ${days.length} days` : 'Press days to add them; press one again to let it go'}</Readout>
    </div>
  );
}

function Periods() {
  const [period, setPeriod] = React.useState<Exclude<CalendarPeriod, 'day'>>('quarter');
  const [chosen, setChosen] = React.useState<DateRange | null>(null);
  React.useEffect(() => setChosen(null), [period]);
  return (
    <div className="grid justify-items-center gap-12">
      <Switcher aria-label="Period" value={period} onValueChange={setPeriod} options={[{ value: 'month', label: 'Month' }, { value: 'quarter', label: 'Quarter' }, { value: 'half', label: 'Half' }, { value: 'year', label: 'Year' }]} />
      <Calendar aria-label="Reporting period" mode="range" period={period} value={chosen} onValueChange={setChosen} locale="en-GB" />
      <Readout>{chosen ? `${short(chosen.start)} – ${chosen.end ? short(chosen.end) : '…'}` : 'Choose one, or press a second for a range'}</Readout>
    </div>
  );
}

function Weeks() {
  return (
    <div className="flex flex-wrap justify-center gap-40">
      <Calendar aria-label="Sprint day" locale="en-GB" weekStartsOn={0} weekNumbers />
    </div>
  );
}

const SCHEDULE: Record<number, DayMark> = { 2: { label: '2 events' }, 8: { label: 'Review' }, 14: { label: 'Invoice due', tone: 'amber' }, 21: { label: 'Backup failed', tone: 'red' }, 30: { label: 'Launch' } };
function Marked() {
  const [day, setDay] = React.useState<Date | null>(null);
  const t = today();
  const marks = (d: Date) => (d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear() ? SCHEDULE[d.getDate()] : undefined);
  return (
    <div className="grid justify-items-center gap-8">
      <Calendar aria-label="Schedule" value={day} onValueChange={setDay} marks={marks} locale="en-GB" />
      <Readout>{day ? `${long(day)}${marks(day) ? ` · ${marks(day)!.label}` : ''}` : 'Dots mark days with something on'}</Readout>
    </div>
  );
}

function Limits() {
  const t = today();
  const [day, setDay] = React.useState<Date | null>(null);
  return (
    <div className="flex flex-wrap items-start justify-center gap-40">
      <div className="grid justify-items-center gap-8">
        <Calendar aria-label="Delivery" value={day} onValueChange={setDay} min={plus(t, 2)} max={plus(t, 45)} isDateUnavailable={weekend} locale="en-GB" />
        <Readout>{day ? long(day) : 'From the day after tomorrow, for 45 days'}</Readout>
      </div>
      <div className="w-[240px]">
        <FormField>
          <FormField.Label>Delivery</FormField.Label>
          <DatePicker value={day} onValueChange={setDay} min={plus(t, 2)} max={plus(t, 45)} isDateUnavailable={weekend} locale="en-GB" />
          <FormField.Description>Type a day outside, then leave the field.</FormField.Description>
          <FormField.Error />
        </FormField>
      </div>
    </div>
  );
}

function FarDates() {
  const [born, setBorn] = React.useState<Date | null>(null);
  return (
    <div className="grid justify-items-center gap-8">
      <Calendar aria-label="Birthday" value={born} onValueChange={setBorn} max={today()} defaultMonth={new Date(1990, 5, 1)} locale="en-GB" />
      <Readout>{born ? long(born) : 'Press the title for the months, and again for the years'}</Readout>
    </div>
  );
}

function Controlled() {
  const [month, setMonth] = React.useState(() => today());
  const [day, setDay] = React.useState<Date | null>(null);
  return (
    <div className="grid justify-items-center gap-12">
      <div className="flex gap-8">
        <Button size="compact" onClick={() => setMonth(today())}>This month</Button>
        <Button size="compact" onClick={() => setMonth(new Date(today().getFullYear(), 11, 1))}>December</Button>
      </div>
      <Calendar aria-label="Booking" month={month} onMonthChange={setMonth} value={day} onValueChange={setDay} locale="en-GB" />
      <Readout>{`Showing ${new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(month)}`}</Readout>
    </div>
  );
}

function InAForm() {
  const [sent, setSent] = React.useState<string | null>(null);
  return (
    <Form className="w-full max-w-[320px]" onSubmit={(e) => { e.preventDefault(); setSent(String(new FormData(e.currentTarget).get('due') ?? '')); }}>
      <FormField>
        <FormField.Label>Deadline</FormField.Label>
        <DatePicker name="due" required locale="en-GB" />
        <FormField.Error match="valueMissing">Choose a deadline.</FormField.Error>
        <FormField.Error match="customError" />
      </FormField>
      <FormField>
        <FormField.Label>Created</FormField.Label>
        <DatePicker name="created" readOnly defaultValue={new Date(2026, 0, 12)} locale="en-GB" />
      </FormField>
      <div className="flex items-center gap-12">
        <Button type="submit" cap="primary">Save</Button>
        {sent != null && <span className="type-meta text-ink3" role="status">Sent due={sent}</span>}
      </div>
    </Form>
  );
}

function MonthTuner() {
  const d = useDialKit('Calendar month', {
    spring: { type: 'select', options: SPRING_NAMES, default: 'settle' },
    travel: [8, 0, 32],
    slow: [1, 1, 10],
  });
  const [day, setDay] = React.useState<Date | null>(today());
  const vars = { ...springVars('settle', d.spring as SpringName, d.slow), '--mu-motion-content': `${d.travel}px` } as React.CSSProperties;
  return <div data-testid="calendar-month-tuner" className="flex justify-center" style={vars}><Calendar aria-label="Tuned calendar" value={day} onValueChange={setDay} locale="en-GB" /></div>;
}

/* Forty tasks spread around today, so a condition has something to count. */
const TASKS = Array.from({ length: 40 }, (_, i) => plus(today(), ((i * 17) % 61) - 30));

function Conditions() {
  const d = useDialKit('Date selector', {
    presentation: { type: 'select', options: ['popover', 'dialog'], default: 'popover' },
    operators: { type: 'select', options: ['all four', 'between only', 'before and after'], default: 'all four' },
    period: { type: 'select', options: ['day', 'month', 'quarter', 'year'], default: 'day' },
    size: { type: 'select', options: ['regular', 'compact'], default: 'regular' },
    months: [2, 1, 2],
  });
  const [due, setDue] = React.useState<DateCondition | null>({ op: 'before', value: plus(today(), 7) });
  const operators: DateOperator[] = d.operators === 'between only' ? ['between'] : d.operators === 'before and after' ? ['before', 'after'] : ['is', 'before', 'after', 'between'];
  const period = d.period as CalendarPeriod;
  const count = due ? TASKS.filter((t) => matchesDate(due, t, period)).length : TASKS.length;
  return (
    <div className="grid justify-items-center gap-12">
      <DateSelector
        key={`${d.operators}-${period}`}
        label="Due"
        value={due}
        onValueChange={setDue}
        operators={operators}
        period={period}
        presentation={d.presentation as 'popover' | 'dialog'}
        size={d.size as 'regular' | 'compact'}
        months={Math.round(d.months)}
        locale="en-GB"
      />
      <Readout><span role="status">{`${count} of ${TASKS.length} tasks`}</span></Readout>
    </div>
  );
}

function InADialog() {
  const [created, setCreated] = React.useState<DateCondition | null>(null);
  const [sent, setSent] = React.useState<string | null>(null);
  return (
    <form className="grid justify-items-center gap-12" onSubmit={(e) => { e.preventDefault(); setSent(String(new FormData(e.currentTarget).get('opened') ?? '')); }}>
      <DateSelector label="Opened" presentation="dialog" name="opened" value={created} onValueChange={setCreated} max={today()} locale="en-GB" />
      <div className="flex items-center gap-12">
        <Button type="submit" size="compact">Search</Button>
        {sent != null && <span className="type-meta text-ink3" role="status">{`Sent opened=${sent || '(any)'}`}</span>}
      </div>
    </form>
  );
}

function Narrow() {
  const d = useDialKit('Calendar width', { width: [360, 280, 640] });
  const [stay, setStay] = React.useState<DateRange | null>(null);
  return (
    <div className="grid justify-items-center gap-8 w-full">
      <div data-testid="calendar-narrow" className="grid justify-items-center max-w-full rounded-card border border-dashed border-ink3/40" style={{ containerType: 'inline-size', width: Math.round(d.width) }}>
        <Calendar aria-label="Narrow stay" mode="range" months={2} value={stay} onValueChange={setStay} locale="en-GB" />
      </div>
      <Readout>{`A container ${Math.round(d.width)} wide: ${Math.round(d.width) < 504 ? 'one month, both steps on it' : 'two months side by side'}`}</Readout>
    </div>
  );
}

const LOCALES = [
  { value: 'en-US', label: 'English (US)', dir: 'ltr' },
  { value: 'de-DE', label: 'Deutsch', dir: 'ltr' },
  { value: 'ja-JP', label: '日本語', dir: 'ltr' },
  { value: 'ar-EG', label: 'العربية', dir: 'rtl' },
  { value: 'he-IL', label: 'עברית', dir: 'rtl' },
] as const;
function Languages() {
  const [locale, setLocale] = React.useState<(typeof LOCALES)[number]['value']>('ar-EG');
  const [day, setDay] = React.useState<Date | null>(today());
  const dir = LOCALES.find((l) => l.value === locale)!.dir;
  return (
    <div className="grid justify-items-center gap-12">
      <Switcher aria-label="Language" value={locale} onValueChange={setLocale} options={LOCALES.map((l) => ({ value: l.value, label: l.label }))} />
      <div dir={dir} lang={locale} className="grid justify-items-center gap-12">
        <Calendar key={locale} aria-label="Localised calendar" value={day} onValueChange={setDay} locale={locale} weekNumbers />
        <DateSelector key={`s-${locale}`} value={day ? { op: 'after', value: day } : null} locale={locale} />
      </div>
      <Readout>{day ? new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(day) : ''}</Readout>
    </div>
  );
}

function Quiet() {
  const [day, setDay] = React.useState<Date | null>(null);
  return <div className="flex justify-center"><Calendar aria-label="Studio day" value={day} onValueChange={setDay} isDateUnavailable={weekend} locale="en-GB" /></div>;
}

export default function CalendarPage() {
  return (
    <ComponentPage
      title="Calendar"
      lede="A month to choose a day from, or a range, several days, a month, a quarter or a year. The chosen day lands into a raised thumb and a range stretches it across the weeks; turning the month, the title turns on the drum and the days come in from the side you head to. The date picker is a field you type a date into or open the calendar from."
      play={{ lede: 'Choose days, turn the month, press the title for months and years, or Tab in and use the arrow keys and Page Up / Down. The Calendar panel sets the mode, the period, the pages, the week and the limits.', caption: 'en-GB · weeks start on Monday', node: <Playground /> }}
      capture="calendar"
      more={[
        { id: 'range', title: 'Ranges', lede: 'mode="range": the first press lands a thumb, and until the second the stretch it would make shows sunken under the pointer. Then one thumb stretches across each week, round at its true ends and nearly square where it runs on. Here two months side by side, 2 to 15 days from today; the picker below types or opens a range, with presets beside the calendar.', node: <Ranges /> },
        { id: 'several', title: 'Several days', lede: 'mode="multiple": each chosen day stands raised on its own; pressing one again lets it go.', node: <Several /> },
        { id: 'periods', title: 'Months, quarters, years', lede: 'period chooses a larger unit in the same footprint: twelve months, four quarters, two halves or a decade of years. They range, mark and limit the same way; a range’s end is the last day of its last unit.', node: <Periods /> },
        { id: 'weeks', title: 'Weeks', lede: 'weekStartsOn sets the week’s first day over the locale’s (here Sunday, in en-GB); weekNumbers puts the ISO week before each row.', node: <Weeks /> },
        { id: 'marks', title: 'Marked days', lede: 'marks puts a dot beside a day with something on it, and says its words with the day. The dot is ink; amber when the thing is urgent, red when it failed: the LED’s own meanings.', node: <Marked /> },
        { id: 'limits', title: 'Min and max', lede: 'Days before min and after max are disabled and the month steps stop; quiet days (weekends here) can still be chosen. The picker takes the same limits and refuses a typed day outside them when you leave the field. The Calendar panel sets the playground’s limits too.', node: <Limits /> },
        { id: 'far', title: 'Far dates', lede: 'The title is a key: it opens the twelve months of its year, and that title the years. Choosing one goes back down to it; Esc goes back where you were.', node: <FarDates /> },
        { id: 'controlled', title: 'Controlled month', lede: 'month and onMonthChange hold the shown month outside, so another control can turn it.', node: <Controlled /> },
        { id: 'form', title: 'In a form', lede: 'In a FormField the picker takes the label and the errors like any control: required, readOnly, and name, which sends the day as ISO 8601. Type “7/10”, “7 oct” or “2026-10-07”: the readback says what it understood.', node: <InAForm /> },
        { id: 'unavailable', title: 'Quiet days', lede: 'isDateUnavailable marks days with nothing to offer (here, weekends): quiet in the month and described as “Unavailable”. They can still be chosen, so the host can say why and offer the next good day; days out of min and max are the ones that can’t.', node: <Quiet /> },
        { id: 'conditions', title: 'Date conditions', lede: 'DateSelector chooses a condition, not a value: is a day, before it, after it, or between two, in Filters’ words. The operator is a switcher at the top of the panel and the day carries across it; choosing is a draft until Apply, and Cancel, Esc or a click outside throws it away. The key reads the condition as a sentence; matchesDate tests a date against it (here, the count of tasks). The Date selector panel sets the presentation, the operators, the period, the size and the months.', node: <Conditions /> },
        { id: 'dialog', title: 'In a dialog', lede: 'presentation="dialog" puts the same panel in a Dialog titled by the label, with Clear, Cancel and Apply in its actions: for a narrow window or a condition that deserves the page. With name it sends the condition with the form, as “before:2026-10-06”.', node: <InADialog /> },
        { id: 'narrow', title: 'Two months, narrow', lede: 'Months side by side answer to their container: narrower than both (504 for two), the calendar shows one with both steps on it, and the keys turn the page instead of walking into a hidden month. The panel of a date selector is that container. The Calendar width panel sets the container’s width.', node: <Narrow /> },
        { id: 'languages', title: 'Other languages', lede: 'Names, titles, the key’s sentence and the digits come from Intl in the locale, and the week starts where it starts it. Under dir="rtl" the weeks run from the right, the chevrons point outward, ← goes to the next day and a later month comes in from the left. “Q3” and the library’s own words stay English.', node: <Languages /> },
        { id: 'month', title: 'Tune the month', lede: 'The Calendar month panel swaps the spring the month rides, sets how far a new month comes from, and stretches time.', node: <MonthTuner /> },
      ]}
      usage={`const [day, setDay] = React.useState<Date | null>(null);
const [stay, setStay] = React.useState<DateRange | null>(null);

<Calendar aria-label="Trip day" value={day} onValueChange={setDay} min={new Date()} />
<Calendar aria-label="Stay" mode="range" months={2} maxDays={14} value={stay} onValueChange={setStay} />

<FormField>
  <FormField.Label>Due date</FormField.Label>
  <DatePicker name="due" required value={day} onValueChange={setDay} />
  <FormField.Error />
</FormField>

const [due, setDue] = React.useState<DateCondition | null>(null);
<DateSelector label="Due" value={due} onValueChange={setDue} />
rows.filter((r) => !due || matchesDate(due, r.due));`}
      sources={[
        { id: 'react', label: 'React', code: `${reactSource}\n// ── date-picker.tsx ──\n\n${pickerSource}\n// ── date-selector.tsx ──\n\n${selectorSource}` },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'swift', label: 'SwiftUI', code: swiftSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'CA1', title: 'Six rows, always', body: 'Every month shows six weeks, and every level the same footprint, so the calendar never changes size.', origin: 'Ours' },
        { id: 'CA2', title: 'The month says which way', body: 'Later months come from the right and the title turns up; earlier ones the other way. A level up comes from larger, a level down from smaller.', origin: 'Ours' },
        { id: 'CA3', title: 'The reader\'s week', body: 'The week starts where the locale starts it, unless the host has a reason.', origin: 'Ours' },
        { id: 'CA4', title: 'Raised is chosen', body: 'Only what is chosen stands raised: a day, several, or one thumb stretched across a range. A preview sinks.', origin: 'Ours' },
        { id: 'CA5', title: 'Say the limits first', body: 'Disable what can’t be chosen (out of range, out of a range’s reach) rather than refusing it after.', origin: 'Ours' },
        { id: 'CA6', title: 'A condition waits for Apply', body: 'A date condition is a draft until Apply: a range means nothing after its first press, so nothing it filters moves until it is whole.', origin: 'Ours' },
      ]}
    />
  );
}
