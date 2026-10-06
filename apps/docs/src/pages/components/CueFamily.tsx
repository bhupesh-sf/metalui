import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Avatar, Cue, CueInferred, CueLife, CueUrgency, CueUrl, Dimple, Field, SlidingIndicator } from '@unlocalhosted/metalui';
import { LinkIcon } from '@unlocalhosted/metalui/icons';
import { LifeCalmIcon, LifeCoffeeIcon, LifeLateNightIcon, LifeSpentIcon, LifeStepsIcon } from '@unlocalhosted/metalui/icons/life';
import reactSource from '../../../../../packages/metalui/src/components/mark/mark.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import agentGuide from '../../../../../packages/metalui/src/components/mark/mark.agent.md?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalCue.swift?raw';
import { Bench, Code, PageHeader, Rules, Section, TokenTable } from '../../ui/doc';
import { SwiftCapture } from '../../ui/SwiftCapture';
import { springVars } from '../../ui/springTuning';

const TABS = [
  { id: 'react', label: 'React', code: reactSource },
  { id: 'css', label: 'CSS', code: cssSource },
  { id: 'swift', label: 'SwiftUI', code: swiftSource },
  { id: 'agent', label: 'Agent guide', code: agentGuide },
] as const;

/* The glyphs the set has for each kind. Money and sleep stand in until the set draws a coin and a moon of their own. */
const COIN = <LifeSpentIcon size={14} />;
const MOON = <LifeLateNightIcon size={14} />;
const STEPS = <LifeStepsIcon size={14} />;
const person = (name: string) => <Avatar name={name} size="small" label="" />;

/** A line with every in-flow cue, or the same words plain. `bare` drops the glyphs: the drawing alone must measure the same. */
function Line({ cues, bare, raw, fresh }: { cues: boolean; bare?: boolean; raw?: boolean; fresh?: boolean }) {
  const C = ({ glyph, ...p }: React.ComponentProps<typeof Cue>) =>
    cues ? <Cue {...p} glyph={bare ? false : glyph} raw={raw} fresh={fresh} /> : <span>{p.children}</span>;
  return (
    <span data-testid={cues ? (bare ? 'line-cued' : 'line-glyphs') : 'line-plain'} className="type-content whitespace-nowrap text-ink">
      Send <C kind="tag">#poster</C> <C kind="date" resolved="WED 30 SEP · 16:00">tomorrow 4pm</C>, <C kind="duration" resolved="1 H 30 · 90 MIN">1h30</C> for <C kind="amount" resolved="$40.00" glyph={COIN}>$40</C>, slept <C kind="measurement" label="Sleep" resolved="6 H" glyph={MOON}>6h</C>, in <C kind="hex" color="#FF6B3D">#FF6B3D</C> via <C kind="derived-tag">#studio</C>
    </span>
  );
}

