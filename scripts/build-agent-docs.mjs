// Agent context: public/AI.md (full guide), public/llms.txt (index), public/components.json (manifest),
// public/widgets.schema.json (the widget JSON a model may send, from components/widget/spec.ts).
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { root, emit, finish } from './lib/emit.mjs';
import { components } from './lib/components.mjs';

const ORIGIN = 'https://metalui.dev';
const list = components();
const icons = JSON.parse(readFileSync(root('packages/metalui/public/icons.json'), 'utf8'));

const intro = `# MetalUI: agent integration guide

MetalUI is a set of Soft Hardware components: bone and graphite soft-touch plastic, smoked glass, knurled metal, LEDs, and press-in mechanics. Each component exists as React on Base UI (\`@unlocalhosted/metalui\`) and as SwiftUI (the \`MetalUI\` Swift package), and the two render the same material recipes.

## Setup

React:

\`\`\`sh
npm install @unlocalhosted/metalui
\`\`\`

\`\`\`tsx
import '@unlocalhosted/metalui/styles.css'; // once, at the app root
import '@unlocalhosted/metalui/icons.css';  // once, if you use icons
\`\`\`

The package is ESM only: use \`import\`, not \`require()\`. In a Tailwind v3 app import \`@unlocalhosted/metalui/styles.unlayered.css\` instead of \`styles.css\` (the same rules without cascade layers, which Tailwind v3's PostCSS rejects). Components are client components (they carry \`"use client"\`), so they work in Next.js App Router.

Or copy the source into your project with the shadcn CLI (Tailwind v4): \`npx shadcn@latest add ${ORIGIN}/r/<name>.json\`. The first install also adds \`@unlocalhosted/metalui\` and imports its \`tokens.css\` and \`theme.css\` into your global CSS, which is what styles the copied component; files land under \`components/metalui/\` in the same layout as the package, so imports between components resolve. Whole screens (blocks) install the same way as \`${ORIGIN}/r/block-<name>.json\` into \`components/metalui/screens/<name>/\`. Both routes work in Vite and Next.js (\`app/\` and \`src/app/\`). Release notes: ${ORIGIN}/changelog.

SwiftUI: add the package \`https://github.com/vijayksingh/metalui\` and \`import MetalUI\`. It needs macOS 14 or iOS 17.

## Global rules

- **Colorway:** set \`data-mu-colorway="bone" | "graphite"\` on any ancestor, or use \`.metalColorway(.bone)\` in SwiftUI. Without it, the system color scheme decides. Don't restyle materials with custom backgrounds, borders or shadows.
- **Signal color:** one per object, at most. Phosphor green marks intent (focus, selection, live state), never a call to action. Red is destructive only. \`--mu-success\` always sits beside a check glyph and \`--mu-warning\` beside a label or glyph, never hue alone. \`--mu-photon\` is for its listed places only. Status LEDs: green on, amber waiting, red failed, blue capture or link kind, off idle.
- **Feelings tints** (\`.mu-tint-ember | blush | tide | spark | graphite | dusk | iris\`, SwiftUI \`.metalTint(.blush)\`): only on glyphs that carry a feeling, or a moment with an unmistakable one (a date is affection, a party is joy). The tint names the kind of feeling (joy, affection, calm, wonder, neutral, low, tension), never its strength, which the glyph's shape shows. The tint colors the glyph's stroke, so the line itself evokes the feeling; a tinted glyph's vessel is not filled. Never red or green, never on words, never for status or intent. Off under Increase Contrast and inside \`data-mu-untinted\` (\`.metalUntinted()\`), so the glyph must read without it.
- **Motion:** it comes from the component, and reduced motion is built in. Don't add your own transitions on top. Under Reduce Motion each spring class resolves one way (\`tokens.json\` \`springs.*.reduced\`): part, object, hinge and refusal apply at once; surface and settle lose travel and fade in place; release (the press) plays as authored. Lift is two motions (T5): a hover lift rides \`settle\` (one step, no overshoot, still by the time the pointer leaves); a land (a drop into place) rides \`object\`, a stop, and rare. Web: ride \`--mu-spring-<class>-d\` and multiply enter or exit offsets by \`--mu-travel-<class>\`; \`data-mu-motion=\"reduce\"\` on any ancestor forces the policy. SwiftUI: \`.metalAnimation(.settle, value:)\` or \`MetalMotion.resolve(_:reduceMotion:)\`, never \`accessibilityReduceMotion\` directly.
- **Choose by component name.** Only use exports listed in \`components.json\` and \`icons.json\`. Never invent names.
- **Show real outcomes.** An animation never stands in for a real result such as a save, delete or sync.

## Components
`;

