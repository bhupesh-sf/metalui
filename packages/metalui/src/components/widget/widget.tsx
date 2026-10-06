'use client';

import * as React from 'react';
import { WIDGET_LIMITS, WIDGET_NAME, WIDGET_SPEC, WIDGET_URL, type WidgetAction, type WidgetNodeOf, type WidgetPropSpec, type WidgetType } from './spec';

/* ─────────────────────────────────────────────────────────
 * WIDGET, a piece of interface a model sent as JSON
 *
 *   parse     the JSON is untrusted: only nodes and props in the spec (spec.ts) pass; strings are text,
 *             URLs only http, https or mailto, nothing is a function; a node's type is looked up as an own
 *             key; depth 8 and 200 nodes at most
 *   render    each node is the MetalUI component it names, its module loaded when a node first needs it
 *   fallback  an unknown node, a node missing what it needs, or one that throws while rendering reads
 *             "Can't show this part" in its place, quietly; the rest of the widget still renders
 *   actions   a key hands the host { type: "action", name, payload } and the fields' values by name;
 *             nothing in the widget runs anything
 * A composed object: every look is the component's; the widget lays its nodes out in a column.
 * ───────────────────────────────────────────────────────── */

export type { WidgetAction, WidgetNode, WidgetNodeOf, WidgetType, WidgetOption, WidgetPair } from './spec';

/** A node as the renderer holds it after parsing: a node of the spec, or a fallback in its place. */
export type WidgetParsedNode = { type: WidgetType | 'Fallback'; [prop: string]: unknown };
export interface WidgetIssue { path: string; message: string }
export interface ParsedWidget { nodes: WidgetParsedNode[]; issues: WidgetIssue[] }
export interface WidgetActionContext { values: Record<string, string> }

export interface WidgetProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** The widget: one node, an array of nodes, or the JSON text of either. */
  widget: unknown;
  /** A key was pressed: its action, and the widget's field values by name. */
  onAction?: (action: WidgetAction, context: WidgetActionContext) => void;
}

const FALLBACK: WidgetParsedNode = { type: 'Fallback' };
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
/** A node may stand where its parent's `of` names it, or anywhere when there is no `of` and it isn't nested. */
const fits = (type: WidgetType, of?: readonly string[]) => (of ? of.includes(type) : !('nested' in WIDGET_SPEC[type]));

