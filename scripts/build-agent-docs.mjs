// Agent context: public/AI.md (full guide), public/llms.txt (index), public/components.json (manifest).
import { readFileSync, readdirSync } from 'node:fs';
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

Or copy the source into your project with the shadcn CLI: \`npx shadcn@latest add ${ORIGIN}/r/<name>.json\`.

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
- **State glyphs morph:** \`MorphIcon\` (copy, check, plus, close, minus, menu, arrows, chevrons, play/pause, download/upload) transforms into another state glyph instead of being replaced: \`<MorphIcon name={copied ? 'check' : 'copy'} size={14} />\`.
- **Static:** \`animate={false}\` keeps a glyph static. Reduced motion does this automatically.
- **SwiftUI and SVG:** the same glyphs ship as SF Symbols (planned), plus static and animated SVGs at \`${ORIGIN}/icons/svg/<name>.svg\`.

| Component | Name | Category | Hover | Press |
|---|---|---|---|---|
${icons.icons.map((i) => `| \`${i.component}\` | \`${i.name}\` | ${i.category} | ${i.hover} | ${i.press} |`).join('\n')}
`;

const guides = list.map((m) => readFileSync(root('packages/metalui/src', m.dir, m.agent ?? `${m.name}.agent.md`), 'utf8').trim()).join('\n\n---\n\n');

// ---------- Gadgets: the catalog an assistant composes from, as a guide, a manifest and two schemas ----------
const T = JSON.parse(readFileSync(root('tokens/tokens.json'), 'utf8')), G = T.gadgets;
const own = (o) => Object.fromEntries(Object.entries(o).filter(([k]) => !k.startsWith('$')));
const mechDir = root('packages/metalui/gadgets/src/mechanisms');
const MECHS = {};
for (const f of readdirSync(mechDir).filter((f) => f.endsWith('.mjs')).sort()) {
  for (const m of Object.values(await import(pathToFileURL(`${mechDir}/${f}`).href))) MECHS[m.name] = m;
}
const fixtureDir = root('packages/metalui/src/gadgets/fixtures'), fixtures = readdirSync(fixtureDir).sort();
const specsOf = (ext) => fixtures.filter((f) => f.endsWith(ext)).map((f) => JSON.parse(readFileSync(`${fixtureDir}/${f}`, 'utf8')));
const shelf = G.set.order, onShelf = (n) => { const i = shelf.indexOf(n); return i < 0 ? Infinity : i; };
const gadgetSpecs = specsOf('.gadget.json').sort((a, b) => onShelf(a.name) - onShelf(b.name)), rigSpecs = specsOf('.rig.json');
const metaOf = (name) => { try { return JSON.parse(readFileSync(root('packages/metalui/src/gadgets', name, 'meta.json'), 'utf8')); } catch { return null; } };
const PARTS = own(G.parts), JOBS = own(G.jobs), MATERIALS = Object.keys(own(G.materials));
const SIGNALS = Object.keys(own(G.lamp)), GESTURES = Object.keys(own(T.status.gestures)).filter((g) => g !== 'dim'), EARCONS = Object.keys(own(T.sound.beeper.earcons));
const MAP_KINDS = {
  threshold: 'a number or count at or past `at` becomes `above`, else `below` (a word or a switch)',
  scale: 'a number mapped linearly from `from` [a, b] onto `to` [c, d]',
  match: 'a word or switch equal to `when` becomes a pulse',
  count: 'a pulse adds `step` (1 or -1) to the count already at the far port',
  select: 'a word or switch looked up in `table` (keys are words, "true" or "false"): a word, a number or a switch',
};
const PORT_KINDS = { number: 'a value between `min` and `max`, with a `unit`', count: 'a whole count up to `max`', boolean: 'a switch; named after a state, it puts the gadget in that state', state: 'one of `options`; it sets the gadget\'s state', pulse: 'an event, never stored; into a gadget it plays its act' };
const mechOf = (name) => { const m = MECHS[name], d = G.mechanisms[name]; return { mode: d.mode, drive: d.drive ?? null, slots: Object.fromEntries(Object.entries(d.slots).map(([k, v]) => [k, { parts: v.parts, many: !!v.many, optional: !!v.optional }])), states: Object.keys(m?.states ?? {}), caption: m?.caption ?? '', spring: m?.spring ?? null }; };
const built = Object.keys(G.mechanisms).filter((n) => MECHS[n]);
const manifest = {
  $description: 'MetalUI gadgets: the catalog an assistant composes gadgets and rigs from. Specs are JSON (metalui/gadget@1, metalui/rig@1), validated by validateGadget and validateRig, drawn by <Gadget> and <Rig> (React) and MetalGadget and MetalRig (SwiftUI).',
  schemas: { gadget: `${ORIGIN}/schemas/gadget.schema.json`, rig: `${ORIGIN}/schemas/rig.schema.json` },
  jobs: Object.fromEntries(Object.entries(JOBS).map(([k, j]) => [k, { stations: j.stations, reach: j.reach, containers: j.containers, pin: j.pin ?? null }])),
  materials: MATERIALS,
  parts: Object.fromEntries(Object.entries(PARTS).map(([k, p]) => [k, { size: p.size, materials: p.materials, params: p.params, strike: p.strike ?? null }])),
  mechanisms: Object.fromEntries(built.map((n) => [n, mechOf(n)])),
  lamp: { signals: SIGNALS, gestures: GESTURES }, earcons: EARCONS, ports: PORT_KINDS, maps: MAP_KINDS,
  limits: own(G.spec),
  gadgets: gadgetSpecs.map((g) => ({ name: g.name, title: g.title, description: metaOf(g.name)?.description ?? '', job: g.job, container: g.container, mechanism: g.mechanism.name, ports: g.ports ?? {}, states: Object.keys(g.states), spec: g })),
  rigs: rigSpecs.map((r) => ({ name: r.name, title: r.title, grid: r.grid, gadgets: Object.fromEntries(Object.entries(r.gadgets).map(([k, v]) => [k, typeof v.gadget === 'string' ? v.gadget : `inline: ${v.gadget.name}`])), cables: r.cables, spec: r })),
};
emit('packages/metalui/public/gadgets.json', JSON.stringify(manifest, null, 2) + '\n');

// The two JSON schemas: the closed lists come from the tokens, so a schema never drifts from the catalog.
const oklchFeel = { type: 'object', required: ['v', 'a', 'w'], properties: { v: { type: 'number', minimum: 0, maximum: 1 }, a: { type: 'number', minimum: 0, maximum: 1 }, w: { type: 'number', minimum: 0, maximum: 1 } }, additionalProperties: false };
const pose = { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' }, r: { type: 'number' }, sx: { type: 'number' }, sy: { type: 'number' } }, additionalProperties: false };
const channel = { type: 'object', required: ['kind'], properties: { kind: { enum: Object.keys(PORT_KINDS) }, min: { type: 'number' }, max: { type: 'number' }, unit: { type: 'string' }, options: { type: 'array', items: { type: 'string' } }, default: {} } };
const gadgetSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema', $id: `${ORIGIN}/schemas/gadget.schema.json`, title: 'MetalUI gadget spec (metalui/gadget@1)',
  description: 'A gadget: Parts from the catalog on a body, one mechanism, states. validateGadget checks what a schema cannot (bindings, overlap, colour).',
  type: 'object', required: ['$schema', 'name', 'title', 'job', 'feel', 'parts', 'mechanism', 'states'],
  properties: {
    $schema: { const: 'metalui/gadget@1' }, name: { type: 'string', pattern: '^[a-z][a-z0-9-]*$', maxLength: G.spec['name-max'] }, title: { type: 'string' },
    job: { enum: Object.keys(JOBS) }, feel: oklchFeel, container: { enum: ['slab', 'inset', 'free'] }, station: { type: 'number' }, material: { enum: MATERIALS },
    parts: { type: 'array', minItems: G.spec.parts[0], maxItems: G.spec.parts[1], items: { type: 'object', required: ['id', 'part', 'at', 'role'], properties: {
      id: { type: 'string' }, part: { enum: Object.keys(PARTS) }, at: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 }, size: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 },
      role: { enum: ['body', 'actor', 'trim', 'lamp', 'cut'] }, material: { enum: [...MATERIALS, 'accent'] }, params: { type: 'object' } } } },
    mechanism: { type: 'object', required: ['name', 'bind'], properties: { name: { enum: built }, bind: { type: 'object', additionalProperties: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] } }, drive: { type: 'string' }, detents: { type: 'integer', minimum: G.spec.detents[0], maximum: G.spec.detents[1] } } },
    ports: { type: 'object', properties: { in: { type: 'object', additionalProperties: channel }, out: { type: 'object', additionalProperties: channel } } },
    states: { type: 'object', required: ['rest'], maxProperties: G.spec.states, additionalProperties: { type: 'object', properties: {
      feel: { type: 'object' }, lamp: { type: 'array', prefixItems: [{ enum: SIGNALS }, { enum: GESTURES }], minItems: 2, maxItems: 2 },
      form: { type: 'object', additionalProperties: { oneOf: [{ type: 'object', required: ['pose'], properties: { pose } }, { type: 'object', required: ['param', 'value'] }] } },
      beep: { enum: EARCONS }, enter: { enum: ['act', 'none'] }, hint: { type: 'string' } } } },
    initial: { type: 'string' }, describe: { type: 'string' },
  },
};
const rigSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema', $id: `${ORIGIN}/schemas/rig.schema.json`, title: 'MetalUI rig spec (metalui/rig@1)',
  description: 'A rig: gadgets on a grid in one panel, wired by patch cables from out ports to in ports. validateRig checks kinds, cycles, fan-out and the set rules.',
  type: 'object', required: ['$schema', 'name', 'title', 'job', 'feel', 'grid', 'gadgets', 'cables'],
  properties: {
    $schema: { const: 'metalui/rig@1' }, name: { type: 'string' }, title: { type: 'string' }, job: { enum: Object.keys(JOBS) }, feel: oklchFeel,
    grid: { type: 'array', items: { type: 'integer', minimum: 1 }, minItems: 2, maxItems: 2 },
    gadgets: { type: 'object', minProperties: G.spec['rig-gadgets'][0], maxProperties: G.spec['rig-gadgets'][1], additionalProperties: { type: 'object', required: ['gadget', 'at'], properties: {
      gadget: { oneOf: [{ enum: gadgetSpecs.map((g) => g.name) }, { $ref: `${ORIGIN}/schemas/gadget.schema.json` }] }, at: { type: 'array', items: { type: 'integer', minimum: 0 }, minItems: 2, maxItems: 2 }, set: { type: 'object' } } } },
    cables: { type: 'array', minItems: G.spec.cables[0], maxItems: G.spec.cables[1], items: { type: 'object', required: ['from', 'to'], properties: {
      from: { type: 'string', pattern: '^[a-z][a-z0-9-]*\\.[a-z][a-z0-9-]*$' }, to: { type: 'string', pattern: '^[a-z][a-z0-9-]*\\.[a-z][a-z0-9-]*$' },
      map: { type: 'object', required: ['kind'], properties: { kind: { enum: Object.keys(MAP_KINDS) } } } } } },
  },
};
emit('packages/metalui/public/schemas/gadget.schema.json', JSON.stringify(gadgetSchema, null, 2) + '\n');
emit('packages/metalui/public/schemas/rig.schema.json', JSON.stringify(rigSchema, null, 2) + '\n');

const reading = rigSpecs.find((r) => r.name === 'reading');
const gadgetsDoc = `
---

