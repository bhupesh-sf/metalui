# Snap guides

The lines that explain a snap while a person moves or resizes an object on the canvas. React: `SnapGuides` from `@unlocalhosted/metalui`. SwiftUI: `MetalSnapGuides`.

## Use it for

- Moving or resizing objects on the canvas, when the core's snap lands an edge or a centre on a neighbour's. Pass the core's `guides` for this frame.

## Don't use it for

- Showing a grid, a ruler or a selection. Guides exist only while something is being moved, and only for the alignments that actually snapped.

## Anatomy

- One line per alignment, in world coordinates, drawn inside the transformed canvas world.
- `presence.guide-width` (1 pt) in `presence.guide` (`#3FB97A`; `presence.guide-dark` `#78D6A5` in Graphite).
- Edges solid; centres dashed `presence.guide-dash` on, the same off (3 / 3).
- Each line spans every aligned object plus `presence.guide-overshoot` (8 pt) at both ends.
- Width, dash and overshoot are screen points: pass the canvas `scale` and they stay the same at every zoom.

## States and motion

| State | Look |
|---|---|
| rest | nothing |
| snapping | the lines for this frame, updated in the same frame as the snap, never animated |
| release | the last lines fade on the release spring, then clear |

Reduce Motion: they clear at once.

## Haptics

`onEngage` fires once when a snap catches a line that was not caught in the previous frame. Staying on a line is silent; letting go is silent; catching a second line while on the first fires again.

- Mac: play `NSHapticFeedbackManager.defaultPerformer.perform(.alignment, performanceTime: .now)` in the same frame as the snap. `MetalSnapGuides` does this itself.
- Web: call `haptic('alignment')` from `onEngage`. It plays what this platform has and returns the path it took:

  | Path | Where | What plays |
  |---|---|---|
  | `'bridge'` | a web view whose host called `setHapticBridge` | the host's native haptic |
  | `'vibrate'` | a touch device with `navigator.vibrate` (Android) | an 8 ms pulse |
  | `'ios-switch'` | iOS Safari 17.4+ (a touch device that knows `<input switch>`) | the system tick, by toggling a hidden switch |
  | `'none'` | everywhere else, including every Mac and PC browser | nothing |

  ```tsx
  import { haptic, SnapGuides } from '@unlocalhosted/metalui';
  <SnapGuides guides={guides} scale={scale} onEngage={() => haptic('alignment')} />
  ```

  Browsers expose no trackpad haptics, so on a Mac the web is silent: say so (the docs demo shows the path), and never replace a haptic with a sound or a flash. Whether the web should stand in for it at all is the owner's decision; until then, the guide's own catch (it lights in the frame of the snap) is the only feedback.

### A web view in a Mac app

A host that renders MetalUI in a web view (Electron, Tauri, a `WKWebView`) can route `haptic()` to `NSHapticFeedbackManager`. Set the bridge once, at start-up; every `haptic()` call then goes to it and returns `'bridge'`:

```ts
import { setHapticBridge } from '@unlocalhosted/metalui';

// Electron: the preload exposes ipcRenderer.send('haptic', kind) as window.native.haptic
setHapticBridge((kind) => window.native.haptic(kind));
// WKWebView: a WKScriptMessageHandler named "haptic"
setHapticBridge((kind) => window.webkit.messageHandlers.haptic.postMessage(kind));
// Tauri: a command that performs it
setHapticBridge((kind) => invoke('haptic', { kind }));
```

On the native side, perform it at once (`performanceTime: .now`), mapping the kind:

| `kind` | `NSHapticFeedbackManager.FeedbackPattern` |
|---|---|
| `alignment` | `.alignment` |
| `detent` | `.levelChange` |
| `refusal` | `.generic` |

`setHapticBridge(null)` returns to the web paths. The bridge is a setter rather than a global so it is typed, and so a page never picks up a haptic it did not ask for.

## API

| React | SwiftUI |
|---|---|
| `guides: SnapGuide[]` (`axis`, `position`, `start`, `end`, `kind`) | `guides:` |
| `scale` | `scale:` |
| `onEngage` (call `haptic('alignment')`) | built in (the alignment haptic) |

## Rules

- A guide explains a snap that happened. Never draw one the snap did not use.
- Guides move with the snap in the same frame. A lagging guide would contradict the snap.
- ⌘ held turns snapping off, so there are no guides and no haptic.
- One haptic per new line caught, never one per frame.
