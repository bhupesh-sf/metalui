### Stepper

From "Components other libraries ship that we don't" § 2: the steps of a wizard (ReUI Stepper, shadcn Questionnaire).

Now: nothing. Two neighbours do part of the job and must not be duplicated:

- **`Progress` `steps`** draws one well per step and says "Step 2 of 4". It answers *how far*, and nothing in it can be pressed: a step there is a share of a bar, not a place you can go back to.
- **`Tabs`** switches between panels that are peers: every tab is always reachable, ← → move and choose at once, and nothing is ever "done".

A wizard needs what neither has: an order you move through, steps you have finished and can return to, a step that has a problem, a step that is waiting, and steps you can't reach yet. That is Stepper.

Read for jobs: ReUI Stepper, shadcn Questionnaire, Material 3 steppers, Carbon Progress indicator, USWDS Step indicator, GOV.UK "check your answers", Apple's setup assistants (macOS Setup, Xcode's new-project sheet), Stripe Checkout and Linear's onboarding.

**Place (docs/COMPOSITION.md): a Component.** You operate it (pick a step, Back, Continue) to change something else: which panel of the flow is shown. It stands for nothing of the person's (Object fails), it stays while you work (Instrument fails), and it has no area that holds objects (Place fails: the panels hold the host's form, not objects).

**Semantics (WAI-ARIA).** The APG has no stepper pattern. Tabs semantics would be wrong: a tablist says the steps are peers, its roving ← → would let you choose a step you can't reach yet, and `aria-selected` can't say "done" or "has a problem". So: an ordered list (`<ol>`, named by the host) whose current step carries `aria-current="step"` (USWDS, GOV.UK); a step you can go to is a `<button>`, one you can't is plain text; each step's state is said in words to assistive tech ("completed", "has a problem: …", "not available yet"). Tab moves through the reachable steps; there is no roving focus (a wizard has 3 to 7 steps). Base UI has no stepper part, so nothing is reimplemented: buttons, a list and `hidden` panels are the platform's.

**Jobs**

