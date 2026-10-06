# Confirmation

The agent asks before it acts ("Delete 3 files?"), with Deny and Allow; once answered, what was decided stays in the thread. React: `Confirmation` from `@unlocalhosted/metalui`. SwiftUI: `MetalConfirmation`. An object: it stands for the request and then for its answer. Every look is borrowed: it is an `Alert` (urgent while asking, a quiet note once decided) and its answers are `Button`s (a destructive one held to confirm). The `confirmation` recipe holds the hint's and the decision's gaps.

## Use it for

- A tool call or an act the agent needs a yes for, in a `Message` body; keep the call `queued` until it is answered.

## Don't use it for

- A question that must block everything else: use `AlertDialog`.
- A notice with nothing to answer: use `Alert`.

## Anatomy

- Asking: an urgent `Alert` on its plate (the warning glyph in its window, the amber lamp steady), the `title` (the question) in title type, `children` (what will happen) in body type, ink2, and the answers: Deny (standard) then Allow (primary), both compact.
- `destructive`: Allow is the destructive cap with the trash, `hold`; let go early and the hint (`holdHint`) fades in under the answers, 6 below, meta type, ink3.
- Decided: a quiet `Alert` (no plate) with the note's glyph; the question and detail stay; the answers give way to a 14 check (allowed) or cross (denied), 6, the word ("Allowed", "Denied") and the `time`, in meta type, ink2.

## States and motion

| State | Look | Motion |
|---|---|---|
| asking | urgent, on its plate, the answers | arrives as an Alert (rising one nest, settle) |
| holding Allow (destructive) | the fill runs across the cap | Button's hold; the trash lid rides it |
| let go early | the hint under the answers | fades in |
| `decision` allowed / denied | quiet, the note's glyph, the check or cross and the word | the glyph morphs; the plate goes |

Reduce Motion: the Alert's own; the hold's fill still runs (it is time).

## Rules

- The host keeps the answer: `onDecide` tells it, `decision` shows it. Reloaded history passes `decision` and the record shows at once.
- Ask with a question that names the act and its object ("Delete 3 files?"); say what will happen in the children.
- Use `destructive` only for an act that can't be undone; the hold is the guard.
- Name the answers with verbs when they say more than Allow and Deny (`allowLabel="Delete"`, `denyLabel="Keep"`); the record still reads "Allowed" or "Denied" unless `allowedLabel` and `deniedLabel` say otherwise.
- Never deny on a timer: nothing runs at rest.

## API

| React | SwiftUI |
|---|---|
| `Confirmation` `title`, `decision`, `onDecide`, `destructive`, `allowLabel`, `denyLabel`, `allowedLabel`, `deniedLabel`, `holdHint`, `time`, `children` | `MetalConfirmation(_ title:, detail:, decision:, destructive:, allowLabel:, denyLabel:, time:, onDecide:)` |
| `ConfirmationDecision` `allowed`, `denied` | `MetalConfirmationDecision` `.allowed`, `.denied` |

## Keyboard and accessibility

- Asking, it is `role="alert"`: the question is read at once. Tab reaches Deny, then Allow.
- A held Allow says "Hold to confirm" after its name; a screen reader's activate confirms at once (Button's single-pointer path). The hint is said once, politely.
- Decided, it is `role="status"`; the word says the answer (the glyph is decorative).
