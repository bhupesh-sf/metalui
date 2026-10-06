'use client';

import * as React from 'react';
import { CheckIcon } from '../../icons/components.generated';
import { SwapText } from '../../motion/swap';
import { useWait } from '../../motion/wait';
import { Button, type ButtonProps } from '../button/button';
import { Spinner } from '../spinner/spinner';

/* ─────────────────────────────────────────────────────────
 * STEPPER, the steps of a wizard: where you are, what's done, what's left
 *
 *   upcoming  the switch's sunk well, its number in ink3
 *   current   under the switcher's raised thumb, number in ink; the thumb glides from step to step
 *             along the groove on the part spring (a track with ends: it may overshoot its stop)
 *   done      the checkbox's on look with the set's check; the groove after it fills green (the
 *             switch's on look, slid in) on the settle spring, and drains on release
 *   error     the field's invalid hairline ring on the indicator; the words under the title in the
 *             form error's ink. Error wins over done
 *   waiting   the number gives way to the Spinner's ring after the show delay (useWait); its tick
 *             when the wait ends
 *   unreachable  past the furthest step reached (linear): plain text, "not available yet"
 *   disabled  40 %, not a button
 *   hover     a step you can go to lifts (the row's list hover); focus: the green ring
 *   panel     always mounted, hidden unless current (input survives going back); the new one drifts
 *             in one nest from the way you went and fades, settle spring; focus moves to it after
 *             Back or Continue
 *   narrow    under 480 px a horizontal list keeps its titles for readers only and shows one line
 *             under the row: "Step 2 of 4 · Shipping"
 * Reduce Motion: the thumb, the fill and the panel move at once; the panel fades.
 * Semantics: an ordered list; the current step has aria-current="step"; no roving focus.
 * Slots: Stepper.Root, Stepper.List, Stepper.Panel, Stepper.Back, Stepper.Next.
 * ───────────────────────────────────────────────────────── */

export interface StepperStep {
  title: string;
  /** A second line under the title. */
  description?: string;
  /** What's wrong with this step, said under its title in the error ink; it rings the indicator. */
  error?: string;
  /** The step is working (saving, checking): its number gives way to the Spinner's ring after the show delay. */
  waiting?: boolean;
  /** Done or not, overriding the default (a step is done once you've passed it). */
  complete?: boolean;
  /** Off for now: 40 %, not a button. */
  disabled?: boolean;
}

export type StepperOrientation = 'horizontal' | 'vertical';
export type StepperLayout = 'stacked' | 'inline';

const ROOT = 'mu-stepper grid gap-stepper-panel-gap';
const LIST_WRAP = 'mu-stepper-list stepper-list grid min-w-0';
const FRAME = 'relative min-w-0';
const LIST = 'm-0 flex list-none p-0 data-[orientation=vertical]:flex-col';
const THUMB = 'mu-stepper-thumb stepper-thumb size-stepper-indicator-size rounded-pill recipe-switcher-thumb pointer-events-none reduced-motion:transition-none';
const ITEM: Record<StepperOrientation | 'inline', string> = {
  horizontal: 'mu-stepper-item relative flex min-w-0 flex-1 justify-center',
  inline: 'mu-stepper-item relative flex min-w-0 flex-1 items-center last:flex-none',
  vertical: 'mu-stepper-item relative grid justify-items-start pb-stepper-vertical-gap last:pb-0 [&>.mu-stepper-panel]:stepper-panel-beside',
};
const STEP = 'mu-stepper-step relative flex min-w-0 gap-stepper-step-gap p-stepper-step-pad rounded-stepper-step-radius border-0 bg-transparent outline-none';
const STEP_SHAPE: Record<StepperOrientation | 'inline', string> = {
  horizontal: 'flex-col items-center text-center',
  inline: 'items-center text-left',
  vertical: 'items-start text-left',
};
const PRESSABLE = 'cursor-pointer transition-row hover:recipe-row-list-hover focus-visible:focus-ring';
const INDICATOR = 'mu-stepper-indicator relative grid flex-none place-items-center size-stepper-indicator-size rounded-pill type-meta tabular-nums [&_svg]:size-stepper-indicator-glyph';
const LOOK = {
  upcoming: 'recipe-switch text-ink3',
  current: 'text-ink',
  done: 'recipe-checkbox-on text-checkbox-tick-color',
} as const;
const TEXT = 'grid min-w-0 gap-stepper-step-text-gap';
const TITLE = 'mu-stepper-title type-ui';
const DESCRIPTION = 'mu-stepper-description type-meta text-ink3';
const ERROR = 'mu-stepper-error type-meta text-form-field-error-ink';
const GROOVE = 'mu-stepper-groove block overflow-hidden rounded-pill recipe-switch';
const GROOVE_SHAPE: Record<StepperOrientation | 'inline', string> = {
  horizontal: 'stepper-groove-across',
  inline: 'stepper-groove-inline',
  vertical: 'stepper-groove-down',
};
const FILL = 'mu-stepper-fill stepper-fill recipe-switch-on reduced-motion:transition-none';
const NOW = 'mu-stepper-now stepper-now m-0 pt-stepper-step-pad text-center type-meta text-ink2';
const PANEL = 'mu-stepper-panel stepper-panel';