| Job | Where | Our form | Tier |
|---|---|---|---|
| Know where you are | every wizard | the current step's indicator is the switcher's raised thumb (the same "you are here" as Pagination's page and Tabs' tab) with its number in ink; its title in ink | Must |
| Know how much is left | every wizard | upcoming steps are the switch's sunk well with the number in ink3; the groove between two steps fills green (the switch's on-look, Progress's fill) when the step before it is done, so the run of green is how far you've come | Must |
| See what's done | a step behind you | its well is filled green with the set's `check` in the on-ink. The check is a word for the reader too: "completed" | Must |
| Go back without losing input | Back, or a finished step | `Stepper.Back`, or press any step you've reached; **panels stay mounted** (hidden), so what was typed survives going back and forward | Must |
| A step you can't reach yet | steps past the furthest you've reached | `linear` (the default): only steps up to the furthest reached are buttons; the rest are text at rest, said "not available yet". `linear={false}` for flows whose steps are independent. `disabled` on a step for one that is off for now (40 %) | Must |
| See which step has a problem | a review step, or Continue refused | `error` on a step: the invalid hairline ring (the field's, never the focus ring) on its indicator, and the error's words under its title in the form error's ink. Colour never alone: the words are the state | Must |
| What waits | a step saving or checking | `waiting` on a step: its number gives way to the Spinner's ring after the show delay (`useWait`: nothing for fast work, a minimum on screen once shown, the tick when done); Continue takes Button `state="waiting"` at the same time, so the key and the place agree | Must |
| Move on, or refuse to | Continue | `Stepper.Next`: a primary Button; its words turn on the drum to "Finish" on the last step. The host refuses (validation) by calling `event.preventDefault()` in its `onClick`; on the last step it never advances (the host submits) | Must |
| The new step arrives from the way you went | every move | the panel drifts in from the trailing side going forward and the leading side going back (one nest, settle spring), with a fade; the old one leaves at once (as Tabs). Focus goes to the new panel after Back or Continue, so a reader hears where it landed | Must |
| Controlled or not | every host | `value` / `defaultValue` / `onValueChange` (an index) | Must |
| Titles under the steps (ReUI "title") | a wide wizard header | `layout="stacked"` (default): indicators in a row on one groove, titles centred under them | Must |
| Title beside the indicator (ReUI "inline") | a dialog's header, a compact header | `layout="inline"`: each title beside its indicator, grooves between the groups | Must |
| Title and description (ReUI) | onboarding, checkout | `description` on a step: a second line in meta type, ink3 | Must |
| Vertical | a sidebar of steps, a long setup | `orientation="vertical"`: indicators in a column on a standing groove, title and description beside | Must |
| *ours*: the panel inside the vertical list | a narrow checkout, a phone-width setup | `Stepper.Panel` placed in the vertical list under its step's title (`Stepper.List` takes the panels as children in vertical) | Should |
| *ours*: a wizard that runs out of width | a horizontal stepper in a narrow column | a container query on the list: below its width, the other steps' titles go (still said to readers) and only the current one shows, so the row never wraps or truncates mid-word | Should |
| Reduce Motion | every move | the panel only fades; the groove's fill and the indicator's look change at once | Must |
| Title and status (ReUI) | "Completed", "In progress" under each title | covered: the indicator says it (check, thumb, well, ring) and readers hear it; visible status words under every step are noise. A step with something to say says it in `description` or `error` | covered |
| Title and bar (ReUI) | a segmented bar with titles | covered by `Progress` `steps` with a label ("Step 2 of 4 · Shipping"): a bar you can't press is a Progress | covered |
| Number only (ReUI) | a dense header | covered by `Progress` `steps` when the steps can't be visited; when they can, `inline` with short titles. A row of bare numbers that you can press says nothing about where they go | covered |
| A progress bar across the steps (ReUI) | above the list | covered by the groove's fill, which *is* the bar; a second bar would say it twice | covered |
| A step you may skip | "Invite your team (optional)" | Later: a skipped step stays unfilled while the groove after it fills; needs a fourth look | Later |
| Custom indicators per state (ReUI) | a glyph per step | Later: `icon` on a step in place of its number (the set's glyph, in the same well). One look per state until a real screen needs a glyph | Later |
| Sizes | a dense panel | Later: one 24 indicator (it sits in a 32 row, level with a regular field); compact when a real screen needs it | Later |

Not doing: tabs semantics and roving focus (see above); an LED per step (a lamp would put a fifth meaning on a step; the green fill already is the done colour, and red, amber and blue keep their meanings: the invalid ring is the red, the spinner the amber "waiting"); a numbered "1 2 3" with no titles on the web (unclear where each goes); animating the groove's width (only transform: the fill scales).

**Decide**

- **Tabs semantics or a list with `aria-current`?** A list with `aria-current="step"` and buttons. Steps are ordered, not peers; tabs' arrow keys would choose unreachable steps, and tabs can't say done or invalid.
- **Do panels unmount when you leave them?** No: always mounted, `hidden` when not current. Going back must keep input (the job), and a wizard's panels are one form split up. A host that needs a fresh panel keys it.
- **Which steps are reachable?** Linear by default: any step up to the furthest you've reached, so finishing step 3 then going back to 1 still lets you jump to 3. `linear={false}` frees them all.
- **Who says "done"?** By default a step is done when you've passed it (it is before the furthest reached and not current). `complete` on a step overrides (true or false), and `error` always wins over done: a step you passed can still have a problem.
- **How does Continue refuse?** The host's `onClick` calls `event.preventDefault()`; no `canNext` callback, no validation API. The host marks the step's `error`, the field's own error says the rest.
- **Where does focus go?** After Back or Continue, to the new panel (`tabIndex=-1`, no ring for the pointer); after pressing a step, it stays on the step, so you can keep moving along the list.
- **Reuse, not a new look.** The indicator's looks are the switcher's thumb (current), the switch's sunk well (upcoming) and on-look (done), the field's invalid ring and the Spinner's ring. The `stepper` recipe holds only sizes and motion.

**Must**
- [x] React: `Stepper` (`steps`, `value`, `defaultValue`, `onValueChange`, `linear`), `Stepper.List` (`orientation`, `layout`, `aria-label`), `Stepper.Panel` (`index`), `Stepper.Back`, `Stepper.Next` (Button props, `finish`).
- [x] States: current, upcoming, done, unreachable, disabled, error, waiting; grooves that fill on settle and drain on release.
- [x] Panels always mounted; directional arrival; focus to the panel on Back and Continue; Reduce Motion fades.
- [x] SwiftUI `MetalStepper` (the list, both orientations and layouts, the same states on the same recipes) and `MetalStepperPanel`.
- [x] Recipe `stepper`, agent guide, meta.json, the page with its DialKit panel, the e2e slice.

**Should**
- [x] The panel inside the vertical list.
- [x] The narrow horizontal list keeps only the current title.

**Later**
- [ ] A skipped optional step.
- [ ] `icon` per step.
- [ ] A compact size.

- Done (2026-10-06): Must and Should. The done look is the checkbox's on look (the library's "ticked"), not green: green stays the groove's fill, so the run of green reads as one bar and a check reads in both colorways. Left: SwiftUI has no Back / Continue slots (the host's `MetalButton`s on the binding; `check-slots` lists list, back and next as pending) and no narrow line; SwiftUI panels don't take focus.