# Gadgets

Gadgets are small Soft Hardware objects that stand for a feature: a patch bay for sync, a counter drum for a streak, a needle gauge for a level. They are Objects (emblems): looked at, never operated, so a gadget never stands in for a control. A gadget is a JSON spec (\`metalui/gadget@1\`) composed from a closed catalog of Parts and mechanisms; gadgets wire into rigs (\`metalui/rig@1\`) with patch cables. The manifest is [\`/gadgets.json\`](${ORIGIN}/gadgets.json) and the schemas are [\`gadget.schema.json\`](${ORIGIN}/schemas/gadget.schema.json) and [\`rig.schema.json\`](${ORIGIN}/schemas/rig.schema.json). Try a spec on [Gadgets › Compose](${ORIGIN}/gadgets/compose).

\`\`\`tsx
import { Gadget, Rig, validateGadget, validateRig } from '@unlocalhosted/metalui/gadgets';

<Gadget spec={needleGauge} value={24} />                       // a value drives it; its state follows
<Gadget spec={patchBay} state="failed" />                       // or the host sets a state
<Rig spec={reading} catalog={{ 'needle-gauge': needleGauge, 'counter-drum': counterDrum }} values={{ today: { value: 34 } }} />
\`\`\`

SwiftUI: \`MetalGadget(spec: spec, state: "failed", value: 24)\` and \`MetalRig(spec: rig, catalog: catalog, values: [...], states: [...])\`, from the same JSON.

## What you cannot do

- **Invent a Part, a mechanism, a colour or a sound.** Compose from the catalog below. If a request needs something that is not there, say so: "this needs a new Part; ask a person to draw it".
- **Pick colours.** A gadget's colours come from its job (a hue station) and its feel; you set the job and three numbers, never a colour.
- **Make a gadget a control.** It shows a feature's state; the controls stay Components.

## Composing a gadget

1. **Job**: what it means. Each job owns hue stations (gadgets side by side need ${G.set['hue-gap']}° between colourful bodies), a reach for its sound, its containers and sometimes a pinned material.
2. **Feel**: \`v\` (tense ↔ pleased), \`a\` (still ↔ active), \`w\` (how much the act commits you), each 0 to 1. Feel picks the material and the body's lightness and colour.
3. **Parts** on the 400-unit canvas (the body is 320 across at [200, 196]): one \`body\` (a slab or a bezel), \`actor\`s the mechanism moves, \`trim\`, a \`lamp\` (an LED, top right at [313, 78]), \`cut\`s into a slab. ${G.spec.parts[0]} to ${G.spec.parts[1]} parts.
4. **Mechanism**: exactly one; \`bind\` maps its slots to part ids. Held mechanisms follow a \`drive\` port's value; momentary ones play an act.
5. **States**: always \`rest\`; each gives the lamp \`[signal, gesture]\`, may pose parts (\`form\`), beep an earcon (\`beep\`), or play the act on entering (\`enter: "act"\`), with a \`hint\` for its spoken description. At most ${G.spec.states}.
6. **Ports**: \`in\` and \`out\` channels a rig can wire. \`describe\` says it aloud, with \`{title}\`, \`{state}\`, \`{value}\`, \`{max}\`, \`{unit}\`, \`{share}\`.

Signals: ${SIGNALS.map((s) => `\`${s}\``).join(', ')}. Gestures: ${GESTURES.map((s) => `\`${s}\``).join(', ')}. Earcons: ${EARCONS.map((s) => `\`${s}\``).join(', ')}.