const LEGEND: { kind: string; specimen: React.ReactNode; glyph: string; line: string; chip: string }[] = [
  { kind: 'time · date', specimen: <Cue kind="date" resolved="WED 30 SEP · 16:00">tomorrow 4pm</Cue>, glyph: 'clock (its act: an hour passes)', line: 'engraved groove', chip: 'DATE · WED 30 SEP · 16:00' },
  { kind: 'time · duration', specimen: <Cue kind="duration" resolved="1 H 30 · 90 MIN">1h30</Cue>, glyph: 'clock', line: 'engraved groove', chip: 'DURATION · 1 H 30 · 90 MIN' },
  { kind: 'money', specimen: <Cue kind="amount" resolved="$40.00" glyph={COIN}>$40</Cue>, glyph: 'coin (spent stands in)', line: 'quiet hairline (tabular in the chip)', chip: 'AMOUNT · $40.00' },
  { kind: 'body · sleep', specimen: <Cue kind="measurement" label="Sleep" resolved="6 H" glyph={MOON}>6h</Cue>, glyph: 'moon (late night stands in)', line: 'soft green', chip: 'SLEEP · 6 H' },
  { kind: 'body · steps', specimen: <Cue kind="measurement" label="Steps" resolved="8 000" glyph={STEPS}>8k steps</Cue>, glyph: 'steps', line: 'soft green', chip: 'STEPS · 8 000' },
  { kind: 'colour', specimen: <Cue kind="hex" color="#3F7FE0">#3F7FE0</Cue>, glyph: 'the live swatch', line: '3 pt in the colour', chip: 'COLOUR' },
  { kind: 'tag', specimen: <Cue kind="tag">#poster</Cue>, glyph: '—', line: 'a luggage tag in its own hue', chip: '—' },
  { kind: 'person', specimen: <Cue kind="person" glyph={person('Sam Ito')}>Sam</Cue>, glyph: 'their avatar', line: '—', chip: 'PERSON' },
  { kind: 'link', specimen: <CueUrl host="figma.com" href="https://figma.com" glyph={<LinkIcon size={11} />} />, glyph: 'link', line: 'the host pill', chip: '—' },
];

export default function CueFamilyPage() {
  const [tab, setTab] = React.useState<(typeof TABS)[number]['id']>('react');
  const [done, setDone] = React.useState(false);
  const [ghostDone, setGhostDone] = React.useState(false);
  const [fri, setFri] = React.useState(false);
  const [replay, setReplay] = React.useState(0);
  const d = useDialKit(
    'Cue family',
    {
      cues: true,
      doing: false,
      urgent: true,
      writing: false,
      slow: [1, 1, 6],
      hold: [1800, 600, 4000],
      replay: { type: 'action', label: 'Replay recognition' },
    },
    { onAction: (a) => a === 'replay' && setReplay((n) => n + 1) },
  );
  const code = TABS.find((t) => t.id === tab)!;
  const motion = { ...springVars('settle', 'settle', d.slow), ...springVars('object', 'object', d.slow), ...springVars('part', 'part', d.slow), '--mu-r-mark-motion-chip-hold': `${Math.round(d.hold * d.slow)}ms` } as React.CSSProperties;

  return (
    <div style={motion}>
      <PageHeader
        title="Cue family"
        lede="Recognition made visible. Every kind has one look: time is an engraved groove with a clock, money a quiet hairline and a coin (its formatted amount, tabular, in the chip), the body a soft green line with its moon or steps, a colour its live swatch, a person their avatar, a tag a luggage tag in its own colour. The glyph sits at full ink before the words it explains; hover a cue for what the glyph means and the value it resolved to. The words never move: the drawing sits behind them, and raw text keeps every chunk exactly in place."
      />

      <Section title="Kinds" lede="The legend. One look per kind, everywhere: the glyph says what it is, the line says it was understood, the chip (on hover or focus) names it and shows the value.">
        <TokenTable
          head={['Cue', 'Kind', 'Glyph', 'Line', 'Chip']}
          mono={[4]}
          rows={LEGEND.map((k) => [<span key={k.kind} className="type-content text-ink" data-testid={`legend-${k.kind}`}>{k.specimen}</span>, k.kind, k.glyph, k.line, k.chip])}
        />
      </Section>

      <Section title="Recognition" lede="Type below. A chunk is recognised only once the caret has left it: then its line draws in from the left, its glyph pops in beside it, a colour blooms its swatch, money turns its figures on the drum, and a date shows its day for a moment. The glyph plays its own act once (the clock passes an hour, the moon tilts, the cup steams). Type # for the tags you've used; a bare weekday is a suggestion until you press Tab or click it. Reduce Motion: all of it arrives at once.">
        <TypingDemo />
      </Section>

      <Section title="On a block" lede="Hover a cue for its name and value. Confirm the FRI suggestion: it stamps solid with one sparkle. Turn cues off in the dial panel: the drawing and the glyphs fade and nothing moves. Turn writing on: the display-only cues (the URL pill, the inferred pill, the life glyph, the margin objects) step aside. Replay recognition plays the moment again.">
        <Bench caption={`${d.writing ? 'writing' : 'at rest'} · cues ${d.cues ? 'on' : 'raw'}`} className="min-h-[280px]">
          <div key={replay} className="flex flex-col gap-8 pl-40" data-testid="cue-block">
            <div className="relative">
              {!d.writing && d.urgent && !done && <CueUrgency className="absolute -left-35 top-8" />}
              {!d.writing && (
                <Dimple className="absolute -left-25 top-[2.5px]" checked={done} doing={d.doing} onCheckedChange={(v) => setDone(v)} aria-label="Send the poster" />
              )}
              <span className="type-content text-ink">
                {d.writing && <span className="type-readout inline-block w-25 -ml-25 text-ink3">[{done ? 'x' : ' '}] </span>}
                <span className={done ? 'text-ink3 line-through decoration-[rgba(0,0,0,.25)]' : ''}>Send the poster to <Cue kind="person" glyph={person('Sam Ito')} raw={!d.cues} fresh={replay > 0}>Sam</Cue></span>
                {!d.writing && <CueInferred resolved="FRI 2 OCT · RECOGNIZER 0.82" confirmed={fri} onConfirm={() => setFri(true)}>fri</CueInferred>}
              </span>
            </div>
            <Line cues raw={!d.cues} fresh={replay > 0} />
            <span className="type-content text-ink">
              moodboard {d.writing ? <span className="text-[var(--mu-cue-url-ink)]">https://figma.com/file/poster</span> : <CueUrl host="figma.com" href="https://figma.com" glyph={<LinkIcon size={11} />} />}
              {!d.writing && <CueLife label="A drink · coffee?" raw={!d.cues} fresh={replay > 0}><LifeCoffeeIcon size={16} /></CueLife>}
            </span>
            <div className="relative">
              {!d.writing && <Dimple ghost className="absolute -left-27 top-[3.5px]" checked={ghostDone} onCheckedChange={(v) => setGhostDone(v)} aria-label="Call the printer (inferred task)" />}
              <span className="type-content text-ink">call the printer about paper</span>
              {!d.writing && <CueLife label="A mood · calm?" raw={!d.cues} fresh={replay > 0}><LifeCalmIcon size={16} /></CueLife>}
            </div>
          </div>
        </Bench>
        <Bench tone="page" caption="Metric neutrality · the drawing alone, and the same words plain · width delta measured live">
          <MetricProof />
        </Bench>
      </Section>

      <Section title="The dimple" lede="A task's checkbox on Base UI Checkbox: rest, hover, checked (a pen draws the tick: the short leg, a beat at the corner, then the long leg on a spring), doing (announced as mixed), ghost, and disabled.">
        <Bench tone="page" caption="rest · checked · doing · ghost · disabled">
          <div className="flex items-center gap-40">
            <figure className="flex flex-col items-center gap-10"><Dimple aria-label="rest" /><figcaption className="type-label engraved">rest</figcaption></figure>
            <figure className="flex flex-col items-center gap-10"><Dimple defaultChecked aria-label="checked" /><figcaption className="type-label engraved">checked</figcaption></figure>
            <figure className="flex flex-col items-center gap-10"><Dimple doing aria-label="doing" /><figcaption className="type-label engraved">doing</figcaption></figure>
            <figure className="flex flex-col items-center gap-10"><Dimple ghost aria-label="ghost" /><figcaption className="type-label engraved">ghost</figcaption></figure>
            <figure className="flex flex-col items-center gap-10"><Dimple disabled aria-label="disabled" /><figcaption className="type-label engraved">disabled</figcaption></figure>
            <figure className="flex flex-col items-center gap-10"><CueUrgency /><figcaption className="type-label engraved">urgency</figcaption></figure>
          </div>
        </Bench>
      </Section>

      <Section title="SwiftUI" lede="MetalCueMark (the glyph, the line and the recognition moment), MetalCueTag (the luggage tag), MetalCueInferred (dashed until confirmed), MetalCueLife (with its label), MetalCueURLPill, MetalCueUrgency and MetalDimple, from the same recipe. In a TextKit editor the host draws the lines and tags itself from the mark recipe.">
        <SwiftCapture name="cue" />
      </Section>

      <Section title="Source" lede="The family three ways, plus the guide your coding agent reads.">
        <div className="flex flex-col gap-12">
          <div role="tablist" aria-label="Source" data-md="skip" className="material-well relative inline-flex w-fit rounded-pill p-2">
            <SlidingIndicator className="material-thumb rounded-pill" />
            {TABS.map((t) => (
              <button key={t.id} role="tab" type="button" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={['type-ui relative z-10 h-28 cursor-pointer rounded-pill px-13 transition-colors duration-150', tab === t.id ? 'text-ink' : 'text-ink2 hover:text-ink'].join(' ')}>
                {t.label}
              </button>
            ))}
          </div>
          <Code label={code.label} code={code.code} />
        </div>
      </Section>

      <Section title="API">
        <TokenTable
          head={['Component', 'Props', 'Notes']}
          rows={[
            ['Cue', 'kind, resolved?, glyph?, label?, fresh?, inferred?, raw?, color?', 'date · duration · amount · measurement · tag · derived-tag · hex · person · match. The words keep their advance; the glyph sits before them.'],
            ['CueUrl', 'host, glyph, href', 'At rest only; while writing show the raw URL.'],
            ['CueInferred', 'resolved?, confirmed?, onConfirm?', 'A value read by the model that is not in the text: dashed until confirmed (click, or Tab in the host).'],
            ['CueLife', 'children (a Life*Icon at 16), label?, fresh?', 'One per block, trailing: the kind of the whole line, named on hover.'],
            ['Dimple', 'checked, onCheckedChange, doing?, ghost?, disabled?', 'Base UI Checkbox. The host writes [x] into the text on tick.'],
            ['CueUrgency', '–', 'An open task due soon.'],
          ]}
        />
      </Section>

      <Section title="Rules">
        <Rules
          rules={[
            { id: 'Q1', title: 'A cue never moves a letter', body: 'The line and the tag’s paper are drawn behind the words, which keep their exact advance (width delta 0.00 pt). The glyph has its own slot before the words; raw text keeps the slot, so turning cues off fades and moves nothing.', origin: 'the brief, DS-31' },
            { id: 'Q2', title: 'Applying a cue never rewrites text', body: 'Text changes only when the person acts: ticking a dimple writes [x], accepting a chip, picking a tag. Each is undoable. Money turns its figures on the drum without changing them; the formatted amount is in the chip.', origin: 'the brief' },
            { id: 'Q3', title: 'One look per kind', body: 'The glyph says the kind, at full ink beside the words it explains; the trailing life glyph is only for the whole line’s kind. A tag is a luggage tag in its own colour everywhere.', origin: 'Owner, 2026-09-30' },
            { id: 'Q4', title: 'Recognition plays once', body: 'Only when the caret has left the words; never looping; the glyph’s own act once. Reduce Motion turns all of it off.', origin: 'Owner, 2026-09-30' },
            { id: 'Q5', title: 'Hidden confidence is a bug', body: 'An inferred value is dashed and says where it came from in its chip (RECOGNIZER 0.82) until the person confirms it.', origin: 'the brief' },
          ]}
        />
      </Section>
    </div>
  );
}

function MetricProof() {
  const [delta, setDelta] = React.useState<number | null>(null);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const a = el.querySelector('[data-testid="line-cued"]') as HTMLElement, b = el.querySelector('[data-testid="line-plain"]') as HTMLElement;
      setDelta(Math.abs(a.getBoundingClientRect().width - b.getBoundingClientRect().width));
    };
    measure();
    document.fonts.ready.then(measure);
  }, []);
  return (
    <div ref={ref} className="flex flex-col items-start gap-8" data-testid="metric-proof">
      <Line cues bare />
      <Line cues={false} />
      <span className="type-readout text-ink2">width delta {delta == null ? '…' : delta.toFixed(2)} pt</span>
    </div>
  );
}

