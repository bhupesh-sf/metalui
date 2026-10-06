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
