import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Card, CodeField, FormField, type CodeFieldSize } from '@unlocalhosted/metalui';
import { type SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';
import reactSource from '../../../../../packages/metalui/src/components/code-field/code-field.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalCodeField.swift?raw';
import agentSource from '../../../../../packages/metalui/src/components/code-field/code-field.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * CODE FIELD PAGE · a one-time code where it is asked for
 *
 *   sign-in   a card that sent a code: type, paste or autofill it; it is checked (the ring), refused
 *             (the ring on every slot, one shake) or accepted (the tick); Resend counts down
 *   recovery  an 8-character recovery code, letters and digits in 4–4, shown in capitals
 *   sizes     large, regular and compact beside Field's sizes
 *   tune      DialKit: the keycap's spring, the ripple, the refusal, time stretched
 * ───────────────────────────────────────────────────────── */

const RIGHT = '246810';

/** The host's check: a beat on the "server", then right or wrong. */
function useCheck(right: string, ms = 900) {
  const [value, setValue] = React.useState('');
  const [checking, setChecking] = React.useState(false);
  const [invalid, setInvalid] = React.useState(false);
  const [accepted, setAccepted] = React.useState(false);
  React.useEffect(() => {
    if (!checking) return;
    const t = window.setTimeout(() => {
      setChecking(false);
      const ok = value === right;
      setInvalid(!ok);
      setAccepted(ok);
    }, ms);
    return () => window.clearTimeout(t);
  }, [checking, value, right, ms]);
  return {
    value, checking, invalid, accepted,
    onValueChange: (next: string) => { setValue(next); setInvalid(false); setAccepted(false); },
    onValueComplete: () => setChecking(true),
  };
}

function SignIn({ size = 'large', testId }: { size?: CodeFieldSize; testId?: string }) {
  const check = useCheck(RIGHT);
  const [sent, setSent] = React.useState(1);
  return (
    <Card className="w-full max-w-[400px]" data-testid={testId}>
      <Card.Title>Check your email</Card.Title>
      <Card.Description>We sent a 6-digit code to ana@example.com. It is {RIGHT}; anything else is refused.</Card.Description>
      <div className="grid justify-items-start gap-12 pt-12">
        <FormField invalid={check.invalid}>
          <FormField.Label>Sign-in code</FormField.Label>
          <CodeField
            size={size}
            value={check.value}
            invalid={check.invalid}
            checking={check.checking}
            onValueChange={check.onValueChange}
            onValueComplete={check.onValueComplete}
          />
          <FormField.Error match={check.invalid}>That code isn't right. Check the newest email{sent > 1 ? ` (we've sent ${sent})` : ''}.</FormField.Error>
        </FormField>
        <div className="flex items-center gap-8 type-meta text-ink3">
          <span>{check.accepted ? 'Signed in.' : 'Didn\'t get it?'}</span>
          <CodeField.Resend cooldown={30} onResend={() => setSent((n) => n + 1)} />
        </div>
      </div>
    </Card>
  );
}

function Recovery() {
  const [value, setValue] = React.useState('');
  return (
    <div className="grid w-full max-w-[420px] justify-items-start gap-8">
      <FormField>
        <FormField.Label>Recovery code</FormField.Label>
        <CodeField size="regular" length={8} validationType="alphanumeric" value={value} onValueChange={setValue} />
        <FormField.Description>From the sheet you printed: letters and digits; case doesn't matter.</FormField.Description>
      </FormField>
    </div>
  );
}

function Sizes() {
  return (
    <div className="grid justify-items-start gap-16">
      {(['large', 'regular', 'compact'] as const).map((size) => (
        <FormField key={size}>
          <FormField.Label>{size === 'large' ? 'Large, 44' : size === 'regular' ? 'Regular, 32' : 'Compact, 28'}</FormField.Label>
          <CodeField size={size} length={4} defaultValue="27" />
        </FormField>
      ))}
    </div>
  );
}

/* KEYCAP TUNER: the page's DialKit panel. key swaps the spring a keycap arrives on; ripple sets the
 * step between keycaps on a paste; refusal swaps the shake; slow stretches every duration; checking
 * holds the ring up; wrong refuses whatever is typed. */
function KeycapTuner() {
  const d = useDialKit('Code field keycaps', {
    key: { type: 'select', options: SPRING_NAMES, default: 'part' },
    refusal: { type: 'select', options: SPRING_NAMES, default: 'refusal' },
    ripple: [45, 0, 160],
    pop: [0.6, 0.2, 1],
    slow: [1, 1, 10],
    size: { type: 'select', options: ['large', 'regular', 'compact'], default: 'large' },
  });
  const [value, setValue] = React.useState('');
  const vars = {
    ...springVars('part', d.key as SpringName, d.slow),
    ...springVars('refusal', d.refusal as SpringName, d.slow),
    '--mu-r-code-field-key-ripple': `${d.ripple * d.slow}ms`,
    '--mu-r-code-field-key-pop': d.pop,
  } as React.CSSProperties;
  return (
    <div data-testid="code-field-tuner" className="grid w-full justify-items-center gap-16" style={vars}>
      <FormField>
        <FormField.Label>Paste 135792 here</FormField.Label>
        <CodeField size={d.size as CodeFieldSize} value={value} onValueChange={setValue} />
      </FormField>
    </div>
  );
}

export default function CodeFieldPage() {
  return (
    <ComponentPage
      capture="code-field"
      title="Code field"
      lede="A one-time code, one slot per character. Each slot is Field's well; a typed character sets a keycap into it on the part spring, and a paste or the phone's autofill sets them all in one ripple. A wrong code rings every slot and shakes the row once."
      play={{ lede: 'Type the code, paste it, or type a wrong one. Arrows and Backspace move and fix one character.', caption: 'a sign-in card · checked, refused, accepted', wide: true, node: (
        <div className="flex w-full justify-center"><SignIn testId="code-field-sign-in" /></div>
      ) }}
      more={[
        { id: 'recovery', title: 'Letters and digits', lede: 'validationType="alphanumeric" takes a recovery code; letters show in capitals. Eight characters group 4–4; a character the code can\'t hold shakes its slot.', node: <div className="flex w-full justify-center"><Recovery /></div> },
        { id: 'sizes', title: 'Sizes', lede: 'Field\'s ladder: large 44 for a code alone on its screen, regular 32 and compact 28 to sit level with fields and selects.', node: <div className="flex w-full justify-center"><Sizes /></div> },
        { id: 'tune', title: 'Tune the keycaps', lede: 'The Code field keycaps panel swaps the springs a keycap arrives and refuses on, sets the ripple step and the pop, and stretches time.', node: <KeycapTuner /> },
      ]}
      usage={`<FormField invalid={wrong}>
  <FormField.Label>Sign-in code</FormField.Label>
  <CodeField
    value={code}
    onValueChange={(next) => { setCode(next); setWrong(false); }}
    onValueComplete={check}
    checking={checking}
    invalid={wrong}
  />
  <FormField.Error match={wrong}>That code isn't right.</FormField.Error>
</FormField>
<CodeField.Resend cooldown={30} onResend={send} />`}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'swift', label: 'SwiftUI', code: swiftSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'CF1', title: 'Keycaps in wells', body: 'An empty slot is a sunk well; a filled one holds a keycap. How far you are reads at a glance, and a paste reads as a hand running across the keys.', origin: 'Ours' },
        { id: 'CF2', title: 'Keep a wrong code', body: 'A refused code stays, ringed, so it can be compared with the message; focus goes back to the first character, selected, so typing again overwrites it.', origin: 'Ours' },
        { id: 'CF3', title: 'Let the phone fill it', body: 'The first slot asks for autocomplete="one-time-code" and takes the whole code; never turn it off.', origin: 'Apple, WHATWG' },
      ]}
    />
  );
}