### Jobs

| Job | Stations | Reach | Containers | Pinned material |
|---|---|---|---|---|
${Object.entries(JOBS).map(([k, j]) => `| \`${k}\` | ${j.stations.join(', ')} | ${j.reach} | ${j.containers.join(', ')} | ${j.pin ?? ''} |`).join('\n')}

### Parts

| Part | Size | Materials | Params |
|---|---|---|---|
${Object.entries(PARTS).map(([k, p]) => `| \`${k}\` | ${p.size.join(' × ')} | ${p.materials.join(', ')} | ${Object.entries(p.params).map(([n, v]) => `\`${n}\` (${v[0]}${v.length > 1 ? `: ${v.slice(1).join(', ')}` : ''})`).join('; ')} |`).join('\n')}

### Mechanisms

| Mechanism | Mode | Drive | Slots | What it does |
|---|---|---|---|---|
${built.map((n) => { const m = mechOf(n); return `| \`${n}\` | ${m.mode} | ${m.drive ? m.drive.join(', ') : ''} | ${Object.entries(m.slots).map(([s, v]) => `\`${s}\`: ${v.parts.join('/')}${v.many ? ' (many)' : ''}${v.optional ? ' (optional)' : ''}`).join('; ')} | ${m.caption} |`; }).join('\n')}

## The catalog

Name a catalog gadget in a rig, or copy its spec from \`/gadgets.json\` and change it.

| Gadget | Job | Mechanism | In | Out | States |
|---|---|---|---|---|---|
${gadgetSpecs.map((g) => `| \`${g.name}\` (${g.title}) | ${g.job} | ${g.mechanism.name} | ${Object.entries(g.ports?.in ?? {}).map(([k, c]) => `\`${k}\` ${c.kind}`).join(', ')} | ${Object.entries(g.ports?.out ?? {}).map(([k, c]) => `\`${k}\` ${c.kind}`).join(', ')} | ${Object.keys(g.states).join(', ')} |`).join('\n')}

## Rigs

A rig puts ${G.spec['rig-gadgets'][0]} to ${G.spec['rig-gadgets'][1]} gadgets on a grid (up to ${G.spec['rig-grid'].join(' × ')}) and wires out ports to in ports with cables. Outs have jacks on a gadget's right and ins on its left, so wire each cable to a gadget to the right or below. A cable carries its value as it is, or through one map:

${Object.entries(MAP_KINDS).map(([k, v]) => `- \`${k}\`: ${v}.`).join('\n')}