/** Validates untrusted widget JSON against the spec. Never throws: what fails becomes a fallback or is dropped, and is listed in `issues`. */
export function parseWidget(input: unknown): ParsedWidget {
  const issues: WidgetIssue[] = [];
  let count = 0;
  const fail = (path: string, message: string) => { issues.push({ path, message }); return FALLBACK; };

  if (typeof input === 'string') {
    try { input = JSON.parse(input); } catch { return { nodes: [FALLBACK], issues: [{ path: '', message: 'not JSON' }] }; }
  }

  function value(p: WidgetPropSpec, v: unknown, path: string, depth: number): unknown {
    switch (p.kind) {
      case 'string': return typeof v === 'string' ? v.slice(0, p.max ?? WIDGET_LIMITS.text) : undefined;
      case 'name': return typeof v === 'string' && WIDGET_NAME.test(v) ? v : undefined;
      case 'number': return typeof v === 'number' && Number.isFinite(v) ? Math.min(p.max ?? Infinity, Math.max(p.min ?? -Infinity, v)) : undefined;
      case 'boolean': return typeof v === 'boolean' ? v : undefined;
      case 'enum': return typeof v === 'string' && p.values.includes(v) ? v : undefined;
      case 'url': {
        const s = typeof v === 'string' ? v.trim() : '';
        if (!WIDGET_URL.test(s)) return undefined;
        try { return new URL(s).href; } catch { return undefined; }
      }
      case 'date': {
        const m = typeof v === 'string' ? DAY.exec(v) : null;
        if (!m) return undefined;
        const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
        return d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[3]) ? v : undefined;
      }
      case 'action': {
        if (!isRecord(v) || v.type !== 'action' || typeof v.name !== 'string' || !v.name || v.name.length > 64) return undefined;
        if (v.payload === undefined) return { type: 'action', name: v.name };
        if (!isRecord(v.payload)) return undefined;
        // A copy that is plain data: no functions, no cycles, no prototype but Object's.
        let text: string;
        try { text = JSON.stringify(v.payload); } catch { return undefined; }
        return text.length <= WIDGET_LIMITS.payload ? { type: 'action', name: v.name, payload: JSON.parse(text) } : undefined;
      }
      case 'nodes': {
        if (!Array.isArray(v)) return undefined;
        const out: WidgetParsedNode[] = [];
        v.slice(0, WIDGET_LIMITS.items).forEach((child, i) => {
          const n = node(child, `${path}[${i}]`, depth + 1);
          if (!n) return;
          out.push(n.type !== 'Fallback' && !fits(n.type, p.of) ? fail(`${path}[${i}]`, `${n.type} can't stand here`) : n);
        });
        return out;
      }
      case 'options': {
        if (!Array.isArray(v)) return undefined;
        const out = v.slice(0, WIDGET_LIMITS.items).filter((o): o is { value: string; label: string } => isRecord(o) && typeof o.value === 'string' && typeof o.label === 'string').map((o) => ({ value: o.value.slice(0, 200), label: o.label.slice(0, 200) }));
        return out.length ? out : undefined;
      }
      case 'pairs': {
        if (!Array.isArray(v)) return undefined;
        const out = v.slice(0, WIDGET_LIMITS.items).filter((o): o is { label: string; value: string | number } => isRecord(o) && typeof o.label === 'string' && (typeof o.value === 'string' || typeof o.value === 'number')).map((o) => ({ label: o.label.slice(0, 200), value: String(o.value).slice(0, 600) }));
        return out.length ? out : undefined;
      }
    }
  }

  function node(raw: unknown, path: string, depth: number): WidgetParsedNode | null {
    if (++count > WIDGET_LIMITS.nodes) { if (count === WIDGET_LIMITS.nodes + 1) issues.push({ path, message: `more than ${WIDGET_LIMITS.nodes} nodes; the rest is left out` }); return null; }
    if (depth > WIDGET_LIMITS.depth) return fail(path, `deeper than ${WIDGET_LIMITS.depth}`);
    if (!isRecord(raw) || typeof raw.type !== 'string') return fail(path, 'not a node');
    if (!Object.hasOwn(WIDGET_SPEC, raw.type)) return fail(path, `unknown node ${JSON.stringify(raw.type.slice(0, 40))}`);
    const type = raw.type as WidgetType;
    const spec: Record<string, WidgetPropSpec> = WIDGET_SPEC[type].props;
    const out: WidgetParsedNode = { type };
    for (const key of Object.keys(raw)) if (key !== 'type' && !Object.hasOwn(spec, key)) issues.push({ path: `${path}.${key}`, message: `${type} has no ${key}; dropped` });
    for (const [key, p] of Object.entries(spec)) {
      const given = Object.hasOwn(raw, key) && raw[key] !== undefined && raw[key] !== null;
      const v = given ? value(p, raw[key], `${path}.${key}`, depth) : undefined;
      if (given && v === undefined) issues.push({ path: `${path}.${key}`, message: `not a valid ${p.kind}; dropped` });
      if (v === undefined) {
        if ('required' in p && p.required) return fail(path, `${type} needs ${key}`);
        continue;
      }
      out[key] = v;
    }
    return out;
  }

  const roots = Array.isArray(input) ? input : [input];
  const nodes = roots.slice(0, WIDGET_LIMITS.items).flatMap((r, i) => {
    const path = Array.isArray(input) ? `[${i}]` : '';
    const n = node(r, path, 1);
    return !n ? [] : n.type !== 'Fallback' && !fits(n.type) ? [fail(path, `${n.type} can't stand here`)] : [n];
  });
  return { nodes, issues };
}

/* ── loading on demand ─────────────────────────────────── */

const loaders = {
  Card: () => import('../card/card'),
  List: () => import('../row/row'),
  ListItem: () => Promise.all([import('../row/row'), import('../badge/badge')]),
  Badge: () => import('../badge/badge'),
  Button: () => import('../button/button'),
  Field: () => Promise.all([import('../field/field'), import('../form-field/form-field')]),
  Select: () => Promise.all([import('../select/select'), import('../form-field/form-field')]),
  DatePicker: () => Promise.all([import('../calendar/date-picker'), import('../form-field/form-field')]),
  Properties: () => import('../properties/properties'),
  Markdown: () => import('../markdown/markdown'),
  Progress: () => import('../progress/progress'),
  Meter: () => import('../meter/meter'),
  Alert: () => import('../alert/alert'),
} satisfies Record<WidgetType, () => Promise<unknown>>;

function preload(nodes: WidgetParsedNode[]) {
  for (const n of nodes) {
    if (n.type === 'Fallback') continue;
    void loaders[n.type]();
    for (const v of Object.values(n)) if (Array.isArray(v) && v.length && isRecord(v[0]) && 'type' in v[0]) preload(v as WidgetParsedNode[]);
  }
}

/* ── values and actions ────────────────────────────────── */

interface WidgetContext { values: Record<string, string>; act: (action: WidgetAction | undefined) => void }
const Context = React.createContext<WidgetContext>({ values: {}, act: () => {} });

