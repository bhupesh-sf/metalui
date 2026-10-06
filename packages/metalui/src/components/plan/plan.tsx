'use client';

import * as React from 'react';
import { CheckIcon } from '../../icons/components.generated';
import { SwapText } from '../../motion/swap';
import { useWait } from '../../motion/wait';
import { Led, type LedGesture, type LedKind } from '../led/led';
import { Progress, type ProgressState } from '../progress/progress';
import { Spinner } from '../spinner/spinner';

/* ─────────────────────────────────────────────────────────
 * PLAN, the agent's to-do list: what it said it would do, and how far it has got
 *
 *   head      a compact Progress: the title, "3 of 5" on the drum, the sunk track filling as steps
 *             finish; a failed step stops it in the failed ink, every step done completes it
 *   pending   the off lamp, the words in ink (still to do)
 *   queued    the amber lamp, "Queued": next to run, or waiting on something else (a confirmation)
 *   running   the lamp gives way to the Spinner's ring after the show delay (useWait), "Running";
 *             its tick when it ends
 *   done      the check glyph, the words in ink3
 *   failed    the red lamp, "Failed"; it blinks twice when it fails on screen, never on load
 *   detail    a line under a task, meta type, ink2
 *   nested    a step's own tasks under it, beside an engraved rule (as a tool call group's calls)
 * The states are ToolCall's words and lamps, so a plan and the calls that carry it out never disagree.
 * Reduce Motion: the lamp holds steady; the drum changes in place.
 * Semantics: the head is a progressbar ("3 of 5 done"); the tasks an ordered list, busy while one runs.
 * ───────────────────────────────────────────────────────── */

export type PlanTaskState = 'pending' | 'queued' | 'running' | 'done' | 'failed';

export interface PlanTask {
  /** Stable key. */
  id: string;
  title: string;
  /** pending (default), queued, running, done, failed. */
  state?: PlanTaskState;
  /** A line under the title: what it found, why it failed. */
  description?: React.ReactNode;
  /** The tasks under this step. The head counts steps (the top level), not these. */
  tasks?: PlanTask[];
}

export interface PlanProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children' | 'title'> {
  /** The steps, in order. */
  tasks: PlanTask[];
  /** The plan's name, on its head (default "Plan"). */
  title?: string;
}

const ROOT = 'mu-plan grid min-w-0 gap-plan-gap';
const LIST = 'mu-plan-list m-0 grid list-none p-0';
const TASK = 'mu-plan-task grid min-w-0 py-plan-task-pad-y';
const LINE = 'flex min-w-0 items-center gap-plan-task-gap';
const SLOT = 'grid flex-none size-spinner-small place-items-center text-ink3 [&>svg]:size-spinner-small';
const WORD = 'mu-plan-word flex-none type-meta tabular-nums text-ink3';
const UNDER = 'flex min-w-0 gap-plan-task-gap';
const DETAIL = 'mu-plan-detail m-0 min-w-0 type-meta text-ink2';
// The rule runs down the middle of the mark's column, so nested marks line up under the step's words.
const RAIL = 'flex w-spinner-small flex-none justify-center';
const RULE = 'block w-rule-thickness recipe-rule';

const lampOf: Record<PlanTaskState, LedKind> = { pending: 'off', queued: 'waiting', running: 'live', done: 'off', failed: 'failed' };
const WORDS: Record<PlanTaskState, string> = { pending: '', queued: 'Queued', running: 'Running', done: '', failed: 'Failed' };

/** A red lamp blinks twice when its task fails on screen, never on load. */
function useGesture(state: PlanTaskState): LedGesture {
  const [seen, setSeen] = React.useState(state);
  const [gesture, setGesture] = React.useState<LedGesture>('steady');
  if (seen !== state) {
    setSeen(state);
    setGesture(state === 'failed' ? 'blink2' : 'steady');
  }
  return gesture;
}

function Task({ task }: { task: PlanTask }) {
  const state = task.state ?? 'pending';
  const wait = useWait(state === 'running' ? 'working' : state === 'done' ? 'done' : 'idle');
  const gesture = useGesture(state);
  return (
    <li className={TASK} data-state={state}>
      <span className={LINE}>
        <span aria-hidden className={SLOT}>
          {wait.showing
            ? <Spinner size="small" phase={wait.phase} label="" />
            : state === 'done' ? <CheckIcon /> : <Led kind={lampOf[state]} size="small" gesture={gesture} />}
        </span>
        <span className={`min-w-0 flex-1 type-ui ${state === 'done' ? 'text-ink3' : 'text-ink'}`}>
          {task.title}
          {state === 'done' && <span className="sr-only">, done</span>}
        </span>
        <span className={WORD}><SwapText value={WORDS[state]} /></span>
      </span>
      {task.description != null && (
        <div className={UNDER}>
          <span aria-hidden className="w-spinner-small flex-none" />
          <p className={DETAIL}>{task.description}</p>
        </div>
      )}
      {task.tasks && task.tasks.length > 0 && (
        <div className={UNDER}>
          <span aria-hidden className={RAIL}><span className={RULE} /></span>
          <ol className={`${LIST} flex-1`}>{task.tasks.map((t) => <Task key={t.id} task={t} />)}</ol>
        </div>
      )}
    </li>
  );
}

/** The agent's to-do list: a head with how far it has got, and the steps with their states. */
export function Plan({ tasks, title = 'Plan', className, ...props }: PlanProps) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.state === 'done').length;
  const state: ProgressState = tasks.some((t) => t.state === 'failed') ? 'failed' : total > 0 && done === total ? 'complete' : 'running';
  const busy = tasks.some(function runs(t): boolean { return t.state === 'running' || !!t.tasks?.some(runs); });
  const count = `${done} of ${total}`;
  return (
    <div className={className ? `${ROOT} ${className}` : ROOT} {...props}>
      <Progress size="compact" label={title} detail={count} value={done} max={total || 1} state={state} getAriaValueText={() => `${count} done`} />
      <ol className={LIST} aria-label={title} aria-busy={busy || undefined}>
        {tasks.map((t) => <Task key={t.id} task={t} />)}
      </ol>
    </div>
  );
}