const join = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ');

interface StepperContext {
  steps: StepperStep[];
  value: number;
  reached: number;
  linear: boolean;
  orientation: StepperOrientation;
  direction: 'next' | 'back' | null;
  /** Counts moves made by Back and Continue: the new panel takes focus. */
  moved: number;
  go: (index: number, by?: 'key') => void;
}
const Ctx = React.createContext<StepperContext | null>(null);
const useStepper = (part: string) => {
  const c = React.useContext(Ctx);
  if (!c) throw new Error(`Stepper.${part} must be inside Stepper.Root`);
  return c;
};

export interface StepperRootProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> {
  steps: StepperStep[];
  /** The current step's index. */
  value?: number;
  defaultValue?: number;
  onValueChange?: (index: number) => void;
  /** true (default): only steps up to the furthest you've reached can be visited. false: any step. */
  linear?: boolean;
  /** horizontal (default): the steps in a row above the panels. vertical: a column; lay it beside the panels, or put the panels in the list. */
  orientation?: StepperOrientation;
}

/** Holds the steps and which one is current; put a Stepper.List, the panels and Back / Continue anywhere inside. */
function Root({ steps, value: valueProp, defaultValue = 0, onValueChange, linear = true, orientation = 'horizontal', className, children, ...props }: StepperRootProps) {
  const [own, setOwn] = React.useState(defaultValue);
  const value = Math.max(0, Math.min(steps.length - 1, valueProp ?? own));
  const [reached, setReached] = React.useState(value);
  if (value > reached) setReached(value);
  const [move, setMove] = React.useState<{ direction: 'next' | 'back' | null; moved: number }>({ direction: null, moved: 0 });
  const last = React.useRef(value);
  // A new value from anywhere (a step, a key, the host): the panel arrives from the way you went.
  if (value !== last.current) {
    const direction = value > last.current ? 'next' : 'back';
    setMove((m) => ({ ...m, direction }));
    last.current = value;
  }
  const go = React.useCallback((index: number, by?: 'key') => {
    if (index === value || index < 0 || index >= steps.length) return;
    if (by) setMove((m) => ({ ...m, moved: m.moved + 1 }));
    if (valueProp === undefined) setOwn(index);
    onValueChange?.(index);
  }, [value, steps.length, valueProp, onValueChange]);
  const ctx = React.useMemo(
    () => ({ steps, value, reached: Math.max(reached, value), linear, orientation, direction: move.direction, moved: move.moved, go }),
    [steps, value, reached, linear, orientation, move, go],
  );
  return (
    <Ctx.Provider value={ctx}>
      <div data-orientation={orientation} className={join(ROOT, className)} {...props}>{children}</div>
    </Ctx.Provider>
  );
}

