'use client';

import { Field as BaseField } from '@base-ui/react/field';
import { Fieldset as BaseFieldset } from '@base-ui/react/fieldset';
import { Form as BaseForm } from '@base-ui/react/form';

/* ─────────────────────────────────────────────────────────
 * FORM FIELD and FIELDSET, a control with its words, on Base UI Field and Fieldset
 *
 *   label        above the control (ui type, ink); tied to it, so clicking it focuses the control
 *   description  below (meta type, ink3); read with the control by assistive tech
 *   error        below, when the value is not accepted (meta type, red): its row grows open on
 *                the settle spring as it fades in, so the layout below moves rather than jumps;
 *                it leaves on the release spring
 *   states       invalid and disabled on the field reach every control inside (Field, Textarea,
 *                Select, Combobox, Number field, Radio group, Checkbox group), which draw their own
 *                invalid ring and disabled look
 *   fieldset     groups fields (or a radio or checkbox group) under a legend
 *   form         validates every field on submit, moves focus to the first one not accepted, and
 *                takes a server's errors by field name
 * Reduce Motion: the error's row snaps; the fade stays.
 * Slots: FormField.Root, FormField.Label, FormField.Description, FormField.Error; Fieldset.Root, Fieldset.Legend; Form.
 * ───────────────────────────────────────────────────────── */

const ROOT = 'mu-form-field grid gap-form-field-gap';
const LABEL = 'mu-form-field-label type-ui text-ink w-max data-disabled:opacity-field-state-disabled';
const DESCRIPTION = 'mu-form-field-description m-0 type-meta text-ink3';
const ERROR = 'mu-form-field-error type-meta text-form-field-error-ink form-field-error';
const FIELDSET = 'mu-fieldset grid gap-form-field-fieldset-gap m-0 p-0 border-0 min-w-0 data-disabled:opacity-field-state-disabled';
const FORM = 'mu-form grid gap-form-field-form-gap';
const LEGEND = 'mu-fieldset-legend type-label engraved form-field-legend';

export type FormFieldRootProps = Omit<BaseField.Root.Props, 'className'> & { className?: string };

function Root({ className, ...props }: FormFieldRootProps) {
  return <BaseField.Root className={className ? `${ROOT} ${className}` : ROOT} {...props} />;
}

function Label({ className, ...props }: BaseField.Label.Props & { className?: string }) {
  return <BaseField.Label className={className ? `${LABEL} ${className}` : LABEL} {...props} />;
}

function Description({ className, ...props }: BaseField.Description.Props & { className?: string }) {
  return <BaseField.Description className={className ? `${DESCRIPTION} ${className}` : DESCRIPTION} {...props} />;
}

/**
 * Why the value is not accepted. Shown while the field is invalid (or, with `match`, for one validity
 * rule). Without children it says the validation message: what `validate` returned, or the browser's.
 */
function Error({ className, children, ...props }: BaseField.Error.Props & { className?: string }) {
  return (
    <BaseField.Error className={className ? `${ERROR} ${className}` : ERROR} {...props}>
      {/* One inner row: the error's grid grows it open. */}
      <span>{children ?? <BaseField.Validity>{(v) => v.errors.join(' ') || v.error}</BaseField.Validity>}</span>
    </BaseField.Error>
  );
}

export const FormField = Object.assign(Root, { Label, Description, Error, Root });

function FieldsetRoot({ className, ...props }: BaseFieldset.Root.Props & { className?: string }) {
  return <BaseFieldset.Root className={className ? `${FIELDSET} ${className}` : FIELDSET} {...props} />;
}

function Legend({ className, ...props }: BaseFieldset.Legend.Props & { className?: string }) {
  return <BaseFieldset.Legend className={className ? `${LEGEND} ${className}` : LEGEND} {...props} />;
}

export const Fieldset = Object.assign(FieldsetRoot, { Legend, Root: FieldsetRoot });

export type FormProps<Values extends Record<string, unknown> = Record<string, unknown>> = Omit<BaseForm.Props<Values>, 'className'> & { className?: string };

/** A form of fields: validates them all on submit and focuses the first one not accepted. */
export function Form<Values extends Record<string, unknown> = Record<string, unknown>>({ className, ...props }: FormProps<Values>) {
  return <BaseForm<Values> className={className ? `${FORM} ${className}` : FORM} {...props} />;
}
