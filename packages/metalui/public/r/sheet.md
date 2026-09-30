# Sheet

A panel that slides in from an edge of the window. React: `Sheet` from `@unlocalhosted/metalui`, on Base UI Drawer. SwiftUI: `MetalSheet` (work in progress). The plate and scrim are the dialog's; the `sheet` recipe adds the edge, the grip and the motion.

## Use it for

- An inspector or settings beside the work (`side="right"`), or a phone sheet of options (`side="bottom"`).

## Don't use it for

- A question that needs an answer (use an alert dialog), a small task by its trigger (use a popover), or navigation that should stay (use a sidebar place).

## Anatomy

- Right: full height, 380 wide (never wider than the window), padding 20, rounded 22 on its inner edge.
- Bottom: full width, at most 85 % of the window tall, rounded 22 on its top edge, a grip (36 × 4, the switch well) 10 from the top.
- Title (title type), Description (body type, ink2), then content, 14 apart.

## States and motion

| State | Look | Motion |
|---|---|---|
| opening | scrim and sheet | slides its whole size in on the surface spring; scrim fades |
| open | focus inside | – |
| dragging | follows the finger | one to one, no spring |
| let go, past the threshold | leaves | release spring, shorter for a harder flick |
| let go, short of it | goes home | settle spring |
| closing (Esc, scrim, Close) | leaves | release spring |

Reduce Motion: it fades in and out, with no slide.

## API

| React | SwiftUI |
|---|---|
| `Sheet.Root` `open`, `defaultOpen`, `onOpenChange`, `side` (`right`, `bottom`), `modal` | `isPresented:`, `edge:` |
| `Sheet.Trigger` (`render` your button) | `trigger:` |
| `Sheet.Popup`, `Sheet.Title`, `Sheet.Description`, `Sheet.Close` | `content:` |

## Keyboard and accessibility

- A modal dialog named by its title and described by its description. Focus is trapped inside while open; Esc closes it and focus returns to the trigger.
- Swiping is extra, never the only way out: keep a Close button.

## Rules

- Everything in it is about what is behind it; it is not a page.
- Keep a visible Close; swipe and Esc are shortcuts.