function seed(nodes: WidgetParsedNode[], values: Record<string, string>) {
  for (const n of nodes) {
    if ((n.type === 'Field' || n.type === 'Select' || n.type === 'DatePicker') && typeof n.name === 'string') values[n.name] = typeof n.defaultValue === 'string' ? n.defaultValue : '';
    for (const v of Object.values(n)) if (Array.isArray(v) && v.length && isRecord(v[0]) && 'type' in v[0]) seed(v as WidgetParsedNode[], values);
  }
}

const dayOf = (iso: string | undefined) => {
  const m = iso ? DAY.exec(iso) : null;
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : undefined;
};
const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
/** Markdown links that are not http, https or mailto become their words. */
const safeLinks = (text: string) => text.replace(/\[([^\]]+)\]\(\s*([^)\s]+)(?:\s+"[^"]*")?\s*\)/g, (all, words: string, url: string) => (WIDGET_URL.test(url) ? all : words));

/* ── the views ─────────────────────────────────────────── */

type View<T extends WidgetType> = React.ComponentType<{ node: WidgetNodeOf<T> }>;
const nodesOf = (v: unknown) => (v ?? []) as WidgetParsedNode[];
const STACK = 'mu-widget grid gap-widget-gap min-w-0';
// Row's props don't name a button's type; in a host's form a row key must not submit it.
const notSubmit = { type: 'button' };
const NOTE = 'mu-widget-fallback m-0 type-meta text-ink3';

const views: { [T in WidgetType]: React.LazyExoticComponent<View<T>> } = {
  Card: React.lazy(() => loaders.Card().then(({ Card }) => ({
    default: function WidgetCard({ node }: { node: WidgetNodeOf<'Card'> }) {
      return (
        <Card status={node.status} size={node.size}>
          <Card.Title href={node.href}>{node.title}</Card.Title>
          {node.description && <Card.Description>{node.description}</Card.Description>}
          {node.children && <Nodes nodes={node.children} />}
          {node.footer?.length ? <Card.Footer><Nodes nodes={node.footer} /></Card.Footer> : null}
        </Card>
      );
    },
  }))),
  List: React.lazy(() => loaders.List().then(() => ({
    default: function WidgetList({ node }: { node: WidgetNodeOf<'List'> }) {
      return <ul aria-label={node.label} className="m-0 p-0 list-none grid"><Nodes nodes={node.children} /></ul>;
    },
  }))),
  ListItem: React.lazy(() => loaders.ListItem().then(([{ Row }, { Badge }]) => ({
    default: function WidgetListItem({ node }: { node: WidgetNodeOf<'ListItem'> }) {
      const { act } = React.useContext(Context);
      const parts = (
        <>
          <Row.Text>{node.text}{node.detail && <span className="block type-meta text-ink2">{node.detail}</span>}</Row.Text>
          {node.badge && <Row.Trail><Badge size="compact">{node.badge}</Badge></Row.Trail>}
        </>
      );
      if (!node.action) return <Row as="li" variant="panel">{parts}</Row>;
      return <li className="list-none"><Row as="button" {...notSubmit} variant="panel" className="w-full text-start border-0 bg-transparent" onClick={() => act(node.action)}>{parts}</Row></li>;
    },
  }))),
  Badge: React.lazy(() => loaders.Badge().then(({ Badge }) => ({
    default: function WidgetBadge({ node }: { node: WidgetNodeOf<'Badge'> }) {
      return <Badge led={node.led} size={node.size} className="justify-self-start">{node.text}</Badge>;
    },
  }))),
  Button: React.lazy(() => loaders.Button().then(({ Button }) => ({
    default: function WidgetButton({ node }: { node: WidgetNodeOf<'Button'> }) {
      const { act } = React.useContext(Context);
      return <Button cap={node.cap} size={node.size} disabled={node.disabled} className="justify-self-start" onClick={() => act(node.action)}>{node.label}</Button>;
    },
  }))),
  Field: React.lazy(() => loaders.Field().then(([{ Field }, { FormField }]) => ({
    default: function WidgetField({ node }: { node: WidgetNodeOf<'Field'> }) {
      const { values } = React.useContext(Context);
      const name = node.name ?? '';
      return (
        <FormField>
          {node.label && <FormField.Label>{node.label}</FormField.Label>}
          <Field size={node.size ?? 'regular'}>
            <Field.Input name={name} type={node.input ?? 'text'} defaultValue={node.defaultValue} placeholder={node.placeholder} aria-label={node.label ? undefined : name} onChange={(e) => { values[name] = e.currentTarget.value; }} />
          </Field>
        </FormField>
      );
    },
  }))),
  Select: React.lazy(() => loaders.Select().then(([{ Select }, { FormField }]) => ({
    default: function WidgetSelect({ node }: { node: WidgetNodeOf<'Select'> }) {
      const { values } = React.useContext(Context);
      const name = node.name ?? '';
      const options = node.options ?? [];
      return (
        <FormField>
          {node.label && <FormField.Label>{node.label}</FormField.Label>}
          <Select name={name} options={options} defaultValue={options.some((o) => o.value === node.defaultValue) ? node.defaultValue : undefined} placeholder={node.placeholder} size={node.size} aria-label={node.label ? undefined : name} onValueChange={(v) => { values[name] = v; }} />
        </FormField>
      );
    },
  }))),
  DatePicker: React.lazy(() => loaders.DatePicker().then(([{ DatePicker }, { FormField }]) => ({
    default: function WidgetDatePicker({ node }: { node: WidgetNodeOf<'DatePicker'> }) {
      const { values } = React.useContext(Context);
      const name = node.name ?? '';
      return (
        <FormField>
          {node.label && <FormField.Label>{node.label}</FormField.Label>}
          <DatePicker defaultValue={dayOf(node.defaultValue)} min={dayOf(node.min)} max={dayOf(node.max)} size={node.size} aria-label={node.label ? undefined : name} onValueChange={(d) => { values[name] = d ? isoOf(d) : ''; }} />
        </FormField>
      );
    },
  }))),
  Properties: React.lazy(() => loaders.Properties().then(({ Properties }) => ({
    default: function WidgetProperties({ node }: { node: WidgetNodeOf<'Properties'> }) {
      return <Properties size={node.size}>{(node.items ?? []).map((p, i) => <Properties.Item key={i} label={p.label}>{p.value}</Properties.Item>)}</Properties>;
    },
  }))),
  Markdown: React.lazy(() => loaders.Markdown().then(({ Markdown }) => ({
    default: function WidgetMarkdown({ node }: { node: WidgetNodeOf<'Markdown'> }) {
      return <Markdown>{safeLinks(node.text ?? '')}</Markdown>;
    },
  }))),
  Progress: React.lazy(() => loaders.Progress().then(({ Progress }) => ({
    default: function WidgetProgress({ node }: { node: WidgetNodeOf<'Progress'> }) {
      return <Progress label={node.label} value={node.value ?? null} state={node.state} showValue={node.value !== undefined} />;
    },
  }))),
  Meter: React.lazy(() => loaders.Meter().then(({ Meter }) => ({
    default: function WidgetMeter({ node }: { node: WidgetNodeOf<'Meter'> }) {
      const min = node.min ?? 0;
      const max = Math.max(min + 1, node.max ?? 100);
      return <Meter label={node.label} value={Math.min(max, Math.max(min, node.value ?? 0))} min={min} max={max} showValue />;
    },
  }))),
  Alert: React.lazy(() => loaders.Alert().then(({ Alert }) => ({
    default: function WidgetAlert({ node }: { node: WidgetNodeOf<'Alert'> }) {
      return (
        <Alert kind={node.kind}>
          <Alert.Title>{node.title}</Alert.Title>
          {node.description && <Alert.Description>{node.description}</Alert.Description>}
          {node.actions?.length ? <Alert.Actions><Nodes nodes={node.actions} /></Alert.Actions> : null}
        </Alert>
      );
    },
  }))),
};