type Shape = StepperOrientation | 'inline';

interface StepProps { index: number; step: StepperStep; shape: Shape; panel?: React.ReactNode }

/** One step: its indicator, title and lines, the groove to the next, and (vertical) its panel. */
function Step({ index, step, shape, panel }: StepProps) {
  const { steps, value, reached, linear, go } = useStepper('List');
  const current = index === value;
  const done = !step.error && (step.complete ?? (index < reached && !current));
  const reachable = !step.disabled && (!linear || index <= reached);
  const wait = useWait(step.waiting ? 'working' : done ? 'done' : 'idle');
  const look = current ? LOOK.current : done ? LOOK.done : LOOK.upcoming;
  const said = [
    done && 'completed',
    step.error && `has a problem: ${step.error}`,
    !reachable && !current && (step.disabled ? 'unavailable' : 'not available yet'),
  ].filter(Boolean).join(', ');
  const inner = (
    <>
      <span aria-hidden className={join(INDICATOR, look, step.error && 'invalid-ring')}>
        {wait.showing ? <Spinner size="small" phase={wait.phase} label={`${step.title}, working`} /> : done ? <CheckIcon animate={false} /> : index + 1}
      </span>
      <span className={TEXT}>
        <span className={join(TITLE, 'stepper-said', current ? 'text-ink' : reachable ? 'text-ink2' : 'text-ink3')}>
          <span className="sr-only">Step {index + 1}: </span>{step.title}{said && <span className="sr-only">, {said}</span>}
        </span>
        {step.error
          ? <span className={join(ERROR, shape === 'horizontal' && 'stepper-said')}>{step.error}</span>
          : step.description && <span className={join(DESCRIPTION, shape === 'horizontal' && 'stepper-said')}>{step.description}</span>}
      </span>
    </>
  );
  const own = join(STEP, STEP_SHAPE[shape], step.disabled && 'opacity-stepper-step-disabled');
  const groove = index < steps.length - 1 && (
    <span aria-hidden className={join(GROOVE, GROOVE_SHAPE[shape])}>
      <span className={FILL} data-on={done ? '' : undefined} />
    </span>
  );
  return (
    <li
      className={ITEM[shape]}
      data-current={current ? '' : undefined}
      data-done={done ? '' : undefined}
      data-invalid={step.error ? '' : undefined}
      aria-busy={wait.busy || undefined}
    >
      {reachable
        ? <button type="button" className={join(own, PRESSABLE)} aria-current={current ? 'step' : undefined} onClick={() => go(index)}>{inner}</button>
        : <span className={own} aria-current={current ? 'step' : undefined}>{inner}</span>}
      {groove}
      {panel}
    </li>
  );
}

/** Where the current indicator sits inside the list, for the thumb. */
function useThumb(frame: React.RefObject<HTMLDivElement | null>) {
  const thumb = React.useRef<HTMLSpanElement>(null);
  React.useLayoutEffect(() => {
    const box = frame.current;
    const el = thumb.current;
    if (!box || !el) return;
    const place = () => {
      const ind = box.querySelector<HTMLElement>(':scope > ol > [data-current] > .mu-stepper-step > .mu-stepper-indicator');
      if (!ind) return;
      const from = box.getBoundingClientRect();
      const at = ind.getBoundingClientRect();
      el.style.setProperty('--mu-stepper-x', `${at.left - from.left}px`);
      el.style.setProperty('--mu-stepper-y', `${at.top - from.top}px`);
    };
    place();
    // Glide only after the first place, so the thumb never flies in on load.
    const ready = requestAnimationFrame(() => el.setAttribute('data-ready', ''));
    const ro = new ResizeObserver(place);
    ro.observe(box);
    return () => { cancelAnimationFrame(ready); ro.disconnect(); };
  });
  return thumb;
}

