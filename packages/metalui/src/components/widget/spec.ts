/* ─────────────────────────────────────────────────────────
 * WIDGET SPEC · the one source for what a model may send
 *
 *   Every node a widget can hold, its props, their kinds, enums and limits. The renderer validates
 *   against it (widget.tsx), the JSON Schema is generated from it (public/widgets.schema.json), and so
 *   is the vocabulary in AI.md (scripts/build-agent-docs.mjs). Plain data, no imports: Node reads this
 *   file directly when it generates.
 * ───────────────────────────────────────────────────────── */

/** Limits on what one widget may hold; past them the rest is a quiet fallback. */
export const WIDGET_LIMITS = { depth: 8, nodes: 200, text: 4000, items: 100, payload: 8192 } as const;

/** URLs a widget may carry: anything else is dropped. */
export const WIDGET_URL = /^(https?:|mailto:)/i;
/** A field's name, the key its value is sent under. */
export const WIDGET_NAME = /^[\w.-]{1,64}$/;

export type WidgetPropSpec =
  | { kind: 'string'; doc: string; required?: boolean; max?: number }
  | { kind: 'name'; doc: string; required?: boolean }
  | { kind: 'number'; doc: string; required?: boolean; min?: number; max?: number }
  | { kind: 'boolean'; doc: string }
  | { kind: 'enum'; doc: string; values: readonly string[] }
  | { kind: 'url'; doc: string }
  | { kind: 'date'; doc: string }
  | { kind: 'action'; doc: string; required?: boolean }
  | { kind: 'nodes'; doc: string; of?: readonly string[]; required?: boolean }
  | { kind: 'options'; doc: string; required?: boolean }
  | { kind: 'pairs'; doc: string; required?: boolean };

export interface WidgetNodeSpec {
  doc: string;
  /** The MetalUI component it renders. */
  renders: string;
  /** Only inside a node whose `nodes` prop names it (a ListItem in a List), never on its own. */
  nested?: boolean;
  props: Record<string, WidgetPropSpec>;
}

const SIZE = { kind: 'enum', doc: 'regular (the default) or compact.', values: ['regular', 'compact'] } as const;
const LABEL = { kind: 'string', doc: 'What the field asks for, shown above it.', max: 120 } as const;
const NAME = { kind: 'name', doc: 'The key its value is sent under with every action (letters, digits, _ . -).', required: true } as const;

