import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Button, Message, ToolCall, type ToolCallStatus } from '@unlocalhosted/metalui';
import { RetryIcon } from '@unlocalhosted/metalui/icons';
import reactSource from '../../../../../packages/metalui/src/components/tool-call/tool-call.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalToolCall.swift?raw';
import agentSource from '../../../../../packages/metalui/src/components/tool-call/tool-call.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * TOOL CALL PAGE · one thing an agent did, folded to a row that says how it went
 *
 *   play      Run again: the call is queued (amber), runs (the ring after the show delay), and ends done
 *             with its duration; Fail it while it runs. Open the row for its input and result
 *   group     three calls in a row, folded under "3 tools"
 *   own UI    a tool with its own look fills the panel in place of the fallback
 *   tune      DialKit: the status, a summary, a duration, an error, open
 * ───────────────────────────────────────────────────────── */

const INPUT = { query: 'springs', limit: 5, sources: ['docs', 'changelog'] };
const RESULT = [
  { title: 'Springs', path: '/foundations/motion' },
  { title: 'Reduce Motion', path: '/foundations/motion#reduce' },
];

function Lifecycle() {
  const [status, setStatus] = React.useState<ToolCallStatus>('done');
  React.useEffect(() => {
    if (status !== 'queued' && status !== 'running') return;
    const t = window.setTimeout(() => setStatus(status === 'queued' ? 'running' : 'done'), status === 'queued' ? 700 : 1800);
    return () => window.clearTimeout(t);
  }, [status]);
  const busy = status === 'queued' || status === 'running';
  return (
    <div className="grid w-full max-w-[520px] gap-12">
      <Message from="assistant" model="Fast" status={busy ? 'writing' : 'done'}>
        <ToolCall
          name="search_docs"
          status={status}
          summary="‘springs’"
          input={INPUT}
          result={status === 'done' ? RESULT : undefined}
          error={status === 'failed' ? 'The docs index is rebuilding. Try again in a minute.' : undefined}
          duration={1240}
        />
      </Message>
      <div className="flex gap-8">
        <Button size="compact" icon={<RetryIcon />} disabled={busy} onClick={() => setStatus('queued')}>Run again</Button>
        <Button size="compact" disabled={status !== 'running'} onClick={() => setStatus('failed')}>Fail</Button>
      </div>
    </div>
  );
}

function Group() {
  return (
    <div className="grid w-full max-w-[520px]">
      <Message from="assistant" model="Fast">
        <ToolCall.Group status="failed">
          <ToolCall name="read_file" summary="release-note.md" input={{ path: 'docs/release-note.md' }} result={'# Release 0.9\n\nSprings now carry their durations…'} duration={180} />
          <ToolCall name="search_docs" summary="‘springs’" input={INPUT} result={RESULT} duration={1240} />
          <ToolCall name="open_link" status="failed" summary="motion#reduce" input={{ url: '/foundations/motion#reduce' }} error="404: the anchor moved." />
        </ToolCall.Group>
      </Message>
    </div>
  );
}

function OwnUI() {
  return (
    <div className="grid w-full max-w-[520px]">
      <Message from="assistant" model="Fast">
        <ToolCall name="get_weather" summary="Lisbon" duration={420} defaultOpen>
          <p className="m-0 type-content text-ink">Lisbon · 21° and clear, wind 12 km/h from the north.</p>
        </ToolCall>
      </Message>
    </div>
  );
}

/* TOOL CALL TUNER: the page's DialKit panel. Every prop of one call: its status, a summary, a duration,
 * an error in place of the result, and open. */
function Tuner() {
  const d = useDialKit('Tool call', {
    status: { type: 'select', options: ['queued', 'running', 'done', 'failed'], default: 'done' },
    summary: true,
    duration: true,
    error: false,
    open: true,
  });
  return (
    <div data-testid="tool-call-tuner" className="grid w-full max-w-[520px] justify-self-center">
      <ToolCall
        name="search_docs"
        status={d.status as ToolCallStatus}
        summary={d.summary ? '‘springs’' : undefined}
        input={INPUT}
        result={RESULT}
        error={d.error ? 'The docs index is rebuilding.' : undefined}
        duration={d.duration ? 1240 : undefined}
        open={d.open}
      />
    </div>
  );
}

export default function ToolCallPage() {
  return (
    <ComponentPage
      capture="tool-call"
      title="Tool call"
      lede="One thing an agent did, folded to a row: the tool's name and a lamp and a word for how it went. Open it for what it was given and what came back."
      play={{ lede: 'Press Run again: the call waits (amber, Queued), runs (the ring, Running) and settles with how long it took. Fail it while it runs. Open the row for its input and result.', caption: 'a call, queued to done', wide: true, node: <div className="flex w-full justify-center"><Lifecycle /></div> }}
      more={[
        { id: 'group', title: 'Calls in a row', lede: 'Consecutive calls fold under one row, its lamp the host\'s: red here, because one of the three failed.', node: <div className="flex w-full justify-center"><Group /></div> },
        { id: 'own', title: 'A tool with its own UI', lede: 'Children replace the fallback input and result; the row still says what ran.', node: <div className="flex w-full justify-center"><OwnUI /></div> },
        { id: 'tune', title: 'Tune a tool call', lede: 'The Tool call panel sets its status, a summary, a duration, an error and open.', node: <Tuner /> },
      ]}
      usage={`<ToolCall name="search_docs" status="running" summary="‘springs’" input={{ query: 'springs' }} />

<ToolCall.Group status={anyFailed ? 'failed' : 'done'}>
  {calls.map((c) => <ToolCall key={c.id} {...c} />)}
</ToolCall.Group>`}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'swift', label: 'SwiftUI', code: swiftSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'TC1', title: 'Folded by default', body: 'The row says what ran and how it went; opening it is for inspecting.', origin: 'Ours' },
        { id: 'TC2', title: 'The same lamps as every state', body: 'Amber waits, the ring runs, red failed, off is done; a word goes with each.', origin: 'Ours' },
        { id: 'TC3', title: 'Its own UI or the fallback', body: 'A tool with a look of its own fills the panel; every other tool reads as input and result.', origin: 'Ours' },
      ]}
    />
  );
}
