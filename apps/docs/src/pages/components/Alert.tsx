import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Alert, Button, Card, Field, FormField, type AlertKind, type AlertTone } from '@unlocalhosted/metalui';
import { type SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';
import reactSource from '../../../../../packages/metalui/src/components/alert/alert.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import agentSource from '../../../../../packages/metalui/src/components/alert/alert.agent.md?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalAlert.swift?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * ALERT PAGE
 *
 *   playground  a form that saves: waiting while it saves, failed the first time (Try again),
 *               done the second (dismissible); the alert updates in place, never jumps
 *   kinds       the five kinds, each a glyph, words and a lamp
 *   places      top of a form (plate), inside a card (quiet), strong, a page banner
 *   tuner       the Alert panel: kind, tone, banner, solid, parts, the arrival and leave springs
 * ───────────────────────────────────────────────────────── */

const KINDS: AlertKind[] = ['note', 'done', 'waiting', 'urgent', 'failed'];
const TONES: AlertTone[] = ['plate', 'quiet', 'strong'];
/** Each kind's own words: the title always says the kind. */
const WORDS: Record<AlertKind, [string, string]> = {
  note: ['Shared with 3 people', 'Changes you make here show up for them as you type.'],
  done: ['Plan saved', 'Everyone on the trip sees the new times.'],
  waiting: ['Importing 240 notes', 'You can keep working; the notes land here as they arrive.'],
  urgent: ['Your plan ends in 3 days', 'Boards over 50 notes turn read-only after that.'],
  failed: ["Couldn't save the plan", "The server didn't answer. Your changes are kept here until it does."],
};

type Saving = 'idle' | 'waiting' | 'failed' | 'done';

/** A form that saves: the first save fails, the second goes through. The alert sits above the first field. */
function PlanForm() {
  const [state, setState] = React.useState<Saving>('idle');
  const tries = React.useRef(0);
  const timer = React.useRef(0);
  React.useEffect(() => () => clearTimeout(timer.current), []);
  const save = () => {
    clearTimeout(timer.current);
    setState('waiting');
    tries.current += 1;
    const ok = tries.current % 2 === 0;
    timer.current = window.setTimeout(() => setState(ok ? 'done' : 'failed'), 1400);
  };
  const kind: AlertKind = state === 'idle' ? 'note' : state;
  return (
    <form className="grid w-full max-w-[440px] gap-16" aria-label="Trip plan" onSubmit={(e) => { e.preventDefault(); save(); }}>
      {state !== 'idle' && (
        <Alert kind={kind} onDismiss={state === 'done' ? () => setState('idle') : undefined} data-testid="plan-alert">
          <Alert.Title>{state === 'waiting' ? 'Saving the plan' : WORDS[kind][0]}</Alert.Title>
          <Alert.Description>{state === 'waiting' ? 'This takes a moment.' : WORDS[kind][1]}</Alert.Description>
          {state === 'failed' && (
            <Alert.Actions>
              <Button size="compact" cap="primary" onClick={save}>Try again</Button>
            </Alert.Actions>
          )}
        </Alert>
      )}
      <FormField>
        <FormField.Label>Plan name</FormField.Label>
        <Field size="regular"><Field.Input defaultValue="Lisbon, four days" /></Field>
      </FormField>
      <FormField>
        <FormField.Label>First stop</FormField.Label>
        <Field size="regular"><Field.Input defaultValue="Alfama at 9:00" /></Field>
      </FormField>
      <div className="flex justify-end">
        <Button type="submit" cap="primary" disabled={state === 'waiting'}>Save plan</Button>
      </div>
    </form>
  );
}

function Kinds() {
  return (
    <div className="grid w-full max-w-[560px] gap-12" data-testid="alert-kinds">
      {KINDS.map((k) => (
        <Alert key={k} kind={k}>
          <Alert.Title>{WORDS[k][0]}</Alert.Title>
          <Alert.Description>{WORDS[k][1]}</Alert.Description>
        </Alert>
      ))}
    </div>
  );
}

function Places() {
  return (
    <div className="grid w-full max-w-[640px] gap-28" data-testid="alert-places">
      <div className="overflow-hidden rounded-card recipe-well-field" data-place="banner">
        <Alert kind="urgent" banner>
          <Alert.Title>{WORDS.urgent[0]}</Alert.Title>
          <Alert.Actions><Button size="compact" cap="primary">Keep the plan</Button></Alert.Actions>
        </Alert>
        <p className="m-0 p-20 type-body text-ink3">The page under the banner.</p>
      </div>
      <Card className="max-w-[360px]" data-place="card">
        <Card.Title>Weekend in Porto</Card.Title>
        <Alert kind="failed" tone="quiet">
          <Alert.Title>Photos are offline</Alert.Title>
          <Alert.Description>3 photos live on a drive that isn't connected.</Alert.Description>
        </Alert>
        <Card.Description>9 notes, a tram map.</Card.Description>
      </Card>
      <Alert kind="failed" tone="strong" data-place="strong">
        <Alert.Title>Sync stopped</Alert.Title>
        <Alert.Description>Nothing you change on this device reaches the others until it's back.</Alert.Description>
        <Alert.Actions>
          <Button size="compact" cap="primary">Reconnect</Button>
          <Button size="compact">Details</Button>
        </Alert.Actions>
      </Alert>
      <div className="grid gap-12" data-place="parts">
        <Alert kind="done"><Alert.Title>Title only: 12 notes moved to Lisbon</Alert.Title></Alert>
        <Alert kind="note"><Alert.Description>Description only: a sentence of context that needs no headline, kept in the body type.</Alert.Description></Alert>
        <Alert kind="waiting" className="max-w-[320px]">
          <Alert.Title>A long message wraps</Alert.Title>
          <Alert.Description>In a narrow place the words wrap under the title, and the actions drop under the words instead of crowding them.</Alert.Description>
          <Alert.Actions><Button size="compact">Pause</Button></Alert.Actions>
        </Alert>
      </div>
    </div>
  );
}

function Tuner() {
  const [shown, setShown] = React.useState(true);
  const [round, setRound] = React.useState(0);
  const d = useDialKit('Alert', {
    kind: { type: 'select', options: KINDS, default: 'failed' },
    tone: { type: 'select', options: TONES, default: 'plate' },
    banner: false,
    solid: false,
    description: true,
    actions: true,
    arrive: { type: 'select', options: SPRING_NAMES, default: 'settle' },
    leave: { type: 'select', options: SPRING_NAMES, default: 'release' },
    slow: [1, 1, 10],
    again: { type: 'action', label: 'Arrive again' },
  }, {
    onAction: (action) => { if (action === 'again') { setShown(true); setRound((r) => r + 1); } },
  });
  const kind = d.kind as AlertKind;
  const vars = { ...springVars('settle', d.arrive as SpringName, d.slow), ...springVars('release', d.leave as SpringName, d.slow) } as React.CSSProperties;
  return (
    <div data-testid="alert-tuner" className="grid w-full max-w-[560px] min-h-[96px] content-start" style={vars}>
      {shown ? (
        <Alert key={round} kind={kind} tone={d.tone as AlertTone} banner={d.banner} solid={d.solid} onDismiss={() => setShown(false)}>
          <Alert.Title>{WORDS[kind][0]}</Alert.Title>
          {d.description && <Alert.Description>{WORDS[kind][1]}</Alert.Description>}
          {d.actions && <Alert.Actions><Button size="compact">Open</Button></Alert.Actions>}
        </Alert>
      ) : <Button onClick={() => { setShown(true); setRound((r) => r + 1); }}>Show the alert again</Button>}
    </div>
  );
}

export default function AlertPage() {
  return (
    <ComponentPage
      title="Alert"
      lede="A message about this place, in the flow of the page: at the top of a form, inside a card, along the top of a page. It says what happened and what to do, stays until it's resolved or dismissed, and updates where it is. Not a toast (the result of your own action, floating, timed), not a status badge (a few words for a lasting state), not an alert dialog (a question that blocks)."
      play={{ lede: 'Save the plan. The alert arrives while it saves, says it failed (the first time), and turns into done in place when you try again; dismiss it when you have read it.', caption: 'a form · waiting, failed, done in one place', node: <PlanForm /> }}
      more={[
        { id: 'kinds', title: 'Kinds', lede: 'Five meanings, each said three ways: the glyph in the window, the words of the title, and the lamp in the window’s corner (none for a note, green steady, amber breathing, amber steady, red blinking twice). Colour is the fourth cue, never the only one.', node: <Kinds /> },
        { id: 'places', title: 'Where it sits', lede: 'A banner spans the top of a page with square ends. Inside a card it is quiet, with no plate of its own. Strong tints the plate in the kind’s ink, for the one alert in a view that must be seen. Title only, description only, or both; narrow, the words wrap and the actions drop under them.', node: <Places /> },
        { id: 'tune', title: 'Tune it', lede: 'The Alert panel changes its kind (watch the glyph morph and the lamp play its gesture), tone and placement, takes parts away, and swaps the springs it arrives and leaves on. Dismiss it with the close key or Esc.', node: <Tuner /> },
      ]}
      usage={`<Alert kind="failed" onDismiss={() => setError(null)}>
  <Alert.Title>Couldn't save the plan</Alert.Title>
  <Alert.Description>The server didn't answer. Your changes are kept here.</Alert.Description>
  <Alert.Actions>
    <Button size="compact" cap="primary" onClick={save}>Try again</Button>
  </Alert.Actions>
</Alert>`}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'swift', label: 'SwiftUI', code: swiftSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'AL1', title: 'About this place', body: 'An alert sits where the problem is. The result of your own action is a toast; a state in three words is a badge; a question that blocks is a dialog.', origin: 'Ours' },
        { id: 'AL2', title: 'Never colour alone', body: 'The glyph, the title’s words and the lamp’s gesture each say the kind; the LED keeps the library’s meanings, and blue stays a link’s.', origin: 'LED meanings' },
        { id: 'AL3', title: 'It updates where it is', body: 'Waiting turns into done or failed in place: the glyph morphs and the lamp plays its gesture, so the outcome lands where the person was looking.', origin: 'Ours' },
        { id: 'AL4', title: 'It never leaves by itself', body: 'Only the close key or Esc dismisses it; a message in the flow that vanishes moves the page under the reader.', origin: 'Ours' },
      ]}
    />
  );
}