const iconsDoc = `
---

# Icons

\`@unlocalhosted/metalui/icons\` has ${icons.count} Soft Hardware glyphs: monoline + duotone on a 24×24 grid, with a 1.7 stroke. Each glyph has an authored **hover pose** (a reversible spring) and a **press one-shot**. Icons inherit \`currentColor\`. A static icon (\`animate={false}\`) at 16px or below uses a tuned small cut with a heavier stroke.

\`\`\`tsx
import { SendAwayIcon, Icon } from '@unlocalhosted/metalui/icons';

<Button cap="destructive"><SendAwayIcon size={16} />Delete</Button>
<Icon name="synced" size={13} title="Synced" />
\`\`\`

- **Triggering:** an icon inside any element with the class \`mu-icon-trigger\` plays from that element, and MetalUI Buttons already have it. Otherwise the icon plays from its own hover and press.
- **Accessibility:** icons without \`title\` are decorative (\`aria-hidden\`). Give icon-only controls an \`aria-label\`.
- **State glyphs morph:** \`MorphIcon\` (copy, check, plus, close, minus, menu, arrows, chevrons, send/stop, download/upload, eye/eye-off, info/warning, folder/folder-open, sun/moon, save) transforms into another state glyph instead of being replaced: \`<MorphIcon name={copied ? 'check' : 'copy'} size={14} />\`.
- **On cue:** \`act\` plays the glyph's act whenever it turns to a new truthy value, for a result rather than a touch: \`<Icon name="check" act={saves} />\` plays on each save; \`act\` alone plays it as the icon arrives.
- **Static:** \`animate={false}\` keeps a glyph static. Reduced motion does this automatically.
- **SwiftUI and SVG:** the same glyphs ship as SF Symbols (planned), plus static and animated SVGs at \`${ORIGIN}/icons/svg/<name>.svg\`.

| Component | Name | Category | Hover | Press |
|---|---|---|---|---|
${icons.icons.map((i) => `| \`${i.component}\` | \`${i.name}\` | ${i.category} | ${i.hover} | ${i.press} |`).join('\n')}
`;

// Widgets: the one spec (a .ts file of plain data, which Node reads as it is) → the JSON Schema and AI.md's vocabulary.
const { WIDGET_SPEC, WIDGET_LIMITS, WIDGET_URL, WIDGET_NAME } = await import(pathToFileURL(root('packages/metalui/src/components/widget/spec.ts')).href);
const widgetTypes = Object.keys(WIDGET_SPEC);
const ref = (t) => ({ $ref: `#/$defs/${t}` });
const propSchema = (p) => {
  const doc = { description: p.doc };
  switch (p.kind) {
    case 'string': return { type: 'string', maxLength: p.max ?? WIDGET_LIMITS.text, ...doc };
    case 'name': return { type: 'string', pattern: WIDGET_NAME.source, ...doc };
    case 'number': return { type: 'number', ...(p.min !== undefined && { minimum: p.min }), ...(p.max !== undefined && { maximum: p.max }), ...doc };
    case 'boolean': return { type: 'boolean', ...doc };
    case 'enum': return { enum: p.values, ...doc };
    case 'url': return { type: 'string', format: 'uri', pattern: WIDGET_URL.source, ...doc };
    case 'date': return { type: 'string', format: 'date', pattern: '^\\d{4}-\\d{2}-\\d{2}$', ...doc };
    case 'action': return { ...ref('action'), ...doc };
    case 'nodes': return { type: 'array', maxItems: WIDGET_LIMITS.items, items: p.of ? { oneOf: p.of.map(ref) } : ref('node'), ...doc };
    case 'options': return { type: 'array', minItems: 1, maxItems: WIDGET_LIMITS.items, items: ref('option'), ...doc };
    case 'pairs': return { type: 'array', minItems: 1, maxItems: WIDGET_LIMITS.items, items: ref('pair'), ...doc };
    default: throw new Error(`widget spec: unknown prop kind ${p.kind}`);
  }
};
const widgetSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: `${ORIGIN}/widgets.schema.json`,
  title: 'MetalUI widget',
  description: `A piece of interface a model sends as JSON, rendered by MetalUI's Widget (React) and MetalWidget (SwiftUI): one node or an array of nodes. Keys never act; they hand their action to the host. At most ${WIDGET_LIMITS.depth} deep and ${WIDGET_LIMITS.nodes} nodes; URLs only http, https or mailto. Generated from components/widget/spec.ts.`,
  oneOf: [ref('node'), { type: 'array', maxItems: WIDGET_LIMITS.items, items: ref('node') }],
  $defs: {
    node: { oneOf: widgetTypes.filter((t) => !WIDGET_SPEC[t].nested).map(ref) },
    action: {
      type: 'object',
      description: 'What a key hands the host, with the widget\'s field values beside it.',
      properties: { type: { const: 'action' }, name: { type: 'string', minLength: 1, maxLength: 64 }, payload: { type: 'object', description: `Plain JSON, at most ${WIDGET_LIMITS.payload} characters.` } },
      required: ['type', 'name'],
      additionalProperties: false,
    },
    option: { type: 'object', properties: { value: { type: 'string', maxLength: 200 }, label: { type: 'string', maxLength: 200 } }, required: ['value', 'label'], additionalProperties: false },
    pair: { type: 'object', properties: { label: { type: 'string', maxLength: 200 }, value: { type: ['string', 'number'] } }, required: ['label', 'value'], additionalProperties: false },
    ...Object.fromEntries(widgetTypes.map((t) => {
      const { doc, props } = WIDGET_SPEC[t];
      return [t, {
        type: 'object',
        description: doc,
        properties: { type: { const: t }, ...Object.fromEntries(Object.entries(props).map(([k, p]) => [k, propSchema(p)])) },
        required: ['type', ...Object.entries(props).filter(([, p]) => p.required).map(([k]) => k)],
        additionalProperties: false,
      }];
    })),
  },
};
emit('packages/metalui/public/widgets.schema.json', JSON.stringify(widgetSchema, null, 2) + '\n');
// MetalWidget reads the same spec: each node's props with their kinds, limits and enums, as Swift data.
const swiftString = (v) => JSON.stringify(v);
const swiftProp = (p) => `.init(kind: .${p.kind === 'enum' ? 'choice' : p.kind}, required: ${Boolean(p.required)}, min: ${p.min ?? 'nil'}, max: ${p.max ?? 'nil'}, values: [${(p.values ?? p.of ?? []).map(swiftString).join(', ')}])`;
emit('swift/Sources/MetalUI/Components/MetalWidgetSpec.generated.swift', `// Generated by scripts/build-agent-docs.mjs from packages/metalui/src/components/widget/spec.ts. Do not edit.

/// The widget spec as MetalWidget reads it: the limits, and each node's props with their kinds.
enum MetalWidgetSpec {
    struct Prop: Sendable {
        enum Kind: Sendable { case string, name, number, boolean, choice, url, date, action, nodes, options, pairs }
        let kind: Kind
        let required: Bool
        let min: Double?
        let max: Double?
        /// An enum's values, or the node types a \`nodes\` prop takes (empty: any node that isn't nested).
        let values: [String]
    }

    static let depth = ${WIDGET_LIMITS.depth}
    static let nodes = ${WIDGET_LIMITS.nodes}
    static let text = ${WIDGET_LIMITS.text}
    static let items = ${WIDGET_LIMITS.items}
    static let payload = ${WIDGET_LIMITS.payload}
    /// URLs that pass (case-insensitive), and a field's name, as regular expressions.
    static let url = #"${WIDGET_URL.source}"#
    static let name = #"${WIDGET_NAME.source}"#
    static let nested: Set<String> = [${widgetTypes.filter((t) => WIDGET_SPEC[t].nested).map(swiftString).join(', ')}]

    static let props: [String: [(String, Prop)]] = [
${widgetTypes.map((t) => `        ${swiftString(t)}: [\n${Object.entries(WIDGET_SPEC[t].props).map(([k, p]) => `            (${swiftString(k)}, ${swiftProp(p)}),`).join('\n')}\n        ],`).join('\n')}
    ]
}
`);
const widgetsDoc = `
---

# Widgets: render from JSON

A model can answer with interface instead of words: JSON that \`<Widget widget={json} onAction={…} />\` (React) or \`MetalWidget(json:onAction:)\` (SwiftUI) renders with the components above. The schema is ${ORIGIN}/widgets.schema.json (also \`@unlocalhosted/metalui/widgets.schema.json\`). Give it to the model as the shape of its answer (structured output or a tool's input schema).

- A widget is one node or an array of nodes: \`{ "type": "Card", "title": "…", "children": [ … ] }\`.
- A key never acts: it hands the host \`{ "type": "action", "name": "…", "payload": { … } }\`, and beside it the values of every \`Field\`, \`Select\` and \`DatePicker\` by \`name\`. The host decides what happens.
- Only http, https and mailto URLs pass. Strings are text, never HTML. At most ${WIDGET_LIMITS.depth} deep and ${WIDGET_LIMITS.nodes} nodes. What can't be shown reads "Can't show this part" in its place; the rest renders.

| Node | Renders | Props (* required) |
|---|---|---|
${widgetTypes.map((t) => `| \`${t}\` | ${WIDGET_SPEC[t].renders}: ${WIDGET_SPEC[t].doc} | ${Object.entries(WIDGET_SPEC[t].props).map(([k, p]) => `\`${k}\`${p.required ? '*' : ''} (${p.kind === 'enum' ? p.values.join(', ') : p.kind === 'nodes' && p.of ? p.of.join(', ') : p.kind})`).join(', ')} |`).join('\n')}

\`\`\`json
{ "type": "Card", "title": "Table for 2, Friday", "description": "Casa Lume, 20:30",
  "children": [{ "type": "DatePicker", "name": "day", "label": "Day", "defaultValue": "2026-10-09" }],
  "footer": [{ "type": "Button", "label": "Book", "cap": "primary", "action": { "type": "action", "name": "book", "payload": { "venue": "casa-lume" } } }] }
\`\`\`
`;

