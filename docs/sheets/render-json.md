# Render from JSON (widgets)

A model answers with a small piece of interface (a booking card with a date and a Confirm key, a list of results, a progress line) instead of words about one. From `docs/BACKLOG.md`, AI section 6, "Render from JSON". Made the way the variation sheets are: OpenAI's ChatKit widgets (Card, ListView, Badge, Button, DatePicker, Select, Form), Vercel's json-render, Google's A2UI, Slack's Block Kit and Adaptive Cards were read for the **jobs** their variations do; each job is given our form, marked covered, or dropped with the reason. *Ours* marks our own ideas.

## The jobs

1. **A model emits a widget.** It needs one published contract it can read (a JSON Schema and a short guide in `AI.md`), small enough to fit in a prompt, made of components it already knows by name.
2. **The app renders it safely.** The JSON is untrusted: whatever arrives, the page never runs code, never follows a URL other than http, https or mailto, never throws, and never shows more than it can afford (depth and count limits). What it can't show it says quietly, in place.
3. **Actions come back to the host.** A key in the widget never does anything itself. It hands the host `{ type: "action", name, payload }`, with the values of the widget's fields beside it, and the host decides (call a tool, send a message, open a page).

## Where it sits

**`Widget` is an Object** (`docs/COMPOSITION.md`): it stands for one thing the model produced and stays in the thread, as a `Message` or a `ToolCall` does. It is not a Component: pressing it changes nothing (its keys hand an action to the host). It is not a Place: it has no area of its own, it is as big as what it holds. As an Object it may use Components, Parts and other Objects (Card), and nothing later.

It is **composed**: every look is borrowed from the components it names. It has no recipe and no stylesheet; it lays its nodes out in a column and the host page paints the rest.

SwiftUI: **`MetalWidget`** decodes the same JSON into the same views.

## The vocabulary

One rule decides what is in it: a component that exists on main, that a model can fill with words and numbers alone (no callbacks, no React nodes), and whose job turns up in an assistant's reply.

| Node | Renders | Holds | Tier |
|---|---|---|---|
| `Card` | `Card` with title (a link when `href` is http/https/mailto), description, status LED, body nodes and a footer of buttons | any node; footer: `Button` | Must |
| `List` + `ListItem` | a list of `Row`s: text, a detail line, a trailing badge; an item with an `action` is a key | `ListItem` only | Must |
| `Badge` | `Badge`, one fact, an optional LED (live, waiting, failed, off) | – | Must |
| `Button` | `Button`, standard, primary or destructive; regular or compact; its `action` goes to the host | – | Must |
| `Field` | `Field` with a label, text, email, number or URL, a placeholder and a default; its value goes with every action by `name` | – | Must |
| `Select` | `Select` of label and value options; value by `name` | – | Must |
| `DatePicker` | `DatePicker`, one day, ISO `YYYY-MM-DD` in and out; value by `name` | – | Must |
| `Properties` | `Properties`: label and value pairs | – | Must |
| `Markdown` | `Markdown`, with every link that is not http, https or mailto turned into its words | – | Must |
| `Progress` | `Progress`: a value of 100, or none (indeterminate), a label, a state | – | Must |
| `Meter` | `Meter`: a value in a range, a label | – | Must |
| `Alert` | `Alert`: a kind (note, done, waiting, urgent, failed), a title, a description and buttons | `Button` | Must |
| A row of keys, columns, a spacer (ChatKit Row, Col, Spacer) | dropped for now: the Card footer and the Alert's actions already lay out the keys a reply needs; free layout is where a model makes a mess | Later |
| A form with its own submit (ChatKit Form) | covered: every `Field`, `Select` and `DatePicker` with a `name` is sent with any action, so a Card with fields and a Confirm key is the form | covered |
| Text, Title, Caption (ChatKit) | covered: `Markdown` holds words; Card's title and description hold the rest | covered |
| Image | Later: a URL the model chose is a request the page makes on the reader's behalf; it needs a host allow-list first | Later |
| Checkbox, Radio, Textarea | Later: the same pattern as Field once a host asks | Later |
| Table, Chart, Timeline | Later: they need columns and series, a vocabulary of their own | Later |
| Icon by name | Later: the catalog ships with the icon runtime, which the renderer must not pull in by default | Later |

## Must

- [x] **One source per fact**: a spec object per node (`widget/spec.ts`: its props, their kinds, enums and limits). The JSON Schema (`public/widgets.schema.json`), the renderer's validation and the AI.md section are all generated from or driven by it.
- [x] `Widget` (`widget` a JSON value or a JSON string, `onAction(action, { values })`): validates, then renders. `parseWidget` returns the cleaned tree and the issues, for a host that checks on the server.
- [x] **Safe by construction**: only nodes and props in the spec reach a component; strings are text (React escapes them, nothing is HTML); URLs pass only as http, https or mailto; no prop is a function; `type` is looked up as an own key (`__proto__` and `constructor` are unknown nodes); depth 8 and 200 nodes at most.
- [x] **Never throws**: an unknown node, a node missing a required prop, or a component that throws while rendering shows a quiet fallback in its place ("Can't show this part"); a bad prop is dropped and the rest renders; JSON that doesn't parse shows the fallback alone.
- [x] **Actions**: `{ type: "action", name, payload? }`; the key hands it to `onAction` with the named values. Nothing else runs.
- [x] **On demand**: each component's module loads when a node first needs it (dynamic imports; the bench gate measures the whole set, the worst case).
- [x] Schema published at `metalui.dev/widgets.schema.json` and in the package (`@unlocalhosted/metalui/widgets.schema.json`); AI.md and llms.txt describe it.
- [x] SwiftUI: `MetalWidget` decodes the same JSON for the Must vocabulary, with the same limits and fallback, and `onAction`.
- [x] Docs page: an editable JSON sample, the samples picked from a DialKit panel, the actions it sends; e2e slices including a hostile sample.

## Should

- [ ] A key waits while the host works (`onAction` returns a promise → the Button's `waiting`, then `done`).
- [ ] `Select` and `DatePicker` send an action on change (`onChangeAction`), for a filter that applies at once.
- [ ] Streaming: render a partial tree while the JSON arrives (the parser keeps the last whole node).

## Later

- [ ] Layout nodes (row, column), Image with a host allow-list, Checkbox, Radio, Textarea, Table, Chart, icons by name.
- [ ] Host components: a host registers its own node types beside ours.
- [ ] Templates: a widget with placeholders the host fills from tool output (ChatKit's `.widget` files).

## Decide

- **A new component or a mode of Message?** **New, an Object.** A widget can stand in a message, a tool call's result or a side panel; Message would only hold it.
- **One JSON Schema file or one per node?** **One file**, `$defs` per node: a model reads one document; a host validates with one `$ref`.
- **Validate with a JSON Schema library?** **No.** The renderer walks the same spec the schema is generated from; a validator library would cost more than every node it checks and still need the URL and limit rules.
- **Where do field values go?** **Beside the action**, `onAction(action, { values })`, never merged into the model's `payload`: the host can tell what the model said from what the person typed.
- **A Button with a URL?** **No.** A key hands an action back; a link lives in a Card's title or in Markdown, where it reads as a link. A host that wants to open a page does it on the action.
- **Relative links in Markdown?** **Turned into their words.** A relative URL is the host's own origin; the model doesn't get to choose a page of it.
- **Fallback words?** "Can't show this part": quiet (ink3, meta type), in place, so the rest of the widget still reads.
