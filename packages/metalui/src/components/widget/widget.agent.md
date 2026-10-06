# Widget

A piece of interface a model sends as JSON, rendered with MetalUI's own components: a card with a date and a Book key, a list of results, a progress line. React: `Widget` and `parseWidget` from `@unlocalhosted/metalui`. SwiftUI: `MetalWidget`. An object: it stands for what the model produced and stays in the thread. Composed: every look is the component a node names; the widget lays its nodes out in a column, 12 apart (the `widget` recipe). The vocabulary, its props and its limits are one spec (`widget/spec.ts`), published as `https://metalui.dev/widgets.schema.json` and listed under "Widgets: render from JSON" in AI.md.

## Use it for

- An assistant's answer that is easier to act on than to read: a booking to confirm, choices to pick from, a status to watch.
- A tool's result shown as interface, in a `Message` or a `ToolCall`.

## Don't use it for

- Interface you write yourself: use the components directly.
- A question the agent must have answered before it goes on: use `Confirmation`.

## Anatomy

- A column of nodes (`Card`, `List` of `ListItem`, `Badge`, `Button`, `Field`, `Select`, `DatePicker`, `Properties`, `Markdown`, `Progress`, `Meter`, `Alert`), each the component it names. Keys and badges keep their own width.
- Fallback: "Can't show this part" in meta type, ink3, in place of a node that can't be shown.

## States

| State | Look |
|---|---|
| loading a component's module | nothing yet (the widget is empty until its components are in) |
| a node is unknown, misses a required prop, or throws | the fallback in its place; the rest renders |
| a prop is invalid | dropped; the node renders without it |
| the JSON doesn't parse | the fallback alone |

Nothing of its own moves; each component keeps its motion and its Reduce Motion.

## API

| React | SwiftUI |
|---|---|
| `Widget` `widget` (a node, an array of nodes, or JSON text), `onAction(action, { values })` | `MetalWidget(json: Data or String, onAction: (MetalWidgetAction, [String: String]) -> Void)` |
| `parseWidget(input)` → `{ nodes, issues }`: the cleaned tree and what was dropped, for a host that checks before it stores | `MetalWidgetNode.parse(_:)` |
| `WidgetAction` `{ type: "action", name, payload? }` | `MetalWidgetAction` `name`, `payload` (JSON data) |

## Safety

- The JSON is untrusted. Only the nodes and props in the spec reach a component; a node's `type` is looked up as an own key (`__proto__`, `constructor` are unknown nodes).
- Strings are text; nothing is rendered as HTML. No prop is a function or a component.
- URLs: a Card's `href` only http, https or mailto; Markdown links that are anything else (relative, `javascript:`, `data:`) become their words.
- Limits: 8 deep, 200 nodes, 100 items in a list, 4000 characters of text, an action's payload 8 KB.
- Keys never run anything: they call `onAction`. A payload is a plain-JSON copy.

## Keyboard and accessibility

- Each node is the component's own: its keys, focus and names. A `List` is a list; an item with an action is a button.
- Fields need a `label` to be named visibly; without one their `name` names them.
- The fallback is plain text, read in order.

## Rules

- Give the model the schema, not prose about it: structured output or a tool's input schema.
- The host decides what an action does. Never map an action name straight to a URL or a command.
- Keep `values` beside the `payload`: what the person typed is not what the model said.
- One primary key per widget, as anywhere.