const guides = list.map((m) => readFileSync(root('packages/metalui/src', m.dir, m.agent ?? `${m.name}.agent.md`), 'utf8').trim()).join('\n\n---\n\n');

emit('packages/metalui/public/AI.md', `${intro}\n${guides}\n${widgetsDoc}${iconsDoc}`);

emit('packages/metalui/public/llms.txt', `# MetalUI

> Soft Hardware components for React (on Base UI) and SwiftUI, with animated duotone icons. Every component ships React, SwiftUI and an agent guide.

- [Full agent guide](${ORIGIN}/AI.md)
- [Component manifest](${ORIGIN}/components.json)
- [Icon manifest](${ORIGIN}/icons.json)
- [Widget schema](${ORIGIN}/widgets.schema.json): the JSON a model sends to render MetalUI components (\`Widget\`, \`MetalWidget\`)
- [Changelog](${ORIGIN}/changelog)

## Install

- React from npm (ESM only): \`npm install @unlocalhosted/metalui\`, then import \`@unlocalhosted/metalui/styles.css\` once.
- React source into your project (Tailwind v4): \`npx shadcn@latest add ${ORIGIN}/r/<name>.json\`; whole screens as \`${ORIGIN}/r/block-<name>.json\` (settings, task-inbox, share-panel, ai-composer, availability-picker, studio-week).
- SwiftUI: add \`https://github.com/vijayksingh/metalui\` with Swift Package Manager (macOS 14 or iOS 17).

## Components

${list.map((m) => `- [${m.title}](${ORIGIN}/r/${m.name}.md): ${m.description}`).join('\n')}
`);

