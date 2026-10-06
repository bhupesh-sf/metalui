import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Attachment, PromptInput, Select } from '@unlocalhosted/metalui';
import reactSource from '../../../../../packages/metalui/src/components/prompt-input/prompt-input.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalPromptInput.swift?raw';
import agentSource from '../../../../../packages/metalui/src/components/prompt-input/prompt-input.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * PROMPT INPUT PAGE · where a message is written and sent
 *
 *   play      write and press ↩: what was sent shows above, Send turns to Stop while a pretend reply
 *             writes (3 s), Stop or ⎋ ends it; attach, drop or paste files and they land above the well
 *   offline   disabled with its reason and the amber lamp
 *   tune      DialKit: busy held, offline, attach, the rows it grows to, the hint
 * ───────────────────────────────────────────────────────── */

const MODELS = [{ value: 'fast', label: 'Fast' }, { value: 'thorough', label: 'Thorough' }];

type Picked = { id: number; name: string; size: number };

function Composer({ busyHeld = false, attach = true, maxRows = 6, hint = true }: { busyHeld?: boolean; attach?: boolean; maxRows?: number; hint?: boolean }) {
  const [text, setText] = React.useState('');
  const [files, setFiles] = React.useState<Picked[]>([]);
  const [model, setModel] = React.useState('fast');
  const [sent, setSent] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const well = React.useRef<HTMLTextAreaElement>(null);
  const seq = React.useRef(0);
  React.useEffect(() => {
    if (!busy) return;
    const t = window.setTimeout(() => setBusy(false), 3000);
    return () => window.clearTimeout(t);
  }, [busy]);
  return (
    <div className="grid w-full max-w-[560px] gap-12">
      <p data-testid="sent" className="m-0 min-h-[20px] type-meta text-ink3">{sent === null ? 'Nothing sent yet.' : `Sent: ${sent || '(files only)'}`}</p>
      <PromptInput
        ref={well}
        value={text}
        onValueChange={setText}
        placeholder="Ask for a draft, a summary, a fix…"
        busy={busy || busyHeld}
        onSend={(t) => { setSent(`${t}${files.length ? ` + ${files.length} file${files.length > 1 ? 's' : ''}` : ''}`); setText(''); setFiles([]); setBusy(true); }}
        onStop={() => setBusy(false)}
        onAttach={attach ? (list) => setFiles((was) => [...was, ...list.map((f) => ({ id: seq.current++, name: f.name, size: f.size }))]) : undefined}
        attachments={files.map((f) => <Attachment key={f.id} name={f.name} size={f.size} onRemove={() => { setFiles((was) => was.filter((x) => x.id !== f.id)); well.current?.focus(); }} />)}
        tools={<Select size="compact" aria-label="Model" value={model} onValueChange={setModel} options={MODELS} />}
        maxRows={maxRows}
        hint={hint ? undefined : null}
      />
    </div>
  );
}

/* PROMPT INPUT TUNER: the page's DialKit panel. Busy held (Send reads Stop), offline (disabled with its
 * reason), attach on or off, the rows the well grows to, and the hint. */
function Tuner() {
  const d = useDialKit('Prompt input', {
    busy: false,
    offline: false,
    attach: true,
    maxRows: [6, 2, 12],
    hint: true,
  });
  return (
    <div data-testid="prompt-input-tuner" className="grid w-full justify-items-center">
      {d.offline
        ? <div className="w-full max-w-[560px]"><PromptInput onSend={() => {}} disabled disabledReason="You're offline" placeholder="Ask anything" /></div>
        : <Composer busyHeld={d.busy} attach={d.attach} maxRows={d.maxRows} hint={d.hint} />}
    </div>
  );
}

export default function PromptInputPage() {
  return (
    <ComponentPage
      capture="prompt-input"
      title="Prompt input"
      lede="Where a message is written and sent: a well that grows with its text, attach, the model, and Send that becomes Stop while a reply writes."
      play={{ lede: 'Write and press ↩ (⇧↩ breaks the line). Send turns to Stop while a reply writes; Stop or ⎋ ends it. Attach, drop or paste files and they land above the well.', caption: 'write, send, stop', wide: true, node: <div className="flex w-full justify-center"><Composer /></div> }}
      more={[
        { id: 'offline', title: 'Offline', lede: 'Disabled with its reason beside the amber lamp: the well, attach and Send refuse until the connection is back.', node: <div className="flex w-full justify-center"><div className="w-full max-w-[560px]"><PromptInput onSend={() => {}} disabled disabledReason="You're offline" placeholder="Ask anything" onAttach={() => {}} /></div></div> },
        { id: 'tune', title: 'Tune the input', lede: 'The Prompt input panel holds a reply writing, takes it offline, turns attach off, sets the rows the well grows to and hides the hint.', node: <Tuner /> },
      ]}
      usage={`<PromptInput
  value={draft}
  onValueChange={setDraft}
  onSend={(text) => { send(text, files); setDraft(''); setFiles([]); }}
  busy={writing}
  onStop={stop}
  onAttach={(list) => setFiles([...files, ...list])}
  attachments={files.map((f) => <Attachment key={f.name} name={f.name} size={f.size} onRemove={() => drop(f)} />)}
  tools={<Select size="compact" aria-label="Model" value={model} onValueChange={setModel} options={models} />}
  disabled={!online}
  disabledReason="You're offline"
/>`}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'swift', label: 'SwiftUI', code: swiftSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'PI1', title: 'One key for go and stop', body: 'Send becomes Stop while a reply writes: the glyph morphs, the word turns. The person never hunts for a second key.', origin: 'Ours' },
        { id: 'PI2', title: '↩ sends, ⇧↩ breaks', body: 'One keymap everywhere, and never while an IME is composing.', origin: 'Ours' },
        { id: 'PI3', title: 'The files are the host\'s', body: 'The input hands files over (picked, dropped, pasted); the host keeps the list and shows Attachments.', origin: 'Ours' },
      ]}
    />
  );
}