function Fallback() {
  return <p className={NOTE} data-widget-fallback="">Can't show this part</p>;
}

/** A component that throws while rendering a node shows the fallback in its place. */
class Boundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <Fallback /> : this.props.children; }
}

function Nodes({ nodes }: { nodes: unknown }) {
  return nodesOf(nodes).map((n, i) => {
    if (n.type === 'Fallback') return <Fallback key={i} />;
    const View = views[n.type] as React.ComponentType<{ node: WidgetParsedNode }>;
    return <Boundary key={i}><View node={n} /></Boundary>;
  });
}

/** Renders widget JSON a model sent with MetalUI's components; keys hand their actions to `onAction`. */
export function Widget({ widget, onAction, className, ...props }: WidgetProps) {
  // Parsed by content, not identity: a host that passes a fresh object each render keeps the fields' values.
  const source = React.useMemo(() => { try { return typeof widget === 'string' ? widget : JSON.stringify(widget) ?? ''; } catch { return ''; } }, [widget]);
  const parsed = React.useMemo(() => parseWidget(source), [source]);
  React.useMemo(() => preload(parsed.nodes), [parsed]);
  const values = React.useMemo(() => { const v: Record<string, string> = {}; seed(parsed.nodes, v); return v; }, [parsed]);
  const context = React.useMemo<WidgetContext>(() => ({ values, act: (action) => { if (action) onAction?.(action, { values: { ...values } }); } }), [values, onAction]);
  return (
    <div className={className ? `${STACK} ${className}` : STACK} data-widget="" {...props}>
      <Context.Provider value={context}>
        <React.Suspense fallback={null}>
          <Nodes nodes={parsed.nodes} />
        </React.Suspense>
      </Context.Provider>
    </div>
  );
}
