'use client';

import * as React from 'react';
import { Field as BaseField } from '@base-ui/react/field';
import { Fieldset as BaseFieldset } from '@base-ui/react/fieldset';
import { Form as BaseForm } from '@base-ui/react/form';
import { SwapText } from '../../motion/swap';

/* ─────────────────────────────────────────────────────────
 * FORM FIELD and FIELDSET, a control with its words, on Base UI Field and Fieldset
 *
 *   label        above the control (ui type, ink); tied to it, so clicking it focuses the control
 *   beside       orientation="horizontal": the label in a 136 column, end-aligned on the control's
 *                baseline, 16 from it; description, readback and error under the control. When the
 *                field is narrower than 400 it stacks (its own container, @container/form-field)
 *   mark         the minority: "Optional" in ink3 after the label when most fields are required, or a
 *                required dot when most are optional; never both
 *   changed      a small engraved dot hung before the label: changed since it was saved. It pops in on
 *                the settle spring and leaves on the release spring (ChangedMark, shared)
 *   description  below (meta type, ink3); read with the control by assistive tech
 *   readback     a line under the control in the readout type, saying what was understood ("Tue 8 Oct,
 *                08:00", "= 96"); it turns on the drum, and its row opens and closes like the error's
 *   error        below, when the value is not accepted (meta type, red): its row grows open on
 *                the settle spring as it fades in, so the layout below moves rather than jumps;
 *                it leaves on the release spring
 *   timing       a field checks when you leave it (or on submit), and its error goes the moment you
 *                change the value: never an error on the first keystroke
 *   states       invalid and disabled on the field reach every control inside (Field, Textarea,
 *                Select, Combobox, Number field, Radio group, Checkbox group), which draw their own
 *                invalid ring and disabled look
 *   fieldset     groups fields (or a radio or checkbox group) under a legend
 *   form         validates every field on submit, moves focus to the first one not accepted, and
 *                takes a server's errors by field name
 * Reduce Motion: the rows snap and the marks fade without the pop; the fades stay.
 * Slots: FormField.Root, FormField.Label, FormField.Description, FormField.Readback, FormField.Error;
 * Fieldset.Root, Fieldset.Legend; Form. ChangedMark stands alone for other controls.
 * ───────────────────────────────────────────────────────── */

const ROOT = 'mu-form-field grid gap-form-field-gap';
const SIDE = 'mu-form-field form-field-side';
const SIDE_GRID = 'mu-form-field-grid form-field-side-grid';
const LABEL = 'mu-form-field-label relative inline-block type-ui text-ink w-max data-disabled:opacity-field-state-disabled';
const OPTIONAL = 'mu-form-field-optional inline-block ml-form-field-mark-gap text-ink3';
const REQUIRED = 'mu-form-field-required ml-form-field-mark-gap form-field-required';
const CHANGED = 'mu-changed-mark changed-mark';
const DESCRIPTION = 'mu-form-field-description m-0 type-meta text-ink3';
const READBACK = 'mu-form-field-readback m-0 form-field-error';
const READBACK_TEXT = 'block type-readout text-ink2';
const ERROR = 'mu-form-field-error type-meta text-form-field-error-ink form-field-error';
const FIELDSET = 'mu-fieldset grid gap-form-field-fieldset-gap m-0 p-0 border-0 min-w-0 data-disabled:opacity-field-state-disabled';
const FORM = 'mu-form grid gap-form-field-form-gap';
const LEGEND = 'mu-fieldset-legend type-label engraved form-field-legend';

const cx = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' ');

type ValidationMode = BaseField.Root.Props['validationMode'];
// A Form's validation mode reaches its fields; without a Form, fields check on blur.
const ModeCtx = React.createContext<ValidationMode>('onBlur');
// Whether the field's value is changed since it was saved (undefined: the field does not track it).
const ChangedCtx = React.createContext<boolean | undefined>(undefined);

export type FormFieldRootProps = Omit<BaseField.Root.Props, 'className'> & {
  className?: string;
  /** vertical (the default): the label above. horizontal: the label beside the control, stacking when the field is narrow. */
  orientation?: 'vertical' | 'horizontal';
  /** The value is changed since it was saved: the changed mark before the label. Pass false (not nothing) once saved, so it leaves on its spring. */
  changed?: boolean;
};

function Root({ className, orientation = 'vertical', changed, validationMode, children, ...props }: FormFieldRootProps) {
  const mode = React.useContext(ModeCtx);
  const side = orientation === 'horizontal';
  return (
    <ChangedCtx.Provider value={changed}>
      <BaseField.Root
        validationMode={validationMode ?? mode}
        data-orientation={orientation}
        data-changed={changed ? '' : undefined}
        className={cx(side ? SIDE : ROOT, className)}
        {...props}
      >
        {/* Beside: the field is its own container, and the grid inside it reads the field's width. */}
        {side ? <div className={SIDE_GRID}>{children}</div> : children}
      </BaseField.Root>
    </ChangedCtx.Provider>
  );
}