Ports: ${Object.entries(PORT_KINDS).map(([k, v]) => `\`${k}\` is ${v}`).join('; ')}. No cycles; at most ${G.spec['fan-out']} cables out of one port; every pair of gadgets in a rig passes the set rules (hue apart, not the same material and lightness band, a visible difference also for colour blindness, no more than ${G.set['slab-run']} slab gadgets in a row).

### Worked example: the reading rig

Today's needle gauge drives the streak counter: crossing today's line sends a pulse that counts one more day.

\`\`\`json
${JSON.stringify(reading, null, 2)}
\`\`\`

## Checking a spec

\`validateGadget(spec)\` and \`validateRig(spec, catalog)\` return \`{ ok: true, spec }\` or \`{ ok: false, problems }\`, each problem a \`path\`, a \`code\`, a \`message\` and a \`fix\`. Fix every problem before rendering; the renderer draws only valid specs.
`;
emit('packages/metalui/public/AI.md', `${intro}\n${guides}\n${iconsDoc}${gadgetsDoc}`);

emit('packages/metalui/public/llms.txt', `# MetalUI

> Soft Hardware components for React (on Base UI) and SwiftUI, with animated duotone icons. Every component ships React, SwiftUI and an agent guide.

- [Full agent guide](${ORIGIN}/AI.md)
- [Component manifest](${ORIGIN}/components.json)
- [Icon manifest](${ORIGIN}/icons.json)
- [Gadget manifest](${ORIGIN}/gadgets.json): the catalog of Parts, mechanisms, gadgets and rigs an assistant composes from

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
finish(`agent docs (${list.length} components)`);