/* ── The live typing demo: a small recogniser over the words, the caret rule, recognition once. ── */

type Chunk = { kind: React.ComponentProps<typeof Cue>['kind']; text: string; start: number; resolved?: string; glyph?: React.ReactNode; label?: string; color?: string; inferred?: boolean };

const TODAY = new Date(2026, 8, 29);
const DAY = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const dayOf = (offset: number) => DAY.format(new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + offset)).replace(',', '').toUpperCase();
const WEEK = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const nextWeekday = (word: string) => {
  const want = WEEK.indexOf(word.slice(0, 3).toLowerCase());
  return ((want - TODAY.getDay() + 7) % 7) || 7;
};
const PEOPLE = ['Sam', 'Ana', 'Marta'];
const USED_TAGS = ['#poster', '#studio', '#coffee', '#done'];

const RULES: { re: RegExp; make: (m: RegExpExecArray) => Omit<Chunk, 'start' | 'text'> }[] = [
  { re: /#[0-9a-f]{6}\b/gi, make: (m) => ({ kind: 'hex', color: m[0] }) },
  { re: /#[a-z][\w-]*/gi, make: () => ({ kind: 'tag' }) },
  { re: /\$\d+(?:\.\d{1,2})?/g, make: (m) => ({ kind: 'amount', glyph: COIN, resolved: `$${Number(m[0].slice(1)).toFixed(2)}` }) },
  { re: /(?<=slept )\d+(?:\.\d+)?h\b/gi, make: (m) => ({ kind: 'measurement', glyph: MOON, label: 'Sleep', resolved: `${parseFloat(m[0])} H` }) },
  { re: /\b\d+(?:\.\d+)?k? steps\b/gi, make: (m) => ({ kind: 'measurement', glyph: STEPS, label: 'Steps', resolved: `${Math.round(parseFloat(m[0]) * (/k/i.test(m[0]) ? 1000 : 1))}` }) },
  { re: /\b\d+h(?:\d{2})?\b|\b\d+ ?min\b/gi, make: (m) => ({ kind: 'duration', resolved: m[0].toUpperCase().replace(/(\d)H/, '$1 H ').trim() }) },
  {
    re: /\b(?:today|tomorrow|yesterday|tonight|(?:mon|tues|wednes|thurs|fri|satur|sun)day)(?: \d{1,2}(?::\d{2})?(?:am|pm))?\b|\b\d{1,2}(?::\d{2})?(?:am|pm)\b/gi,
    make: (m) => {
      const w = m[0].toLowerCase();
      const off = w.startsWith('tomorrow') ? 1 : w.startsWith('yesterday') ? -1 : /day\b/.test(w.split(' ')[0]) && !w.startsWith('today') ? nextWeekday(w) : 0;
      const time = m[0].match(/(\d{1,2})(?::(\d{2}))?(am|pm)/i);
      const at = time ? ` · ${String((Number(time[1]) % 12) + (time[3].toLowerCase() === 'pm' ? 12 : 0)).padStart(2, '0')}:${time[2] ?? '00'}` : '';
      return { kind: 'date', resolved: `${dayOf(off)}${at}` };
    },
  },
  { re: new RegExp(`\\b(?:${PEOPLE.join('|')})\\b`, 'g'), make: (m) => ({ kind: 'person', glyph: person(m[0]) }) },
  { re: /\b(?:mon|tue|wed|thu|fri|sat|sun)\b/gi, make: (m) => ({ kind: 'date', inferred: true, resolved: `${dayOf(nextWeekday(m[0]))} · RECOGNIZER 0.82` }) },
];

/** Every chunk the recogniser reads, left to right, first rule winning an overlap; none the caret is still inside. */
function recognise(text: string, caret: number): Chunk[] {
  const found: Chunk[] = [];
  for (const { re, make } of RULES) {
    for (const m of text.matchAll(re)) {
      const start = m.index ?? 0, end = start + m[0].length;
      if (caret >= start && caret <= end) continue; // the caret is still in the words
      if (found.some((c) => start < c.start + c.text.length && end > c.start)) continue;
      found.push({ ...make(m as RegExpExecArray), text: m[0], start });
    }
  }
  return found.sort((a, b) => a.start - b.start);
}

const keyOf = (c: Chunk, all: Chunk[]) => `${c.kind}:${c.text}:${all.filter((o) => o.start < c.start && o.kind === c.kind && o.text === c.text).length}`;

function TypingDemo() {
  const [text, setText] = React.useState('Send #poster tomorrow 4pm to Sam for $40');
  const [caret, setCaret] = React.useState(Infinity);
  const [confirmed, setConfirmed] = React.useState<Set<string>>(() => new Set());
  const input = React.useRef<HTMLInputElement>(null);
  const chunks = recognise(text, caret);
  // What was there on arrival is not news; everything recognised after that plays its moment once.
  const initial = React.useRef<Set<string> | null>(null);
  if (!initial.current) initial.current = new Set(chunks.map((c) => keyOf(c, chunks)));
  const inline = chunks.filter((c) => !c.inferred);
  const suggestions = chunks.filter((c) => c.inferred);
  const pending = suggestions.find((c) => !confirmed.has(keyOf(c, chunks)));
  const confirm = (c: Chunk) => setConfirmed((s) => new Set(s).add(keyOf(c, chunks)));
  const life = /\b(?:coffee|latte|espresso)\b/i.test(text.slice(0, caret === Infinity ? undefined : Math.max(0, caret - 1)));

  // The word the caret is in, for the tag list.
  const at = caret === Infinity ? text.length : caret;
  const wordStart = text.lastIndexOf(' ', at - 1) + 1;
  const word = text.slice(wordStart, at);
  const tagList = word.startsWith('#') ? [...new Set([...USED_TAGS, ...inline.filter((c) => c.kind === 'tag').map((c) => c.text)])].filter((t) => t.toLowerCase().startsWith(word.toLowerCase()) && t.toLowerCase() !== word.toLowerCase()) : [];

  const readCaret = () => setCaret(input.current?.selectionStart ?? Infinity);
  const pickTag = (tag: string) => {
    const next = `${text.slice(0, wordStart)}${tag} ${text.slice(at).replace(/^\S*\s?/, '')}`;
    setText(next);
    place.current = wordStart + tag.length + 1;
    setCaret(place.current);
  };
  // A picked tag puts the caret after it, before the next key can land.
  const place = React.useRef<number | null>(null);
  React.useLayoutEffect(() => {
    if (place.current == null) return;
    input.current?.focus();
    input.current?.setSelectionRange(place.current, place.current);
    place.current = null;
  });

  let cursor = 0;
  const out: React.ReactNode[] = [];
  for (const c of inline) {
    if (c.start > cursor) out.push(text.slice(cursor, c.start));
    const key = keyOf(c, chunks);
    out.push(<Cue key={key} kind={c.kind} resolved={c.resolved} glyph={c.glyph} label={c.label} color={c.color} fresh={!initial.current.has(key)}>{c.text}</Cue>);
    cursor = c.start + c.text.length;
  }
  out.push(text.slice(cursor));

  return (
    <div className="flex flex-col gap-16">
      <Field size="large">
        <Field.Input
          ref={input}
          value={text}
          aria-label="Write a line"
          data-testid="cue-typing"
          spellCheck={false}
          onChange={(e) => { setText(e.target.value); setCaret(e.target.selectionStart ?? Infinity); }}
          onSelect={readCaret}
          onKeyUp={readCaret}
          onFocus={readCaret}
          onBlur={() => setCaret(Infinity)}
          onKeyDown={(e) => {
            if (e.key === 'Tab' && !e.shiftKey && pending) { e.preventDefault(); confirm(pending); }
            else if (e.key === 'Tab' && !e.shiftKey && tagList.length) { e.preventDefault(); pickTag(tagList[0]); }
          }}
        />
      </Field>
      <Bench caption={pending ? 'tab confirms the suggestion' : tagList.length ? 'tab picks the first tag' : 'recognised as you leave each word'} className="min-h-[160px]">
        <div className="flex flex-col gap-12 pl-40" data-testid="cue-typing-line">
          <span className="type-content whitespace-pre-wrap text-ink">
            {out}
            {suggestions.map((c) => {
              const key = keyOf(c, chunks);
              return <CueInferred key={key} resolved={c.resolved} confirmed={confirmed.has(key)} onConfirm={() => confirm(c)}>{c.text}</CueInferred>;
            })}
            {life && <CueLife label="A drink · coffee?" fresh><LifeCoffeeIcon size={16} /></CueLife>}
          </span>
          {tagList.length > 0 && (
            <div role="listbox" aria-label="Tags you've used" className="flex flex-wrap gap-10" data-testid="cue-tag-list">
              {tagList.map((t) => (
                <button key={t} role="option" aria-selected={false} type="button" className="type-content cursor-pointer rounded-pill" onMouseDown={(e) => e.preventDefault()} onClick={() => pickTag(t)}>
                  <Cue kind="tag">{t}</Cue>
                </button>
              ))}
            </div>
          )}
        </div>
      </Bench>
    </div>
  );
}