export type FormFieldLabelProps = BaseField.Label.Props & {
  className?: string;
  /** Mark the minority: "optional" when most fields in the form are required, "required" (a dot) when most are optional. Never both. */
  mark?: 'optional' | 'required';
};

function Label({ className, mark, children, ...props }: FormFieldLabelProps) {
  const changed = React.useContext(ChangedCtx);
  return (
    <BaseField.Label className={cx(LABEL, className)} {...props}>
      {children}
      {mark === 'optional' && <span className={OPTIONAL}>Optional</span>}
      {/* The control's own `required` says it to assistive tech; the dot is for the eye. */}
      {mark === 'required' && <span aria-hidden className={REQUIRED} />}
      {changed !== undefined && <ChangedMark changed={changed} className="form-field-changed-hang" />}
    </BaseField.Label>
  );
}

function Description({ className, ...props }: BaseField.Description.Props & { className?: string }) {
  return <BaseField.Description className={cx(DESCRIPTION, className)} {...props} />;
}

export interface FormFieldReadbackProps extends Omit<BaseField.Description.Props, 'children' | 'className'> {
  /** What was understood, in words a person checks at a glance: "Tue 8 Oct, 08:00", "= 96". Empty closes the row. */
  children?: string | null;
  className?: string;
}

/**
 * Says what the field understood from what was typed, in the readout type under the control. Each new reading
 * turns on the drum; the row opens and closes like the error's. It describes the control (read with it), and is
 * not announced on every keystroke.
 */
function Readback({ children, className, ...props }: FormFieldReadbackProps) {
  const text = children ?? '';
  // While the row closes it keeps the last reading; each time it opens the drum is fresh (nothing to turn from).
  const [seen, setSeen] = React.useState({ text, last: text, opened: 0 });
  if (text !== seen.text) setSeen((s) => ({ text, last: text || s.last, opened: text && !s.text ? s.opened + 1 : s.opened }));
  return (
    <BaseField.Description className={cx(READBACK, className)} data-ending-style={text ? undefined : ''} {...props}>
      {/* One inner row, which the grid grows open; the closing reading is hidden from assistive tech. */}
      <span className={READBACK_TEXT} aria-hidden={text ? undefined : true}>
        <SwapText key={seen.opened} value={text || seen.last} />
      </span>
    </BaseField.Description>
  );
}

/**
 * Why the value is not accepted. Shown while the field is invalid (or, with `match`, for one validity
 * rule). Without children it says the validation message: what `validate` returned, or the browser's.
 */
function Error({ className, children, ...props }: BaseField.Error.Props & { className?: string }) {
  return (
    <BaseField.Error className={cx(ERROR, className)} {...props}>
      {/* One inner row: the error's grid grows it open. */}
      <span>{children ?? <BaseField.Validity>{(v) => v.errors.join(' ') || v.error}</BaseField.Validity>}</span>
    </BaseField.Error>
  );
}

export const FormField = Object.assign(Root, { Label, Description, Readback, Error, Root });

export interface ChangedMarkProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** Changed since it was saved (or off its default). false hides it on the release spring; it keeps no space either way. */
  changed?: boolean;
  /** What a screen reader hears after the thing it marks. Default "changed". */
  label?: string;
}

/**
 * The changed mark: a small engraved dot for a value changed since it was saved, or off its default, so a person
 * can review what they touched before saving. Put it before what it marks (a label, a cell, a row's name); it pops
 * in on the settle spring and leaves on the release spring.
 */
export function ChangedMark({ changed = true, label = 'changed', className, ...props }: ChangedMarkProps) {
  return (
    <span className={cx(CHANGED, className)} data-changed={changed ? '' : undefined} {...props}>
      <span className="sr-only">{changed ? label : ''}</span>
    </span>
  );
}

function FieldsetRoot({ className, ...props }: BaseFieldset.Root.Props & { className?: string }) {
  return <BaseFieldset.Root className={cx(FIELDSET, className)} {...props} />;
}

function Legend({ className, ...props }: BaseFieldset.Legend.Props & { className?: string }) {
  return <BaseFieldset.Legend className={cx(LEGEND, className)} {...props} />;
}

export const Fieldset = Object.assign(FieldsetRoot, { Legend, Root: FieldsetRoot });

export type FormProps<Values extends Record<string, unknown> = Record<string, unknown>> = Omit<BaseForm.Props<Values>, 'className'> & { className?: string };

/** A form of fields: validates them all on submit and focuses the first one not accepted. Its fields check on blur unless told otherwise. */
export function Form<Values extends Record<string, unknown> = Record<string, unknown>>({ className, validationMode = 'onBlur', ...props }: FormProps<Values>) {
  return (
    <ModeCtx.Provider value={validationMode}>
      <BaseForm<Values> validationMode={validationMode} className={cx(FORM, className)} {...props} />
    </ModeCtx.Provider>
  );
}
