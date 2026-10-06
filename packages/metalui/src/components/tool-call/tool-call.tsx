'use client';

import * as React from 'react';
import { SwapText } from '../../motion/swap';
import { useWait } from '../../motion/wait';
import { Collapsible } from '../collapsible/collapsible';
import { Led, type LedGesture, type LedKind } from '../led/led';
import { Properties } from '../properties/properties';
import { Spinner } from '../spinner/spinner';

/* ─────────────────────────────────────────────────────────
 * TOOL CALL, one thing the agent did: the tool, what it was given, what came back
 *
 *   row       Collapsible's row, folded by default: the lamp, the tool's name in code type, the state's
 *             word on the drum; a summary in ink3 (the main input) that fades as it opens
 *   queued    the amber lamp, "Queued" (waiting on something else: a confirmation, the call before)
 *   running   the lamp gives way to the Spinner's ring after the show delay (useWait), "Running"; busy;
 *             said once when it ends
 *   done      the off lamp; the duration ("1.2 s") when the host gives it
 *   failed    the red lamp, "Failed"; it blinks twice when it fails on screen, never on load
 *   panel     Input: the input as compact Properties (objects as JSON); Result: text in the field's sunk
 *             well in code type, scrolling past its height (objects pretty-printed); or the error in
 *             the error ink. A tool with its own UI passes children, which replace both
 *   group     ToolCall.Group: one row ("4 tools", or the host's label) with the host's status, folding
 *             the calls under it beside an engraved rule
 * Reduce Motion: the fold crossfades; the lamp holds steady; the drum changes in place.
 * Semantics: Collapsible's button (aria-expanded) named by the tool and its state; busy while running.
 * Slots: ToolCall.Root, ToolCall.Group.
 * ───────────────────────────────────────────────────────── */

export type ToolCallStatus = 'queued' | 'running' | 'done' | 'failed';