export const WIDGET_SPEC = {
  Card: {
    doc: 'A thing on a raised plate: a title, a description, a status lamp, body nodes and a footer of buttons.',
    renders: 'Card',
    props: {
      title: { kind: 'string', doc: 'The card\'s title.', required: true, max: 200 },
      href: { kind: 'url', doc: 'Makes the title a link over the card (http, https or mailto only).' },
      description: { kind: 'string', doc: 'One or two lines under the title.', max: 600 },
      status: { kind: 'enum', doc: 'A lamp at the title\'s end: live (green), waiting (amber), failed (red).', values: ['live', 'waiting', 'failed'] },
      size: SIZE,
      children: { kind: 'nodes', doc: 'Body nodes, in a column.' },
      footer: { kind: 'nodes', doc: 'Buttons under the body.', of: ['Button'] },
    },
  },
  List: {
    doc: 'Rows of items, each a line of text with a detail and a trailing badge; an item with an action is a key.',
    renders: 'Row',
    props: {
      label: { kind: 'string', doc: 'Names the list for assistive tech.', max: 120 },
      children: { kind: 'nodes', doc: 'The items.', of: ['ListItem'], required: true },
    },
  },
  ListItem: {
    doc: 'One row of a List.',
    renders: 'Row',
    nested: true,
    props: {
      text: { kind: 'string', doc: 'The row\'s words.', required: true, max: 200 },
      detail: { kind: 'string', doc: 'A second, quieter line.', max: 400 },
      badge: { kind: 'string', doc: 'A short fact at the row\'s end.', max: 40 },
      action: { kind: 'action', doc: 'Makes the row a key that sends this action.' },
    },
  },
  Badge: {
    doc: 'One short fact: a kind, a version, a state.',
    renders: 'Badge',
    props: {
      text: { kind: 'string', doc: 'The words.', required: true, max: 40 },
      led: { kind: 'enum', doc: 'A leading lamp: live (green), waiting (amber), failed (red), off.', values: ['live', 'waiting', 'failed', 'off'] },
      size: SIZE,
    },
  },
  Button: {
    doc: 'A key that sends an action to the host, with the widget\'s field values beside it.',
    renders: 'Button',
    props: {
      label: { kind: 'string', doc: 'The verb on the key.', required: true, max: 60 },
      action: { kind: 'action', doc: 'What the key sends.', required: true },
      cap: { kind: 'enum', doc: 'standard (the default), primary (the one main act), destructive (cannot be undone).', values: ['standard', 'primary', 'destructive'] },
      size: { kind: 'enum', doc: 'default or compact.', values: ['default', 'compact'] },
      disabled: { kind: 'boolean', doc: 'Shown but not pressable.' },
    },
  },
  Field: {
    doc: 'A one-line text field; its value is sent with every action under its name.',
    renders: 'Field',
    props: {
      name: NAME,
      label: LABEL,
      input: { kind: 'enum', doc: 'text (the default), email, number or url.', values: ['text', 'email', 'number', 'url'] },
      placeholder: { kind: 'string', doc: 'The hint while empty.', max: 120 },
      defaultValue: { kind: 'string', doc: 'The value it starts with.', max: 400 },
      size: { kind: 'enum', doc: 'large, regular (the default) or compact.', values: ['large', 'regular', 'compact'] },
    },
  },
  Select: {
    doc: 'One of a few options; its value is sent with every action under its name.',
    renders: 'Select',
    props: {
      name: NAME,
      label: LABEL,
      options: { kind: 'options', doc: 'The options, [{ value, label }].', required: true },
      placeholder: { kind: 'string', doc: 'The words before a choice.', max: 120 },
      defaultValue: { kind: 'string', doc: 'The value chosen at first.', max: 200 },
      size: SIZE,
    },
  },
  DatePicker: {
    doc: 'One day, typed or picked; sent as YYYY-MM-DD under its name.',
    renders: 'DatePicker',
    props: {
      name: NAME,
      label: LABEL,
      defaultValue: { kind: 'date', doc: 'The day it starts with, YYYY-MM-DD.' },
      min: { kind: 'date', doc: 'The first day that can be chosen.' },
      max: { kind: 'date', doc: 'The last day that can be chosen.' },
      size: SIZE,
    },
  },
  Properties: {
    doc: 'Label and value pairs: a receipt, a details panel.',
    renders: 'Properties',
    props: {
      items: { kind: 'pairs', doc: 'The pairs, [{ label, value }].', required: true },
      size: SIZE,
    },
  },
  Markdown: {
    doc: 'Words, in Markdown. Links other than http, https and mailto become their words.',
    renders: 'Markdown',
    props: {
      text: { kind: 'string', doc: 'The Markdown source.', required: true },
    },
  },
  Progress: {
    doc: 'How far a task has gone.',
    renders: 'Progress',
    props: {
      label: { kind: 'string', doc: 'What is under way.', max: 120 },
      value: { kind: 'number', doc: 'Done so far, 0 to 100; leave it out when unknown.', min: 0, max: 100 },
      state: { kind: 'enum', doc: 'running (the default), paused, failed or complete.', values: ['running', 'paused', 'failed', 'complete'] },
    },
  },
  Meter: {
    doc: 'A measured amount in a known range: storage, quota, a level.',
    renders: 'Meter',
    props: {
      label: { kind: 'string', doc: 'What is measured.', required: true, max: 120 },
      value: { kind: 'number', doc: 'The amount.', required: true },
      min: { kind: 'number', doc: 'The range\'s low end, 0 by default.' },
      max: { kind: 'number', doc: 'The range\'s high end, 100 by default.' },
    },
  },
  Alert: {
    doc: 'A message about this place, with buttons.',
    renders: 'Alert',
    props: {
      kind: { kind: 'enum', doc: 'note (the default), done, waiting, urgent or failed.', values: ['note', 'done', 'waiting', 'urgent', 'failed'] },
      title: { kind: 'string', doc: 'The message.', required: true, max: 200 },
      description: { kind: 'string', doc: 'More about it.', max: 600 },
      actions: { kind: 'nodes', doc: 'Buttons.', of: ['Button'] },
    },
  },
} as const satisfies Record<string, WidgetNodeSpec>;

export type WidgetType = keyof typeof WIDGET_SPEC;

/** What the host receives when a key is pressed. */
export interface WidgetAction {
  type: 'action';
  name: string;
  payload?: Record<string, unknown>;
}
export interface WidgetOption { value: string; label: string }
export interface WidgetPair { label: string; value: string }

type ValueOf<P> = P extends { kind: 'string' | 'name' | 'url' | 'date' } ? string
  : P extends { kind: 'number' } ? number
  : P extends { kind: 'boolean' } ? boolean
  : P extends { kind: 'enum'; values: readonly (infer V)[] } ? V
  : P extends { kind: 'action' } ? WidgetAction
  : P extends { kind: 'nodes' } ? WidgetNode[]
  : P extends { kind: 'options' } ? WidgetOption[]
  : P extends { kind: 'pairs' } ? WidgetPair[]
  : never;

/** One node of a type, its props typed from the spec. */
export type WidgetNodeOf<T extends WidgetType> = { type: T } & { -readonly [K in keyof (typeof WIDGET_SPEC)[T]['props']]?: ValueOf<(typeof WIDGET_SPEC)[T]['props'][K]> };
export type WidgetNode = { [T in WidgetType]: WidgetNodeOf<T> }[WidgetType];