emit('packages/metalui/public/components.json', JSON.stringify({
  $description: 'MetalUI components. Each has a React export, a SwiftUI symbol, a shadcn registry item and an agent guide.',
  components: list.map((m) => ({
    name: m.name,
    title: m.title,
    status: m.status,
    description: m.description,
    react: { package: '@unlocalhosted/metalui', export: m.react.export, base: m.base },
    swift: { package: 'MetalUI', symbol: m.swift.symbol },
    registry: `${ORIGIN}/r/${m.name}.json`,
    agent: `${ORIGIN}/r/${m.name}.md`,
    sheet: m.sheet,
  })),
}, null, 2) + '\n');
// docs/COMPOSITION.md: the layer table, from each meta.json `layer`, so it can't fall behind.
const LAYERS = [['part', 'Parts'], ['component', 'Components'], ['object', 'Objects'], ['instrument', 'Instruments'], ['place', 'Places']];
const composition = readFileSync(root('docs/COMPOSITION.md'), 'utf8');
const table = ['| Layer | Members |', '|---|---|', ...LAYERS.map(([k, name]) => `| **${name}** | ${list.filter((m) => m.layer === k).map((m) => m.title).sort().join(', ')} |`)].join('\n');
emit('docs/COMPOSITION.md', composition.replace(/(<!-- layers:start[^>]*-->\n)[\s\S]*?(<!-- layers:end -->)/, `$1${table}\n$2`));
finish(`agent docs (${list.length} components)`);