interface Fold {
  /** Open, controlled. */
  open?: boolean;
  /** Open at first (default: folded). */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export interface ToolCallRootProps extends Fold, Omit<React.HTMLAttributes<HTMLDivElement>, 'children' | 'title' | 'onChange'> {
  /** The tool's name, as the model called it: `search_docs`. */
  name: string;
  /** queued, running, done (default) or failed. */
  status?: ToolCallStatus;
  /** The main input in a few words, shown on the row while folded: "‘springs’". */
  summary?: React.ReactNode;
  /** What it was given: shown as label and value pairs. */
  input?: Record<string, unknown>;
  /** What came back: text, an element, or data (pretty-printed as JSON). */
  result?: unknown;
  /** Why it failed: shown in place of the result. */
  error?: React.ReactNode;
  /** How long it took, in ms: "1.2 s" on the row once done. */
  duration?: number;
  /** The tool's own UI, in place of the fallback Input and Result. */
  children?: React.ReactNode;
}

export interface ToolCallGroupProps extends Fold, Omit<React.HTMLAttributes<HTMLDivElement>, 'title' | 'onChange'> {
  /** The row's words (default "4 tools", from the count of calls). */
  label?: string;
  /** The calls' state as one lamp, from the host's list: running while any runs, failed if any failed. */
  status?: ToolCallStatus;
  /** The ToolCalls. */
  children?: React.ReactNode;
}

const ROOT = 'mu-tool-call';
const HEAD = 'mu-tool-call-head flex min-w-0 items-center gap-tool-call-row-gap';
const SLOT = 'grid flex-none size-spinner-small place-items-center';
const NAME = 'mu-tool-call-name min-w-0 truncate type-code text-ink';
const WORD = 'mu-tool-call-word flex-none type-meta tabular-nums text-ink3';
const PANEL = 'mu-tool-call-panel grid gap-tool-call-panel-gap py-tool-call-panel-pad-y';
const SECTION = 'grid min-w-0 gap-tool-call-section-gap';
const CAPTION = 'm-0 type-label engraved';
const RESULT = 'mu-tool-call-result m-0 max-h-tool-call-result-max-height overflow-auto whitespace-pre-wrap break-words px-tool-call-result-pad-x py-tool-call-result-pad-y rounded-well-radius-field recipe-well-field type-code text-ink outline-none focus-visible:focus-ring';
const ERROR = 'mu-tool-call-error m-0 type-meta text-form-field-error-ink';
const GROUP_BODY = 'flex gap-tool-call-group-indent';
const RULE = 'block w-rule-thickness flex-none recipe-rule';

const lampOf: Record<ToolCallStatus, LedKind> = { queued: 'waiting', running: 'live', done: 'off', failed: 'failed' };
const WORDS: Record<ToolCallStatus, string> = { queued: 'Queued', running: 'Running', done: '', failed: 'Failed' };

/** "0.4 s" and "1.2 s" under ten seconds, then "42 s", then "1:12". */
function took(ms: number) {
  if (ms < 10_000) return `${(ms / 1000).toFixed(1)} s`;
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const json = (v: unknown) => (typeof v === 'string' ? v : JSON.stringify(v, null, 2));

/** A red lamp blinks twice when its call fails on screen, never on load. */
function useGesture(status: ToolCallStatus): LedGesture {
  const [seen, setSeen] = React.useState(status);
  const [gesture, setGesture] = React.useState<LedGesture>('steady');
  if (seen !== status) {
    setSeen(status);
    setGesture(status === 'failed' ? 'blink2' : 'steady');
  }
  return gesture;
}

/** The lamp's state: the wait's timing (the ring after the show delay) and the gesture a change plays. */
function useLamp(status: ToolCallStatus) {
  const wait = useWait(status === 'running' ? 'working' : status === 'done' ? 'done' : 'idle');
  return { wait, gesture: useGesture(status) };
}

type Lamp = ReturnType<typeof useLamp>;

/** The lamp (the ring stands in for it while it runs), the words and the state's word. */
function Head({ status, lamp, duration, code, children }: { status: ToolCallStatus; lamp: Lamp; duration?: number; code?: boolean; children: React.ReactNode }) {
  const word = status === 'done' && duration != null ? took(duration) : WORDS[status];
  return (
    <span className={HEAD}>
      <span aria-hidden className={SLOT}>
        {lamp.wait.showing
          ? <Spinner size="small" phase={lamp.wait.phase} label="" />
          : <Led kind={lampOf[status]} size="small" gesture={lamp.gesture} />}
      </span>
      <span className={code ? NAME : 'min-w-0 truncate text-ink'}>{children}</span>
      <span className={WORD}><SwapText value={word} /></span>
    </span>
  );
}

/** Says the run twice, outside the row's button: when the ring shows, and when it is done. */
function Said({ status, lamp, title }: { status: ToolCallStatus; lamp: Lamp; title: string }) {
  if (status !== 'running' && lamp.wait.phase === 'idle') return null;
  return <Spinner.Status phase={lamp.wait.phase} label={`${title}, running`} result={`${title}, done`} />;
}

function useFold({ open, defaultOpen = false, onOpenChange }: Fold) {
  const [own, setOwn] = React.useState(defaultOpen);
  return {
    open: open ?? own,
    onOpenChange: (next: boolean) => {
      setOwn(next);
      onOpenChange?.(next);
    },
  };
}

/** The fallback: Input as label and value pairs, Result in a sunk well, or the error. */
function Fallback({ input, result, error }: Pick<ToolCallRootProps, 'input' | 'result' | 'error'>) {
  const pairs = input ? Object.entries(input) : [];
  return (
    <>
      {pairs.length > 0 && (
        <div className={SECTION}>
          <p className={CAPTION}>Input</p>
          <Properties size="compact">
            {pairs.map(([k, v]) => (
              <Properties.Item key={k} label={k}>
                {v == null ? undefined : typeof v === 'object' ? <code className="type-code">{JSON.stringify(v)}</code> : String(v)}
              </Properties.Item>
            ))}
          </Properties>
        </div>
      )}
      {error != null
        ? (
          <div className={SECTION}>
            <p className={CAPTION}>Error</p>
            <p className={ERROR}>{error}</p>
          </div>
        )
        : result !== undefined && (
          <div className={SECTION}>
            <p className={CAPTION}>Result</p>
            {React.isValidElement(result)
              ? result
              : <pre tabIndex={0} aria-label="Result" className={RESULT}>{json(result)}</pre>}
          </div>
        )}
    </>
  );
}

/** One tool call: a folded row with its state; open, its input and result (or its own UI). */
function Root({ name, status = 'done', summary, input, result, error, duration, open, defaultOpen, onOpenChange, className, children, ...props }: ToolCallRootProps) {
  const fold = useFold({ open, defaultOpen, onOpenChange });
  const lamp = useLamp(status);
  return (
    <Collapsible.Root
      {...fold}
      data-status={status}
      aria-busy={status === 'running' || undefined}
      className={className ? `${ROOT} ${className}` : ROOT}
      {...props}
    >
      <Collapsible.Trigger summary={summary}>
        <Head status={status} lamp={lamp} duration={duration} code>{name}</Head>
      </Collapsible.Trigger>
      <Collapsible.Panel>
        <div className={PANEL}>{children ?? <Fallback input={input} result={result} error={error} />}</div>
      </Collapsible.Panel>
      <Said status={status} lamp={lamp} title={name} />
    </Collapsible.Root>
  );
}

/** Calls in a row, folded under one row: "4 tools" with the host's lamp. */
function Group({ label, status = 'done', open, defaultOpen, onOpenChange, className, children, ...props }: ToolCallGroupProps) {
  const fold = useFold({ open, defaultOpen, onOpenChange });
  const lamp = useLamp(status);
  const words = label ?? `${React.Children.toArray(children).length} tools`;
  return (
    <Collapsible.Root
      {...fold}
      data-status={status}
      aria-busy={status === 'running' || undefined}
      className={className ? `mu-tool-call-group ${className}` : 'mu-tool-call-group'}
      {...props}
    >
      <Collapsible.Trigger>
        <Head status={status} lamp={lamp}>{words}</Head>
      </Collapsible.Trigger>
      <Collapsible.Panel>
        <div className={GROUP_BODY}>
          <span aria-hidden className={RULE} />
          <div className="grid min-w-0 flex-1">{children}</div>
        </div>
      </Collapsible.Panel>
      <Said status={status} lamp={lamp} title={words} />
    </Collapsible.Root>
  );
}

export const ToolCall = Object.assign(Root, { Root, Group });
export type ToolCallProps = ToolCallRootProps;