export interface StepperListProps {
  /** Names the steps: "Checkout steps". */
  'aria-label': string;
  /** stacked (default): titles under the indicators. inline: each title beside its indicator. Horizontal only. */
  layout?: StepperLayout;
  /** Vertical only: Stepper.Panels placed here open under their step's title. */
  children?: React.ReactNode;
  className?: string;
}

/** The steps on their groove, with the current step's thumb. */
function List({ layout = 'stacked', children, className, ...props }: StepperListProps) {
  const { steps, value, orientation } = useStepper('List');
  const shape: Shape = orientation === 'vertical' ? 'vertical' : layout === 'inline' ? 'inline' : 'horizontal';
  const frame = React.useRef<HTMLDivElement>(null);
  const thumb = useThumb(frame);
  const panels = React.Children.toArray(children).filter((c): c is React.ReactElement<StepperPanelProps> => React.isValidElement(c));
  return (
    <div data-orientation={orientation} className={join(LIST_WRAP, className)}>
      <div ref={frame} className={FRAME}>
        <span ref={thumb} aria-hidden className={THUMB} />
        <ol aria-label={props['aria-label']} data-orientation={orientation} className={LIST}>
          {steps.map((step, i) => (
            <Step key={i} index={i} step={step} shape={shape} panel={orientation === 'vertical' ? panels.find((p) => p.props.index === i) : undefined} />
          ))}
        </ol>
      </div>
      {orientation === 'horizontal' && (
        <p aria-hidden className={NOW}>
          <SwapText value={`Step ${value + 1} of ${steps.length} · ${steps[value]?.title ?? ''}`} />
        </p>
      )}
    </div>
  );
}

export interface StepperPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The step this panel belongs to. */
  index: number;
}

/** One step's content. Always mounted, hidden unless current, so what was typed survives going back. */
function Panel({ index, className, ...props }: StepperPanelProps) {
  const { value, direction, moved, steps } = useStepper('Panel');
  const ref = React.useRef<HTMLDivElement>(null);
  const current = index === value;
  const seen = React.useRef(moved);
  React.useEffect(() => {
    if (moved === seen.current) return;
    seen.current = moved;
    if (current) ref.current?.focus({ preventScroll: true });
  }, [moved, current]);
  return (
    <div
      ref={ref}
      role="group"
      aria-label={steps[index]?.title}
      tabIndex={-1}
      hidden={!current}
      data-direction={direction ?? undefined}
      className={join(PANEL, className)}
      {...props}
    />
  );
}

export type StepperBackProps = Omit<ButtonProps, 'children'> & { children?: React.ReactNode };

/** Back one step; off on the first. What was typed stays. */
function Back({ children = 'Back', onClick, disabled, ...props }: StepperBackProps) {
  const { value, go } = useStepper('Back');
  return (
    <Button
      {...props}
      disabled={disabled || value === 0}
      onClick={(e) => { onClick?.(e); if (!e.defaultPrevented) go(value - 1, 'key'); }}
    >
      {children}
    </Button>
  );
}

export type StepperNextProps = Omit<ButtonProps, 'children'> & {
  /** The words on every step but the last. */
  children?: string;
  /** The words on the last step, where it never advances (the host submits). */
  finish?: string;
};

/** On to the next step: a primary key whose words turn to "Finish" on the last. Refuse with `event.preventDefault()` in `onClick`. */
function Next({ children = 'Continue', finish = 'Finish', onClick, cap = 'primary', ...props }: StepperNextProps) {
  const { value, steps, go } = useStepper('Next');
  const last = value === steps.length - 1;
  return (
    <Button
      cap={cap}
      {...props}
      onClick={(e) => { onClick?.(e); if (!e.defaultPrevented && !last) go(value + 1, 'key'); }}
    >
      <SwapText value={last ? finish : children} />
    </Button>
  );
}

export const Stepper = Object.assign(Root, { Root, List, Panel, Back, Next });
