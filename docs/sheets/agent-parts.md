### Agent parts: Reasoning, steps, Tool call and Confirmation

From "AI components" § 2, "Agent parts": what an agent shows inside its reply while it works. Reasoning (AI Elements Reasoning, prompt-kit Reasoning, assistant-ui Reasoning, Ant Design X Think), chain of thought or steps (AI Elements Chain of Thought, prompt-kit Steps, X ThoughtChain), the tool call (AI Elements Tool, prompt-kit Tool, assistant-ui ToolFallback and ToolGroup) and the confirmation (AI Elements Confirmation, CopilotKit's human in the loop).

All four render in a `Message` body (`from="assistant"`), above or between the answer's words. Neighbours that must not be duplicated:

- **`Collapsible`** is show and hide in place (the row, the chevron, the reveal, what follows travelling in step). Reasoning and a tool call are collapsibles that know what they hold.
- **`Timeline`** is a record of events on a rail: done, running (the Spinner's ring after the show delay), waiting, failed and planned, a lamp with a word, a detail line under each, arrivals said once. An agent's steps are exactly that.
- **`Stepper`** is a wizard the person walks through and goes back in. An agent's steps are not operated: checked, not reused.
- **`Alert`** is a message about this place with actions, read out at once when urgent. A confirmation is the agent's urgent question with two answers.
- **`AlertDialog`** blocks until answered. A confirmation doesn't block the page: the thread goes on around it, and the agent waits.
- **`Properties`** is label and value pairs: a tool's inputs.

**Place (docs/COMPOSITION.md).**

- **Reasoning is an Object.** It stands for something the assistant produced (its thinking) and stays in the turn. Opening it changes nothing else (Component fails); it isn't drawn only while you act. Sibling of `Message`.
- **Tool call is an Object.** It stands for one thing the agent did, with what it was given and what came back, and stays as the record. Same tests as Reasoning. A group of calls is the same object, folded together.
- **Confirmation is an Object.** It stands for the agent's request ("Delete 3 files?") and, once answered, for what was decided; it stays in the thread. Its answers are `Button`s inside it (as a `Message`'s Copy is in its footer); you operate those, not the request.
- **Steps are not a new thing.** They are a `Timeline` (an Object), shown in a `Reasoning` fold when they are the agent's working.

**Semantics.** Reasoning and a tool call are Base UI Collapsibles: a button with `aria-expanded` and the panel it controls; the button's name says the state ("Thinking", "Thought for 4 s"; "search_docs, Running"). A tool call that is running is `aria-busy`, and its end is said once by the Spinner's status. A confirmation asking is an Alert of kind urgent (`role="alert"`, read at once); answered, it turns to a note (`role="status"`) whose words say what was decided.

**Decide**

- **Do steps and tool calls share a part?** No. A step is a line of a story, read in order, and has no inside to open; a tool call is a thing you open to inspect (inputs, result, error). Steps are a `Timeline`; a tool call is its own object. They share the state vocabulary and its lamps, so the two never disagree: queued is the amber lamp ("Queued", waiting on something else), running the Spinner's ring after the show delay ("Running"), done the off lamp, failed the red lamp ("Failed"). A step that is a tool call is shown as the `ToolCall`, not as a step.
- **Who counts the seconds of thought?** Reasoning, from when `streaming` turns on to when it turns off (nothing ticks while it thinks: the word is "Thinking", then "Thought for 4 s" on the drum). A host that knows the time passes `duration` (restored history).
- **Who opens and closes Reasoning?** Reasoning, following `streaming` (open while it thinks, folded when the answer starts) until the person opens or closes it themselves; from then on it is theirs.
- **Who groups consecutive reasoning parts?** The host: it passes them as one `Reasoning`'s children. A second fold for each part is the noise grouping removes.
- **Who groups consecutive tool calls?** The host, with `ToolCall.Group` around them (one boolean of its own list, as Message's `grouped`). The group counts its children for its default words ("4 tools") and takes its lamp from the host's `status` (the calls' states are the host's data).
- **What does a tool with no UI of its own show?** The fallback: the inputs as compact `Properties` (objects as JSON), the result as text in a sunk well in code type (objects pretty-printed), an error in the error ink. A tool with its own UI passes `children`, which replace the fallback in the panel.
- **What does a decided confirmation look like?** It recedes: the plate goes (Alert's quiet tone), the glyph turns to the note's, the answers give way to the decision: a check or a cross with its word ("Allowed", "Denied") and an optional time (the answers leave, nothing turns: the drum is for a word that changes in place). The question stays, so the thread reads as what was asked and what was said.
- **Destructive confirmations.** `destructive` makes Allow the destructive cap with the trash glyph and Button's `hold`; a tap shows the hint under the answers, as in AlertDialog.
- **Reuse.** The fold is `Collapsible`; the words on the drum are `SwapText`; the lamps are `Led`; the running ring is `Spinner` through `useWait`; the inputs are `Properties`; the result's well is the field well; steps are `Timeline`; the request is `Alert`; the answers are `Button`. The `reasoning`, `tool-call` and `confirmation` recipes hold only sizes.

**Jobs: Reasoning**

| Job | Where | Our form | Tier |
|---|---|---|---|
| See that the model is thinking | a reasoning model | `streaming`: the row says "Thinking" beside the amber lamp breathing (waiting, as Message's) and the fold is open, the thought arriving in it | Must |
| Read the thought, or not | after the answer | the fold shuts when `streaming` turns off; the row says "Thought for 4 s" (the off lamp), turned on the drum; pressing it opens the thought again | Must |
| How long it thought | every reply | measured from `streaming` on to off, or the host's `duration`; under a second says "Thought for a moment" | Must |
| The person's choice holds | they open it while it thinks, or shut it | once the person presses the row, `streaming` no longer opens or shuts it | Must |
| Several reasoning parts in a row (A) | interleaved models | covered: the host passes them as one Reasoning's children | covered |
| The agent's steps instead of prose | a chain of thought | covered: a `Timeline` as the children, the row's words from `label` ("Worked for 12 s") | covered |
| Thought in quieter type | every reply | the panel's text in body type, ink2, beside an engraved rule at the start (the thought is the answer's margin, not the answer) | Must |
| Shimmering "Thinking" (V, P) | | dropped: the lamp breathes and the word says it; a shimmer is its own entry ("Thinking indicator") | dropped |
| Streaming Markdown in the thought | | its own entry ("Streaming text and Markdown") | Later |

**Jobs: Steps (chain of thought)**

| Job | Where | Our form | Tier |
|---|---|---|---|
| Steps, each pending, running, done or failed | an agent at work | covered: `Timeline` events with `state` planned (pending), running, done, failed; the lamp and the word; running shows the Spinner's ring after the show delay | covered |
| Detail under each | "Searched 12 pages", a list of results | covered: the event's `description` (a node: chips, links) | covered |
| A glyph per step (search, read) | | covered: the event's `glyph` | covered |
| A step arrives | streaming steps | covered: Timeline lands it one nest from above and says it once | covered |
| Folded once the answer starts | a long chain | covered: the Timeline inside a `Reasoning` with `label` | covered |
| A step's detail folded on its own | a long result | Later: a Collapsible in the description works today; a built-in fold waits on a need | Later |

**Jobs: Tool call**

| Job | Where | Our form | Tier |
|---|---|---|---|
| What tool ran | every call | `ToolCall` `name` in code type on a collapsible row, an optional `summary` (ink3, the main input: "‘springs’") that fades as it opens | Must |
| How it's going | every call | `status`: queued the amber lamp and "Queued"; running the Spinner's ring after the show delay and "Running" (busy); done the off lamp and the `duration` ("1.2 s") if given; failed the red lamp, blinking twice when it fails on screen, and "Failed". The word turns on the drum | Must |
| What it was given | inspecting | the panel's Input: the `input` object as compact `Properties`, objects as JSON | Must |
| What came back | inspecting | the panel's Result: `result` as text in a sunk well, code type (objects pretty-printed); `error` in the error ink instead when it failed | Must |
| Folded by default | every call | closed unless `defaultOpen` / `open` | Must |
| Calls in a row (A) | an agent that runs several | `ToolCall.Group`: one row ("4 tools", or `label`) with the host's `status` lamp, folding the calls under it | Must |
| A tool with its own UI | weather, a chart | `children` replace the fallback in the panel; the row stays | Must |
| Waiting for the person's yes | a guarded tool | covered: a `Confirmation` beside the call, the call `queued` until it's answered | covered |
| Copy the result | debugging | Later: with "Message actions" | Later |

**Jobs: Confirmation**

| Job | Where | Our form | Tier |
|---|---|---|---|
| The agent asks before it acts | "Delete 3 files?" | `Confirmation`: an urgent `Alert` (the amber lamp, the warning glyph, read at once) with `title`, the detail as children, and the answers Deny then Allow (compact; Allow primary) | Must |
| Answer it | | `onDecide('allowed' \| 'denied')`; the host keeps the answer and passes it back as `decision` | Must |
| What was decided stays | reading back | `decision`: the plate goes (quiet), the glyph turns to the note's, the answers give way to a check or a cross and the word ("Allowed", "Denied"), with the host's `time`; said politely | Must |
| A destructive act | delete, send, pay | `destructive`: Allow is the destructive cap with the trash and `hold`; let go early and the hint shows under the answers | Must |
| Name the answers | "Run", "Skip" | `allowLabel`, `denyLabel`; the record still says "Allowed" or "Denied" (`allowedLabel`, `deniedLabel` to change it) | Must |
| Allow always for this tool (C) | repeated calls | Later: a third answer needs a place the host keeps the rule | Later |
| Edit the inputs before allowing | | Later: the host's form in the children works today | Later |

Not doing: a timer that auto-denies (nothing runs at rest), a modal for a confirmation (that is AlertDialog's job), a colour per tool.

**Must**
- [x] React: `Reasoning` (`streaming`, `duration`, `label`, `open`, `defaultOpen`, `onOpenChange`, children), `ToolCall` (`name`, `status`, `summary`, `input`, `result`, `error`, `duration`, children) and `ToolCall.Group` (`label`, `status`, children), `Confirmation` (`title`, `decision`, `onDecide`, `destructive`, `allowLabel`, `denyLabel`, `holdHint`, `time`, children).
- [x] SwiftUI `MetalReasoning`, `MetalToolCall`, `MetalToolCallGroup`, `MetalConfirmation` with the same states.
- [x] Recipes `reasoning`, `tool-call`, `confirmation` (sizes), agent guides, meta.json, the pages with their DialKit panels, the e2e slices, bundle ceilings.
- [x] Steps: shown with Timeline inside Reasoning on the Reasoning page.

**Later**
- [ ] Allow always; editing inputs before allowing.
- [ ] A step's own fold; copying a result.

### Plan, sources, the context meter, and a new chat's welcome

From "AI components" § 2: the plan, task and queue (AI Elements Plan, Task and Queue; assistant-ui's todo list), sources and inline citations (AI Elements Sources and InlineCitation, prompt-kit Source, Ant Design X Sources), the context meter (AI Elements Context), starter prompts and follow-ups (AI Elements Suggestion, prompt-kit PromptSuggestion, assistant-ui ThreadWelcome suggestions, X Prompts) and the welcome (assistant-ui ThreadWelcome, X Welcome). Neighbours that must not be duplicated, besides those above:

- **`Progress`** is how far a task has come, with words on the drum. A plan's head is a Progress.
- **`Checkbox`** is a tick the person operates. A plan's ticks are the agent's: the check glyph, not the control.
- **`PreviewCard`** is what is behind a link after a steady hover. A source is that.
- **`MarkUrl`** (the link cue) is a URL at rest in text, a host pill. A citation is a link at rest in text.
- **`ProvenanceTooltip`** says where a recognised cue came from. A citation says where an answer's words came from: the same idea, but a source has a title, a line and a place to go, so it previews as a card, not a tooltip.
- **`Meter`** is a level in a known range whose top (or bottom) end is the problem. A context window is that.
- **`EmptyState`** is a place with nothing in it yet, how to start and the action that starts it. A new chat is that.

**Place (docs/COMPOSITION.md).**

- **Plan is an Object.** It stands for the work the agent took on and stays as the record of how far it got. You don't operate it (its ticks are the agent's), it isn't drawn only while you act, you don't go into it. Sibling of `Timeline` and `Tool call`.
- **Citation is an Object.** It stands for a source and stays with the words it backs. Pressing it follows the link (a link is a link, as in `Link card`); the list of sources is the same object, folded together.
- **The context meter is a `Meter`** (a Component), not a thing of its own.
- **The welcome is an `EmptyState`** (a Place: the thread before anything is in it). Starter prompts and follow-ups are `Button`s.

**Decide**

- **Does a plan share Timeline's states or ToolCall's?** ToolCall's: pending (off lamp), queued (amber, "Queued"), running (the ring after the show delay, "Running"), done, failed (red, "Failed", blinking twice when it fails on screen). A plan and the calls that carry it out never disagree. Done is the check glyph in ink3 rather than the off lamp, because a to-do list's done must differ from its not-yet without colour.
- **What is the queue?** What is waiting to run: steps in state `queued`. A separate queue component would be a second list of the same tasks. The person's own messages waiting to send while the agent works belong to the composer (another entry).
- **What does the head count?** Steps, the top level. A step's own tasks are its business; counting leaves would let one big step swamp the count.
- **Does a plan fold?** No. A long plan goes in a `Collapsible` or a `Reasoning`; one fold, not two kinds.
- **What does a citation mark look like?** The link cue's pill with the number in place of the host (meta type, tabular). It is a link at rest in text, so it wears the link cue's look; the number ties it to the list.
- **Hover, tooltip or card?** The preview card: a source has a title, a line and a host, and the pointer may want to move onto it. Focus opens it too (PreviewCard's own).
- **Who numbers the sources?** The host: `n` on the mark, the order of `sources` in the list. The two are the same numbers by rule, not by the component counting.
- **Context meter: a component?** No: `<Meter label="Context" value={used} max={window} showValue />`, the tokens in words under it and in `getAriaValueText`. Its default zones are the right ones (amber from 75 %, red from 90 %). Documented on the Meter page and in its agent guide.
- **Starter prompts: Chip or Button?** Button (compact, standard). `Chip variant="suggestion"` accepts or dismisses something the AI proposed; a starter prompt is an action that sends words. Several in the EmptyState's action row, which already wraps and centres. Follow-ups are the same Buttons in a row under the reply, inside the Thread.
- **Welcome: a component?** No: an `EmptyState` in the `Thread` (glyph or avatar, greeting, what it can do, the prompts). Documented on the EmptyState page and in its agent guide.
- **Reuse.** The plan's head is `Progress`; the lamps are `Led`; the ring is `Spinner` through `useWait`; the words are `SwapText`; the nesting is the engraved rule. The mark is `mark-url`; the preview is `PreviewCard`; the list folds in `Collapsible`; its titles are quiet external `Link`s. The `plan` and `citation` recipes hold only sizes.

**Jobs: Plan, task and queue**

| Job | Where | Our form | Tier |
|---|---|---|---|
| See the agent's plan and how far it has got | an agent at work | `Plan`: a compact `Progress` head ("Plan", "3 of 5" on the drum, the track filling), then the steps | Must |
| Each step's state | every step | `state`: pending the off lamp; queued amber, "Queued"; running the ring, "Running"; done the check, ink3; failed red, "Failed" | Must |
| What is waiting to run | a queue | covered: steps `queued` | covered |
| Tasks nested under a step | a big step | `tasks`: under the step beside an engraved rule, their marks under its words | Must |
| Why a step failed, what it found | detail | `description`: a line under the title, meta type, ink2 | Must |
| The plan failed or finished | the head | any failed step turns the Progress failed; every step done completes it | Must |
| Fold the plan | long plans | covered: in a `Collapsible` or a `Reasoning` | covered |
| A plan revised while it runs (steps arrive, leave) | replanning | Later: `useRowMotion` on the list, when an agent replans on screen | Later |
| The person's queued messages (A Queue) | sending while it works | Later: the composer's entry | Later |
| Remove or reorder a queued step | | Later: a step's own actions wait on a need | Later |

**Jobs: Sources and citations**

| Job | Where | Our form | Tier |
|---|---|---|---|
| Mark where a claim came from | in the answer | `Citation` `n` `source`: a numbered mark on the link cue's pill, a link to the source (new tab), named "Source 1: Motion" | Must |
| See the source without leaving | a steady hover or focus | the `PreviewCard`: image, title, a line, the host (the href's host without "www." by default) | Must |
| The sources under the answer | after the answer | `Citation.Sources`: one collapsible row ("4 sources"), folded; open, numbered lines with the title as a quiet external `Link` and the host | Must |
| Several sources for one claim | | covered: several marks side by side | covered |
| A host pill with "+2" (V InlineCitation) | | dropped: numbers tie the text to the list; a carousel inside a hover card hides sources | dropped |
| Favicons | | Later: needs the host's images and a fallback | Later |

**Jobs: Context meter**

| Job | Where | Our form | Tier |
|---|---|---|---|
| How full the context window is | the composer, the thread's header | covered: `Meter` `label="Context"`, `value` used, `max` window, `showValue`; the tokens in words under it and in `getAriaValueText` | covered |
| A breakdown (input, output, cached, cost) on hover | | Later: a `Popover` or `Properties` beside it, when a host has the numbers | Later |

**Jobs: Welcome, starter prompts and follow-ups**

| Job | Where | Our form | Tier |
|---|---|---|---|
| Greet a new chat | an empty thread | covered: `EmptyState` in the `Thread`: glyph or `Avatar`, greeting, what it can do | covered |
| Start from a prompt | a new chat | covered: two to four compact `Button`s in its action row, each a whole prompt, sending it | covered |
| Follow-ups after a reply | after an answer | covered: the same compact Buttons in a row (`role="group"`, "Follow-ups") under the reply in the Thread, gone when the person sends | covered |
| Prompts as cards with a title and a line (X Prompts) | | Later: a `Card` grid waits on a host that needs it | Later |

**Must**
- [x] React: `Plan` (`tasks`, `title`) with `PlanTask` (`id`, `title`, `state`, `description`, `tasks`); `Citation` (`n`, `source`) and `Citation.Sources` (`sources`, `label`, `open`, `defaultOpen`, `onOpenChange`).
- [x] SwiftUI `MetalPlan`, `MetalCitation`, `MetalCitationSources` with the same states.
- [x] Recipes `plan` and `citation` (sizes), agent guides, meta.json, the pages with their DialKit panels, the e2e slices, bundle ceilings.
- [x] Context meter on the Meter page and in its agent guide; the welcome, starter prompts and follow-ups on the EmptyState page and in its agent guide.
- [x] `MetalMessage` `waiting` shows its body when it has one (the skeleton only while it has none), as React.

**Later**
- [ ] A plan revised on screen; removing or reordering a queued step; the person's queued messages.
- [ ] Favicons on sources; a context breakdown; prompt cards.
