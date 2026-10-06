# MetalUI: agent integration guide

MetalUI is a set of Soft Hardware components: bone and graphite soft-touch plastic, smoked glass, knurled metal, LEDs, and press-in mechanics. Each component exists as React on Base UI (`@unlocalhosted/metalui`) and as SwiftUI (the `MetalUI` Swift package), and the two render the same material recipes.

## Setup

React:

```sh
npm install @unlocalhosted/metalui
```

```tsx
import '@unlocalhosted/metalui/styles.css'; // once, at the app root
import '@unlocalhosted/metalui/icons.css';  // once, if you use icons
```

The package is ESM only: use `import`, not `require()`. In a Tailwind v3 app import `@unlocalhosted/metalui/styles.unlayered.css` instead of `styles.css` (the same rules without cascade layers, which Tailwind v3's PostCSS rejects). Components are client components (they carry `"use client"`), so they work in Next.js App Router.

Or copy the source into your project with the shadcn CLI (Tailwind v4): `npx shadcn@latest add https://metalui.dev/r/<name>.json`. The first install also adds `@unlocalhosted/metalui` and imports its `tokens.css` and `theme.css` into your global CSS, which is what styles the copied component; files land under `components/metalui/` in the same layout as the package, so imports between components resolve. Whole screens (blocks) install the same way as `https://metalui.dev/r/block-<name>.json` into `components/metalui/screens/<name>/`. Both routes work in Vite and Next.js (`app/` and `src/app/`). Release notes: https://metalui.dev/changelog.

SwiftUI: add the package `https://github.com/vijayksingh/metalui` and `import MetalUI`. It needs macOS 14; iOS is not supported yet.

## Global rules

- **Colorway:** set `data-mu-colorway="bone" | "graphite"` on any ancestor, or use `.metalColorway(.bone)` in SwiftUI. Without it, the system color scheme decides. Don't restyle materials with custom backgrounds, borders or shadows.
- **Signal color:** one per object, at most. Phosphor green marks intent (focus, selection, live state), never a call to action. Red is destructive only. `--mu-success` always sits beside a check glyph and `--mu-warning` beside a label or glyph, never hue alone. `--mu-photon` is for its listed places only. Status LEDs: green on, amber waiting, red failed, blue capture or link kind, off idle.
- **Feelings tints** (`.mu-tint-ember | blush | tide | spark | graphite | dusk | iris`, SwiftUI `.metalTint(.blush)`): only on glyphs that carry a feeling, or a moment with an unmistakable one (a date is affection, a party is joy). The tint names the kind of feeling (joy, affection, calm, wonder, neutral, low, tension), never its strength, which the glyph's shape shows. The tint colors the glyph's stroke, so the line itself evokes the feeling; a tinted glyph's vessel is not filled. Never red or green, never on words, never for status or intent. Off under Increase Contrast and inside `data-mu-untinted` (`.metalUntinted()`), so the glyph must read without it.
- **Motion:** it comes from the component, and reduced motion is built in. Don't add your own transitions on top. Under Reduce Motion each spring class resolves one way (`tokens.json` `springs.*.reduced`): part, object, hinge and refusal apply at once; surface and settle lose travel and fade in place; release (the press) plays as authored. Lift is two motions (T5): a hover lift rides `settle` (one step, no overshoot, still by the time the pointer leaves); a land (a drop into place) rides `object`, a stop, and rare. Web: ride `--mu-spring-<class>-d` and multiply enter or exit offsets by `--mu-travel-<class>`; `data-mu-motion="reduce"` on any ancestor forces the policy. SwiftUI: `.metalAnimation(.settle, value:)` or `MetalMotion.resolve(_:reduceMotion:)`, never `accessibilityReduceMotion` directly.
- **Choose by component name.** Only use exports listed in `components.json` and `icons.json`. Never invent names.
- **Show real outcomes.** An animation never stands in for a real result such as a save, delete or sync.

## Components

# Accordion

Sections that open in place. React: `Accordion` from `@unlocalhosted/metalui`, on Base UI Accordion. SwiftUI: `MetalAccordion` (work in progress). Headers use the `row` recipe's panel hover and sections are parted by the `rule` recipe; the `accordion` recipe adds the sizes and the motion.

## Use it for

- Secondary detail that most people skip: advanced settings, a FAQ, a long inspector split into sections.

## Don't use it for

- Content everyone needs (show it), switching between peers (use tabs), or a single show/hide (one item is fine, but keep it short).

## Anatomy

- Item: one section; engraved rules between items, inset to the text.
- Trigger: a row 40 tall, padding 12, radius 12, ui type; the set's `chevron` (12, ink2) at the end, the same glyph and turn as Collapsible's.
- Panel: the content, body type, ink2, padding 12 at the sides and 14 below.

## States and motion

| State | Look | Motion |
|---|---|---|
| closed | the header row, chevron pointing along | – |
| hover | the row lifts (row panel hover) | the row's own fade |
| opening | the panel grows to its content; content fades in | settle spring, no overshoot |
| open | chevron turned a quarter | chevron on the part spring (may overshoot its stop) |
| closing | height and content leave | release spring; chevron turns back |
| focus | the green ring on the header | – |
| disabled | 40 % | – |

Reduce Motion: the height snaps, the content crossfades, the chevron snaps.

## API

| React | SwiftUI |
|---|---|
| `Accordion.Root` `value`, `defaultValue`, `onValueChange`, `multiple` | `expanded:` |
| `Accordion.Item` `value`, `disabled` | `section:` |
| `Accordion.Trigger` (children: the title) | `title:` |
| `Accordion.Panel` (children: the content) | `content:` |

## Keyboard and accessibility

- Each header is a button in a heading; Enter or Space opens and closes it; Tab moves between headers (arrow keys between headers are optional in the pattern and not provided).
- The button has `aria-expanded` and controls its panel.

## Rules

- Title each section with what is inside ("Export options"), not "More".
- `multiple` when sections are independent; one at a time when they are alternatives.

---

# Alert

An inline message about this place: top of a form, inside a card, along the top of a page. React: `Alert` (`Alert.Root`, `Alert.Title`, `Alert.Description`, `Alert.Actions`) from `@unlocalhosted/metalui`. SwiftUI: `MetalAlert`. Sheet: `docs/sheets/alert.md`.

## Use it for

- A form that couldn't save, said above its first field (each field still carries its own error).
- A card or panel whose source is offline, or whose import is under way.
- One banner along the top of a page: a plan running out, a read-only copy.

## Don't use it for

- The result of the person's own action ("Moved 3 notes"): a **toast** (floats, leaves by itself, carries Undo).
- A lasting system state in three words with nothing to do: a **status badge**.
- A question the page can't go on without: an **alert dialog**.
- An empty place: an **empty state**.

## Kinds

Each kind is carried by the glyph's shape, the title's words and the lamp's gesture; colour is never the only cue.

| `kind` | Means | Glyph | Lamp | Read out |
|---|---|---|---|---|
| `note` (default) | worth knowing, nothing is wrong | note | none | politely (`status`) |
| `done` | finished well | check | green, steady | politely |
| `waiting` | under way; it will update | clock | amber, breathing | politely |
| `urgent` | act soon or something goes wrong | bell | amber, steady | at once (`alert`) |
| `failed` | failed or refused | sync-error | red, two blinks, then lit | at once |

No blue: blue is a link's kind. The info and warning glyphs aren't in the set yet; `note` and `bell` stand in.

## Tones and placement

| | Look | Use it |
|---|---|---|
| `tone="plate"` (default) | the status badge's raised plate, radius 16 | top of a form, on the page |
| `tone="quiet"` | no plate | inside a card or panel (one plate is enough) |
| `tone="strong"` | the plate tinted in the kind's ink; title and glyph in its deep ink | one alert per view that must be seen |
| `banner` | square ends, spanning its container, padding 20 at the sides | one per page, along its top |
| `solid` | the badge's 1 pt keyline round the plate | on frost, glass or an image; Reduce Transparency turns it on, and a quiet alert takes its plate back |

Strong on `note` is a plate.

## Anatomy

A 28 sunk window (the field well, radius 9) holding the 16 glyph, the kind's LED seated in its top right corner; 12 to the words; a title (title type, 13.5 / 600) and a description (body type, ink2), 2 apart, the title centred on the window's middle line; actions (compact Buttons, 8 apart) beside the words from 480 wide (a container query on the alert, not the viewport) and 10 under them when narrower; the close key (ghost IconButton, 28) at the end. Padding 14.

## Over time

- **Arrives** rising one nest from below, fading in, on the settle spring (T9).
- **Updates in place**: change `kind` and the glyph morphs (clock → check) while the new lamp plays its gesture from the start; change the words where they are. A count that ticks ("3 of 12") goes in `SwapText`, so it turns on the drum.
- **Resolves**: the host turns `waiting` into `done` or `failed`; the alert stays where the person was looking.
- **Dismissed**: with `onDismiss`, the close key or Esc inside the alert plays the leave (one nest down, fading, release spring), then calls `onDismiss`; remove it there. Without `onDismiss` it can't be dismissed: an error that's still true stays.
- It never leaves by itself: a message in the flow that vanishes moves the page under the reader.
- Reduce Motion: it fades in without travel, goes at once, and the glyph changes in place.

## API

| React | SwiftUI |
|---|---|
| `Alert.Root kind tone banner solid onDismiss dismissLabel` | `MetalAlert(kind:tone:banner:solid:title:description:onDismiss:actions:)` |
| `Alert.Title` | `title:` |
| `Alert.Description` | `description:` |
| `Alert.Actions` | `actions:` (`@ViewBuilder`) |

`Alert` itself is `Alert.Root`.

## Rules

- The title says the kind in words ("Couldn't save the plan", not "Error").
- The fix is an action in the alert, the one that fixes it first; at most two.
- One strong alert per view; one banner per page.
- When a dismissed alert held focus, move focus somewhere sensible in `onDismiss` (the field it was about, or the form).

## Accessibility

- `failed` and `urgent` are `role="alert"`; the others `role="status"`. The glyph and lamp are decorative (`aria-hidden`); the title carries the meaning.
- The close key is a real button named "Dismiss" (`dismissLabel`); Esc anywhere inside the alert does the same.

## Tokens

`recipes.alert` (`p-alert-pad`, `gap-x-alert-gap`, `size-alert-window-size`, `alert-body`, `alert-arrive`), the status recipe's plates and inks (`recipe-status-badge`, `recipe-status-badge-strong-<kind>`, `text-status-strong-ink-<kind>`, `outline-status-badge-keyline`), `recipe-well-field`. Swift: `MetalRecipes.alert`, `MetalRecipes.status`.

---

# Alert dialog

A question that must be answered before going on. React: `AlertDialog` from `@unlocalhosted/metalui`, on Base UI AlertDialog. SwiftUI: `MetalAlertDialog` (work in progress). The plate, scrim and layout are the `dialog` recipe's; the `alert-dialog` recipe adds the text gap, and the refusal is the system's refusal spring.

## Use it for

- Confirming something that loses work or can't easily be undone: "Delete 3 regions?", "Discard this draft?".

## Don't use it for

- Anything with Undo (just do it and offer Undo in a toast), information (use a toast), or a form (use a dialog).

## Anatomy

- Plate: the dialog's (360 wide, padding 20, near the top of the viewport) over its scrim.
- Title: the question. Description: what happens if you agree, 4 below it, body type, ink2.
- Actions: Cancel, then the confirm button last (destructive red for a loss).

## States and motion

| State | Look | Motion |
|---|---|---|
| opening | scrim and plate | the dialog's rise on the surface spring |
| open | focus on Cancel | – |
| click outside | it stays | the plate shakes once on the refusal spring, one nest (6) aside |
| Cancel or Esc | closes, nothing done | release spring |
| confirm | runs, then closes | release spring |
| confirm `hold`, pressed | the fill runs across the cap, the trash lid lifts with it | linear over the hold time (800 ms) |
| confirm `hold`, let go early | nothing runs; "Hold to confirm" (`holdHint`) fades in under the actions, said once as a status | the fill drains on the release spring |
| confirm `hold`, complete | the cap settles, the lid drops shut, it runs, then closes | object spring, then release |

Reduce Motion: no shake; the rise is a crossfade; a hold's fill still runs, with no settle and no lid travel.

Where the hold applies: only an act that can't be undone (deleting for good). A delete that goes to the past can be brought back, so its confirm stays a plain press (`hold` is off by default).

## API

| React | SwiftUI |
|---|---|
| `AlertDialog.Root` `open`, `onOpenChange` | `isPresented:` |
| `AlertDialog.Popup`, `Title`, `Description`, `Actions` | `title:`, `message:` |
| `AlertDialog.Cancel` (children: its label) | `cancel:` |
| `AlertDialog.Confirm` `onClick`, `tone` (`destructive`, `primary`) | `confirm:`, `role: .destructive` |
| `AlertDialog.Confirm` `hold`, `holdHint`, `icon` (a hold confirm leads with `TrashIcon`) | – (the system alert can't hold; use `MetalButton` `.metalHoldToConfirm` in your own sheet) |

## Keyboard and accessibility

- An `alertdialog` named by its title and described by its description. Focus is trapped inside and starts on Cancel; Esc is Cancel; focus returns to what opened it.

## Rules

- The title is the question; the confirm button says the action ("Delete regions"), never "OK" or "Yes".
- Say what is lost in the description. If nothing is lost, it is not an alert dialog.
- A click outside is refused, not obeyed: the shake says an answer is needed.

---

# Attachment

A file someone attached. React: `Attachment` from `@unlocalhosted/metalui` (named so it never shadows the browser's `File`). SwiftUI: `MetalAttachment` (work in progress). An object: the plate is the raised `surface`, the type sits in a `well`, the upload uses the progress fill; the `attachment` recipe adds the layout and the land and leave.

## Use it for

- Files attached to a note, a message or a form: before, during and after upload.

## Don't use it for

- Browsing files (use a table or a list of cards), or links (use a link card).

## Anatomy

- Plate: raised, 52 tall, filling its column from 240 to 360 wide (a list shares one width), radius 14, padding 8.
- Type: a 36 sunk well with the extension engraved (PDF, PNG).
- Name: ui type; a long name keeps its extension and cuts the middle.
- Line: meta type, ink3: the size, "Uploading · 40 %", or the error in red.
- Track (uploading): 3 tall, Progress's fill: a whole capsule slid in by transform on the settle spring (never a width, so it paints and does not lay out). Try again (failed), Remove (a mini key).

## States and motion

| State | Look | Motion |
|---|---|---|
| added | the plate | lands from one nest above on the object spring (T5b) |
| uploading | the track fills; the line counts | settle spring |
| done | the size | – |
| failed | the reason in red; Try again | announced once |
| removed | – | one nest down, fading, on the release spring (T9); then gone |

Reduce Motion: it appears and goes at once; the fill still moves.

## API

| React | SwiftUI |
|---|---|
| `name`, `size` (bytes) | `name:`, `size:` |
| `progress` (0–100 while uploading) | `progress:` |
| `error`, `onRetry` | `error:`, `retry:` |
| `onRemove` (called after it has left) | `remove:` |
| `fill` (no max width: a list as wide as its panel) | `.frame(maxWidth: .infinity)` |

## Keyboard and accessibility

- A `group` named by the file name. The progress is a named `progressbar`; a failure is an `alert`. Remove is a button named "Remove report.pdf"; move focus to a neighbour after removing.

## Rules

- Say why an upload failed in a few words ("Too large, 25 MB at most"), and offer to try again.
- Keep the extension visible; cut the middle of long names.

## Waiting

- `progress={null}` while uploading before the amount is known: a lit segment sweeps the track and the line says "Uploading"; pass the number as soon as it is known and the fill takes over.

---

# Avatar

A person, as a small raised disc. React: `Avatar` and `AvatarGroup` from `@unlocalhosted/metalui`, on Base UI Avatar. SwiftUI: `MetalAvatar` (work in progress). An object: the disc is the raised `surface`, presence is the LED part; the `avatar` recipe adds sizes, the ring and the group's spread.

## Use it for

- Showing who: an author, who is here, who something is shared with.

## Don't use it for

- Things that are not people (use an icon or a glyph), or a person's details (link to them; a preview card can show more).

## Anatomy

- Disc: raised surface, round; small 24, regular 32, large 44.
- Initials: the first letters of the first and last names, ink2, in the size's type.
- Photo: covers the disc once it has loaded.
- Presence: the LED at the lower right on a 2 ring of the page's ground.
- Group: discs overlap by 8, each ringed in the ground; past `max` (4), a +N disc.

## States and motion

| State | Look | Motion |
|---|---|---|
| loading | the initials | – |
| loaded | the photo | fades in on the settle spring |
| broken photo | the initials stay | – |
| group, hover | the discs apart | one grid step each, on the object spring |
| group, leave | back together | release spring |

Reduce Motion: the photo appears at once; the group does not spread.

## API

| React | SwiftUI |
|---|---|
| `Avatar` `name`, `src`, `size` (`small`, `regular`, `large`), `presence` (`live`, `waiting`, `off`) | `MetalAvatar(name:image:)` |
| `Avatar` `label`: its accessible name when it differs from `name` ("Assigned to Marta"); `''` when the name is written beside it (decorative, silent) | `.accessibilityLabel`, `.accessibilityHidden(true)` |
| `AvatarGroup` `people`, `max` (4), `size`, `aria-label` | – |

## Keyboard and accessibility

- An avatar is an image named by the person's name (and presence: "Ana Rocha, here"). A group is a named `group`; the +N disc says "3 more". Avatars take no focus; wrap one in a link or button when it goes somewhere.

## Rules

- Always give the name; the initials and the label come from it.
- Colour never carries presence alone: the label says it too.

## Waiting

- `waiting` (useWait's `busy`): after the show delay a short arc travels round the rim in ink2 and the disc dims; the new photo fading in is the result. Mount `Spinner.Status` beside it to say the start and the end. Reduce Motion: the rim breathes.

---

# Badge

One short fact about a thing: its kind, its version, its state, or how many are waiting. React: `Badge` and `Badge.Anchor` from `@unlocalhosted/metalui`. SwiftUI: `MetalBadge` and the `.metalBadge(count:)` modifier.

## Use it for

- A kind, a version or a role beside a name: `Beta`, `v2.4`, `Admin`, `Draft`.
- A thing's state in a row or a card, with its LED: `<Badge led="failed">Build failed</Badge>`.
- A count after a label: a tab's `Inbox 12`, a nav row, a group header.
- A count on another control's corner (a notification badge): `<Badge.Anchor count={3}><IconButton label="Inbox, 3 unread" … /></Badge.Anchor>`.

## Don't use it for

- The system's own state (sync, connection, a service): that is `StatusBadge`, which is announced when it changes and carries the fix as its hint.
- Something you remove or act on (a chosen value, a filter token, a suggestion): that is a `Chip` with `Chip.Actions` and `IconButton variant="mini"`.
- A link. A badge is not pressable; use `Link`.
- Colour for meaning. There are no tones: a state is the LED plus words.

## Badge, Chip or StatusBadge

Does it describe a thing (Badge), do you act on it (Chip), or is the system speaking (StatusBadge)?

## Anatomy

- **Stamp**: a pill cut shallow into the surface (the well's light at 18 tall: a 1 px inset shade, a .5 px hairline, a light lip under it). Never raised: raised at this size is a keycap or a status plate.
- **Words**: the engraved mono, uppercase, ink2 with the engraved lip. Regular 9.5 px / .08em; compact 8.5 px / .09em.
- **Lead** (one, optional): the LED part (6 regular, 4 compact) or a glyph (11 regular, 10 compact) in ink2.
- **Count**: the readout type, tabular (10.5 regular, 9 compact); min width equals the height, so one digit is a circle.
- **Sizes**: `regular` 18 tall (pad 7, gap 4) beside ui and body text; `compact` 15 (pad 5, gap 3) beside meta text, in dense rows and on corners. They follow the type, not the field ladder.
- **Corner cap** (`Badge.Anchor`): a compact count drawn in the other colorway (a graphite cap with light digits on Bone, a bone cap with dark digits on Graphite), ringed 1.5 in the surface colour, 5 past the control's top-right corner.

## Behaviour and motion

- A count turns on the drum (`SwapText`) when it changes: up as it grows, down as it shrinks; the footprint settles to the new width. Past `max` (99) it reads `99+`.
- The LED holds steady. When `led` changes after the first paint (queued → running → failed) it plays `flicker` once and settles lit; never on first paint, so a page of rows doesn't flicker on load.
- The corner cap comes in from 60 % on the object spring when the count leaves zero, and goes on the release spring at zero, keeping its last number as it leaves. It never shows `0`.
- Reduce Motion: the drum crossfades, the lamp changes at once, the cap fades without scaling.

## API

| React | SwiftUI |
|---|---|
| `Badge` children (words) | `MetalBadge(_ text:)` |
| `led` (`live`, `waiting`, `failed`, `link`, `off`) | `led:` (`MetalLEDKind`) |
| `glyph` (a node, usually `<Icon animate={false} />`) | `glyph:` (`MetalIconName`) |
| `count`, `max` (99), `label` | `MetalBadge(count:max:label:)` |
| `size` (`regular`, `compact`) | `size:` (`.regular`, `.compact`) |
| `Badge.Anchor count max` + children | `.metalBadge(count:max:)` |

## Rules

- Words are short: one to three words, a version, a role. A sentence is a `Label` or a notice.
- One lead: an LED or a glyph, not both.
- LED colours keep the library's meanings: green live, amber waiting or urgent, red failed, blue a link's kind, off idle; the words always say the state.
- In a table, a badge sits in its own column so the stamps line up.
- A corner count goes on a control whose label already says the number.

## Accessibility

- A plain `span`: read in place, not announced (fifty rows of live regions would talk over each other). For a state the person must hear about as it happens, use `StatusBadge`.
- The LED and the glyph are hidden; the words carry the state.
- A count reads `label` when given ("3 unread"), the number otherwise; the drum's faces are hidden so the number is read once.
- The corner cap is hidden from assistive tech: say the count in the control's own label ("Inbox, 3 unread"), because a "3" after a button names nothing.

## Tokens

`recipes.badge`: `recipe-badge` (the stamp), `recipe-badge-corner` (the cap), `type-badge-regular`, `type-badge-compact`, `type-badge-count`, `type-badge-count-compact`, `h-badge-*-height`, `badge-corner-ring`, `badge-corner-motion`, `text-badge-corner-ink`; the words' lip is `recipe-label-engraved`. Swift: `MetalRecipes.badge`.

---

# Block silhouette

A block seen from far away. React: `BlockSilhouette` from `@unlocalhosted/metalui`. SwiftUI: `MetalBlockSilhouette`. Its look is the `silhouette` recipe.

## Use it for

- Every block on the canvas when the zoom is below the far-zoom threshold (the core's `lod_policy`, 0.35). The canvas swaps blocks for silhouettes on the camera commit, never in the middle of a gesture.

## Don't use it for

- Loading placeholders or skeletons. A silhouette is a real block, seen from far.

## Anatomy, per kind

| Kind | Silhouette |
|---|---|
| text | bars where its lines are (8 tall every 22), no plate; `lines` ends them after the last line |
| code | the dark code card with light bars (7 every 20) inside, 12 padding |
| link | the dark glass with the site's tint (`color`) glowing from the top right |
| swatch | its colour (`color`) |
| image | its average colour (`color`), lit a little from the top |
| file | a light plate |
| region | its tray and its name (`label`) at 56 pt, so it reads at 35 % |

No text other than a region's name, no shadows beyond a hairline: it must stay cheap for thousands of blocks.

## States and motion

| State | Look |
|---|---|
| enter | fades in over 160 ms on settle as the zoom crosses the threshold; Reduce Motion: at once |

## API

| React | SwiftUI |
|---|---|
| `kind` | `kind:` |
| `color` | `color:` |
| `label` | `label:` |
| `lines` | `lines:` |

## Rules

- The silhouette sits exactly where its block is and is exactly its size.
- Swap at the camera commit, never during a pinch or a pan.
- Both clients use the same threshold from the core, so a shared canvas looks the same to everyone.

---

# Breadcrumbs

Where you are, as a path you can climb. React: `Breadcrumbs` from `@unlocalhosted/metalui`. SwiftUI: `MetalBreadcrumbs` (work in progress). The `breadcrumbs` recipe sets the gaps, the chevrons, the fold key and the arrival; the fold opens the `menu`.

## Use it for

- Deep, nested places: a folder in a folder, a region inside a canvas inside a space.

## Don't use it for

- A flat site (use the navigation menu), steps of a task (use a stepper), or history (use Back).

## Anatomy

- `nav` named "Breadcrumb", an ordered list.
- Levels above: links in ui type, ink2, ink on hover. The current level: ink, not a link.
- Separators: 10 engraved chevrons in ink3, hidden from assistive tech.
- Fold: past `max` (4) levels, the first stays, then a quiet "…" key (22 tall, radius 6) that opens a menu of the hidden levels, then the last two.

## States and motion

| State | Look | Motion |
|---|---|---|
| first render | the path | still |
| deeper | a new last crumb | arrives one grid step from the right, fading in, on the settle spring |
| up | fewer crumbs | the path shortens |
| folded | "…" key | its menu opens on the menu's own motion |
| focus | the green ring on a link | – |

Reduce Motion: the new crumb fades in without travel.

## API

| React | SwiftUI |
|---|---|
| `items` (`id`, `label`, `href`) | `path:` |
| `max` (4) | – |
| `renderLink(item, props)` (a router's link) | – |
| `onNavigate(item)` (a folded level chosen) | `onSelect:` |

## Keyboard and accessibility

- A `nav` landmark ("Breadcrumb") with an ordered list; the current level says `aria-current="page"`. Tab moves through the links and the fold key; the fold opens with Enter or ↓.

## Rules

- The last crumb is where you are and is not a link.
- Name levels as they are named where they live.

---

# Brush cursor

The pointer while drawing (P) or erasing (E) on the canvas. React: `BrushCursor` from `@unlocalhosted/metalui`. SwiftUI: `MetalBrushCursor` (on the Mac, an `NSCursor` image drawn from the same values). Its look is the `brush` recipe.

## Use it for

- The draw and erase tools, over the canvas only. Hide the system cursor there (`cursor: none`) and pass the pointer position.

## Anatomy

- Pen: a disc in the ink colour, diameter = stroke width × zoom (× pressure while drawing), never under `brush.min` (6); a 0.5 light ring and a 0.5 dark edge so it reads on any ink and on both colorways.
- Eraser: a dashed ring (1 pt, 3 / 2) of the eraser's diameter; dark on Bone, light on Graphite.

## States and motion

| State | Look |
|---|---|
| hover | follows the pointer in the same frame |
| drawing | the disc's size follows pressure at once |
| off the canvas | hidden (`at = null`); the system cursor returns |

No easing: the brush shows the stroke you are about to make.

## API

| React | SwiftUI |
|---|---|
| `mode` (`pen`, `eraser`) | `mode:` |
| `at` | the cursor's position |
| `size` | `size:` |
| `color` | `color:` |

## Rules

- The brush is the stroke's true size on screen, always.
- The eraser ring is the area it removes.

---

# Button

A press-in pill button. React: `Button` from `@unlocalhosted/metalui`, built on Base UI `Button`. SwiftUI: `MetalButton`, or `.buttonStyle(MetalButtonStyle(cap:))`.

## Use it for

- An action that happens right away when the user activates it: Save, New Canvas, Cancel, Delete, Export.
- A dialog footer, form submit, or row action that needs a visible, labelled control.

## Don't use it for

- Navigation to another page. Use a link.
- On/off or latched tool state. Use `Toggle` / `ToolButton`, which carry the pressed state and LED.
- Icon-only toolbar controls. Use `ToolButton` inside `Toolbar`.

## Anatomy

- The **cap** is a 32px-tall pill: 15px horizontal padding, Geist 12.5 medium (the `ui` type role), tracking −0.005em.
- The **icon** (`icon` prop) leads the label: 16 in the 32 cap, 6 before the label; 14 and 7 in the compact cap; 16 on a strip, 14 on graphite, 12 beside a link. The cap sizes it, so pass the glyph without a size.
- The **label** is text: a verb, or a verb and its object.
- **Compact** (`size="compact"`): 28 tall, 11 padding, 12 pt, a 14 glyph 7 before the label. A standard compact cap wears the button fill on `raise-sm`, ink2 until hover; a primary or destructive compact cap keeps its own fill (the composer's Send beside a compact Select). The canvas pills: "seed a sample day", "lenses ⌘K", a lens row's "Open".
- **Waiting** (`state="waiting"`): the key stays down in its pressed look, refuses presses (`aria-disabled`, still focusable) and says `aria-busy`; after the spinner's 400 ms show delay its glyph cross-fades into a turning arc in the key's own ink (white on a primary key), so a quick action never shows it. Reduce Motion: the arc breathes. `state="done"` stays held while the host shows the result ("Saved", `check`); then `ready`. The label stays the host's, turned with `SwapText`: Save → Saving… → Saved.
- **Hold to confirm** (`hold`, destructive caps only; for an act that can't be undone): pressing (pointer, or Space / Enter held) takes the key down and a darker red fill (`recipe-button-hold`) runs across it from the leading edge over `--mu-r-button-hold-time` (800 ms), linear, so it reads as time. Let go early: the fill drains on the release spring, nothing runs, and `onHoldHint` fires (a tap is the same: it only shows the hint, which the host places under the actions). At the end the cap settles once from `hold.settle` on the object spring, and `onClick` runs (the release's own click is swallowed). A `TrashIcon` as `icon` is the gauge: its held act (`acts/trash.mjs` `hold`) lifts the lid with the fill and drops it shut at the end. Reduce Motion: the fill still runs; no settle, no lid travel. A delete that goes to the past (undoable) stays a plain press.
- The **press** moves the cap down 1px (50 ms, linear), and its shadow collapses into an inner well. The release rides the `release` spring (stiffness 500, damping 40; half 71ms, near-settled 178ms). Shadows and fills cross-fade over 180ms.

## Caps that set their own size

- `link`: a mono word in green, 9 pt, tracked 0.1em, no cap and no press (READ ALL beside a readout).
- `graphite`: a 24 tall quiet light cap on graphite chrome (a banner's Back to now).
- `strip` / `strip-danger`: a 28 tall flat cap (radius 11) in a graphite tool strip; lights on hover, sinks into a dark well on press; focus is a 1.5 green ring. `strip-danger` is red.

## API

| React prop | SwiftUI | Values | Default |
|---|---|---|---|
| `cap` | `cap:` | `standard`, `primary`, `destructive`, `link`, `graphite`, `strip`, `strip-danger` | `standard` |
| `size` | `size:` | `default` (32), `compact` (28); ignored by the link, graphite and strip caps | `default` |
| `state` | `.metalButtonState(_:)` | `ready`, `waiting` (held, refuses presses, busy; the glyph turns into the arc after 400 ms), `done` (held for the result). Pass `ready` between waits so a MorphIcon keeps morphing | – |
| `hold` | `.metalHoldToConfirm(hint:onHint:)` | boolean; destructive and strip-danger caps only. `onClick` runs only after the hold time | `false` |
| `holdHint` | `hint:` | the button's description (said after its name) and the hint text | `'Hold to confirm'` |
| `onHoldHint` | `onHint:` | called when a hold is let go early: show the hint under the actions | – |
| `icon` | `icon:` (a `MetalIconName`), or the `icon:` view builder | a glyph element, such as `<ShareIcon />` or `<MorphIcon name=… />`; leads the label, sized by the cap (16, compact 14, strip 16, graphite 14, link 12) | – |
| `disabled` | `.disabled(_:)` | boolean | `false` |
| `focusableWhenDisabled` | – | boolean | `false` |
| `render` | – | Base UI render prop, for `<a>` or custom elements (set `nativeButton={false}`) | – |
| any `<button>` attribute | – | `type`, `onClick`, `aria-*` | – |

```tsx
import { Button } from '@unlocalhosted/metalui';
import { ShareIcon, TrashIcon } from '@unlocalhosted/metalui/icons';
import '@unlocalhosted/metalui/styles.css';

<Button cap="primary" onClick={create}>New Canvas</Button>
<Button onClick={close}>Cancel</Button>
<Button size="compact" onClick={seed}>seed a sample day</Button>
<Button icon={<ShareIcon />} onClick={share}>Share</Button>
<Button cap="destructive" icon={<TrashIcon />} onClick={remove}>Delete</Button>
```

```swift
import MetalUI

MetalButton("New Canvas", cap: .primary) { create() }
MetalButton("Cancel") { close() }
MetalButton("seed a sample day", size: .compact) { seed() }
MetalButton("Share", icon: .share) { share() }
MetalButton("Delete", icon: .trash, cap: .destructive) { remove() }
```

## Rules

- Use at most **one** `primary` or `destructive` cap per group. Everything else is `standard`.
- `destructive` is only for actions that remove or discard data. Pair it with confirmation when the action can't be undone.
- The label is a verb, or a verb + object, in title case. The button text itself says what happens.
- **An action names itself with a glyph and a verb.** A button that does something (save, share, export, delete, send, attach, copy, new) passes its glyph as `icon`: `<Button icon={<ShareIcon />}>Share</Button>`. A plain choice (Cancel, Done, Close as a word, OK) stays words only. Use the glyph whose act is that verb (`share`, `trash` or `send-away`, `duplicate`, `plus`, `pen` for Rename); don't borrow one that means something else.
- Pass the glyph as `icon`, not as a child, and don't give it a size: the cap sets it (16, compact 14, strip 16, graphite 14, link 12). Children still take a glyph for compatibility, but `icon` is the documented slot. The button is the icon's trigger: it plays its act when the button is hovered, focused from the keyboard or clicked, so don't wire up animation yourself.
- Don't restyle the cap with custom backgrounds, borders, or shadows. Colorway comes from `data-mu-colorway` (`bone` | `graphite`) on any ancestor. When no ancestor sets it, `prefers-color-scheme` decides.
- Don't signal success with the press motion. Show the real result: a toast, a state change, or an error.
- **A state change of the same control morphs, never swaps** (Transitions T1–T3, `docs/MORPH.md`). When one control's meaning changes (Copy → Copied, Pin → Unpin, Collapse → Expand), its glyph morphs with `MorphIcon` (from `@unlocalhosted/metalui/icons`) on the settle spring, and its label turns on the drum with `SwapText` (from `@unlocalhosted/metalui`), together: `<Button icon={<MorphIcon name={copied ? 'check' : 'paste'} />}><SwapText value={copied ? 'Copied' : 'Copy'} /></Button>`. The width settles to the new label. Only a glyph outside the morph family (a solid character glyph) turns on the drum with `SwapIcon` instead.

## Accessibility

- It renders a native `<button>`. Enter and Space activate it, and it takes part in form submission. Base UI handles the disabled state and `focusableWhenDisabled`.
- The focus ring is a 2px `--mu-focus` outline at a 2px offset, shown only for keyboard focus (`:focus-visible`).
- An icon-only Button needs `aria-label`. Icons inside labelled buttons are decorative (`aria-hidden`).
- Disabled buttons render at 40% opacity and don't play their icon motion.
- A `hold` button says the hold in its description (`aria-describedby`: "Hold to confirm"); the visible hint is announced once by its host (AlertDialog's status line), not on every frame. A click with no press before it (a screen reader's or switch's activate; SwiftUI: the accessibility action) confirms at once: those can't hold (WCAG 2.5.7's single-pointer path), and the question around the button still guards the act. `hold={false}` turns it off where pointers can't hold.
- Under reduced motion, transitions are instant. The 1px press travel stays, because it is feedback, not decoration.

## Tokens

`--mu-button-*` (sizes, press, fade, focus), `--mu-raise-sm` (compact), `--mu-btn-bg`, `--mu-btn-sh`, `--mu-pressed-bg`, `--mu-pressed-sh`, `--mu-primary-*`, `--mu-destructive-*`, `--mu-spring-release`, `--mu-focus`. Swift: `MetalButtonMetrics`, `MetalTokens.<colorway>.btnBg/btnSh/pressedBg/pressedSh`, `MetalCaps.primary/destructive`, `MetalSprings.release`.

---

# Button group and split button

Related actions as one machined bar. React: `ButtonGroup`, `ButtonGroupReadout` and `SplitButton` from `@unlocalhosted/metalui`. SwiftUI: `MetalButtonGroup` and `MetalSplitButton`. The bar and its keys are the `button` recipe; the `button-group` recipe adds the seams, the hover light, the readout window and the rocker.

## Use it for

- A few actions on the same thing, side by side: Undo · Redo; Zoom out · 100 % · Zoom in.
- `latch`: a choice that stays, as latching keys in one bar: alignment (`one`), text marks (`several`).
- `SplitButton`: one main action with a few variants: Export PDF, and a chevron for PNG, SVG, Copy link.

## Don't use it for

- More than four actions (use a toolbar or a menu), or unrelated actions that happen to sit together.
- A value you can't change in place as a key: put it in a `ButtonGroupReadout`, never a Button that does nothing.

## Anatomy

- Bar: one raised cap in the keys' material (standard, compact, or primary when the keys are primary), the outer pill radius only, clipped to it.
- Keys: Buttons (or Toggles with `latch`), bare in the bar, square inside; the end keys keep the bar's pill ends.
- Seam: 2 wide, a dark line and a light edge beside it, between every two parts; the bar draws it, so it never moves.
- Window (`ButtonGroupReadout`): the field well cut into the bar, 4 inside its edges, at least 56 wide, radius 4, tabular figures on the drum.
- Split: the main Button, a seam, a 32 wide chevron key with the set's `chevron` as a `MorphIcon`.

## States and motion

| State | Look | Motion |
|---|---|---|
| rest | one cap, seams | – |
| hover | that key's light lifts; not the bar | fade 180 ms |
| pressed | that key in the button's pressed look, down 1; seams and the rest stay | the button's press and release |
| rocker pressed | the whole cap tips 1° toward the pressed end; the key doesn't slide | part spring |
| latched | the key stays sunk with its lamp lit | the toggle's latch |
| menu open (split) | the chevron key held down; the chevron points up | the chevron turns over on its axis (a `MorphIcon` half turn, edge-on midway) on the settle spring, the way the combobox's does; a CSS spin would swing it through pointing sideways |
| focus | the green ring 2 inside the key, following the bar's ends | – |
| disabled | a key at 40 %; `disabled` sets the whole bar at 40 % and refuses | – |
| waiting | the main key held with its arc (`Button` `state`, `useWait`) | the button's wait |

Reduce Motion: the rocker and the chevron turn at once; the drum cross-fades.

## API

| React | SwiftUI |
|---|---|
| `ButtonGroup` `aria-label`, `disabled`, `rocker`, children (Buttons, a `ButtonGroupReadout`) | `MetalButtonGroup(_:cap:size:rocker:parts:)` with `.key(…)`, `.readout(…)` |
| `ButtonGroup` `latch="one" \| "several"`, `value`, `defaultValue`, `onValueChange`, children (Toggles with `value`) | `.latch(_:isOn:)` parts |
| `ButtonGroupReadout` children (the value as words) | `.readout("100 %")` |
| `SplitButton` children (the main Button; its `cap` and `size` dress the bar), `menu` (MenuItem…), `menuLabel`, `heading`, `disabled` | `MetalSplitButton(_:icon:cap:size:menuLabel:heading:items:action:)` |

The bar takes its material from the keys: give every key the same `cap` and `size`. Pass Buttons directly (no fragments) so the bar can cut a seam between each.

## Keyboard and accessibility

- A `group` named by `aria-label` (a fieldset, so `disabled` disables every key). Each key is its own tab stop; with `latch` the bar is a toggle group (arrows move, Space latches).
- The readout is a polite `status`: a step is announced. Glyph-only keys need `aria-label`.
- The chevron is a menu button named by `menuLabel`; ↓ or Enter opens the menu, Esc closes it and returns focus.

## Rules

- Keep them related: one object, one kind of action. One primary bar at most per place.
- An action names itself with a glyph and a verb (`icon`); a stepper may be glyph-only.
- When a choice changes what the main action does (the last format chosen becomes the main action), turn its words with `SwapText` and morph its glyph with `MorphIcon`; while it works, hold it with `state` from `useWait`.

---

# Calendar and date picker

A month to choose a day from (or a range, several days, a month, quarter, half year or year), and a field to type a date into or open one from. React: `Calendar` and `DatePicker` from `@unlocalhosted/metalui` (a table grid following the ARIA date-grid pattern; the picker is the library's `Field` with its calendar in the `Popover`). SwiftUI: `MetalCalendar` and `MetalDatePicker`. Chosen units take the `switcher` thumb look and hovered ones its track; the title turns on the swap drum; the `calendar` recipe adds the grid, the stretched range, today's lamp, marks and the arrivals.

## Use it for

- Choosing a day where the weekday or nearby dates matter: a due date, a trip, a booking.
- A stay or a report period: `mode="range"`, often with `months={2}`.
- Shoot days, rota days: `mode="multiple"`.
- A reporting month, quarter, half or year: `period`.
- `DatePicker` in a form, where people may know the date and want to type it.

## Don't use it for

- A time (not yet; see the backlog's Time item).
- An operator filter ("before", "between"): that is a separate date selector built on this.

## Anatomy

- Head: previous and next keys (compact caps, the set's chevron), the title between. The title is a key with a small chevron when there is a level above (days → months → years).
- Grid: weekday initials (meta type, ink3), then six rows of 32 days, 2 apart, radius 10. Week numbers (ink3) lead each row with `weekNumbers`. Larger units fill the same footprint (3 × 4 months, 2 × 2 quarters, 2 halves, 3 × 4 years).
- Today: a 4 green lamp under the number. A mark: a 4 dot beside it (ink2, or the amber / red LED).
- Range: one raised thumb per week the range covers, radius 10 at its true ends, 3 where it runs on.
- Picker: the field's regular (32) or compact (28) well; the trail holds the clear key and the calendar key. Under it, the form field's readback. The plate: presets (menu rows) beside the calendar; Today under it.

## States and motion

| State | Look | Motion |
|---|---|---|
| hover | the unit sinks a touch (the switcher's track) | – |
| chosen | the switcher's raised thumb look | lands into it on the part spring (from 0.9) |
| range, first end | that unit raised; the stretch to the pointer (or the keys) sunken | the first end lands; the preview follows the pointer at once |
| range, whole | one raised thumb across each week, flat-ish where it runs on | settles in on the part spring (fading from 0.6, from 0.85 tall) |
| out of reach | while choosing the second end, units outside `minDays` / `maxDays` at 40 %, disabled | – |
| several | each chosen unit its own thumb; pressing again lets it go | lands |
| later page | title turns up; the grid comes from the right | drum and settle spring, fading in |
| earlier page | title turns down; the grid comes from the left | the same, mirrored |
| level up (title) | the months of the year, or the years; where you were stands raised | comes in from 1.06 on the settle spring, fading in |
| level down | back to the unit chosen (or where you were, with Esc) | comes in from 0.94 |
| focus | the green ring on the unit | – |
| marked | a dot beside the number, said as the unit's description | – |
| unavailable | `isDateUnavailable` days in ink3, described "Unavailable"; still focusable and choosable | – |
| out of range | before `min` or after `max` at 40 %, disabled; the steps stop | – |
| picker typing | the readback says what was understood ("Wed, 7 Oct 2026") | the drum; the row opens like an error's |
| picker left | understood: written in the reader's words. Not: the invalid ring, and the input's validity message | – |
| picker dial | ↑ ↓ step the part under the caret and select it | the field's |
| picker chosen | the popover closes; focus returns to the field | the popover's |

Reduce Motion: the grid arrives, the choice and the range land at once; the fades stay.

## API

| React | SwiftUI |
|---|---|
| `Calendar` `value`, `defaultValue`, `onValueChange`: a `Date` (single), `{ start, end }` (`mode="range"`; `end` null until the second press), `Date[]` (`mode="multiple"`) | `MetalCalendar(_:selection:)` with `Date?`, `MetalDateRange?` or `Set<Date>` |
| `period`: `day`, `month`, `quarter`, `half`, `year` (values are the unit's first day; a range's end its last day) | `period:` |
| `minDays`, `maxDays` (range, in the period's units, both ends counted) | `minDays:`, `maxDays:` |
| `month`, `onMonthChange` (controlled), `defaultMonth` | `month:` binding |
| `months` (pages side by side) | `months:` |
| `min`, `max` | `in:` |
| `isDateUnavailable(date)` | `isUnavailable:` |
| `marks(date)` → `{ label, tone?: 'amber' \| 'red' }` | `marks:` → `MetalDayMark?` |
| `weekStartsOn`, `weekNumbers`, `locale` | `weekStartsOn:`, `weekNumbers:`, the environment's locale |
| `DatePicker` the options above plus `mode` (single, range), `presets`, `today`, `placeholder`, `format`, `size`, `required`, `name`, `readOnly`, `disabled`, `invalid`, `readback`, `aria-label` | `MetalDatePicker(_:selection:)` |

`DatePicker`'s `onValueChange` hears `null` when the field is cleared. `name` sends ISO 8601 in a hidden input (`2026-10-07`, or `2026-10-01/2026-10-07`).

## Keyboard and accessibility

- A `grid` named by its page ("September 2026", "2026", "2020 – 2029"). One unit is in the tab order; arrows move by unit and row, Page Up / Down by page (with Shift, by year), Home / End to the row's ends, Enter or Space chooses. Days are named in full ("Wednesday, 30 September 2026"), quarters with their months ("Q3 2026, July to September"); today says `aria-current="date"`; chosen units (and every day of a whole range) are `aria-selected`; range and several grids are `aria-multiselectable`.
- The title key says what it opens ("September 2026, choose a month"); Esc in a level above goes back down without leaving a popover.
- Marks and "Unavailable" are the unit's description. Week numbers are row headers ("Week 40").
- The picker's input is the control (a FormField labels it and shows its errors); the calendar key is "Choose a day" ("Choose dates" for a range); Alt ↓ opens it from the input; closing returns focus to the input.

## Rules

- The week starts where the reader's locale starts it, unless the host has a reason (`weekStartsOn`).
- Say the range: disable what can't be chosen rather than refusing it after; a typed day outside is refused with the range in words.
- Only what is chosen stands raised; a preview sinks.
- Every level keeps the footprint: six rows of days, and the same box for months and years.

---

# Card

A person's thing, held on a raised plate. React: `Card` from `@unlocalhosted/metalui`. SwiftUI: `MetalCard`, `MetalCardFrame`, `MetalCardChoice`, `MetalCardEmptySlot`. An object: the plate is the raised `surface`; the `card` recipe adds the layout, sizes, the hover lift, the selected ring, the choice latch and the frame. For a link with its site's preview, use the link card; for code, the code card.

## Use it for

- One thing among several of its kind: a document, a project, a place, a person's saved item.
- A result in a list (horizontal, square media at the start).
- A choice whose options need more than a label: a plan, an add-on (choice cards).
- A frame of them: peers to compare (separated), the parts of one whole such as a settings page (stacked), or cards on the page (ghost).

## Don't use it for

- Grouping controls (use a fieldset or a section), or a single block of page text (no plate needed).
- A choice a label says well enough (use a radio group or checkboxes).

## Anatomy

- Plate: raised surface, the card radius (24), padding 16 (compact 12), parts 6 apart (compact 4).
- Media (optional): bleeds to the plate's top edges, 160 tall (compact 120). Horizontal: a square at the start, 72 (compact 56), inside the padding, its radius concentric with the plate's (24 − padding).
- Title (title type, an h3 by default); with `href`, its link stretches over the whole card.
- Status (optional): an LED at the end of the title's line, in an 18 box (the title's line).
- Action (optional): a ghost icon key (`more`) level with the title's first line, reaching 5 into the padding, above the stretched link.
- Description (body type, ink2); Footer: actions, 12 apart (compact 8), above the stretched link.
- Choice: the latch's 4 pt green LED (the LED part's live lamp), 12 in from the top and end corner.
- Frame: separated is the field well, padding 8 (compact 6), cards 8 apart (compact 6), radius card + padding; stacked is one raised plate, sections between engraved hairlines (the rule's groove, inset by the padding); ghost is a grid with no tray. Columns fill by a 200 minimum; side cards make one column.
- Empty slot: the track well (a step deeper than the tray), card radius, at least 120 tall, plus and a verb in ink2.

## States and motion

| State | Look | Motion |
|---|---|---|
| rest | the raised plate | – |
| hover (with a link) | one grid step up, a larger shadow | settle spring (the hover lift) |
| pressed | back down | press time |
| focus | the green ring round the card | – |
| selected | the green ring, 3 out | – |
| without a link | still | – |
| status | live green steady, waiting amber breathing, failed red two blinks | the LED's gesture |
| waiting | a lit edge round the border after the show delay | spinner edge (useWait timing) |
| choice pressed | the seated look, 1 down | press time, linear |
| choice chosen | the seated look (flush, shaded rim), 1 down, the green LED | release spring; the LED settles in |
| choice released (another chosen) | back up to the raised plate, the LED out | release spring |
| choice disabled | 40 % | – |
| section (stacked) | no plate of its own; a hairline above all but the first; the plate clips its corners | never lifts; a linked one washes on hover (settle) |
| empty slot hover / focus | ink to ink1 / the green ring | fade |

Reduce Motion: no lift (the shadow still grows); a choice still seats its 1 pt, a key's depth on the release spring, as the tool key's; the waiting edge breathes in place.

## API

| React | SwiftUI |
|---|---|
| `Card` `selected`, `waiting`, `status` (live, waiting, failed), `statusLabel`, `size` (regular, compact), `orientation` (vertical, horizontal), `render` | `MetalCard(_ title, description:, selected:, waiting:, status:, statusLabel:, size:, orientation:, action:, open:)` |
| `Card.Media` (an image's attributes) | `media:` (a trailing closure; a footer without media passes `media: { EmptyView() }`) |
| `Card.Title` `href`, `render` (a router's link), `level` (3) | the title, the link with `open:` |
| `Card.Action` `label`, `icon` (`more`), `onClick` | `action: MetalCardAction(label, icon:) { … }` |
| `Card.Description`, `Card.Footer` | `description:`, `footer:` |
| `Card.Frame` `variant` (separated, stacked, ghost), `size`, `orientation` (horizontal: one column of side cards) | `MetalCardFrame(_ variant, size:, orientation:) { … }` |
| `Card.Choices` `value`, `onValueChange`, `multiple`, `render` (`<Card.Frame />`) | `MetalCardChoices(selection:)` / `(selections:) { MetalCardFrame { … } }` |
| `Card.Choice` `value`, `disabled`, `waiting`, `size`, `orientation` | `MetalCardChoice(_ title, description:, value:, waiting:, size:)` |
| `Card.EmptySlot` (the verb as children), `onClick` | `MetalCardEmptySlot("New canvas") { … }` |

## Keyboard and accessibility

- An `article`. With `href`, the title is the card's one link (Tab reaches it; the whole card is its hit area); the corner action and footer actions are separate buttons after it. The card shows the focus ring when its link has focus. Never nest a button inside the link.
- Status: the LED is `role="img"` named by its word ("Failed", or `statusLabel`: "Deploy failed"), and the word is its tooltip on hover. Never colour alone: the word and the gesture carry it too. Keep the meanings: green live, amber waiting, red failed.
- Choice cards are Base UI radios (one Tab stop; arrows move and choose) or, with `multiple`, checkboxes (each a Tab stop; Space toggles). The card's text is its name. A choice card holds no link and no other button.
- Empty slot: a button named by its verb ("New canvas"); the plus is decorative.
- Waiting: `aria-busy` on the card or the choice.

## Rules

- One link per card; everything else is an explicit action in the corner or the footer.
- Only cards that go somewhere move; a stacked section never lifts.
- Status is for a wall of cards scanned for trouble, not decoration: use `status="waiting"` for the thing's state (queued) and `waiting` for the card's own work under way.
- A choice card latches like the tool key: down, seated, the green LED. Don't add the selected ring to it.
- The frame says the relation: separated for peers, stacked for parts of one whole, ghost when the page is enough. One radius, no custom spacing, no ornament.
- An empty slot sits where the new card will go (last in a separated or ghost frame); say the verb.

## Waiting

- `waiting` (useWait's `busy`): aria-busy, and after the show delay a lit edge travels round the card's own border in its ink (never a spinner in its middle). Say what is happening in the card's words ("Lifting the subject…", then "Still …" from `wait.still`), mount `Spinner.Status` beside them, and hand over to `Progress` once the amount is known (drop `waiting`). Reduce Motion: the edge breathes. The edge follows every variation: a compact card, a horizontal one (edge to edge, round the media too), a choice card (it stays chosen while it waits) and a stacked section (its own rectangle).

---

# Checkbox

The dimple checkbox. React: `Checkbox` (earlier `Dimple`) from `@unlocalhosted/metalui`, on Base UI Checkbox. SwiftUI: `MetalCheckbox` (earlier `MetalDimple`).

## Use it for

- A task's checkbox in the margin of a line of text; a row's checkbox in a list of tasks.
- `ghost`: a task that was inferred, not written (a hollow ring hanging in the margin).
- `doing`: in progress (a half-filled green square, announced as mixed).

## States and motion

| State | Look | Motion |
|---|---|---|
| rest | a recessed well, 16, radius 6 | – |
| hover | the well darkens a step | 160 ms |
| checked | a dark pressed key; a pen draws the white tick on | the check glyph's tick, drawn along its route: a 40 ms beat (`tick.delay`), the short leg into the corner (`tick.down`, 90 ms, ease-press), a dwell at the corner (`tick.pace`, 30 ms), then the long leg on the part spring, overshooting a little at the tail and settling back to the tip |
| unticked (from checked) | the tick draws back from the tail to the corner and out, then the key goes light | `tick.withdraw` (140 ms, shared by the legs' lengths, ease-press) with the same dwell at the corner, then the 160 ms fade |
| doing | a half-filled green square inside the well | – |
| mixed (a group parent, some ticked) | the dark key with a white dash: the tick laid flat across its width | the dash draws left to right on the part spring (no dwell: the pen only pauses where it turns); mixed → checked bends the dash into the tick on the settle spring, and back; mixed → unticked withdraws it right to left |
| ghost | a hollow 14 ring, radius 5; hover: a green ring | 160 ms |
| row (`size="row"`) | 14, radius 5, the same tick at 14; in flow at the start of a list row | as above |
| pressed, unticked | the dark on look (the press points at the result) | 50 ms; the tick draws on release; dragging off cancels |
| pressed, ticked | the key stays dark | release draws the tick back, then the key goes light |
| disabled | 40 % | – |

Interrupted (ticked again mid-withdraw, say), the pen starts from the length on screen. Reduce Motion: the tick or dash is whole, or gone, at once; the key's colour still fades.

## The tick

The tick is the icon set's `check` tick (`icons/src/acts/check.mjs`, read into `icons/tick.generated.ts` and `MetalTickRoute`), drawn on the 24 grid across the whole well, so it is the same mark as the `check` icon at 16 or 14. Its pen is `tick.pen` (2.4 grid units: 1.6 pt at 16). `tick.rotate` turns it about its corner (0 by default). Durations and curves are tokens: `tick.delay`, `tick.down`, `tick.pace`, `tick.withdraw`, `--mu-ease-press` and the part and settle springs; in a group, the pen also waits for its key's cascade delay.

## Keyboard and accessibility

- Space toggles; the focus ring is the 2 pt green ring at offset 2.
- Give it an accessible name (`aria-label`: the task's text). `doing` announces as mixed.
- Ticking is a person's action: the host writes the change and offers Undo.

---

# Checkbox group

Several independent choices in a form. React: `CheckboxGroup` from `@unlocalhosted/metalui`, on Base UI CheckboxGroup, using the row-size `Checkbox`. SwiftUI: `MetalCheckboxGroup` (work in progress). The checkboxes are the `checkbox` recipe; the `checkbox-group` recipe adds the rows and the cascade.

## Use it for

- Choices that can each be on or off together: "Include notes · photos · links".
- A parent row ("All") when people often want everything or nothing.

## Don't use it for

- Tasks in text (use the margin checkbox), one choice of several (use a radio group), or settings that apply at once (use switches).

## Anatomy

- Row: the 14 checkbox and its label 8 apart, at least 28 tall; the whole row is the hit area.
- Parent (optional): the first row; items under it are indented 22.
- Rows 2 apart.

## States and motion

| State | Look | Motion |
|---|---|---|
| unticked / ticked | the checkbox's well / dark key with a tick | the checkbox's own: 160 ms fade; a pen draws the tick (a 40 ms beat, the short leg, a dwell at the corner, the long leg on the part spring) and draws it back before the key goes light |
| parent, some ticked | the dark key with a white dash (mixed) | the dash draws left to right on the part spring; mixed ↔ all bends the dash into the tick (and back) on the settle spring |
| parent ticked | every row ticks | a cascade from the top, one row every 30 ms; each tick draws a beat after its own key goes dark |
| parent cleared | every row clears | together: every tick withdraws at once, then the keys go light |
| disabled | the row at 40 % | – |

Reduce Motion: no cascade; ticks and the dash are whole, or gone, at once.

## API

| React | SwiftUI |
|---|---|
| `CheckboxGroup` `value`, `defaultValue`, `onValueChange`, `allValues` (needed for a parent; sets the cascade order) | `selection:` |
| `CheckboxGroup.Parent` (children: its label) | `all:` |
| `CheckboxGroup.Item` `value`, `disabled`, children (the label) | `options:` |

## Keyboard and accessibility

- Each checkbox is its own tab stop; Space ticks. The parent announces mixed when some are ticked. Wrap the group in a fieldset with a legend (or give it `aria-labelledby`) so the choices have a name together.

## Rules

- Labels say what is included, in the same form: "Notes", "Photos", "Links".
- A parent only when "all" is a real, common choice.

---

# Chip

A small pill. React: `Chip` with parts `Chip.Root`, `Chip.Lead`, `Chip.Text`, `Chip.Actions`. SwiftUI: `MetalChip { lead: … text: … actions: … }`.

## Variants

- `suggestion`: 20 tall, frosted, a green hairline and a small raise; a question in `Chip.Text`, a confidence `Label`, and `IconButton variant="mini"` actions (✓ accept, × dismiss).
- `glass`: an 18 tall tag on a glass screen in the colorway (light on Bone, dark on Graphite), backdrop-blurred; `Chip.Lead led` for its LED: the LED part's lamp (socket, glow) at 5 pt, in one of its kinds (`link` for a link's kind, `off` for a kind with no state, as the code card's tag). No other colours.
- `glass-action`: an 18 tall light cap on glass (`as="a"` for a link out), brighter on hover.
- `tag`: a 15 tall engraved mono tag in a hairline pill (a derived #tag); no fill.

## Behaviour

- The chip itself is not a control; its actions are. A `glass-action` rendered `as="a"` is a link: give it `href`, `target="_blank"` and `rel="noopener noreferrer"`.

## Waiting

- `waiting` (useWait's `busy`): the chip is held and dims except the part holding a `Spinner`; put `<Spinner size="small" phase={wait.phase}>` around its glyph as a direct child (not inside `Chip.Lead`, which is hidden from assistive tech, so the ring's status is heard).

---

# Code card

Code as a glass object. A custom block: `GlassFace` with a dark screen of numbered, tinted lines and a `Chip` tag. React: `CodeCard` (and `tintCode`) from `@unlocalhosted/metalui`. SwiftUI: `MetalCodeCard`.

## Use it for

- A fenced block of code placed on a canvas: `● CODE · SWIFT · 6 LINES` over the lines.

## Don't use it for

- Inline code in prose, or an editor. It shows code; it does not edit it.

## Anatomy

260 to 460 wide: `GlassFace` (bezel 6, radius 22; screen radius 16 with its glare). The screen pads 30 / 14 / 12 over a radial of `#26282C` into `#0F1011`. `Chip variant="glass"` with a code `Led` at 10 / 10. The code is 11 mono at 1.62, tracked -.01em, `#D7D8DB`; numbers 18 wide in `#48494E`; keywords `#E7A6D9`, types `#E7C98A`, strings `#9FE3BF`, comments `#6D6E73`, numbers `#9EC2FF`. At most 18 lines show; the tag counts all.

## Why custom

The tinted code is drawn by no component. The bezel, glare and tag are `GlassFace` and `Chip`.

## API

| React | SwiftUI | Notes |
|---|---|---|
| `code` | `code:` | |
| `lang` | `lang:` | in the tag, uppercase |
| `maxLines` | `maxLines:` | default 18 |
| `tag` | `tag:` | the host's words; default CODE · LANG · N LINES |

`tintCode(code, maxLines)` returns the escaped, tinted HTML the card renders.

## Tokens

The code-card recipe (screen, code, tint, chip inset), the glass-face and chip recipes.

## Diff fences

A fence tagged `diff` tints whole lines: added lines a faint green band with a green `+`, removed lines a faint red band with a red `-`, context lines plain; `+++` and `---` headers are context. Pass the core's classes (`diff`, one per line, from the fence's `classes`) so both clients tint the same lines; without them the card classes the lines the core's way.

---

# Collapsible

Show and hide in place, on its own. React: `Collapsible` from `@unlocalhosted/metalui`, on Base UI Collapsible. SwiftUI: `MetalCollapsible`, `MetalCollapsibleKey`, `MetalCollapsiblePanel`. The row uses the `row` recipe's panel hover; the `collapsible` recipe adds the sizes, the chevron's turn and the reveal. A component: a control you operate; what it holds can be anything.

## Use it for

- One section most people skip, on its own: "Advanced" in a card, "More options" under a form.
- Opening detail from a key beside a line that already names it ("Ana starred 3 repositories").
- The rest of a list: five tags and "Show 3 more".

## Don't use it for

- Several sections in a stack where one replaces another: use `Accordion`.
- Switching between peers: use `Tabs`. Content everyone needs: show it.
- A sideways collapse: `SplitPane` and `Sidebar` own that.

## Anatomy

- Root (`Collapsible`): holds the trigger and the panel; `open`, `defaultOpen`, `onOpenChange`, `disabled`.
- Trigger: a row 32 tall (level with a regular field), padding 12, radius 10, ui type in ink; the title, an optional `summary` in meta type and ink3, and the set's `chevron` (14, ink2) at the end. The row's hover plate hangs 12 past the column on both sides, so the title lines up with the content it opens.
- Key: a ghost `IconButton` with the chevron; `label` says what it shows.
- More: a quiet key 28 tall after the panel, ui type in ink2 (ink on hover); "Show 3 more" (`count`, or `more` for other words) turning on the drum to "Show less" (`less`); the chevron after the words; it hangs 8 so its words line up with the list.
- Panel: what opens. It adds no padding: the host lays out what it holds. `keepMounted` keeps what was typed while it is closed; `hiddenUntilFound` lets the page's search find and open it.

## States and motion

| State | Look | Motion |
|---|---|---|
| closed | the row with its summary; the chevron points along (a quarter turn back), or down for More | – |
| hover | the row lifts (row panel hover) | the row's own fade |
| opening | the panel takes its place at once and is uncovered from its top edge as it slides out from one nest above, fading in; everything after it travels down in step | settle spring, no overshoot |
| open | chevron down (row, key) or up (More); the summary has faded; More says "Show less" | chevron on the part spring (may overshoot its stop); the words turn on the drum |
| closing | it slides back under its trigger, fading; what follows travels up into the gap in step; then the panel goes | release spring |
| focus | the green ring | – |
| disabled | 40 %, still focusable | – |

Only clip, transform and opacity move: never height. A plate around it (a Card, a settings card) takes its new size at once: opening, the room is there first and fills from the top; closing, the content slides away first and the plate closes after.

Reduce Motion: the content crossfades in place, nothing slides or travels, the chevron snaps. The drum crossfades.

## API

| React | SwiftUI |
|---|---|
| `Collapsible` `open`, `defaultOpen`, `onOpenChange`, `disabled` | `isOpen:` binding; `.disabled()` |
| `Collapsible.Trigger` (children: the title) `summary` | `MetalCollapsible(_ title:, isOpen:, summary:)` |
| `Collapsible.Key` `label` | `MetalCollapsibleKey(_ label:, isOpen:)` |
| `Collapsible.More` `count`, `more`, `less` | `MetalCollapsible(isOpen:, more: .count(3))` |
| `Collapsible.Panel` `keepMounted`, `hiddenUntilFound` | `MetalCollapsiblePanel(isOpen:)` |

## Keyboard and accessibility

- Every trigger is a button with `aria-expanded` and `aria-controls` (Base UI); Enter or Space opens and closes it; the Tab order doesn't change.
- A row trigger's name is its title and its summary. A key's name is its `label`.
- `hiddenUntilFound`: the browser's find opens a closed panel that holds the match, without motion.

## Rules

- Title it with what is inside ("Export options"), never "More"; the summary says what it's set to.
- Inside a settings card, the row's own key opens it (only its control acts); don't make the whole settings row a button.
- Nesting needs nothing: put the inner collapsible in the outer panel.
- Several stacked sections, one at a time: that's `Accordion`.

---

# Combobox

Type to find one of many, or several. React: `Combobox` from `@unlocalhosted/metalui`, on Base UI Combobox. SwiftUI: `MetalCombobox`. The well and its mini keys are the field's (`Field.Icon`, `Field.Trail`, `Field.Key`); the plate and rows are the `menu` recipe with its gliding highlight; rows use `Row`'s slots; several values are `Chip`s with an `IconButton` mini remove; loading is the `Spinner` ring on the `useWait` clock. The `combobox` recipe adds the fit, the detail rows, the sticky labels, the chips' well and the chip's material.

## Use it for

- One value from a long list people know by name: a city, a person, a font, a time zone.
- Several values from a list that can grow: labels, people on a thread (`multiple`, `onCreate`).
- A picker in a toolbar or a row, where a field would be too much (`trigger="button"`: Assign, Kind).

## Don't use it for

- A short list (use a select), commands only (use the command palette), or free text with no list (use a field). A value that isn't in the list at all is Autocomplete, not this.

## Anatomy

- Well: the form field's, `size` regular (32, the default) or compact (28), at least 220 wide; led by the `search` glyph; ui type. The trail holds the field's mini keys: clear (`close`), once there is something to clear, and a chevron key that opens the whole list.
- Plate: the menu's frosted plate, as wide as the well, 6 below it; 7 rows tall, then it scrolls.
- Rows: the menu's rows under one gliding highlight; the typed letters in ink, the rest of the label in ink2. A row may lead with a glyph or an avatar (`icon`) and carry a second line in meta type, ink2 (`description`): such rows are 6 taller at each edge. The chosen row ends in a `check`.
- Group labels: the menu's engraved heading, sticky at the plate's top while their rows scroll.
- After the matches, behind hairlines: a `plus` row "Create "…"" and then command rows, each with its glyph.
- Quiet line (ink3): No matches for "…", Searching…, or "211 more matches; type to narrow" past `limit` (100).
- Chips (`multiple`): frosted, a neutral hairline (not the suggestion's green), 20 tall, 4 apart, a mini remove key; the query keeps at least 64; the well grows a line at a time and its glyph and keys stay on the first line.
- Button (`trigger="button"`): a standard cap (compact under `size="compact"`), 160 to 260 wide, the pick (its glyph or avatar first) or the placeholder in ink3, and a chevron. The plate is at least 260 wide, aligned to the cap's start, with a regular search well at its top.

## States and motion

| State | Look | Motion |
|---|---|---|
| rest | the well, its search glyph and placeholder | – |
| typing | the plate opens; rows filter; the typed letters stand in ink | the plate fades in on settle; rows change at once; the plate's height settles to the new count |
| moving | one row highlighted | the highlight glides on settle |
| open | the chevron points up | the chevron morphs (one glyph turning) |
| chosen | the field holds the value; a pick with a glyph shows it in the well's leading slot | the plate fades out on release; the glyph morphs from search |
| clearable | the clear key shows | the field key's pop |
| before typing, with `recent` | "Recent" and its rows first, the rest after | – |
| loading (`loading`) | after the show delay the ring stands in the clear key's place; rows stay, dimmed to the spinner's item look (0.5); with no rows, Searching… | the wait's clock (delay 400, minimum 600) |
| failed (`failed`) | one row: `sync-error`, "Couldn't load", Try again; ↩ or a click calls `onRetry` | – |
| nothing matched | No matches for "lisb" | – |
| several, pick | a chip lands; the query and the plate stay | the chip lands on the object spring, one nest from above |
| several, remove | Backspace on an empty query rings the last chip; a second Backspace (or its ×) removes it | the chip leaves one nest down on the release spring; then the value changes |
| focus | the flush green ring on the well (on a chip, its own ring) | – |
| invalid | the foundation's invalid ring; aria-invalid | – |
| disabled | 40 % | – |

Reduce Motion: the height snaps, chips come and go at once, glyphs change in place; the fades stay.

SwiftUI: the plate is an overlay under the well (give the combobox room below, or it draws over what follows; it raises its own z-index while open); from a button it is a popover. The pick's glyph and the chevron change in place (SwiftUI has no glyph morph yet: the chevron turns by rotation). Recent shows whenever the plate opens on an empty query.

## API

| React | SwiftUI |
|---|---|
| `items`: strings, `{ value, label, description?, icon?, disabled? }`, or `{ label, items }` groups | `items:` (`MetalComboboxItem`, with `person:` for an avatar) and/or `groups:` (`MetalComboboxGroup`) |
| `value`, `defaultValue`, `onValueChange` (one value or `null`) | `selection:` (`String?`) |
| `multiple` with `value` / `onValueChange` as arrays | `selections:` (`[String]`) |
| `placeholder`, `aria-label`, `emptyText` (string or `(query) => string`) | `prompt:`, the label |
| `size` (`regular`, `compact`), `invalid`, `disabled` | `size:`, `invalid:`, `.disabled()` |
| `onQueryChange`, `filter={false}` (your own search), `loading`, `failed`, `onRetry` | `query:` (a binding), `filter:`, `loading:`, `failed:`, `onRetry:` |
| `recent` (values) | `recent:` |
| `onCreate(label)`: return the new value to choose it | `onCreate:` |
| `actions`: `{ id, label, icon, onAction }[]` | `actions:` (`MetalComboboxAction`) |
| `limit` (100) | – |
| `trigger` (`field`, `button`) | `trigger:` (`.field`, `.button`) |

## Keyboard and accessibility

- A combobox input with a listbox; ↑ ↓ move the highlight, ↩ chooses, Esc closes, typing filters. The chevron key ("Show all") opens the list. Name it with a visible label or `aria-label`.
- Several values: ← from the start of the query or Backspace on an empty query moves to the last chip; ← → move between chips; Backspace or Delete removes the focused one; typing returns to the query.
- From a button: the cap is the combobox and carries the name; the search inside the plate is named "Search <name>".
- Loading sets aria-busy on the input and the plate; the ring says "Searching" once, politely.

## Rules

- Filter as people type; never make them press a button to search. A search you run yourself sets `filter={false}` and `loading` while it runs.
- The plate grows and shrinks with the matches; it never jumps.
- Tell the three empties apart: loading keeps the rows, a failure offers Try again, nothing matched says the query back.
- Create and commands come last, behind a hairline, each with its glyph; they never become the value.
- Give items with the same name a `description` (or an avatar) so they can be told apart.
- Pass `trigger="button"` for pickers in toolbars and rows; keep the field for forms.

---

# Command palette

⌘K: lenses and actions in one field. React: `CommandPalette` from `@unlocalhosted/metalui` (Base UI Dialog around an inline Base UI Combobox). SwiftUI: `MetalCommandPalette` with `MetalCommandPaletteItem`. Sheet reference: the object sheet; 

## Use it for

- Asking the canvas a question (a lens: "open tasks", "#poster", "this week"), jumping to a block, and running any command by name.
- The one place every action with a key is discoverable: show its key on the row.

## Don't use it for

- Picking a value in a form (use a select or combobox field).
- Confirming a destructive action: the palette runs it; the result carries Undo in a toast.

## Anatomy

- **Scrim**: the page at .25 behind; a click on it closes.
- **Plate**: 560 wide (to 32 short of the window), the plate frost (`.mu-frost-plate`, raise), radius 24, padding 6, 16 % down the window.
- **Field**: a 44 well, radius 17, a 15 search glyph in ink3, the query in the content role (15) with a green-deep caret, a `⎋` keycap at the right.
- **Section**: a label engraving and its count: LENS, LENSES, BLOCKS, ACTIONS.
- **Row**: 36 tall at the row radius (12), the ui role, a 14 glyph in ink2, the label (matches weight 650 with a 1.5 green underline), a keycap or a readout engraving at the right. Destructive rows are red.
- **Selected row**: a raised cap (`--mu-row-on-bg`, `raise-sm`) with a 2.5 green-deep bar at the left.
- **Footer**: `↑ ↓ MOVE · ↩ OPEN · ⇧↩ PIN` in keycaps and engravings over an engraved rule; where answers come from at the right ("NATURAL LANGUAGE VIA SYNC" or "SYNC OFFLINE · KEYWORDS ONLY").

## States and motion

| State | Look | Motion |
|---|---|---|
| opens | plate over the scrim, focus in the field | rises one nest (y −6, .985) on surface; Reduce Motion: fades |
| typing | rows refilter; the first row is selected | instant |
| ↑ ↓ / hover | the selection moves (hover moves it too) | instant |
| ↩ | runs the selected row, closes | closes on release |
| ⇧↩ | runs it pinned (a lens kept as a region) | – |
| ⎋ / scrim | closes, nothing runs | release |
| empty | "Nothing matches" in ink3 | – |

## API

```tsx
const [open, setOpen] = useState(false);
const [q, setQ] = useState('');
const rows: CommandPaletteItem[] = [
  ...(q ? [{ id: 'lens:' + q, section: 'LENS', label: `See “${q}”`, icon: <SearchIcon size={14} />, hint: 'RULES' }] : []),
  { id: 'open-tasks', section: 'LENSES', label: 'open tasks', icon: <TaskIcon size={14} /> },
  { id: 'undo', section: 'ACTIONS', label: 'Undo', icon: <UndoIcon size={14} />, hint: <Kbd size="small">⌘Z</Kbd> },
  { id: 'clear', section: 'ACTIONS', label: 'Clear Canvas', icon: <TrashIcon size={14} />, danger: true },
];
<CommandPalette open={open} onOpenChange={setOpen} query={q} onQueryChange={setQ} items={rows}
  icon={<SearchIcon size={15} />} status="NATURAL LANGUAGE VIA SYNC"
  onRun={(item, { pin }) => run(item.id, pin)} />
```

Rows of one section must be adjacent. The palette filters by every query word against `label` and `keywords`; pass `filter={false}` when the host ranks rows itself.

## Rules

- A row that has a key shows it; a destructive row is red and its result has Undo.
- Say where answers come from in the footer; never hide that Recognizer is offline.
- The selection is instant: rows are scanned, not watched.

## Accessibility

- Dialog with a label; the field is a combobox and the list a listbox (Base UI): arrows move `aria-activedescendant`, ↩ runs, ⎋ closes and focus returns to the trigger.
- Sections are groups labelled by their engraving. Keycaps speak their names (`⎋` "Escape").

## Tokens

`--mu-palette-*`, `--mu-row-on-bg`, `--mu-scrim`, `.mu-frost-plate`, `--mu-well*`, `--mu-raise-sm`, `--mu-engrave`, `--mu-green-deep`, `--mu-red`, `--mu-spring-surface`, `--mu-travel-surface`. Swift: `MetalPaletteMetrics`, `MetalFrost.plate`.

---

# Connector

A line between two blocks, and everything around it. React: `Connector` from `@unlocalhosted/metalui`. SwiftUI: `MetalConnector` (not yet).

## Use it for

- A line or arrow whose ends land on two blocks (the core's `ink_endpoints`), per DRAWING.md DR-07.
- `look="current"` or `"stardust"` to show that something flows between two blocks.

## Don't use it for

- Plain strokes that touch no block.
- Current or stardust on every line: they animate all the time. Elastic is the default.

## Looks

| Look | What it is |
|---|---|
| elastic (default) | a taut band; its middle rides a spring (k 170, damping 13), so the line bends behind a moving block and whips back with one overshoot. Arrowheads show the flow. Still when settled. |
| current | a quiet line (28 %) with comets of light: each leaves the source slowly, speeds up, slows into the target, which glows as it lands. Quickens while a block moves. |
| stardust | 34 drifting, twinkling motes along the line; a shimmer runs in the flow's direction. Hover or select: the motes pull into a line. |

`flow`: `forward` (from → to), `backward`, `both`.

## Chrome

| State | Look | Motion |
|---|---|---|
| rest | the line and label | – |
| hover | green halo; end dot 4.5, solid (attached) or hollow (free) | part spring fade |
| selected | halo; end handles 5 | – |

The line is world ink (scales with zoom); halo, dots, handles, hit band (18) and label keep their screen size. Reduce Motion: elastic's straight line, no spring, no flow.

## API

`Connector from={x,y,attached} to={…} look flow ink width state label scale onHoverChange onPress onEndPointerDown`

---

# Day

The day as an object. A custom block: a `Surface` (raise, card radius) with a tear-off page sunk into a `Well` (field). React: `Day`, `DayTile` from `@unlocalhosted/metalui`. SwiftUI: `MetalDay`, `MetalDayTile`.

## Use it for

- Today on a canvas or a home screen: the date big, the time, how much of the year is gone, and a line to carry.

## Don't use it for

- Picking a date: that is a date field. A schedule: that is a calendar.

## Anatomy

`Day.Root` (364 × 382) › `Day.Page` (196 tall, radius 18: 41 × 23 dots, a perforated top edge, the date at 3× from a 5 × 7 face; the month, the weekday and the clock in the pixel face at 24 down the right; sixty small dots of the minute along the foot) › `Day.Year` (the year one dot a day, 27 a row; the days left in the pixel face at 40; the day's number and the moon's phase) › `Day.Line` (one line and who said it).

`DayTile` (180) is the page alone at 2×, with the weekday and month engraved, the days left and a 7 × 7 moon.

## Behaviour

- Tapping the page tears it off: the date's dots fall away a row as they go and the next day's settle in (14 frames of 55 ms). `onTear` gets the new day. Reduced motion or `animate={false}` goes straight to the next day.
- The clock's colon, the current second and today's dot pulse on the first half of each second; with reduced motion they hold steady and the seconds still count.
- Saturday's date is blue and Sunday's amber (`weekendInk={false}` keeps them ink).
- The tear is one real button labelled with the day and the day it goes to.

## API

| React | SwiftUI | Notes |
|---|---|---|
| `date` | `date:` | default today; tearing moves forward from it |
| `lines` (Day, Day.Line) / `line` (Day.Line) | `lines:` | default `DAY_LINES`, one a day by the day of the year |
| `weekendInk` | `weekendInk:` | |
| `animate` | `animate:` | |
| `onTear` | `onTear:` | |
| `Day.Page clock seconds` | `clock:`, `seconds:` | hide the clock or the minute |

## Tokens

The day recipe: sizes, the tear timing, and the per-colorway inks (off, left, hole, date, saturday, sunday, moon). The surface and well recipes.

---

# Dialog

A modal layer. React: `Dialog` with parts `Dialog.Root` (open, onOpenChange) and `Dialog.Popup` (a `Surface`, material `plate` by default). SwiftUI: `MetalDialog(isPresented:) { popup: … }`.

## Behaviour

- Focus moves in and stays in; Escape and a click on the scrim close it; focus returns to the opener.
- The popup rises a step (−6, from .985) on the surface spring and closes on release; under Reduce Motion it fades in place.
- Name it: `aria-label` on the popup.

## Rules

- **A small edit is a Quick edit** (`QuickEdit` under `Dialog.Title`; quick-edit.agent.md), as in "Rename canvas…": it brings its own Cancel and confirm, so it takes the place of `Dialog.Actions`. The key leads with its glyph and stays off until the value changed; a refusal keeps the dialog open with the reason under the field; done shows on the key (`check`, "Renamed") before the dialog closes after the hold; a failure shows `sync-error` and Try again. Offer Undo in a toast.
- A dialog that asks for more than one value keeps `Dialog.Actions`, and its confirm follows the same states: its glyph, off while nothing changed, waiting while it saves, done on the key, failure on the key.

---

# Dot display

Square dots on one pitch, printed into a well. React: `DotDisplay` and `useDotTick`. SwiftUI: `MetalDotDisplay` and `MetalDotClock`.

## Use it for

- A picture made of dots inside an object: a weather sky, a sticker, a small readout. Put it in a `Well`; the object around it carries the label.

## Props

- `cols`, `rows`: the grid. A tile's sky is 21 × 21, a wide sky 46 × 28.
- `dots`: one ink index per dot, row by row. An index with no ink is unlit.
- `inks`: index → a px colour (`off`, `hz`, `hill`, `sun`, `moon`, `star`, `cloud`, `cloud-dark`, `rain`, `snow`), or `[colour, alpha]` for a dimmer dot. Index 0 is always drawn unlit.

## Behaviour

- Pitch 8, dot 6 (recipe `dot-display`). The SVG draws cells; the `dot-display` utility masks them to squares.
- `useDotTick(ref)` gives a frame number that steps every 167 ms. It holds still under reduced motion, in a hidden tab and off screen. Draw the next picture from the tick; never tween between frames.
- Decorative (`aria-hidden`): describe the picture on the object ("Rain, 14°").

## Don't

- Don't round the dots, add glow or draw on black: the dots are printed into the colorway's well.
- Don't pick colours outside the px set; the set is what makes every display read as one family.

---

# Draw picks

The ink and width choices beside the drawing tools. React: `InkPicks`, `WidthPicks` from `@unlocalhosted/metalui`. SwiftUI: `MetalInkPicks`, `MetalWidthPicks` with `Binding<MetalInk>` and `Binding<MetalInkWidth>`, and `MetalInkStroke(ink:width:)`.

## Use it for

- Choosing the ink (ink, red, blue, green, amber) and width (fine, regular, bold) of the pen, pencil, marker, line, arrow, rectangle and ellipse.

## Don't use it for

- A free colour picker. The set is fixed on purpose.
- Anything outside a `Toolbar`: the picks are toolbar buttons.

## Anatomy

A 28 round cap. Ink: a 14 bead in its colour with a gloss. Width: a 20 stroke, slanted 40°, 3, 6 or 10 thick in the current ink (as the pen will draw it). Picks sit 2 apart. Each pick is named with its group, in its tooltip and accessible name: "Ink: plain", "Ink: red", "Width: fine"; each group is named ("Ink", "Width"). `InkStroke` is the stroke alone, for a cap that shows the pen as it is set (the Fan's Ink tray).

## States and motion

| State | Look | Motion |
|---|---|---|
| hover | bead or dot at 1.14 | part spring |
| press | .88 | 80 ms |
| chosen | sunk well (the latched tool's; on a graphite strip, its own dark well) | at once |
| focus | 1.5 ring, no offset | – |
| disabled | 40 % (eraser latched) | – |

## API

| React | Notes |
|---|---|
| `InkPicks value onValueChange disabled` | `Ink`: `'ink' \| 'red' \| 'blue' \| 'green' \| 'amber'` |
| `WidthPicks value onValueChange ink disabled` | `InkWidth`: `'fine' \| 'regular' \| 'bold'` |
| `InkStroke ink width` | the stroke alone, decorative |
| `inkColor(ink)` | the CSS colour to draw with |

---

# Draw tools

The drawing group of the toolbar. A composition block. React: `DrawTools` from `@unlocalhosted/metalui`. SwiftUI: `MetalDrawTools` with bindings for tool, ink and width.

## Use it for

- Picking a drawing tool, its ink and its width on the canvas.

## Don't use it for

- Select, text or region tools: those are the main toolbar.

## Anatomy

`Toolbar` › `ToolButton` × 8 › `ToolbarSeparator` › `InkPicks` › `ToolbarSeparator` › `WidthPicks`.

Keys: P pen, N pencil, M marker, L line, A arrow, R rectangle, O ellipse, E eraser. V or ⎋ goes back to select (the host handles it).

## States

- One tool latched with its LED, or none.
- Eraser latched: inks and widths at 40 %.
- The host remembers the last ink and width per tool.

## API

`DrawTools tool onToolChange ink onInkChange width onWidthChange variant`

---

# Drop zone

A place that receives files, by drop or by picking. React: `DropZone` from `@unlocalhosted/metalui`. SwiftUI: `MetalDropZone` (work in progress; `dropDestination(for:)` and `fileImporter` are the system's). A place: it receives files and holds none itself; the files it took are the caller's `Attachment`s, below it. The tray is a `well`; the `drop-zone` recipe adds the edge, the sink and the motion.

## Use it for

- Attaching files to a thing: a region, a message, a form.
- Compact, the attach row of a composer.

## Don't use it for

- A whole canvas or window that takes drops: handle the drop there; a drop zone is a bounded place.
- One image with a preview (an avatar picker): a button that opens the picker.

## Anatomy

- A sunk tray (well look), radius 20, at least 176 tall, padding 24.
- A 44 raised well with a 20 glyph; the title (ui type); what it takes (meta type, ink3); "or choose files" (meta, ink2, underlined).
- An edge drawn inside the tray (1.5), clear at rest.
- Compact: one 56 row: glyph, words, "or choose files" at the end.

## States and motion

| State | Look | Motion |
|---|---|---|
| rest | the tray; edge clear | – |
| armed (files dragged anywhere in the window) | edge green at 40% | settle spring |
| over | edge green; tray at 0.985; glyph up 4; "Let go to attach" | part spring; the line turns on the drum |
| refused (over, a type it won't take) | edge in the invalid ink; "This file isn't taken here" | the drum; dropping shakes it (refusal) |
| drop | back to rest | the tray comes up on the object spring, with its overshoot |
| focus (keyboard) | the focus ring | – |
| disabled | 50% | – |

Reduce Motion: edge and line change at once; nothing sinks, rises or shakes.

## API

| React | SwiftUI |
|---|---|
| `onFiles(files, refused)` (refused: `{ file, reason: 'type' \| 'size' \| 'count' }[]`) | `onFiles: ([URL]) -> Void` |
| `accept` (the input's accept: `"image/*,.pdf"`), `maxSize` (bytes), `multiple` (true) | `accept: [UTType]` |
| `title`, `description`, `overTitle`, `refusedTitle`, `chooseLabel`, `icon` | `title`, `description`, `systemImage` |
| `compact`, `disabled` | – |

While dragging, only the MIME type is known, so an extension pattern (`.pdf`) is checked on drop; size too.

## Keyboard and accessibility

- The tray is the label of a real file input: Tab reaches it, Space or Enter opens the picker, a click anywhere on it does too.
- The input is named by `title` and described by `description`.
- Dragging is not the only way in: the picker always works.
- Say what was refused and why near the zone (the `refused` list), not only with the shake.

## Rules

- Name what it takes and the largest size in `description`.
- Show what it took right away, as attachments that land below it.
- A drop that misses the zone is swallowed while it is on the page, so the browser never opens the file.

---

# Empty state

A place with nothing in it yet. React: `EmptyState` from `@unlocalhosted/metalui`. SwiftUI: `MetalEmptyState` (work in progress; `ContentUnavailableView` is the system's). A place: the glyph sits in a `well`; the `empty-state` recipe adds the layout and the arrival.

## Use it for

- A list, board or panel with nothing in it: first use, a cleared filter, everything done.

## Don't use it for

- Errors (say what went wrong and how to fix it), or loading (use a skeleton).

## Anatomy

- A 56 sunk well (radius 18) with a 24 glyph in ink3.
- Title (title type): what would be here. Description (body type, ink2): how to start.
- One action, 16 below.
- Compact: one line in ink3 and the action, for small places.

## States and motion

| State | Look | Motion |
|---|---|---|
| empties | the empty state | rises one nest from below on the settle spring (T9) |
| content arrives | the content | the empty state goes; the content's own arrival |

Reduce Motion: it fades in without travel.

## API

| React | SwiftUI |
|---|---|
| `title`, `description`, `icon`, `action` | `ContentUnavailableView(title, systemImage:, description:)` |
| `compact` | – |

## Keyboard and accessibility

- A polite `status`: when a place empties, assistive tech hears what would be here. The action is an ordinary button or link.

## Rules

- Say what would be here and how to start, not only "Nothing here".
- One action; the one that starts it.

---

# Fan

A compact control bar for a toolbar that must stay small: it shows the current state, and each cell opens in place.

## Parts
- `Fan` (the bar, `aria-label` required): keeps which cell is open, one at a time; Escape or a press outside folds it and focus returns to the cell that opened it.
- `Fan.Label`: what the bar is about now, as a word ("Canvas", "Text", "3 selected") or, with `icon`, as a glyph cap whose children name it (tooltip and accessible name): `<Fan.Label icon={<PaletteIcon />}>Ink</Fan.Label>` while inking.
- `Fan.Picker`: the current choice. Pressing it unfolds every choice into a grid from behind the cap: each key grows out of the cap and travels to its cell on the part spring, nearest first (one `--mu-motion-fan-stagger` beat per ring of distance); folding goes back together. One row per `group` on the options, in order (ungrouped, rows of ⌈√n⌉); the cap's column is the grid's middle. `direction="up"` puts the rows above the cap (a bar at the bottom of the screen), `"both"` splits them above and below. The current choice sits latched (sunk, green LED) in its cell and takes focus on open; arrows move in two dimensions, down past the row nearest the cap returns to it; Enter picks.
- `Fan.Tray`: an options cap that stretches sideways into a capsule of more controls (any children: picks, separators, buttons); the set's `chevron`, turned to point the way the tray folds, ends it and folds it.
- The bar is a graphite toolbar to what it holds (`data-variant="graphite"`): `ToolbarSeparator` and the draw picks take their graphite look inside it.

## Rules
- Use it where a full strip does not fit or would crowd the canvas. Every option is one press away and in view once opened: never put options in a dropdown menu instead.
- The picker holds one kind of choice (tools). Group related ones so the grid stays three or four wide: place (select, write, region), freehand (pen, pencil, marker, eraser), shapes (line, arrow, rectangle, ellipse).
- The tray holds what goes with the current context (inks and widths while drawing; a selection's actions).
- The Ink tray explains itself: its cap is `<InkStroke ink={ink} width={width} />` (the stroke the pen will draw), and it holds `InkPicks`, a `ToolbarSeparator` and `WidthPicks`: two named groups ("Ink", "Width") whose picks are named in their tooltips ("Ink: red", "Width: fine"), the chosen ones latched in the strip's well, the widths drawn as strokes in the chosen ink.
- A selection's actions are glyph keys, not worded buttons: `<IconButton variant="tool" label="Export" title="Export" icon={<DownloadIcon />} />` (SwiftUI: `MetalIconButton("Export", icon: .download, variant: .tool)`). The name is the tooltip and the accessible name; the glyph plays its act on hover and press.
- Motion is the part spring; Reduce Motion keeps the layout and drops the travel.
- SwiftUI: `MetalFan`, `MetalFanLabel("Ink", icon: .palette)`, `MetalFanPicker` with `MetalFanOption(value, label, icon:, shortcut:, group:)` (the same grid, latched current, arrows in two dimensions), `MetalFanTray("Ink and width", icon: { MetalInkStroke(ink: ink, width: width) }) { MetalInkPicks(…); MetalToolbarSeparator(); MetalWidthPicks(…) }`; the bar is a graphite strip to what it holds.

## Example
```tsx
<Fan aria-label="Canvas tools">
  <Fan.Label icon={<PaletteIcon size={16} />}>Ink</Fan.Label>
  <Fan.Picker label="Tool" value={tool} options={TOOLS /* { value, label, icon, shortcut, group } */} onValueChange={setTool} />
  <Fan.Tray label="Ink and width" icon={<InkStroke ink={ink} width={width} />}>
    <InkPicks value={ink} onValueChange={setInk} />
    <ToolbarSeparator />
    <WidthPicks value={width} onValueChange={setWidth} ink={ink} />
  </Fan.Tray>
</Fan>
```

---

# Field and search field

React: `Field` with parts `Field.Root`, `Field.Icon`, `Field.Prefix`, `Field.Input`, `Field.Suffix`, `Field.Trail`, `Field.Key`, `Field.Clear`, `Field.Copy`, `Field.Reveal`, `Field.Shortcut`, `Field.Check`; `SearchField`. SwiftUI: `MetalField("Website", text: $url, size: .regular, prefix: "https://", clear: true) { MetalFieldKey(…) }`, `MetalFieldKey`, `MetalSearchField`.

## Field

- Three sizes (`size`): `large` (the default: 44 tall, radius 17, a 15 glyph, the input in 15 pt; the palette's field), and the form sizes `regular` (32, radius 11, 14 glyph, ui type) and `compact` (28, radius 9, 12 glyph), which line up with the select.
- A hint in ink3, a green caret.
- `invalid`: the foundation's invalid ring on the well, and `aria-invalid` on the input. `disabled`: 40 %, and the input is disabled. Inside a `FormField` both come from the field.
- `Field.Input` is Base UI's field control; pass it as a Base UI combobox input's `render` to join a listbox.

## Fixed parts of the value

- `Field.Prefix` / `Field.Suffix`: "https://", "$", "kg", ".com". Engraved in ink3 (with the lip) on the well's floor, in the input's type so they sit on its baseline. Not selectable and not part of the value: the input holds only what was typed.
- Pressing one puts the caret in the input, at the start for a prefix and at the end for a suffix, without blurring it (a blur would check the value).
- They describe the input (`aria-describedby`), so a screen reader hears "Website, https://, .metalui.dev".
- A suffix sits at the well's end, before the counter and the keys, whatever order it is written in.

## Keys inside the field

`Field.Trail` holds mini keys and takes any node (a keycap, a working ring). The documented set:

| Key | React | Does |
|---|---|---|
| clear | `<Field.Clear icon={<Icon name="close" />} />` | shows while there is text; empties it (a controlled host hears `onChange` with "") and keeps the caret |
| shortcut | `<Field.Shortcut keys="⌘K" />` | a keycap that focuses the field from anywhere (⌘ also answers to Ctrl; `bind={false}` when the host binds it); it turns on the drum to "Esc" while the field is active; Esc clears the text, or leaves the field when it is empty. The input gets `aria-keyshortcuts` |
| check | `<Field.Check shown={free} label="Name available"><Icon name="check" act /></Field.Check>` | a remote check that passed: the tick arrives acting, in the deep green, and is said once (`role="status"`). Ordinary valid fields show nothing |
| any | `<Field.Key label="…" icon={…} onClick={…} />` | a mini key of your own; `shown` makes it come and go |
| copy | `<Field.Copy icon={<Icon name="copy" />} copiedIcon={<Icon name="check" />} />` | shows while there is text (or always, with `value`); copies the value, and its glyph turns on the drum to the check for the recipe's `copy.hold` (1400 ms, Table's), then back. Not a morph: copy → check strains 2.38, past the family's limit. "Copied" is said once (`role="status"`, `copiedLabel`) |
| show password | `<Field.Reveal icon={<MorphIcon name="eye" />} hideIcon={<MorphIcon name="eye-off" />} />` | makes the input `type="password"`; pressing it shows the text (`type="text"`) and back. It is a toggle named "Show password" (`label`) with `aria-pressed`, so assistive tech says whether the text shows. Pass the same component for both glyphs: React keeps the element and `MorphIcon` morphs eye ↔ eye-off |

- A key is a compact button cap, 20 round with a 12 glyph and a 24 hit area, as far from the well's edge as from its top and bottom in every size. Pressing one keeps focus in the input. Glyphs come from the host (`@unlocalhosted/metalui/icons`), so `Field` never ships the icon catalogue.
- A key that comes and goes pops in from 60 % on the settle spring and leaves on the release spring, keeping its place so the trail never shifts. A field that loads with text shows its clear key at rest (no pop on load).

## How much to type

- `maxLength` on `Field.Input`: Textarea's counter, in the trail (meta type, tabular, ink3). It fades in at Textarea's share of the limit (`countFrom`, 0.8), turns red at the limit, and typing or pasting past it shakes only the counter on the refusal spring; a screen reader hears "Limit reached" once. It describes the input.
- `chars` on the root: the input is that many characters wide in its own font (plus 2 for the caret) and the well hugs it. Use it for short values of a known length: a postcode (8), a year (4), a card check (3). Prefer it to a width class: it follows the size's type and says what goes in the box.

## Search field

- A button, not an input: it opens search (a palette). 38 tall (radius 15) with a 14 glyph, the placeholder and a keycap (`⌘K`); graphite in a dark strip, light elsewhere.

## Keyboard and accessibility

- Field: the input takes focus. At the large size (a palette, where the field always has focus) the caret is the focus; the form sizes show the flush green ring. Name the input with a visible label (`FormField.Label`) or `aria-label`; say why a value is invalid in text near it. Keys are buttons with names; Tab reaches them after the input. Search field: a button with `aria-keyshortcuts`, the green ring on focus.

## Reduce Motion

Keys fade without the pop, the shortcut's drum crossfades, and the counter does not shake (it still turns red).

## SwiftUI

`MetalField` draws the same well, sizes, caret, prefix and suffix, counter (trimming past `limit` and shaking), `chars`, `clear`, `copy` (the pasteboard; the glyph replaces to the check for `copy.hold` and "Copied" is announced), `secure` (a `SecureField` with a show-password key whose eye replaces to eye-off; the key's value says "Shown" or "Hidden"), `shortcut` (a key equivalent; Esc clears or leaves), `check`, and any `MetalFieldKey` in `trail`. Inside a `MetalFormField` with an error it draws the invalid ring.

---

# Filter bar

Names the question a filter asks and switches how the answer is shown. A composition block on Base UI Toolbar. React: `FilterBar` (earlier `LensBar`) from `@unlocalhosted/metalui`. SwiftUI: `MetalFilterBar` (earlier `MetalLensBar`).

## Use it for

- While a filter is open: `open tasks about the poster · 6 MATCHES · VIA MODEL`, with its views (In Place, List, Table, Timeline, Gallery), pin and close.

## Don't use it for

- Search fields or command entry. The palette asks; the filter bar names what was asked.
- Filtering that moves or hides content permanently. A filter never moves anything.

## Anatomy

`Surface material="frost" radius="pill"`, 38 tall, padding 0 6 0 14, gap 8, at the top centre: a `Glyph` (14, ink2); the query in `Label variant="query"`, ellipsised at 340; `N MATCHES` in `Label variant="engraved"`; the note (`ASKING…` after a waiting `Led`, `VIA MODEL`, `LOCAL`); a compact `Switcher`; two `IconButton variant="ghost"`, pin and close.

## States and motion

| State | Look | Motion |
|---|---|---|
| open | the bar | drops in 8 from above, from .98, on surface; Reduce Motion: fades in place |
| pending | amber LED + the note | – |
| view change | the thumb glides | part |
| icon hover | the ghost button's well, ink | settle |
| close | removed | the host fades it out on release |

## API

| React | SwiftUI | Notes |
|---|---|---|
| `query`, `count`, `note` | same | `note: { text, pending }` |
| `view`, `onViewChange`, `views` | `view:` (Binding), `views:` | pass `[]` for no switcher |
| `onPin` | `onPin:` | omit when it cannot be kept |
| `onClose` | `onClose:` | also ⎋ in the host |
| `glyphs` | (MetalIcon built in) | `{ filter, pin, close }` at 14 |

`LensBar` remains: `source` (`asking`, `local`, or a source's name) becomes the note, `mode` / `onModeChange` / `modes` the views, `glyphs.lens` the filter glyph.

## Rules

- A filter never moves anything. In place dims non-matches; the other views gather matches in a panel without moving them.
- Hidden confidence is a bug: when words were judged beyond the rules, the note says where.

## Accessibility

- A Base UI toolbar named "Filter: …": one tab stop with arrow navigation; the view switcher is a radio group; pin and close have labels and titles.
- The match count is announced politely when it changes.

## Tokens

Layout: `--mu-lensbar-*`. Look: the surface, glyph, label, status, switcher and icon-button recipes. Motion: `--mu-spring-surface`, `--mu-travel-surface`.

---

# Folder

A folder on the canvas: the closed state of a container. React: `Folder` from `@unlocalhosted/metalui`. SwiftUI: `MetalFolder` (not yet).

## Use it for

- Blocks put together by dropping one onto another, by ⌘G, or by the evening sort.
- Anything that should be kept together but not take space (one container, two states).

## Don't use it for

- A place you are working in: unfold it into its region (`Region` with the same `hue`).

## Anatomy

From the Soft Hardware sheet's stack folder, 220 × 204: a translucent paper back panel (150 tall, radius 26, tapering 10 per side toward the bottom) with a tab rising 16; up to three cards (114 × 148, radius 16) with a 62-tall picture and three lines; a frosted glass flap (106 tall, tapering 12 per side: a clipped blur layer under a see-through fill) with the name (title), `Folder · N blocks` (engraved) and the count chip.

## States and motion

Up to six cards peek, each posed by its place in the pile (t: 0 back → 1 front); the fan widens a little with the count. At three cards the poses are the sheet's exactly.

| State | Cards (y, lean, back → front) | Flap | Order |
|---|---|---|---|
| rest | -10: 10° → -5° | -15° | leaving hover: the front settles first |
| hover / focus | -30 → -44: 14° → -9° | -45° | the back lifts first, 45 ms apart (object spring) |
| open (dragged over, or unfolding) | -86 → -106: 18° → -14° | -55° | same |
| joining | the new card is added at the front, the others re-spread; its slot waits (`waiting`) until the block lands | open | – |
| landing | the fan settles together | shuts past rest to -4°, settles (hinge spring) | – |
| empty | none | -15° | – |

Past six, the oldest slides down into the pocket. Colour: `hue` = neutral (the sheet), red, amber, green, blue, violet; soft paper on the back, tinting the glass flap. Reduce Motion: poses at once.

## API

`Folder name count peeks={[{thumb, link}]} hue open landed onUnfold`

- `landed`: change it each time a block drops in (a counter).
- `onUnfold`: double-click or Enter.

---

# Form field and fieldset

A control with its words, and groups of them. React: `FormField`, `Fieldset`, `Form` and the shared `ChangedMark` from `@unlocalhosted/metalui`, on Base UI Field, Fieldset and Form. SwiftUI: `MetalFormField`, `MetalFieldset`, `MetalChangedMark`. The `form-field` recipe sets the gaps, the side column, the marks, the error ink and the rows' motion; the invalid ring is the foundation's.

## Use it for

- Every control in a form that needs a visible label, a hint, or a reason it was not accepted: Field (at a form size), Textarea, Select, Combobox, Number field, Radio group, Checkbox group.
- `Form` around the fields: it validates them all on submit, focuses the first one not accepted, and shows a server's errors by field name.
- `Fieldset` with a `Legend` for a group: a radio or checkbox group, or several fields about one thing ("Shipping").

## Anatomy

- Label above the control (ui type, ink), 6 apart; clicking it focuses the control.
- Description below (meta type, ink3).
- Readback below (`FormField.Readback`, readout type, ink2): what was understood.
- Error below (meta type, red) while the field is invalid.
- Fieldset: the legend (the engraved label type), fields 16 apart.

## Labels beside the field

`orientation="horizontal"`: the label sits in a 136 column, end-aligned, on the control's first baseline, 16 from it; the description, readback and error stay under the control. The field is its own container (`@container/form-field`): when it is narrower than 400 it stacks like a vertical field, so a settings panel that narrows never squeezes its controls. A horizontal field must be given a width (a grid or block parent); it does not size to its content.

## Required or optional

Mark the minority, never both: `<FormField.Label mark="optional">` writes "Optional" in ink3 after the label when most fields are required; `mark="required"` puts a 4 dot in ink2 (lifted to the cap height) after it when most are optional. The dot is for the eye; give the control `required` so assistive tech says it. "Optional" is read with the label.

## Changed

`<FormField changed={value !== saved}>`: a 6 engraved dot (the engraved ink with its lip) hangs 6 before the label, in the margin, so labels stay in their column. Leave room at the start (a form's padding). Pass `false` once saved, not nothing, so it leaves on its spring. A screen reader hears "Region name changed".

`ChangedMark` is the same dot on its own, for other controls: Number field's "off its default", an edited Table cell, a Settings row. `changed` (default true) shows it; `label` (default "changed") is what a screen reader hears after the thing it marks. It keeps no space; place it before what it marks, or hang it there with `form-field-changed-hang` inside a `relative` parent (6 before, centred on a ui line).

```tsx
<span className="relative">Grid size<ChangedMark changed={size !== 8} className="form-field-changed-hang" /></span>
```

## Readback

`<FormField.Readback>{understood}</FormField.Readback>`: a line under the control saying what the field understood, for dates in words ("tomorrow 8am" → "Wed 7 Oct, 08:00"), expressions ("12 * 8" → "= 96") and units. The host parses; the readback shows. Each new reading turns on the drum (`SwapText`); an empty reading closes the row like the error's. It describes the control (read with it) and is not announced on every keystroke. Say only what changes the person's mind: never repeat the value as typed.

## Errors at the right moment

A field checks when you leave it (or when the form is sent) and its error goes the moment you change the value: Base UI's `onBlur` validation, the default for `FormField` and `Form`. Never show an error on the first keystroke. A check that needs a server returns a promise from `validate`; when it passes, show `Field.Check` in the trail ("Name available"). Ordinary valid fields show nothing.

## States and motion

| State | Look | Motion |
|---|---|---|
| valid | label, control, description | – |
| invalid | the control's invalid ring; the error below | the error's row grows open on the settle spring as it fades in |
| valid again | the error leaves | release spring |
| readback | the line under the control | its row opens on settle, closes on release; the words turn on the drum |
| changed | the dot before the label | pops in from 40 % on settle; leaves on release |
| disabled | label and control at 40 % | – |

Reduce Motion: the rows snap and the marks fade without the pop; the fades stay.

## API

| React | SwiftUI |
|---|---|
| `FormField` `invalid`, `disabled`, `name`, `validate`, `validationMode` (default `onBlur`), `orientation`, `changed` | `error:`, `.disabled()`, `orientation:`, `changed:` |
| `FormField.Label` `mark` | `label`, `mark:` |
| `FormField.Description` | `description:` |
| `FormField.Readback` (a string; empty closes it) | `readback:` |
| `FormField.Error` (children, or empty to say the validation message), `match` | `error:` (also the control's invalid ring) |
| `ChangedMark` `changed`, `label` | `MetalChangedMark(changed:)` |
| `Fieldset` `disabled`; `Fieldset.Legend` | `MetalFieldset("Legend") { … }` |
| `Form` `onFormSubmit` (values by name), `errors` (a server's, by name), `validationMode` (default `onBlur`) | – |

## Keyboard and accessibility

- The label names the control; the description, readback and error are read with it (aria-describedby). An invalid control says aria-invalid.
- A fieldset's legend names its group; a disabled fieldset disables everything in it.

## Rules

- Every control has a visible label. Placeholder text is not a label.
- An error says what to do, not only what is wrong: "Give the region a name", not "Invalid".
- Show errors after the person has had a chance (on blur or on submit), not on the first keystroke.
- Mark the minority: optional or required, never both in one form.
- Only a check the person could not see happen earns a tick.

---

# Glass face

A glass object in the colorway: pale glass on Bone, dark glass on Graphite. React: `GlassFace` with parts `GlassFace.Root` (the bezel) and `GlassFace.Screen`. SwiftUI: `MetalGlassFace { screen: … }`.

## Use it for

- An object that shows a screen: a link's preview, a block of code, an image behind glass.

## Anatomy

- The bezel: radius 22, padding 6, a gradient in the colorway (white to bone on Bone, graphite to near black on Graphite) with a bright top edge, an inner glow and a deep drop shadow.
- The screen: radius 16, pale bone (`#E8E7E2`) on Bone, near black on Graphite; the glare is a 115° sheen, a darkening toward the bottom, a bright top rim, a dark inner ring and an inner shadow. The screen's own fill (a hue, a gradient) is the caller's, under the glare.

## Behaviour

- No role; the content and its actions carry their own.

---

# Glyph

A static icon at a size in an ink. React: `Glyph` wrapping any MetalUI icon. SwiftUI: `MetalGlyph(.search, size: .small, tone: .ink2)`.

## Use it for

- A mark beside words that is not a control: the lens beside a query, a field's leading search mark, a menu row's icon.

## Don't use it for

- Anything pressable: use `IconButton`. A glyph that carries meaning alone: give its host an accessible name instead.

## Props

- `size`: `tiny` (10), `small` (14, default) or `regular` (16). `tone`: `ink`, `ink2` (default), `ink3`, or `inherit` (the ink of the words it sits in, as a glyph inside an engraving).
- It is `aria-hidden`; the icon inside inherits the ink.

---

# Hover engraving

A block's identity, shown on a dwell, never on a pass. A composition block. React: `HoverEngraving` from `@unlocalhosted/metalui`. SwiftUI: `.metalHoverEngraving(...)` or `MetalHoverEngraving`.

## Use it for

- Telling what a block is and where it came from, without a card: `LOG · 07:40 · SLEEP 6 H · ALSO TIRED`, `TASK · TOMORROW 16:00 · #POSTER · RECOGNIZER ✓`, `LUNCH? 0.71`, `NOT SENT · LOOKS LIKE A SECRET`.

## Don't use it for

- Anything a person must read to act. The engraving repeats or names what the block already shows (the label role never carries information alone).
- Controls. It is not interactive and ignores the pointer.
- Tooltips on chrome. Those are tooltips; the provenance of a single cue is the provenance tooltip.

## Anatomy

`Surface material="tip" radius="pill"` (frosted, blur 12, a small raise), 22 tall with 10 padding and 8 gaps: `Label variant="engraved"` with the kind as its `<b>` emphasis; derived tags as `Chip variant="tag"`; the recognizer's status in a `Label` after a `Led` (green live, amber waiting, red failed, off). Beside the first line of a text block (4 to the right, 9 down); below a material block (8 under). It never covers the next line of a stacked list.

## States and motion

| State | Look | Motion |
|---|---|---|
| pass | hidden | – |
| dwell 420 ms | shown | settle fade, sliding 3 in (beside) or 2 down (below) |
| leave | hidden at once | settle, no delay |
| selected, writing | hidden (`open={false}`) | – |
| Reduce Transparency | the surface turns opaque, no blur | – |

Reduce Motion: settle is a crossfade, so it fades in place.

## API

| React | SwiftUI | Notes |
|---|---|---|
| `kind` | `kind:` | emphasised first |
| `details` | `details:` | joined with ` · ` |
| `tags` | `tags:` | derived tags only |
| `status` | `status:` | `{ led, text }`; `MetalEngravingStatus` |
| `placement` | `placement:` | `beside`, `below` |
| `open`, `immediate` | `isPresented:` | controlled; the dwell still applies unless `immediate` |

```tsx
<div className="mu-icon-trigger block" aria-describedby="eng-1">
  slept badly, up at 5
  <HoverEngraving id="eng-1" kind="LOG" details={['07:40', 'SLEEP 6 H', 'ALSO TIRED']} status={{ led: 'live', text: 'RECOGNIZER ✓' }} open={selected || editing ? false : undefined} />
</div>
```

## Rules

- A dwell, never a pass: 420 ms before it shows, nothing on the way out.
- Beside the first line, never under a text block (it would cover the next line of a list).
- Hidden while selected or writing.
- Status carries its LED and its words; never colour alone.

## Accessibility

- It is a `note`; point the block's `aria-describedby` at its `id` so assistive tech reads the identity with the block.
- It never takes the pointer or focus.

## Tokens

`--mu-engraving-*`, per colorway `--mu-engraving-bg`, `--mu-engraving-emphasis`, `--mu-engraving-tag-ring`; `--mu-engrave`, `--mu-lip`, `--mu-raise-sm`, `--mu-led-*`, `--mu-type-label`. Swift: `MetalEngraving`.

---

# Icon button

A pressable cap with only a glyph. React: `IconButton`. SwiftUI: `MetalIconButton`.

## Variants

- `tool`: a 38 graphite cap (radius 15). Pressed sinks 1 into a dark well (50 ms linear, back on release). `pressed={true}` latches it down with the LED part's live lamp (the status recipe: sunk socket and glow) at 4 pt, 5 in from the top right.
- `ghost`: a 28 flat round button; hover fills it faintly and darkens the glyph.
- `mini`: an 18 × 16 flat pill inside a chip; `accept` turns its glyph green on hover.

## Keyboard and accessibility

- A `<button>`; Space and Enter activate. `label` is its accessible name; `pressed` sets `aria-pressed`.
- Focus: the green ring (2 pt, no offset: the cap is the target).
- Inside a toolbar, render it through the toolbar's button part so arrow keys move between tools.

---

# Keycap

A key's glyph on a small raised cap. React: `Kbd` from `@unlocalhosted/metalui`. SwiftUI: `MetalKbd`.

## Use it for

- Showing the key for an action: a search well's `⌘K`, a palette footer (`↑↓ move · ↩ open`), a toast's Undo `⌘Z`, a tooltip's `Select · V`.

## Don't use it for

- Buttons. A keycap is shown, never pressed.
- Words or long shortcuts. Glyphs only: ⌘ ⌥ ⇧ ⌃ ⎋ ↩ ⌫ ↑ ↓ and single letters; one cap per key.

## Anatomy

20 tall (16 `small` in a dense footer), min width 19, padding 0 5, radius 6 (`key`), the cap material (`cap-bg`, `cap-sh`), the `readout` role in ink2. On a graphite strip (`surface="strip"`): `#303033 → #262628` with a light top lip, ink `#A6A6A9`. Sunk in a toast's Undo (`surface="sunk"`): a dark inset pill, ink `#9A9A9E`.

## API

| React | SwiftUI |
|---|---|
| children | first argument |
| `size` | `size:` (`.default`, `.small`) |
| `surface` | `surface:` (`.default`, `.strip`, `.sunk`) |
| `label` | `label:` |

## Accessibility

- A `kbd` element; modifier glyphs are named for assistive tech ("Command K").

## Tokens

`--mu-kbd-*`, `--mu-cap-bg`, `--mu-cap-sh`, `--mu-radius-key`, `--mu-type-readout`. Swift: `MetalKbdMetrics`.

---

# Label

Text in a set role. React: `Label`. SwiftUI: `MetalLabel`.

## Use it for

- Engravings (`engraved`, `small`): counts, rules, sections, units, provenance; uppercase mono with a lip.
- Names (`title`), page titles (`heading`), a pinned query's words (`query`).
- Numbers: `count` (a mono count), `cell` (a mono table cell), `value` and `value-small` (a measured value, 22 and 12).
- `display` and `display-quiet`: a large line and its quieter continuation (an empty state's words).
- On graphite: `readout` with its `readout-dim` part, `on-graphite` for sans text, `dark` for an engraving.

## Emphasis

- A `<b>` inside an `engraved` or `small` label is its emphasis: weight 500 in a darker engraving ink (`TASK · 07:40`, the kind before the details).

## Tone and placeholder

- `tone="accent"`: green with no lip, cross-fading on settle (a region's rule while a block is over it: "drop to mark tasks done").
- `placeholder`: shown in ink3 at 500 while the label is empty ("name this region"); on `as="input"` it is the input's placeholder.

## Behaviour

- Plain text: no role. An engraving that is the only name of a control is not an accessible name; give the control an `aria-label`.
- `as="input"`: an editable label (a region's name) that keeps the look, with the green caret and no field, sized to its content; give it an `aria-label`.

---

# Lasso

The box a drag on empty canvas draws, with a count of what it will select. React: `Lasso` from `@unlocalhosted/metalui`. SwiftUI: `MetalLasso`. It uses the Size readout for its count.

## Use it for

- A drag that starts on empty canvas (the Select tool, or no tool). Every object the box touches is selected when the drag ends.

## Don't use it for

- Showing a selection that already exists (that is the Selection frame), or a region (a region is an object you made).

## Anatomy

- A rectangle in world coordinates from where the drag began to the pointer; a drag up or left works the same.
- Its edge is `presence.lasso-width` (1 pt) in `presence.guide`; its fill is `presence.lasso-fill` (intent green at 6 %). Graphite: `guide-dark` and `lasso-fill-dark`.
- Under it, centred, `presence.readout-gap` / 2 (8 pt) below: `SizeReadout` reading `● 3 blocks` (the count, then the unit dimmed). No readout while the count is 0.
- The line and the readout keep their screen size at every zoom: pass the canvas `scale`.

## States and motion

| State | Look |
|---|---|
| rest | nothing |
| drawing | the box and the count, updated in the same frame as the pointer |
| release | the box fades on the release spring; the Selection frame takes over |

No marching ants, no glow. Reduce Motion: it clears at once.

## API

| React | SwiftUI |
|---|---|
| `rect` (`x`, `y`, `width`, `height`, or `null`) | `rect:` |
| `count` | `count:` |
| `scale` | `scale:` |
| `unit` | `unit:` |

## Starting and ending the drag (the host's job)

`Lasso` only draws; the canvas host owns the pointer. These are the rules that make it reliable:

- **Empty space is anything that isn't an object.** Listen on the canvas element itself, not on the world or a layer inside it. A press on the guides layer, on a selection frame's gap, or on the canvas outside a zoomed-out world (at 50 % most of the canvas) is empty space. Only a press on an object is not: that one moves the object. Mark objects (e.g. `data-note`) and test `event.target.closest(...)`; never test `event.target === event.currentTarget`.
- **No native text selection.** Call `preventDefault()` on the lasso's `pointerdown` and put `user-select: none` (`select-none`) on the canvas, or the browser paints its own selection highlight over the objects' text while the box is drawn. Because `preventDefault` also stops the browser from clearing a selection made elsewhere on the page, call `getSelection().removeAllRanges()` on the press. Capture the pointer on the canvas so the drag survives leaving it.
- **Cursor.** A crosshair over empty space; a grab (grabbing while held) over an object that can be moved.
- **Threshold.** The box appears after 3 screen points of travel; a press without travel is a click on empty space and clears the selection.
- **Modifier keys.** Shift held at the press adds what the box touches to the current selection (a Shift-click keeps it). Escape clears the selection. ⌘ is left to the move (it turns snapping off).
- **After the release** the picked objects show the Selection frame only (`handles="none"`, `readout={false}` for a multi-selection); the size readouts belong to resizing one object, not to choosing several.
- Coordinates are world coordinates: `(clientX - worldRect.left) / scale`, which stays right outside the scaled world too.

## Rules

- The count is what the box touches now, never a guess.
- The box never moves objects; it only chooses them.
- A press on empty space always starts it, wherever on the canvas it lands.

---

# LED

A tiny lamp in a small sunk socket, lit from the top left, that says one state by colour and by how it behaves. React: `Led` from `@unlocalhosted/metalui`. SwiftUI: `MetalLED`. A part: it has a look and no job of its own.

## Use it for

- One state, beside the words that name it: in a status badge, a size readout, a hover engraving, the lens bar, a latched key.

## Don't use it for

- A state on its own, with no words: colour alone is not enough.
- Something pressable: the LED is decorative (`aria-hidden`).
- A new colour. There are five kinds and no others.

## Anatomy

- **Lens**: a radial gradient lit at 40 % / 35 % (a hot spot, the ink, a deep edge), 6 pt (4 small).
- **Socket**: a 1 pt dark bezel and a light lip under it, drawn outside the layout box (8 pt and 6 pt in all). The socket is the lamp's own ground, so it reads on bone, graphite, frost and images without help.
- **Halo**: a lit lamp glows in its own ink. An off lamp has no halo: it is a dull, dark lens.

## Kinds and sizes

| Kind | Colour | Means |
|---|---|---|
| live | green (leaning blue) | on, working, latched |
| waiting | amber (leaning yellow) | in progress, or urgent |
| failed | red (deep) | stopped, needs you |
| link | blue | points somewhere else |
| off | a dark lens | idle |

The inks are tuned per colorway and chosen to stay apart for colour-blind readers: green leans blue, amber leans yellow and red is deep, so the four lit kinds differ in lightness where hue fails (every pair at least ΔE00 20 under simulated deuteranopia and protanopia; the Status page measures it). Sizes: 6 (default) and 4 (small, in dense readouts and keys).

## Gestures

How the lamp behaves over time (tokens `status.gestures`). A gesture dims and brightens the whole lamp (lens, socket and halo); it never fades it away.

| Gesture | Behaviour | Use it for |
|---|---|---|
| steady | holds | the default: a state that simply is |
| flicker | one burst of activity (0.8 s), then on | something just happened: a sync finished, a value arrived |
| breathe | a slow loop (2.4 s) | something in progress: syncing, searching |
| blink2 | two sharp flashes, then on | a failure, once; never repeat it |
| rise | comes on slowly (1.2 s) | a first start, a machine waking |

Reduced motion holds every lamp lit at its final level, so the colour still says the state. Changing the gesture, or the kind, plays it again. A status badge picks the state's own gesture for you (live steady, waiting breathe, failed blink2, off steady).

## API

`Led kind size ("default" | "small") gesture ("steady" | "flicker" | "breathe" | "blink2" | "rise")`

SwiftUI: `MetalLED(.live, gesture: .flicker)`.

## Tokens

`recipes.status` led layers (`recipe-status-led-<kind>`, per colorway), `--mu-led-*` (the Bone lamp faces, for dots), `status.gestures`.

---

# Line handles

The presence of a drawn line or arrow. React: `LineHandles` from `@unlocalhosted/metalui`. SwiftUI: `MetalLineHandles` (not yet).

## Use it for

- A line or arrow drawn with the Line or Arrow tool that is not a connector.

## Don't use it for

- Rectangles, ellipses and strokes: use `SelectionFrame` (eight handles).
- Connectors: `Connector` has the same chrome built in.

## States

| State | Look |
|---|---|
| rest | nothing |
| hover | green halo along the line, hollow dot at each end (part spring fade) |
| selected | halo, a handle at each end; dragging one moves that end |

Uses the connector recipe's halo, dot and handle, so every selection on the canvas looks alike. Sizes keep their screen size (`scale`).

## API

`LineHandles from to state scale onHandlePointerDown`

---

# Link

An inline link in text. React: `Link` from `@unlocalhosted/metalui` (Base UI `useRender`, so `render` can swap in a router's link). SwiftUI: `MetalLink`, a link on its own line. The `link` recipe draws the line, its hover and press, the loading run and the glyphs.

## Use it for

- Going somewhere from inside a sentence: another page, a document, a site.
- `kind="standalone"`: a link on its own line ("All regions ›") under a section or a card.
- `kind="quiet"`: a list or table where every row is already a link (no line until hover).

## Don't use it for

- An action that changes something (use a button; the button's `link` cap for a quiet one), or navigation between sections (use tabs or the navigation menu).

## Anatomy

- The text in its surrounding type and ink, underlined with a 1 hairline under the descenders (`text-underline-position: under`) at 30 % ink.
- A faint tint of the text's ink behind the words, on hover only.
- Glyphs after the words, outside the line: `external` (and "(opens in a new tab)" for assistive tech), `download` then the size in a quieter ink ("· 2.4 MB"; assistive tech hears "(download, 2.4 MB)"), or a chevron for standalone. One glyph at most: download, else external, else the chevron.

## States and motion

| State | Look | Motion |
|---|---|---|
| rest | line at 30 % ink (quiet: no line) | – |
| hover | the line rises 1.5 and thickens to 1.5 in the text's ink; a 7 % tint behind the words | settle spring (colour 160 ms) |
| hover, with a glyph | the glyph plays its act (external: the arrow leaves its frame; download: it drops) | the icon's act |
| pressed | the words sink 1 (the press travel) and dim to 64 % | at once |
| focus | the green ring | – |
| visited (`visited`) | words ink2, line ink3 | – |
| current (`aria-current`) | no line, full ink, no pointer | – |
| disabled (`disabled`, `reason`) | ink3, no line, no pointer; the reason in a tooltip | – |
| loading (`loading`) | a run of the text's ink travels along the line, `aria-busy` | 1.1 s, while loading |

Reduce Motion: the line changes without rising, glyphs do not act, and loading breathes (the line fades between rest and full ink) instead of running.

Stills: `data-hovered` and `data-pressed` draw those states without a pointer, and `data-focused` draws the ring (a states strip, a row that owns the hover).

## API

| React | SwiftUI |
|---|---|
| `href`, and every anchor attribute | `destination:` |
| `external` | `external:` |
| `download`, `fileSize` | `fileSize:` (shows the glyph and size; the download itself is the app's) |
| `kind` (`inline`, `quiet`, `standalone`) | `kind:` (`.inline`, `.quiet`, `.standalone`) |
| `visited` | – (SwiftUI has no history) |
| `aria-current` | `current:` |
| `disabled`, `reason` | `.disabled(true)`, `reason:` (the help tag) |
| `loading` | `loading:` |
| `render` (a router's link element; ignored while disabled) | – |

## Keyboard and accessibility

- A real link: Enter follows it. It is underlined in every state but current and disabled, so it is never marked by colour alone; external links say they open a new tab; a loading link is `aria-busy` and says "(loading)".
- Disabled keeps focus (`role="link"`, `aria-disabled`, no `href`) so the keyboard can reach it and hear why.

## Rules

- The text says where it goes: "the export guide", never "click here".
- Mark every link that leaves the site as external.
- Give a download link its file size when you know it: "Tram map.pdf", `fileSize="2.4 MB"`.
- Turn `visited` on in documents (notes, guides), off in apps.
- Use `quiet` only where the context already says "these are links"; everywhere else keep the line.
- Give a disabled link its `reason`.

---

# Link card

A link as a glass object. A custom block: `GlassFace` with a screen tinted by the host, a `Chip` tag and a `Chip` action. React: `LinkCard` (and `linkHueDegrees`) from `@unlocalhosted/metalui`. SwiftUI: `MetalLinkCard`.

## Use it for

- A lone URL placed on a canvas: `figma.com` over `/FILE/POSTER-V3`, with `● LINK` and `OPEN ↗`.

## Don't use it for

- A link inside text: that is a `MarkUrl` host pill. A navigation control: a link or a button.

## Anatomy

250 wide: `GlassFace` (bezel 6, radius 22; screen radius 16 with its glare). The screen is 92 tall, padding 12 / 14, the host and path set at its foot; its tint is a radial of the host's hue into the screen (`#EEEDE9` on Bone, `#121316` on Graphite). `Chip variant="glass"` with a link `Led` and LINK at 10 / 10; `Chip variant="glass-action"` OPEN ↗ at 10 from the top right. The host is 620 15 / 1.2 in ink (`#1B1B1D` on Bone, `#EDEDEF` on Graphite); the path 9.5 mono uppercase at half ink, ellipsised.

## Why custom

The tinted screen and its type are drawn by no component. Everything else is `GlassFace` and `Chip`.

## Behaviour

- The card is not a click target. Only OPEN is: a real link, `target="_blank"`, `rel="noopener noreferrer"`.
- The host lifts it on hover (2, on part); the card itself does not move.

## API

| React | SwiftUI | Notes |
|---|---|---|
| `href` | `url:` | |
| `host`, `path` | `host:`, `path:` | default from the URL |
| `hue` | `hue:` | any colour; default the recipe's tint. The reference tints by host: `hsl(linkHueDegrees(host), 38%, 84%)` on Bone and `hsl(linkHueDegrees(host), 38%, 32%)` on Graphite (the recipe's tint-saturation and the colorway's tint-lightness) |
| `tag`, `openLabel` | `tag:`, `openLabel:` | the host's words (LINK, OPEN ↗) |

## Tokens

The link-card recipe (screen, host, path, chip inset), the glass-face and chip recipes.

## Preview

Pass `preview` (the backend's `GET /preview` result: `title`, `description`, `image`, `icon`) once it arrives. With a title, the title becomes the big line (2 lines at most); the host and path move into a small line with the site icon; the image sits behind the tinted glow, shaded to the bottom; the card grows from 92 to 128 on settle and the preview fades in. Never request or pass a preview for a secret block or while looking at the past. Without a title the card stays as it was: the preview is decoration, the URL is the text.

---

# Mark

Recognition made visible on the text. React: `Mark`, `MarkUrl`, `MarkInferred`, `MarkUrgency`, `MarkLife` from `@unlocalhosted/metalui` (earlier `Cue`, `CueUrl`, `CueInferred`, `CueUrgency`, `CueLife`); the checkbox is `Checkbox`. SwiftUI: `MetalCueMark`, `MetalCueTag`, `MetalCueInferred`, `MetalCueLife`, `MetalCueURLPill`, `MetalCueUrgency`, `Text.metalCue(_:colorway:)`.

## Use it for

- Marking what a recognizer understood in a person's own writing: a date, a duration, an amount, a measurement, a tag, a colour, a person, a link.
- A task's checkbox in the margin (`Checkbox`), a task the model inferred (`Checkbox ghost`), and urgency (`MarkUrgency`).
- The one life glyph trailing a block for the kind of the whole line (`MarkLife` around a `Life*Icon` at 16, with a `label`).

## Don't use it for

- Changing the text. A cue never rewrites, reflows or recolours the words beyond its kind's ink.
- Anything the person did not write: a value the model read that is not in the text is a `MarkInferred` pill after the words, never an underline.
- Status, errors or calls to action. Cues are quiet and have no toast, badge or sound.

## One grammar of kinds

Each kind has one look. The glyph says what the chunk is, at full ink just before the words it explains; the line says it was understood; the chip (hover or focus) names the glyph, then the value: `DATE · WED 30 SEP · 16:00`.

| Kind | `kind` | Glyph | Line |
|---|---|---|---|
| time | `date`, `duration` | clock (default) | engraved groove: a dark hairline with a light lip under it |
| money | `amount` | coin: pass `<LifeSpentIcon size={14} />` until the set has a coin | quiet hairline; the formatted amount is in the chip (mono, tabular) |
| body | `measurement` | pass `<LifeLateNightIcon size={14} />` for sleep (until a moon), `<LifeStepsIcon size={14} />` for steps; `label="Sleep"` | soft green, 1.5 |
| colour | `hex` | the live swatch (default) | 3 pt in the colour |
| tag | `tag` | none: the tag is its shape | a luggage tag: paper in the tag's own hue (`markTagHue(name)`, a stable hash into a 6-hue palette), the point and a punched hole on the left, the hash a quiet mark |
| person | `person` | pass `<Avatar name size="small" label="" />` | none |
| link | `MarkUrl` | the link glyph at 11 | the host pill |
| match | `match` | none | a search's matched words: weight 650, green .55 underline (result rows only) |

A derived tag (`derived-tag`) is a tag the model inferred: the same luggage tag, dashed and hollow, until confirmed.

## Anatomy

- `.mu-cue` (nowrap: a chunk never splits) holds `.mu-cue-glyph` (14, gap 3; a person 17) and `.mu-cue-words`.
- The line and the tag's paper are drawn behind the words (`.mu-cue-words::before`; the tag's paper is `::after` over its edge), so the words keep their exact advance. The tag's paper overhangs by 4.5 / 4 into the spaces around it.
- The chip is `.mu-cue::after`.

## States

| State | Prop | Look |
|---|---|---|
| rest | – | glyph, line or tag |
| fresh | `fresh` | the moment of recognition plays once (below) |
| inferred | `inferred` (default on `derived-tag`) | the line dashes, a tag goes hollow and dashed, the words step to ink2 |
| confirmed | `inferred` true → false | a small press (stamp .94 on the part spring) and one green sparkle |
| raw | `raw` | the drawing and the glyph fade on settle; the glyph keeps its slot, so nothing moves |

`MarkInferred`: dashed ink3 ring and ink2 until `confirmed`, then solid green and ink with the stamp and sparkle; with `onConfirm` it is a button ("Confirm fri, FRI 2 OCT · RECOGNIZER 0.82"). The host also confirms on Tab while the caret is in the line.

## Motion

Recognition (`fresh`), once, never looping:

1. 0 ms: the line draws in from the left (scaleX, settle spring); a tag's paper rises 3 and settles (object spring).
2. 83 ms (settle half): the glyph pops in from .35 with a small overshoot (object spring); a swatch blooms the same way.
3. Money: the figures turn one step on the drum (the drum's step, focus and spring). A box ends kerning at its edge, so the fresh amount may shift 0.66 pt; the glyph arriving hides it.
4. Date: the resolved value rises as the chip, holds (`motion.chip-hold`, 1800 ms) and fades.
5. The glyph's own act, once: the clock passes an hour; a life glyph plays its hover once (`motion.act`, 1200 ms; iteration count forced to 1).

Set `fresh` only once the caret has left the words; never while it's inside them. What is on screen when a page opens isn't news: don't set `fresh` for it. The resolved-value chip rises 3 on the part spring on hover. The dimple's tick is drawn by a pen (see Checkbox). Reduce Motion: everything is there at once; no chip-once, no act, no sparkle, no stamp.

## API

```tsx
import { Avatar, Cue, CueInferred, CueLife, CueUrl, Dimple } from '@unlocalhosted/metalui';
import { LinkIcon } from '@unlocalhosted/metalui/icons';
import { LifeCoffeeIcon, LifeLateNightIcon, LifeSpentIcon } from '@unlocalhosted/metalui/icons/life';

Send <Cue kind="tag">#poster</Cue> <Cue kind="date" resolved="WED 30 SEP · 16:00" fresh={justRecognised}>tomorrow 4pm</Cue>
for <Cue kind="amount" resolved="$40.00" glyph={<LifeSpentIcon size={14} />}>$40</Cue>,
slept <Cue kind="measurement" label="Sleep" resolved="6 H" glyph={<LifeLateNightIcon size={14} />}>6h</Cue>
to <Cue kind="person" glyph={<Avatar name="Sam Ito" size="small" label="" />}>Sam</Cue>
<CueInferred resolved="FRI 2 OCT · RECOGNIZER 0.82" confirmed={ok} onConfirm={confirm}>fri</CueInferred>
<CueLife label="A drink · coffee?" fresh={justRecognised}><LifeCoffeeIcon size={16} /></CueLife>
```

| Component | Props |
|---|---|
| `Cue` | `kind`, `resolved`, `glyph` (a node, `false` for none), `label`, `fresh`, `inferred`, `raw`, `color` (hex) |
| `CueUrl` | `host`, `glyph`, any anchor attribute |
| `CueInferred` | `resolved`, `confirmed`, `onConfirm` |
| `CueLife` | the glyph as children, `label`, `fresh`, `raw` |
| `CueUrgency` | – |
| `markTagHue(name)` | the tag's palette index (0–5) |

## Rules

- Metric-neutral words: every in-flow cue's words have the same advance as the plain text (measured width delta 0.00 pt). The glyph is the only advance a cue adds; raw keeps it.
- One look per kind; one life glyph per block, trailing, for the whole line only, with its label.
- Recognition plays once, after the caret leaves the words. Nothing loops.
- Ticking a dimple or picking a tag is a person's action: the host writes the text and offers Undo. Applying a cue never rewrites text.
- Hidden confidence is a bug: an inferred value shows where it came from (`RECOGNIZER 0.82`) in its chip and stays dashed until confirmed.
- Typing `#` in a host: list the tags already used, drawn as tags (the docs' demo shows them in a listbox; Tab picks the first).

## Accessibility

- The glyph is decorative (`aria-hidden`); its name is in the chip and the words carry the meaning. The chip also shows on keyboard focus (give a focusable cue `tabIndex={0}`).
- A confirmable `MarkInferred` is a real button with a name that says what confirming does.
- The urgency LED has the label "Due soon"; a labelled life glyph is an image with its label.
- Colour is never the only cue: each kind has its glyph or shape, inferred is dashed, tags are shapes.

## Tokens

The mark recipe's props: `glyph.*`, `groove.*` (per colorway), `line.*`, `tag.*` (pad, point, hole, saturation, lightness, edge and ink per colorway, `hue-0`…`hue-5`), `inferred.*`, `motion.*`; the foundation `--mu-cue-*`; `--mu-spring-settle`, `--mu-spring-object`, `--mu-spring-part`, `--mu-swap-*`. Swift: `MetalRecipes.mark`, `MetalCue`, `MetalTokens.<colorway>.cue*`.

---

# Menu and correction popover

A frosted plate of rows. React: `Menu`, `ContextMenu`, `MenuItem`, `MenuSeparator` from `@unlocalhosted/metalui` (Base UI Menu and Context Menu). SwiftUI: `MetalMenuPanel`, `MetalMenuItem`, `.metalMenu(isPresented:at:heading:items:)`. 

## Use it for

- **The correction popover**: right-click a cue for what it is not ("Not a Task", "Not Coffee", "Ignore “4pm”"), Reset Corrections, Ask Recognizer Again, Gather Similar; the heading is the cue's provenance.
- A "more" button's actions; a block's right-click actions.

## Don't use it for

- Running anything by name: that is the command palette.
- Choosing a value in a form (a select) or switching views (switcher).
- Naming a control (a tooltip).

## Anatomy

- **Plate**: `--mu-menu-bg` (frost-strong at .92), `raise`, radius plate (18), padding 6, at least 200 wide; 6 from its trigger, or at the pointer and kept 8 inside the window.
- **Heading** (optional): the label role, engraved: what the menu acts on.
- **Row**: 30 tall at the row radius (12, the plate nests 6), the ui role, a 14 glyph in ink2, the key on a small cap at the right. Destructive: red.
- **Separator**: an engraved 1 rule, inset 5 × 8.

## States and motion

| State | Look | Motion |
|---|---|---|
| opens | plate at the trigger or pointer; focus on the plate (first row on ↓) | fades in on settle; no travel |
| highlighted (pointer or keyboard, one state) | `--mu-menu-row-hover` | instant |
| disabled row | 40 % | – |
| choose (click, ↩) | runs, closes | fades out on release |
| ⎋ / outside | closes, nothing runs; focus back to the trigger | release |
| Reduce Transparency | opaque plate | – |
| Increase Contrast | an edge on the plate and on the highlighted row | – |

## API

```tsx
<ContextMenu heading="NOTE · TASK BY SYNC 0.82" menu={<>
  <MenuItem onSelect={() => correct({ task: false })}>Not a Task</MenuItem>
  <MenuItem onSelect={resetCorrections}>Reset Corrections</MenuItem>
  <MenuSeparator />
  <MenuItem onSelect={gatherSimilar} icon={<SearchIcon size={14} />}>Gather Similar</MenuItem>
</>}>
  <span>{cue}</span>
</ContextMenu>

<Menu trigger={<button aria-label="More"><MoreIcon size={16} /></button>}>
  <MenuItem onSelect={duplicate} shortcut="⌘D">Duplicate</MenuItem>
  <MenuItem onSelect={remove} danger shortcut="⌫">Delete</MenuItem>
</Menu>
```

## Rules

- Corrections win and are remembered for that exact text; after one, show a toast with Undo ("Correction remembered · for this exact text").
- Title Case for rows (macOS menus); the heading in the label role.
- One destructive row, last, red; its result has Undo.

## Accessibility

- Base UI Menu: `role="menu"`, rows `menuitem`, ↑ ↓ Home End and type-ahead, ↩ and Space choose, ⎋ closes and returns focus. The heading labels the group of rows.
- The context menu also opens from the keyboard's context-menu key and ⇧F10 on the focused target (the browser's `contextmenu` event).

## Tokens

`--mu-menu-*` (section), `--mu-menu-bg`, `--mu-menu-row-hover` (colorway), `--mu-raise`, `--mu-radius-plate`, `--mu-radius-row`, `--mu-engrave`, `--mu-rule`, `--mu-red`, `--mu-spring-settle`, `--mu-spring-release`. Swift: `MetalMenuMetrics`.

---

# Menubar

An app's commands under a few words across the top. React: `Menubar` from `@unlocalhosted/metalui`, on Base UI Menubar with the library's `Menu` inside. SwiftUI: `MetalMenubar` (work in progress; on macOS, use the system menu bar through `.commands`). The plates and rows are the `menu` recipe; the `menubar` recipe adds the keys.

## Use it for

- A desktop-style app in the browser with many commands grouped under a few words: File, Edit, View, Insert.

## Don't use it for

- A website's sections (use the navigation menu), or a few actions (use a toolbar or buttons).

## Anatomy

- Bar: keys 2 apart, padding 2.
- Key: a word in ui type, 26 tall, padding 10, radius 8; it lifts (the list row's look) on hover.
- Menu: the menu's frosted plate below its key, with rows, shortcuts and separators.

## States and motion

| State | Look | Motion |
|---|---|---|
| rest | quiet words | – |
| hover (nothing open) | that key lifts | – |
| open | the plate below the key; one highlight under the key | the plate fades in on settle |
| moving across while open | the highlight follows; the next menu opens | the highlight glides on the settle spring; the next menu opens at once as the last fades on release |
| close | Esc, a click outside, or a choice | the plate fades on release |

Reduce Motion: the highlight moves at once.

## API

| React | SwiftUI |
|---|---|
| `Menubar` `aria-label`, `loopFocus`, `modal`, `disabled` | `.commands { … }` |
| `Menubar.Menu` `label`, `heading`, `disabled`, children (MenuItem, MenuSeparator) | `CommandMenu(label)` |

## Keyboard and accessibility

- A `menubar`; ← → move between keys, ↓ or Enter opens a menu, ↑ ↓ move within it, ← → move to the next menu while open, Esc closes it and returns focus to its key.

## Rules

- Few words, most used first: File, Edit, View.
- Every command also has a shortcut or a place elsewhere; the bar is where people look them up.

---

# Meter

A level in a range. React: `Meter` from `@unlocalhosted/metalui`, on Base UI Meter. SwiftUI: `MetalMeter` (work in progress). The lamps are the LED part's looks (the `status` recipe); the `meter` recipe adds the segments and the sweep.

## Use it for

- A measurement that sits in a known range: storage used, battery, signal, a quota.

## Don't use it for

- A task's progress (use progress), or a value someone sets (use a slider).

## Anatomy

- Head (optional): label at the left (ui type), value at the right (meta type).
- Segments: 16 lamps in a row, 10 tall, 2 apart, radius 2.5. Lit up to the value; dark (the off lamp) above.
- Colour by position: green, amber from 75 % of the range, red from 90 % (`warn`, `danger`), measured toward the bad end: the top by default, the bottom with `bad="low"` (a battery).

## States and motion

| State | Look | Motion |
|---|---|---|
| level | lit up to the value | – |
| rising | more segments light | one segment every 16 ms upward from the old edge, each fading in 90 ms |
| falling | segments go dark | one every 16 ms downward from the old edge |

Reduce Motion: every segment changes at once.

## API

| React | SwiftUI |
|---|---|
| `value`, `min` (0), `max` (100) | `value:`, `in:` |
| `label`, `showValue`, `format` | `label:` |
| `segments` (16), `warn` (0.75), `danger` (0.9), `bad` (`high`, `low`) | `segments:` |

## Keyboard and accessibility

- A `meter` with aria-valuenow, min and max; the label names it. It takes no focus. The colours repeat what the value says; never use colour alone to warn (say it in text too).

## Rules

- A meter measures; it never counts down a task.
- Keep the zones meaningful: amber and red only where the level is a problem.

---

# Navigation menu

A site's sections across the top, with panels of links. React: `NavigationMenu` from `@unlocalhosted/metalui`, on Base UI Navigation Menu. SwiftUI: `MetalNavigationMenu` (work in progress). Keys are the `menubar` recipe's, the plate is the `menu` recipe's, links use the `row` recipe's lift; the `navigation-menu` recipe adds the panel's motion.

## Use it for

- A product or docs site's top navigation where some sections hold several pages worth describing.

## Don't use it for

- App commands (use the menubar), a path (use breadcrumbs), or views of one page (use tabs).

## Anatomy

- Keys: the menubar's words; a key with a panel has a 10 chevron; `NavigationMenu.Link top` is a plain key that goes somewhere.
- Panel: the menu's frosted plate, 8 below the key, padding 8.
- Links in a panel: rows (padding 10 × 12, radius 12) with a title (ui type) and a line (body type, ink2).

## States and motion

| State | Look | Motion |
|---|---|---|
| hover / open key | the key lifts | – |
| open | the plate under the key; chevron turned over | rises one nest on the surface spring; chevron on the part spring |
| to the next key | the plate under it at the new panel's size | slides and resizes on the settle spring; content moves two grid steps the way you went and crossfades |
| close | – | fades on the release spring |
| current page | its link lifted (`active`) | – |

Reduce Motion: size and place snap; content crossfades without travel.

## API

| React | SwiftUI |
|---|---|
| `NavigationMenu` `aria-label`, `value`, `onValueChange`, `delay`, `closeDelay` | – |
| `NavigationMenu.Item` `label`, children (the panel) | – |
| `NavigationMenu.Link` `href`, `description`, `active`, `top`, `render` (a router's link) | `NavigationLink` |

## Keyboard and accessibility

- A `nav` with a list of keys; Tab moves between keys, Enter or ↓ opens a panel and moves into it, Esc closes it and returns to the key. The current page's link says `aria-current="page"` (`active`).

## Rules

- A panel's links say what is there in a line, not just a name.
- Keep panels small: a few links a column, at most three columns.

---

# Number field

A number you step, scrub or type. React: `NumberField` from `@unlocalhosted/metalui`, on Base UI NumberField. SwiftUI: `MetalNumberField`. The well is the `well` recipe's field look at the `field` recipe's sizes and radii, the keycaps are compact buttons concentric with it, and the `number-field` recipe adds the sizes, the unit and the inspector; the motion is the system's swap drum and refusal, and the changed mark, readback and error row are the form field's.

## Use it for

- A count or amount with small steps and a sensible range: copies, columns, a font size, minutes, an opacity.
- An inspector's numbers (X, Y, W, H, rotation): `kind="inspector"`.
- A value for several selected things at once: `mixed`.

## Don't use it for

- A value where the rough position matters more than the digits (use a slider), phone numbers or codes (use a field), or large free amounts (use a field with a unit).

## Anatomy

- Label (optional): ui type, ink, above, 6 apart; drag it sideways to scrub. The changed mark hangs 6 before it while the value is off its default.
- Group: the field well, at Field's sizes: large 44 (radius 17, pad 4, 168 wide), regular 32 (11, 3, 132), compact 28 (9, 3, 112).
- Keycaps: compact caps, square (36 / 26 / 22) with the well's radius less its pad, so they are concentric; − and + are the set's `minus` and `plus` glyphs without their tile (the keycap is the tile), and they play their act on press.
- Window: the value, centred, tabular figures (content type large, lead regular, ui compact), with the unit engraved 3 after it in ink3.
- Readback (while typing arithmetic): the form field's readback line under the group.
- Limit (soft limits): the form field's error ink in meta type under the group.
- Inspector: no keycaps; the letter or glyph engraved in ink3 at the well's start (pad 8, 6 to the value) is the scrub handle; 96 / 84 wide; the value starts at the left; the changed mark sits inside at the end.

## States and motion

| State | Look | Motion |
|---|---|---|
| step (+ / ↑) | the new value | the cap sinks and its glyph acts; the value turns one drum step up on the settle spring |
| step (− / ↓) | the new value | the drum turns down |
| hold | repeats | each step turns the drum |
| ⌥ or ⇧ held (over the field or in it) | the legends say the step: "−0.1" "+0.1", "−10" "+10" | the legends turn on the drum, and back when released |
| scrub | the label drags | the drum turns the way the value went |
| at a limit | that keycap disabled | – |
| past a limit (arrow or scrub) | unchanged | only the digits shake on the refusal spring |
| typing | the draft as typed | no drum; Enter or leaving commits, Esc puts the value back |
| arithmetic | "= 96 px" under the field | the readback row opens on settle; the result turns on its drum; on commit the value turns |
| not understood | unchanged | the digits shake |
| soft limit passed | the invalid ring; "Up to 100" under the field | the row opens on settle, closes on release once the value changes |
| off its default | the changed mark | pops in on settle, leaves on release |
| back to default | the default | the drum turns the way it went |
| mixed | "Mixed" in ink3, no unit | – |
| focus | the flush green ring on the group | – |
| invalid | the foundation's invalid ring; aria-invalid | – |
| disabled | 40 % | – |

Reduce Motion: the drum crossfades; nothing shakes; the rows snap.

## Typing

Typing is a draft the field reads itself; it commits on Enter or blur. It understands:

- a plain number in the field's locale ("1.200" in de-DE), with or without the format's own marks ("€", "%") or the `unit` ("12px", "50 %");
- arithmetic on the value: `+10`, `*2`, `/2` (a leading `-` is a negative number, not a subtraction);
- a new value worked out: `=8*12`, or just `8*12`; brackets work.

Arithmetic is read back under the field before it commits ("= 96 px", or "= 120 px · up to 100 px" when it will be clamped). Anything else is refused: the digits shake and the value stays. A percent `format` is read on its shown scale (typing 50 means 50 %).

## Variations

- **Sizes**: `size` large, regular (default), compact.
- **Fine and coarse**: ⌥ steps by `smallStep`, ⇧ by `largeStep` (10), on the keycaps, arrows and scrub. `smallStep` defaults to `step` when `step` is a whole number (a count has no tenths) and to 0.1 otherwise; pass it to override. A step equal to `step` shows no legend.
- **Unit**: `unit` ("px", "%", "°"); `format` and `locale` for currency and grouping.
- **Soft limits**: `allowOutOfRange`. A typed value past a limit is kept and invalid; the keys and the scrub still clamp.
- **Back to default**: give `defaultValue` (it is the reset target even when `value` is controlled). Double-click the label (or the inspector's letter), ⌘-click (Ctrl-click) a keycap, or press ⌘⌫ (Ctrl+Backspace) in the input: the keyboard twin of ⌘-click, so ⌘ always means "back to default" here; it overrides only the delete-to-line-start of a value a few characters long. The input says it in `aria-keyshortcuts`. The changed mark shows while the value differs; a screen reader hears "Font size off its default".
- **Mixed**: `mixed` with `value={null}`. A step calls `onStep(amount)` (signed, with the modifier's step); add it to each item from its own value and keep `mixed` while they still differ. Typing (or Home / End) calls `onValueChange` with one value for all.
- **Inspector**: `kind="inspector"` with a one-letter `label` and an `aria-label` ("W", "Width"). Regular or compact (large falls back to regular).
- **Wheel**: `allowWheelScrub`: the wheel steps the value only while the field has focus, so scrolling the page never changes it.

## API

| React | SwiftUI |
|---|---|
| `value`, `defaultValue`, `onValueChange`, `onValueCommitted` | `value:` (`Double?`), `default:` |
| `min`, `max`, `step`, `smallStep` (⌥), `largeStep` (⇧) | `in:`, `step:`, `smallStep:`, `largeStep:` |
| `size` | `size:` (`MetalFieldSize`) |
| `kind` | `kind:` (`.stepper`, `.inspector`) |
| `unit`, `format`, `locale` | `unit:`, `format:` (`FloatingPointFormatStyle<Double>`) |
| `allowOutOfRange` | `softLimits:` |
| `mixed`, `onStep` | `mixed:`, `onStep:` |
| `allowWheelScrub` | `wheel:` |
| `label`, `aria-label`, `decrementLabel`, `incrementLabel` | `label:`, `letter:` |
| `invalid`, `disabled`, `readOnly`, `required`, `name` | `invalid:`, `.disabled()` |

## Keyboard and accessibility

- The input is a text input described as "Number field" (Base UI): ↑ ↓ step, ⇧ by the large step, ⌥ by the small one, Home and End go to the limits; Enter commits a draft and Esc drops it. The keycaps are named "Decrease" and "Increase" and are skipped by Tab.
- `label` names the input (aria-labelledby); without it, or in the inspector, pass `aria-label`.
- The readback and the limit line describe the input (aria-describedby) while they show.
- Back to default: ⌘⌫ (Ctrl+Backspace) in the input, while there is a `defaultValue`.

## Thumbwheel: prototyped, not shipped

The docs page holds a thumbwheel prototype (a detented wheel standing out of the well's end, one detent per step, a heavier one per large step, a haptic per detent) beside a scrubbed field. It does not read better than scrubbing: the wheel is a second gesture (vertical) for the same job the label's scrub (horizontal) already does, it is 18 wide so it is hard to find and hit, its detents are only felt where there are haptics (not in a Mac or PC browser), and it gives up the keycaps' discoverable steps. It stays a prototype; revisit it only for a hardware-like block where a wheel is the whole control.

## Rules

- Give it a range. A number field without limits is a text field.
- The drum turns the way the number went: up for more, down for less.
- A refusal moves only the digits.
- A modifier that changes the step changes the legends while it is held.
- The unit is engraved in the well, never typed into the value and never printed outside it.

---

# Pagination

Moving through pages of results. React: `Pagination` from `@unlocalhosted/metalui`. SwiftUI: `MetalPagination` (work in progress). The track, thumb and keys are the `switcher` recipe; the `pagination` recipe adds the page window.

## Use it for

- Results people move through by page and may return to by number: search results, an archive, a table.

## Don't use it for

- A feed people scroll (load more as they reach the end), or steps of a task (use a stepper).

## Anatomy

- `nav` named "Pagination", holding the switcher's sunk track.
- Keys: previous (a chevron), the page numbers (at least 28 wide, tabular figures), next.
- The current page: the switcher's raised thumb.
- Long runs: the first and last pages, the current one and `siblings` (1) on each side, ellipses for the gaps.

## States and motion

| State | Look | Motion |
|---|---|---|
| current | the raised thumb under its number | – |
| choose a page | the thumb under the new number | glides on the part spring |
| first / last page | previous / next disabled (40 %) | – |
| focus | the switcher's focus ring | – |

Reduce Motion: the thumb moves at once.

## API

| React | SwiftUI |
|---|---|
| `page` (from 1), `count`, `onPageChange` | `page:`, `count:` |
| `siblings` (1) | – |
| `aria-label` ("Pagination") | – |

## Keyboard and accessibility

- A `nav` landmark; every key is a button named "Page 3", "Previous page", "Next page"; the current page says `aria-current="page"`. Tab moves through the keys.

## Rules

- Keep the page in the address when you can, so a page can be shared.
- Show the page count somewhere near ("Page 3 of 12") when it matters.

---

# Past banner

Says the canvas is showing the past, and brings it back. A composition block. React: `PastBanner` from `@unlocalhosted/metalui`. SwiftUI: `MetalPastBanner`.

## Use it for

- While the time scrubber views a past moment: `MEMORY · viewing Tue 23 Sep · 14:10 · [Back to Now ⎋]`.

## Don't use it for

- Notifications, errors or any other status. It is the only chrome that changes in the past, and only then.

## Anatomy

`Surface material="graphite-plain" radius="pill"`, 34 tall at the top centre, padding 0 6 0 14, gap 10: `Label variant="dark"` MEMORY; `Label variant="on-graphite"` the moment; `Button cap="graphite"` Back to Now with a `Kbd` ⎋ 7 after it.

## States and motion

| State | Motion |
|---|---|
| scrubbed into the past | drops one nest from above on surface (a crossfade under Reduce Motion) |
| Back to Now pressed | the cap presses 1; the host returns and removes the banner (release) |

## API

| React | SwiftUI |
|---|---|
| `moment` | `moment:` |
| `onBack` | `onBack:` |

## Rules

- Shown only while in the past; ⎋ does the same as the cap.
- The moment reads like a sentence: "viewing Tue 23 Sep · 14:10".

## Accessibility

- A `status` region, so arriving in the past is announced. Back to Now is a real button with its shortcut (`aria-keyshortcuts="Escape"`).

## Tokens

Layout: `--mu-pastbanner-*`. Look: the surface, label, button and kbd recipes. Motion: `--mu-spring-surface`, `--mu-motion-nest`. Swift: `MetalPastBannerMetrics`.

---

# Perfect preview

Hold to perfect. React: `PerfectPreview` from `@unlocalhosted/metalui`. SwiftUI: `MetalPerfectPreview` (not yet).

## Use it for

- The pen or pencil held still at the end of a rough line, circle, rectangle or triangle (DRAWING.md DR-05). The core's `shape_recognize` gives the fitted shape.

## Don't use it for

- A large closed loop released without holding: that is still a region.

## Flow

1. Pointer still for a moment with a fitted shape: `phase="holding"`, `d` = fitted outline.
2. The outline traces round over 450 ms (`--mu-r-perfect-self-hold`). `onHeld` fires when it closes.
3. Host sets `phase="done"` and morphs the drawn points to the shape over 180 ms on the settle spring (`--mu-r-perfect-self-morph`, `--mu-spring-settle`); the outline fades over the same time. Then `idle`.
4. Still holding after the morph: `phase="tuning"` with `tune={centre, pointer, angle, scale}`. The host turns and resizes the shape around its centre from the pointer (angle catches at every 45° within 5°); this draws the centre dot, the dashed guide and the readout. Letting go places it.
5. Pointer moves or Escape during 1–2: `phase="idle"` at once; keep the hand-drawn stroke.

## Look

1.5 green line (screen width at any zoom), 70 %. Graphite uses the lighter green. Reduce Motion: shown whole, no trace.

## API

`PerfectPreview d phase tune scale onHeld`

Recognition (the core's `shape_recognize`) should judge closed strokes on the convex hull: biggest inner triangle ≥ .62 of it → triangle; fills ≥ .835 of its tightest box, or its biggest 4-gon ≥ .77 → rectangle (that box, level within 10°); else ellipse in that box. See the docs page's measured table.

---

# Popover

A small panel that comes out of its trigger. React: `Popover` from `@unlocalhosted/metalui`, on Base UI Popover. SwiftUI: `MetalPopover` (work in progress). The plate is the `menu` recipe's frosted plate; the `popover` recipe adds padding, width, text and motion.

## Use it for

- A small task beside the thing it acts on: rename, pick a colour, share a link, confirm a detail. It holds real content: a title, a line, a few controls.

## Don't use it for

- A list of commands (use a menu), a hint on hover (use a tooltip), a choice from options (use a select), or anything that must stop the page until answered (use a dialog).

## Anatomy

- Plate: the menu's frost, radius 18, padding 14, 220 to 320 wide, 6 from its trigger.
- Title (title type), Description (body type, ink2) 4 below it, Body 12 below that.

## States and motion

| State | Look | Motion |
|---|---|---|
| closed | nothing | – |
| opening | the plate starts one nest (6) back toward its trigger, at 0.97, transparent, grown from the trigger's side | rises and fades in together on the surface spring (no overshoot) |
| open | at rest beside the trigger; focus inside | – |
| closing | fades out where it is | release spring; no travel back |
| flipped | if there is no room, it opens on the other side and rises from that side | same |

Reduce Motion: a crossfade.

## API

| React | SwiftUI |
|---|---|
| `Popover.Root` `open`, `defaultOpen`, `onOpenChange`, `modal` | `isPresented:` |
| `Popover.Trigger` (children: the control) | `trigger:` |
| `Popover.Content` `side`, `align` | `arrowEdge:` |
| `Popover.Title`, `Popover.Description`, `Popover.Body`, `Popover.Close` | slots |

## Keyboard and accessibility

- The trigger opens and closes it (Enter or Space). Focus moves into the plate; Tab stays within while open only if `modal`.
- Esc or a click outside closes it and returns focus to the trigger.
- Title and Description name and describe the popup (a dialog role with aria-labelledby and aria-describedby).

## Rules

- It comes from its trigger and goes back to nothing: open on the side with room, never centred on the page.
- Keep it small. If it needs scrolling or more than a few controls, it is a dialog.
- One popover at a time.
- **A confirm that commits a small edit is a Quick edit** (`QuickEdit` in `Popover.Body`; quick-edit.agent.md): Rename, Save region, Tag. The key leads with its glyph (`pen` for Rename) and stays off while the value is empty or unchanged; the name opens selected (a file's extension kept out); Enter commits, Esc cancels; a name it can't take keeps the plate open with the invalid ring and the reason; while it saves the key waits and the field locks; done, the glyph morphs to `check` and the word to "Renamed" on the drum, and the plate closes after the hold; a failure morphs to `sync-error` with Try again. Offer Undo in a toast: "Renamed to Lisbon · Undo". Control the popover (`open`, `onOpenChange`) so Quick edit's `onClose` can close it.

---

# Preview card

What is behind a link, seen by resting on it. React: `PreviewCard` from `@unlocalhosted/metalui`, on Base UI Preview Card. SwiftUI: `MetalPreviewCard` (work in progress). The plate, rise and text are the `popover` recipe's; the `preview-card` recipe adds the width and timing.

## Use it for

- Links whose destination is worth a glance before going: a person, a document, another site.

## Don't use it for

- Anything people must see or act on (it only shows on hover), labels for icons (use a tooltip), or actions (use a popover).

## Anatomy

- The link, unchanged.
- Card: the popover's frosted plate, 300 wide, 6 below the link; an optional image (140 tall, radius 10), the title (title type), a line (body type, ink2), the host (meta type, ink3), 6 apart.

## States and motion

| State | Look | Motion |
|---|---|---|
| hover, under 600 ms | the link only | – |
| hover, 600 ms | the card | rises one nest out of the link on the surface spring |
| pointer on the card | the card stays | – |
| pointer away | the card stays 300 ms | then fades on the release spring |

Reduce Motion: a crossfade.

## API

| React | SwiftUI |
|---|---|
| children (the link) | – |
| `preview` (`title`, `description`, `host`, `image`) | – |
| `side` (`bottom`, `top`) | – |

## Keyboard and accessibility

- The card also opens when the link takes keyboard focus. It is a supplement: the link itself must say where it goes; nothing in the card is needed to use the page.

## Rules

- Only for links; never put controls in a preview card.
- Keep it to a glance: an image, a title and a line.

---

# Progress

How far a task has come. React: `Progress` from `@unlocalhosted/metalui`, on Base UI Progress. SwiftUI: `MetalProgress`. The track and fill are the `switch` recipe's sunk track and green on look; the `progress` recipe adds the sizes, the head, the failed ink and the motion. The ring is the Spinner's ring with a value (one ring, not a fork).

## Use it for

- A task that takes more than a moment and whose end you can see or estimate: an upload, an export, a sync.
- `value={null}` when the amount is unknown but something is happening.
- Known steps (a setup, a wizard): `steps={4}`, `value` counts the steps done.
- Media: `buffer` for how much is loaded ahead of the playhead.

## Don't use it for

- A level or a measurement that is not a task (use Meter), or a wait under a second (show nothing; Button `state` and Spinner cover short waits).

## Anatomy

- Head (bar only): a glyph (`icon`, 16; 14 compact, ink2), the label (ui type; meta when compact), and at the right the value (`showValue`, tabular) or `detail` ("8 of 12 · about 20 s"). Both turn on the drum.
- Track: a pill well, 8 tall (6 compact, 3 slim), at least 160 wide; `steps` splits it into one well per step, 3 apart.
- Fill: the switch's green on look, a whole pill slid in from the start (translate), so its leading edge is always round. Buffer: the same look at 40 % ahead of it.

## States and motion

| State | Look | Motion |
|---|---|---|
| running | the fill reaches the value | rising: the edge moves on the settle spring, never past the value; falling (reset, cancel): it drains on the release spring |
| unknown (`value={null}`) | a short lit segment (32 % of the track) | sweeps across and loops, 1.4 s ease-in-out |
| paused | the fill holds and dims to 45 % | fade |
| failed | the fill stops where it was in the failed ink (red) | cross-fade |
| complete | full | the fill lands first; then the head shows the glyph and label you passed for complete (held until then) |
| cancelled | (a value of 0 while running) | drains back on the release spring |

Reduce Motion: the edge snaps; the unknown segment sits in the middle and breathes (opacity); fades stay.

## Shapes and sizes

- `shape="bar"` (default): head + track.
- `shape="slim"`: no head (the label still names it), 3 tall, along an edge: under a toolbar, along a card's bottom edge (`absolute inset-x-0 bottom-0`).
- `shape="ring"`: the Spinner's ring in the host's ink, 16 (12 compact): it turns while unknown, fills once known, turns red on failure, dims when paused, and draws the check's tick once complete lands. Put it in a key's `icon` slot or beside an avatar.
- `steps={n}`: segmented; with `showValue` the head says "Step 2 of 4" (and so does aria-valuetext).
- `buffer={n}`: buffered, on the same scale as `value`.
- `size="compact"` for a row or a toast; `regular` for a dialog or a page.

## API

| React | SwiftUI |
|---|---|
| `value` (number or `null`), `min`, `max` (100, or `steps`) | `value:` (`Double?`), `total:` |
| `label`, `icon` (a node: pass a MorphIcon) | `_ label`, `icon:` (`MetalIconName`; complete shows check, failed sync-error) |
| `showValue`, `detail` | `showValue:`, `detail:` |
| `state`: `running` · `paused` · `failed` · `complete` | `state:` |
| `shape`: `bar` · `slim` · `ring`; `steps`; `buffer` | `shape:`, `steps:`, `buffer:` |
| `size`: `regular` · `compact` | `size:` |
| `format` (Intl.NumberFormat options for the value) | – |
| `Progress.Root` with your own `Progress.Label`, `Progress.Value`, `Progress.Track` | – |

## Recipes

```tsx
// An export: the key turns to Cancel while it runs; Reset drains to 0 %.
<Progress value={pct} state={done ? 'complete' : 'running'} label={done ? 'Exported 12 photos' : 'Exporting 12 photos'}
  icon={<MorphIcon name={done ? 'check' : 'download'} />} showValue />
<Button icon={<MorphIcon name={running ? 'close' : 'download'} />} onClick={running ? cancel : run}>
  <SwapText value={running ? 'Cancel' : 'Run export'} />
</Button>

// Failed: the words and the action say it, not only the red.
<Progress value={pct} state="failed" icon={<MorphIcon name="sync-error" />} label="Couldn’t export: the disk is full" />
<Button size="compact" icon={<MorphIcon name="retry" />}>Try again</Button>
```

## Keyboard and accessibility

- A `progressbar` with aria-valuenow (absent when unknown); steps add aria-valuetext "Step 2 of 4". The label names it (on slim and ring it is visually hidden); give `aria-label` when there is no label.
- It takes no focus. Say when it is done somewhere that is announced (a toast); a ring that completes says its label once.
- Never let red alone say it failed: change the glyph and the words, and offer Try again.

## Rules

- The fill never moves backward unless the task really did (reset, cancel, a real rollback); when it does, it drains, never jumps.
- Say what is in progress in the label, not "Loading…"; when you can count, say so in `detail`.
- Only `transform` and `opacity` animate: the fill slides, the failed ink and the pause fade.

---

# Properties

Label and value pairs. React: `Properties` from `@unlocalhosted/metalui`. SwiftUI: `MetalProperties`. A part: a `<dl>` with the `label`'s engraving and the `rule`'s hairline; the `properties` recipe adds the sizes and the narrow stack.

## Use it for

- One thing's details: a receipt, a details panel beside a table, a spec sheet, the fields of an opened row.

## Don't use it for

- Many things with the same fields (use `Table`), or values someone edits (use form fields).

## Anatomy

- `Properties.Root` (`Properties`): a `dl` in two columns: labels as wide as the longest (up to 200), values in the rest.
- `Properties.Item`: one pair: `label` (a `dt`, engraved) and its value (a `dd`, ui type, ink, tabular figures).
- Each pair is parted by a hairline; the last is open.
- Values: text, or a `TableCell` in its kind's look (status, person, code, currency, date), so a details panel reads like the table it came from. A missing value is "—" in ink3.

## Sizes

| Size | Pair height | Padding | Gap |
|---|---|---|---|
| regular | at least 32 | 6 | 16 |
| compact | at least 24 | 3 | 12 |

Under 280 wide (its own container, `@container/properties`) the label stands above its value.

## States and motion

None: it is still.

## API

| React | SwiftUI |
|---|---|
| `Properties` `size` | `MetalProperties(size:) { … }` |
| `Properties.Item` `label`, children | `MetalProperty(_ label:) { value }` |

## Keyboard and accessibility

- A real description list: assistive tech reads each label with its value. Nothing in it takes focus unless a value does (a copy key in a code value).

## Rules

- Labels are nouns, short ("Due", "Owner"); put a unit in the label ("Amount (€)") as a table does in its header.
- Keep the order the table uses for the same thing.

---

# Provenance tooltip

One hover away from every cue: where it came from. A composition block: a wrapped `Tooltip` with the detail in `Tooltip.Dim`. React: `ProvenanceTooltip` (and `ProvenanceProvider` around a canvas) from `@unlocalhosted/metalui`. SwiftUI: `.metalProvenance(_:detail:)` or `MetalProvenanceTooltip`.

## Use it for

- Every cue the app applied: `Rule · date parser`, `Recognizer · 0.82`, `Region · Done`, `Cluster · poster`, `Formula`, `You` (a correction).

## Don't use it for

- Tooltips on chrome (a tool's name and key). Those are the toolbar's tooltips.
- Long explanations. The source, then the detail.
- Hiding confidence. If the app guessed, the number is shown.

## Anatomy

`Tooltip wrap` (the graphite fill with no backdrop, radius 11, padding 6 / 10, max 280 wide, 10 mono at 1.45, tracked .05em): the source in its ink, the detail after a middle dot in `Tooltip.Dim`. It waits 380 ms, sits 8 above the cue, or 34 above a cue that shows its own value chip on hover, and flips below near the top of the view.

## States and motion

| State | What shows | Motion |
|---|---|---|
| rest | nothing | – |
| hovered or focused 380 ms | the tooltip | fade on settle |
| next cue within the group | the next tooltip at once | – |
| leave, Escape | hidden | fade on settle |

## API

```tsx
<ProvenanceProvider>
  <ProvenanceTooltip source="Recognizer" detail={['0.82']} clearsChip>
    <Mark kind="date" resolved="TUE 30 SEP">tomorrow</Mark>
  </ProvenanceTooltip>
</ProvenanceProvider>
```

| Prop | Notes |
|---|---|
| `source` | first, in the tooltip's ink |
| `detail` | dimmed, after a middle dot |
| `clearsChip` | the cue has its own value chip: sit above it |
| `open` | controlled |

## Rules

- Every applied cue has provenance, and a guess shows its number.
- The source first.
- It never covers the cue's own value chip.

## Accessibility

- Base UI Tooltip: it opens on hover and on keyboard focus and closes on Escape. Tooltips are visual only, so the block also sets the cue's `aria-description` to the provenance ("Recognizer, 0.82"). The cue stays the focusable element.
- It never holds interactive content.

## Tokens

Timing and placement: `--mu-provenance-delay-ms`, `--mu-provenance-offset`, `--mu-provenance-chip-offset`. Look: the tooltip recipe. Swift: `MetalProvenance`.

---

# Quick edit

One short value edited where it stands and committed with one key. React: `QuickEdit` from `@unlocalhosted/metalui`. SwiftUI: `MetalQuickEdit`. It is the pattern for every confirm that commits a small edit: Rename, Save region, Tag, a label. It goes in a popover's body or a dialog; the plate's title says what is edited. The looks are the field, form field and button recipes; the `quick-edit` recipe adds the gaps and the hold.

## Use it for

- Renaming a region, a canvas, a file; tagging; naming a saved view. One value, one key.

## Don't use it for

- Several fields, or a choice from options (a form in a dialog, a select).
- Editing a name in place on the object itself (the region's own title edits inline).
- A comment or anything that wraps: a textarea's confirm follows the same rules, but this component is one line.

## Anatomy

- A regular (32) field, the field's invalid ring and the form field's error line under it (meta type, red).
- 10 below: the actions, 8 apart, at the end: Cancel (words only), then the primary key leading with its glyph (`pen` for Rename).

## States and motion

| State | Field | Key | Motion |
|---|---|---|---|
| open | focused, the value selected (a file: the name without its extension) | the verb, off | – |
| unchanged or empty | – | off (`disabled`); Enter does nothing | – |
| changed | – | on | – |
| not accepted (on commit) | the invalid ring; the reason under it; the plate stays | on | the error row grows open on the settle spring; it checks live after that and closes when fixed |
| saving | locked (read-only); Cancel and Escape held off | held down (`state="waiting"`), "Renaming…" on the drum; the arc after the spinner's 400 ms delay | the drum turns |
| done | locked; Cancel or Esc close it early | held (`state="done"`), glyph morphs `pen` → `check`, "Renamed" | morph on the settle spring; the plate closes after the hold (800 ms) |
| failed | unlocked, focused | glyph morphs to `sync-error`, "Try again"; pressing it retries | editing turns the key back to the verb and `pen` |

Reduce Motion: the glyph and the word change in place; the hold stays (it is for reading). A sync `onCommit` skips saving and goes straight to done.

## API

| React | SwiftUI |
|---|---|
| `value` (what it is now) | `value:` |
| `label` (names the field: "Region name") | first argument |
| `onCommit(next)`: the trimmed value; return a promise for an async save, reject to fail | `onCommit: (String) async throws -> Void` |
| `onClose()`: Cancel, and the hold after a commit lands | `onClose:` |
| `validate(next)`: the reason it is not accepted, or nothing | `validate:` |
| `extension`: a file name; its extension stays out of the selection | `keepsExtension:` |
| `words` `{ verb, doing, done, failed }`, default Rename / Renaming… / Renamed / Couldn’t rename | `words:` (`.rename`) |
| `icon` (a morph-family glyph), default `pen` | `icon:` (`.pen`) |

```tsx
const toast = useToast(); // under a ToastProvider
<Popover open={open} onOpenChange={setOpen}>
  <Popover.Trigger><Button icon={<PenIcon />}>Rename…</Button></Popover.Trigger>
  <Popover.Content>
    <Popover.Title>Rename region</Popover.Title>
    <Popover.Body>
      <QuickEdit
        label="Region name"
        value={name}
        validate={(next) => (taken.has(next) ? `A region is already called ${next}.` : null)}
        onCommit={async (next) => {
          const was = name;
          await save(next);
          setName(next);
          toast.show({ title: `Renamed to ${next}`, undo: () => setName(was) });
        }}
        onClose={() => setOpen(false)}
      />
    </Popover.Body>
  </Popover.Content>
</Popover>
```

```swift
MetalQuickEdit("Region name", value: name,
               validate: { taken.contains($0) ? "A region is already called \($0)." : nil },
               onCommit: { next in try await save(next); deck.show(.init("Renamed to \(next)", undo: { name = was })) },
               onClose: { renaming = false })
```

## Keyboard and accessibility

- Enter commits (the form's submit; nothing when the key is off). Escape cancels through the plate (the popover's or dialog's own Escape); while a save is out, Escape waits.
- The field is named by `label`; when not accepted it says aria-invalid and the reason is read with it.
- The key's word is its name; it says aria-busy while saving. Done and failed are announced (a status region).

## Rules

- **Every confirm that commits a small edit follows this**: it leads with its glyph, is off while nothing changed, refuses with a reason instead of closing, holds while saving, shows done on the key (glyph to `check`, word on the drum) before the plate closes, and fails on the key (`sync-error`, Try again).
- Offer Undo in a toast when it lands, in the action's words: "Renamed to Lisbon · Undo". The toast is the host's (`useToast`), so the host words it and undoes it; ⌘Z runs the newest Undo.
- The reason says what to do: "A region is already called Lisbon.", "Keep it to 40 characters." Not "Invalid".
- Don't close on a refusal or a failure; the person's text stays.
- Swift: the glyph cross-fades (no Swift morph yet) and the word changes on the settle animation.

---

# Radio group

One choice from a short list. React: `RadioGroup` and `Radio` from `@unlocalhosted/metalui`, on Base UI RadioGroup and Radio. SwiftUI: `MetalRadioGroup` (work in progress). The well's look is the `checkbox` recipe made round; the `radio` recipe adds the pip, the row and the motion.

## Use it for

- Two to about six options where every option should be visible at once, and exactly one holds: "Export as PNG · SVG · PDF".

## Don't use it for

- On or off (use a switch), several at once (use checkboxes), a long list (use a select), or switching views in place (use a switcher).

## Anatomy

- Group: the options stacked (gap 4) or in a line (`orientation="horizontal"`, gap 16).
- Row: a label, at least 24 tall; the well and the text 8 apart. The whole row is the hit area.
- Well: 16, round, the checkbox well; chosen, the checkbox's dark on look.
- Pip: 6, white, centred in the well.

## States and motion

| State | Look | Motion |
|---|---|---|
| rest | a recessed round well | – |
| hover | the well darkens a step (unchosen only) | 160 ms |
| pressed | the well already takes the dark on look | 50 ms: the key is going down |
| chosen | dark well, white pip | the pip scales in on the part spring (may overshoot against its stop) |
| the old choice | back to rest | its pip drops out on the release spring, in the same frame the new one latches |
| cancel (press, drag off) | back to rest | the well fades back; nothing latches |
| focus | the green ring on the well | keyboard only |
| invalid | a red hairline ring on unchosen wells | – |
| disabled | 40 %, no hover, no press; a disabled group keeps one Tab stop (its choice, announced as dimmed) so a keyboard user can reach it and hear why: give it an `aria-describedby` that says what turns it on | – |

Arrow keys choose without the press phase: the latch and release are the same. Reduce Motion: the pip is there or not at once; the well colour still fades.

## API

| React | SwiftUI |
|---|---|
| `RadioGroup` `value`, `defaultValue`, `onValueChange` | `selection:` |
| `RadioGroup` `orientation` (`vertical`, `horizontal`) | `axis:` |
| `RadioGroup` `name`, `disabled`, `readOnly`, `required` | `.disabled()` |
| `Radio` `value`, `disabled`, children (the label) | `MetalRadio(value:) { label }` |
| `RadioGroup.Root`, `RadioGroup.Item` | slots |

## Keyboard and accessibility

- The group is a `radiogroup`; each option is a `radio`. Tab enters on the chosen option (or the first); arrow keys move and choose; Space chooses the focused one.
- Name the group: `aria-labelledby` to a visible heading, or `aria-label`. Each option's label is its text.
- Inside a Base UI Field, `invalid` shows the red ring and the Field's error text explains it.

## Rules

- Every option is visible; if the list does not fit, it is a select.
- Order options in a meaningful way (most common first, or natural order), and choose a default when one is safe.
- Labels are short nouns or phrases in the same form: "PNG", "SVG", "PDF".

---

# Region

A drawn rectangle with a name that carries a rule. A composition block. React: `Region` (with parts `Region.Root`, `Region.Header`, `Region.Name`, `Region.Rule`, `Region.Count`, `Region.Body`, `Region.Row`) and `RegionRow` from `@unlocalhosted/metalui`. SwiftUI: `MetalRegion { header: … rows: … }` and `MetalRegionRow`.

## Use it for

- Arrangement that means something: `Done` ticks what lands, `To do` and `Doing` make tasks or reopen them, `This week`, `friday` or `tomorrow` date what lands, any other name tags what lands.
- Kanban (three adjacent regions), a pipeline (N in a row), an inbox (a pinned lens that makes tasks).
- A pinned lens: a live query kept on the canvas as a frosted plate of rows (`lens`).

## Don't use it for

- Grouping chrome, cards in a settings page or a list. It is a canvas object.
- A container that owns its blocks: blocks sit in it by position only, and dragging them out undoes the rule unless the rule says otherwise.

## Anatomy

- **Root**: `Well variant="region"` (a sunk rectangle, radius 26; `over` lights it green with a 1 pt ring), or `Surface material="lens"` for a pinned lens (a frosted plate, blur 10).
- **Header**, 44 tall (padding 14 / 18, grab cursor, baseline-aligned, gap 10): **Name** `Label variant="title"` (empty: "name this region" in ink3; a field while renaming), **Rule** `Label variant="engraved"` (`marks tasks done`; `tone="accent"` while over), **Count** `Label variant="count"`.
- **Body** (lens only): inset 12, 46 from the top, holding **Row**s: `Row variant="list"` with a `Checkbox size="row"` lead, the text, and the day as an engraving at the right.

## States and motion

| State | Look | Motion |
|---|---|---|
| rest | the well | – |
| over (a block is dragged above) | green fill, 1 pt green ring, the rule reads `drop to mark tasks done` in green | fill and ring on settle |
| drop | the block settles inside its edges, never on a neighbour | the host lands it on the `object` spring (a stop) |
| dim (an in-place lens has no match inside) | .35 | settle |
| past (did not exist at the scrubbed time) | 0, no pointer | settle |
| rename | the name is a field; Enter commits, Escape restores | – |
| selected | the Selection frame at the region's radius | – |

## API

| React | SwiftUI | Notes |
|---|---|---|
| `name`, `rule`, `dropRule`, `count` | same | the host derives the rule from the name |
| `over`, `dim`, `past` | `state:` | |
| `lens` + children (`RegionRow`) | `lens:` + `rows:` | |
| parts: `Region.Root` … `Region.Row` | `header:`, `rows:` | rearrange without forking |
| `renaming`, `onRename`, `onRenameCancel` | `renaming:`, `onRename:` | |
| `width`, `height` | (its frame) | picks the radius |

```tsx
<Region name="Done" rule="marks tasks done" dropRule="drop to mark tasks done" count={3} over={dragOver === 'done'} width={320} height={260} />
<Region name="open tasks" rule="lens · live" lens width={300} height={220}>
  <RegionRow lead={<Checkbox size="row" aria-label="Send the poster" />} meta="FRI">Send the poster</RegionRow>
</Region>
```

## Rules

- Placement is meaning, and reversible. A drop applies the rule with a toast that names it and offers Undo; dragging out undoes it unless the rule says otherwise.
- A dropped block settles inside the edges on `object` and never lands on a neighbour.
- The head says the rule in words; the over state says what the drop will do.
- A lens region holds nothing: its rows are the real blocks, and ticking a row ticks the block.

## Accessibility

- A region is a group named "Region Done, marks tasks done". Its rows are focusable and its dimples are real checkboxes.
- The drop is a pointer gesture; the keyboard path is the tool strip's Region verb and the palette.
- Colour is never alone: the over state also rewrites the rule in words.

## Tokens

Layout: `--mu-region-*` (head, body, the name's minimum, dim). Look: the well, surface, label and row recipes. Swift: `MetalRegion`.

---

# Row

A row in a list. React: `Row` with parts `Row.Root`, `Row.Lead`, `Row.Text`, `Row.Trail`. SwiftUI: `MetalRow { lead: … text: … trail: … }`.

## Variants

- `list`: a compact row of a pinned query: 5 / 8 padding, radius 12, 13 pt; hover and focus raise it.
- `panel`: a row of a gathered panel: 8 / 12 padding, radius 14, 14 pt; hover and focus raise it.
- `option`: a palette row, 36 tall, radius 12; the active row (`active`, or Base UI's `data-highlighted`) raises with a 2.5 green rail at its left edge.

## States

- `checked`: `Row.Text` is struck through in ink3. `maybe`: a weak match at 55 %.
- `selected` (any variant): a picked row, one of several (a task in a multi-select): the option's raised plate, held through hover. Visual only: set `aria-selected` yourself where the row's role allows it (`row`, `option`).
- `opened` (any variant): the row whose detail is showing: the 2.5 green rail at its left edge, without the raise.

## Keyboard and accessibility

- The host gives the row its role (`listitem`, `option`, `row`) and makes it focusable when it acts; focus shows the same raise as hover.

## Waiting

- `waiting` (useWait's `busy`): the row is held (aria-busy, no pointer) and every part but the one holding a `Spinner` dims. Put `<Spinner phase={wait.phase}>` around the row's glyph so the ring stands in for it after the show delay and draws a tick when done (spinner.agent.md, "On a small item").

---

# Rule

An engraved groove between groups. React: `Rule`. SwiftUI: `MetalRule`.

## Use it for

- Separating groups of tools or footer keys; `tone="graphite"` on dark strips. The caller sets the length (height of a vertical rule) through layout.

## Behaviour

- `role="separator"` with its orientation.

---

# Scroll area

A region that scrolls, with the system's own scrollbar. React: `ScrollArea` from `@unlocalhosted/metalui`, on Base UI ScrollArea. SwiftUI: `MetalScrollArea` (work in progress). The `scroll-area` recipe draws the bar, the thumb and the edge fades.

## Use it for

- A list or text inside a fixed frame: a panel's rows, a long description in a popover, a sheet's content.

## Don't use it for

- The page itself (let the window scroll), or content that fits (it shows nothing then anyway).

## Anatomy

- Viewport: the content; give the area a height or max-height.
- Edge fades: 20 at the top and bottom, only where there is more beyond.
- Bar: 12 wide at the right, inset 2; thumb 4 wide (8 when reached for), ink at 28 %.

## States and motion

| State | Look | Motion |
|---|---|---|
| rest | no bar; fades where there is more | – |
| scrolling | the bar shows | fades in on the settle spring; edge fades grow and shrink with the distance |
| stopped | the bar leaves | 600 ms later, fades on the release spring |
| reaching for the bar | the thumb widens to 8 | part spring |

Reduce Motion: the thumb's width snaps; the fades stay.

## API

| React | SwiftUI |
|---|---|
| children (the content) | `content:` |
| `className` (give it a height or max-height) | `.frame(maxHeight:)` |
| `aria-label` (makes it a named region) | `.accessibilityLabel` |
| `viewportRef` (the element that scrolls: scroll it, read its position, listen to scroll) | `ScrollViewReader`, `.onScrollGeometryChange` |

## Keyboard and accessibility

- The viewport takes focus (Tab) and scrolls with the arrow keys, Page Up and Down, Home and End. Name it with `aria-label` when it is a region of its own.

## Rules

- A scroll area inside a scroll area is a trap; give the inner one a clear frame or avoid it.
- Let the fades say "there is more"; do not add "scroll for more" text.

---

# Select

One value from a list of named options. React: `Select` from `@unlocalhosted/metalui`. SwiftUI: `MetalSelect`.

## Use it for

- A value picked from a list: an icon, a folder colour, where to move a block, a preset, a setting with more than four choices.

## Don't use it for

- Two to four short options that fit side by side: `Switcher`.
- A long list someone will search: a combobox (to come).
- An action: `Menu`.
- On or off: `Switch` or `Checkbox`.

## Anatomy

A trigger that is a raised cap (the button cap, it is clicked): the value (with its lead, if any) and an up-down chevron. The list is the menu's frosted plate: rows 30 tall, an LED slot (14), an optional lead, the label; groups get an engraved heading and a separator.

## States and motion

| State | Look | Motion |
|---|---|---|
| rest | the raised cap; placeholder in ink3 | – |
| hover | the cap lightens; chevron ink2 | .16 s fade |
| press | the cap sinks | button press |
| open | the cap stays pressed in; chevron ink | button spring |
| focus | focus ring (keyboard) | – |
| disabled | 40 % | – |
| invalid | a thin red ring inside the cap | – |
| list opens | the chosen row over the trigger when there is room, else below | scale .97 → 1 and fade, surface spring |
| list closes | – | fade .12 s |
| highlight | one soft highlight shared by pointer and keys | glides row to row, settle spring, no bounce |
| chosen row | green LED before the label | – |

Keys: ↵, Space or ↓ opens; ↑ ↓, Home, End, type-ahead move; ↵ chooses; ⎋ closes. Reduce Motion: fade only.

## API

`Select options value onValueChange placeholder size ("regular" 32 | "compact" 28) disabled invalid aria-label name`

`options` is `[{ value, label, lead?, disabled? }]` or groups `[{ label, options }]`.

---

# Selection frame

the object sheet: the one selection for every kind of object. React: `SelectionFrame` from `@unlocalhosted/metalui`. SwiftUI: `.metalSelectionFrame(_:)` on the object, or `MetalSelectionFrame(size:)` for an overlay drawn apart from it. Sheet reference: the object sheet. There is no Base UI part: it is an object, and the host carries the selection semantics.

## Use it for

- Showing which object on a canvas or board is selected: a text block, an image, a card, a region, a file.
- The hover presence of a borderless object: faint corner dots so its invisible boundary is discoverable, and the edge light where the pointer enters its band.
- A multi-selection: `variant="lite"` on each member and one `SelectionFrame` around the bounding box with `count`.

## Don't use it for

- Selected rows, tabs, menu items or segments. They have their own selected state (a raised thumb, a pressed cap, a green bar).
- Keyboard focus. Focus is the 2 pt focus ring on `:focus-visible`; selection and focus can both show.
- A marquee while dragging. The marquee is a plain precision rectangle, drawn by the host.

## Anatomy

- **Ring**: 1.25 pt green-deep (green on graphite) at offset 6 from the object, so its radius is the object's plus 6 (a plate at 18 gets a ring at 24). A flat 3.5 pt collar `rgba(120,214,165,.16)` sits outside it: a band, never a blur.
- **Handles**: eight on the ring line. 10 pt round soft caps at the corners, 6 × 18 capsules at the edge midpoints. With `handles="text"` the n and s capsules are grips (grab cursor, move the object); the corners and e/w set the width. Each handle's hit area reaches 7 pt past its drawn shape.
- **Readout**: a graphite pill 24 tall, 16 under the object: a 4 pt green LED, then `W × H` in the readout role (Martian Mono 10.5, tabular), the `×` dimmed. It reads the measured frame, never a constant: `● 320 × 214`; `● 3 · 540 × 180` for a multi-selection; `● COPIED · PNG 130 × 215` for 900 ms after a copy.
- **Hover**: only the four corner dots, 5 pt, where the handles will be; the edge light (1.5 pt, fading at both ends) on the band edge under the pointer; a soft glow (twice the handle, the edge-light green at .55) behind the band corner under the pointer, also while selected, because a corner resizes.

## States and motion

| State | What shows | Motion |
|---|---|---|
| rest | nothing | – |
| hover | corner dots; edge light on one edge | fade on settle |
| selected | ring, collar, handles, readout | ring and handles enter from 1.02 on the part spring, once |
| selected · writing | the same; readout at .78 | re-measures in the same frame as each keystroke; never replays its entrance |
| selected · moving | readout at 1 | – |
| lite | a 1 pt quiet ring, no collar, no handles | none |

Reduce Motion: part resolves instant, so the ring appears without its entrance; the dots and readout still fade (settle crossfades).

## API

| React prop | SwiftUI | Values | Default |
|---|---|---|---|
| `state` | first argument | `rest`, `hover`, `selected` | `rest` |
| `variant` | `variant:` | `ring`, `lite` | `ring` |
| `mode` | `mode:` | `idle`, `writing`, `moving` | `idle` |
| `radius` | `radius:` | the object's corner radius | `0` |
| `handles` | `handles:` | `object`, `text`, `none` | `object` |
| `readout` | `readout:` | boolean | `true` |
| `count` | `count:` | blocks in a multi-selection | – |
| `size` | (the view's own frame) | `{ width, height }` to override the measured box | measured |
| `copied` | `copied:` | a format, e.g. `"PNG"` | – |
| `edge` | `edge:` | `n`, `e`, `s`, `w` | – |
| `onHandlePointerDown(handle, event)` | `onHandleDrag:` | the host resizes or moves the object | – |

```tsx
import { SelectionFrame } from '@unlocalhosted/metalui';

<div className="block" style={{ position: 'relative', borderRadius: 18 }} aria-selected={selected}>
  {text}
  <SelectionFrame state={selected ? 'selected' : hovered ? 'hover' : 'rest'} radius={18} handles="text" mode={editing ? 'writing' : 'idle'} />
</div>
```

```swift
import MetalUI

note
    .metalSelectionFrame(isSelected ? .selected : isHovered ? .hover : .rest, radius: MetalRadius.plate, handles: .text)
    .accessibilityAddTraits(isSelected ? .isSelected : [])
```

## Rules

- One selection for every kind: never restyle the ring per object type. For a borderless object the ring and dots are its boundary.
- The readout reads the measured frame (fractional layout size, rounded for display). Never type a size into it.
- A selection made by finishing (⎋, ⌘↩) is quiet: ring and readout, no tool strip. A click selection raises the tool strip.
- Handles sit on the ring line, not on the object's edge. Their hit area is larger than their drawing.
- Hover never changes layout: the dots and the edge light are overlays.

## Accessibility

- The frame is decoration (`aria-hidden`). The object carries the semantics: `aria-selected` (web) or `.isSelected` (SwiftUI) while selected, and its own label.
- Keyboard: arrows nudge the selection (1 pt, ⇧ 10 pt) and are the host's; the handles are pointer affordances with titles.
- Increase Contrast: the lite ring becomes the full-weight ring.
- Colour is never the only cue: the ring's shape and handles carry the state in both colorways.

## Tokens

`--mu-presence-*` (ring, collar, lite, handle, capsule, grip, readout, hover dot, edge light), `--mu-presence-dot` per colorway, `--mu-select-offset`, `--mu-led-green`, `--mu-led-ring`, `--mu-spring-part`, `--mu-spring-settle`. Swift: `MetalPresence`, `MetalRing.selectOffset`, `MetalTokens.<colorway>.presenceDot`.

---

# Settings

An app's settings as sections of rows. React: `Settings` with `Settings.Section`, `Settings.Row`, `Settings.Keys`. SwiftUI: `MetalSettings`. A block: `Surface` (raise-lite, card radius), `Label` (engraved heading, `name`, `detail`), `Rule`, `Kbd`, laid out by the `settings` group.

## Use it for

- The settings view: Sync, Storage, Backup, Shortcuts, Account, the opt-in rows.

## Don't use it for

- Forms that need Save (a dialog), or lists of things you act on (Row).

## Anatomy

- Section: the heading engraved 8 above a raised card; sections 28 apart.
- Row: at least 52 tall, 12 / 18 padding; the name (`Label name`, 13.5 at weight 500) and one short detail line (`Label detail`, 12) on the left; one control on the right, 16 away.
- Engraved rules between rows, inset 18 so they align with the text.
- Keys: a shortcut row: what it does, then one keycap per key.

## Controls

- On or off, at once: `Switch`, labelled by the row's name (`aria-labelledby` with the row's `id`).
- One of a few: `Switcher`, compact.
- An action: `Button` (Download backup, Restore, Upgrade).
- A value (Storage used): a `Label value-small` or a `SizeReadout`.

## Rules

- One control per row. A row never raises on hover; only its control acts.
- The name says what is on, in plain words: "Sync this canvas", not "Enable sync".
- The detail says what it does or what it is now, in one line.

---

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

---

# Sidebar

An app's side place for moving between places. React: `Sidebar` from `@unlocalhosted/metalui`. SwiftUI: `MetalSidebar` (work in progress; `NavigationSplitView` is the system's). A place: the highlight is the `row` recipe's lift, section titles are the engraved `label`, the rail's names are `tooltip`s; the `sidebar` recipe adds the widths and the collapse.

## Use it for

- An app with several places people move between often: spaces, views, settings.

## Don't use it for

- A site's sections (use the navigation menu), or a panel of properties (use a sheet or a split pane).

## Anatomy

- Width 232 (a rail 56), padding 8; header and footer stay while the sections scroll.
- Section: an engraved title and its items, 2 apart; sections 16 apart.
- Item: a 16 glyph and a word, 32 tall, radius 10, ink2 (ink when current or hovered).
- Toggle: collapses to the rail and back.

## States and motion

| State | Look | Motion |
|---|---|---|
| current | the lifted highlight under it | – |
| choose another | the highlight under it | glides on the settle spring |
| collapse | the rail | words fade on the release spring, then the width settles |
| expand | the full width | width settles, then the words fade in |
| rail, hover or focus | the name in a tooltip | the tooltip's own |

Reduce Motion: width and words change at once; the highlight moves at once.

## API

| React | SwiftUI |
|---|---|
| `Sidebar` `collapsed`, `aria-label` | `NavigationSplitView` |
| `Sidebar.Header`, `Sidebar.Footer` | – |
| `Sidebar.Section` `title` | `Section(title)` |
| `Sidebar.Item` `icon`, `href`, `active`, `render` (a router's link), children (the word) | `NavigationLink` |
| `Sidebar.Toggle` `collapsed`, `onCollapsedChange`, `icon` | – |

## Keyboard and accessibility

- A `nav` named by `aria-label`; sections are named groups; the current item says `aria-current="page"`. In the rail, items are named by their word and show it as a tooltip on focus. The toggle says whether it is expanded.

## Rules

- Few sections, short words; the most used places first.
- Remember whether someone collapsed it.

---

# Size readout

A graphite pill that reads a measured value. React: `SizeReadout` from `@unlocalhosted/metalui`. SwiftUI: `MetalSizeReadout`. The Selection frame places one under its object; this is the same readout on its own. Built from `Surface`, `Led` and `Label`; a component rather than a block because the Selection frame block uses it.

## Use it for

- An object's measured size (`● 320 × 214`), a multi-selection (`● 3 · 540 × 180`), a copy (`● COPIED · PNG 130 × 215`, for 900 ms), a zoom level (`● 100 %`).

## Don't use it for

- Status with words (use the status pill), counts in a list (use the readout type role inline), or anything a person edits.

## Anatomy

`Surface material="graphite-deep" radius="pill"`, 22 tall, padding 0 10, gap 6: `Led kind="live"` (5 pt), then the value in `Label variant="readout"` (10.5 mono at 1, tracked .04em, `#EDEDEF`); the `×` and `·` in `Label variant="readout-dim"` (`#7C7D82`).

## States and motion

| State | Look |
|---|---|
| live | LED on |
| writing (inside the Selection frame) | .78 |
| moving | 1 |
| copied | `COPIED · PNG …` for 900 ms |

Opacity changes ride settle. The value changes in place without motion; the pill's width follows the figures, as the reference's does.

## API

| React | SwiftUI |
|---|---|
| `width`, `height` | `size:` |
| `count` | `count:` |
| `copied` | `copied:` |
| `value` | `value:` |
| `led` | `led:` |

## Rules

- It reads a measurement, never a constant.
- Short: one value, never a sentence.

## Accessibility

- It repeats what the object states (its size is the host's to expose). Where it is the only carrier (a zoom level), give it a label or make it a live status in the host.

## Tokens

`--mu-presence-readout-*`, `--mu-led-green`, `--mu-led-ring`, `--mu-type-readout`. Swift: `MetalPresence`.

---

# Skeleton

Where content will be, before it arrives. React: `Skeleton` from `@unlocalhosted/metalui`. SwiftUI: `MetalSkeleton` (work in progress). A part: its shapes are the `well` recipe's field look; the `skeleton` recipe adds the sizes, the sheen and the timing.

## Use it for

- A list, a card or a panel whose shape you know while its data loads (over about 300 ms).

## Don't use it for

- Work in a control (use a spinner), a task with an end you can show (use progress), or content whose shape you cannot guess.

## Anatomy

- `Skeleton`: a block (`width`, `height`), radius 8.
- `Skeleton.Text`: `lines` pill lines 12 tall, 8 apart; the last is 62 % wide.
- `Skeleton.Circle`: `size`, for an avatar or a glyph.
- `Skeleton.Swap`: shows the shapes while `loading`, then the content in the same place.

## States and motion

| State | Look | Motion |
|---|---|---|
| mounted | nothing | waits 300 ms, so a fast load never flashes it |
| waiting | the shapes in the sunk well | fade in on the settle spring; a soft light passes across (1.6 s, linear) |
| arrived | the content | the content fades in on the settle spring, in the same place |

Reduce Motion: no sheen; the fades stay.

## API

| React | SwiftUI |
|---|---|
| `Skeleton` `width`, `height` | `MetalSkeleton(width:height:)` |
| `Skeleton.Text` `lines`, `width` | `.redacted(reason: .placeholder)` |
| `Skeleton.Circle` `size` | – |
| `Skeleton.Swap` `loading`, `fallback`, `label` | – |

## Keyboard and accessibility

- The shapes are hidden from assistive tech; `Skeleton.Swap` marks the region busy (a `status` named by `label`, "Loading" by default) until the content arrives.

## Rules

- Draw the shape of what is coming, not a generic grey box: the content should land where the shapes stood.
- One sheen for the whole screen's shapes; never pulse them.

---

# Slider

A value on a track. React: `Slider` from `@unlocalhosted/metalui`, on Base UI Slider. Give it props and it draws itself; or compose its parts `Slider.Track`, `Slider.Marks` (fractions), `Slider.Ticks` (labelled fractions) and `Slider.Knob` inside it for a host that draws its own scale (the time scrubber). SwiftUI: `MetalSlider`.

## Use it for

- A value in a known range that a person sets by feel: zoom, volume, brightness, a quality level, a position in time.

## Don't use it for

- An exact number someone types (use a number field), a level nobody sets (use a meter), or one of a few named options (use a switcher).

## Anatomy

- The track: a track well, 6 / 10 / 14 tall for `compact` / `regular` / `large`; the fill: the green intent gradient at full strength up to the knob, deeper on bone so it stands at least 2:1 from the pale groove, with an inset hairline edge.
- The knob: 16 / 22 / 28, a knurled conic finish with a bright inner ring and a small drop shadow. Size sets the groove and the knob together.
- One travel: the groove is the full width; the knob's centre travels half a knob in from each end, so at the minimum and the maximum the knob sits flush inside the groove's rounded ends, never past them. The fill runs to the knob's centre, and marks and ticks sit on the same travel, so a tick, the fill's end and the knob line up at every value.
- Marks: notches cut across the groove (2 wide, the groove's full height), for steps, detents or moments. Only where there is a step or an event: never loose decoration.
- Ticks: a short line a gap under the groove and its label under that, in the meta type (11) at ink2, so labels read at 4.5:1 or better on the surface in both colorways. A host that engraves its own scale (the time scrubber) passes its own `Label` node, and in SwiftUI `tickStyle: .engraved`. With `ticks`, the slider reserves room for them below.
- Glyphs (optional): `startIcon` and `endIcon` at ink2, 14 / 16 / 18, a gap from the groove. Each plays its act when the value arrives at its end. They are decorative; the knob carries the name and value.
- Value (optional): `showValue` writes the value beside the groove in the figure type with `format`. It keeps the width of its widest value (every step when there are 24 or fewer, else the two ends), so the groove never moves as it changes; the digits turn on the drum.
- Width: full width of its container by default; `width` sets it (a number is px, a string any CSS length). SwiftUI: frame it as any view; it fills the width it is given.
- Put the slider on a plain surface (a panel, a card) or give it clear space: a busy or dotted backdrop never runs through its labels.

## API

| React | SwiftUI |
|---|---|
| `value`, `min`, `max`, `onValueChange` | `value:` (a binding), `in:` |
| `step` (1), `largeStep` (10) | `step:`, `largeStep:` |
| `size` (`compact`, `regular`, `large`) | `size:` (`.compact`, `.regular`, `.large`) |
| `startIcon`, `endIcon` (a glyph node) | `startIcon:`, `endIcon:` (`MetalIconName`) |
| `showValue`, `format` | `showsValue:`, `valueText:` |
| `marks` (values), `ticks` (`{ value, label }[]`) | `marks:`, `ticks:` (fractions), `tickStyle:` |
| `width` (full by default) | `.frame(width:)` |
| `aria-label` | `label:` |
| `disabled` | `.disabled(true)` |
| parts: `Slider.Track`, `Slider.Marks`, `Slider.Ticks`, `Slider.Knob` | `onFocusChange:`, `onDragChange:`, `isExternallyDragging:` |

## States and motion

| State | Look | Motion |
|---|---|---|
| rest | the knurled face, a small drop shadow | – |
| hover (over the groove) | the knob lifts ×1.08, a longer shadow | settle spring |
| pressed, dragging | the knob presses ×0.94, a tight shadow; the fill follows the pointer 1:1 | settle spring; no spring on the value while dragging |
| focus (keyboard) | the green ring around the knob | – |
| disabled | the whole slider at 40 %; no pointer, no keys | – |
| refused (a key pushing past an end) | the groove and knob nudge one nest toward that end and ring back; the value stays | refusal spring |

- The knob's face grows away from the nearer end (its origin follows the value), so even lifted it never pokes past the groove; the refusal moves the groove with the knob, so the knob never leaves it.
- Reduce Motion: jumps land at once, the readout crossfades, the lift and press change at once, and nothing nudges.

## Keyboard and motion

- Arrows step (`step`), Shift + arrows step large (`largeStep`); Home / End go to the ends.
- A jump (a click on the track, a key) rides the part spring; a drag follows the pointer exactly. The knob and the fill ride one animated fraction, clamped to the travel, so a spring that overshoots stops flush at an end. Under Reduce Motion a jump lands at once and the readout crossfades.
- SwiftUI `onDragChange` reports drag start before the first value change and drag end after release. `isExternallyDragging` lets an offscreen host or controlled gesture suppress the jump spring during a scrub.
- Name the knob (`aria-label`) and give it a value text a person reads: `format` does both ("40%"); with parts, `getAriaValueText` on `Slider.Knob` ("THU 24 SEP · 14:10").

## Rules

- A jump springs, a drag does not.
- Marks and ticks mean something: a step, an event, a labelled value.
- Keep labels plain and readable, on a plain surface.

---

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

---

# Sparkline

A small series plot. React: `Sparkline`. SwiftUI: `MetalSparkline`.

## Use it for

- A trend over a short window: one slot per day, `null` for a day with no value (the line breaks).

## Behaviour

- The last dot is in the intent green; the others ring ink2. A dot with `onSelect` is a button named by its `title` ("WED 24 SEP · 6.5"): selecting it focuses its source.
- The dashed baseline sits at the average. Values are plotted, never summarised with a face or a colour.

---

# Spatial field

A decorative Part composed once by a containing Place. The Place supplies its displayed object and Region rectangles in the field's local coordinate system. It chooses the current target, applies the drop and supplies the committed scene. The field never performs hit testing, selects a target or changes placement.

## React

Create one `SpatialFieldController` per surface, render `SpatialFieldCanvas` beneath objects, call `setScene` with bounded visible Regions and stationary object footprints when displayed geometry changes, `setProjection` with the carried footprint and host-selected target, then `endProjection` on drop or cancellation. The small `object` scene key is a one-object shorthand. Keep the controller stable and give the canvas the full surface area. It coalesces pointer samples into one paint per animation frame, caches the stationary occupancy mask, caps raster work, and stops at rest or when hidden. Use `setEnabled(false)` during Place travel. The canvas is inert and hidden from accessibility.

## SwiftUI

Render one `MetalSpatialFieldView(scene:)` beneath a SwiftUI Place, or one `MetalSpatialFieldNSView` beneath an AppKit canvas. Pass `MetalSpatialFieldScene` with displayed Region frames, bounded stationary object frames, optional carried frame and target ID, all in local viewport points. The SwiftUI Canvas redraws only when the host changes its scene; the AppKit view redraws when `setScene` changes its geometry or colorway. Neither has an idle timer or hit target. The host may publish animated presentation frames, but the field must not own a second gesture loop.

## Look and behavior

The field keeps a quiet visible grid at rest. Marks clear Region paper and object footprints. A carried object displaces nearby marks; only the host-selected Region tints nearby marks. Bone and Graphite use the same geometry and generated `spatial-field` recipe. Reduced motion removes field recovery on React; the target and written Region rule remain semantic on both platforms. Standalone Region paper keeps its own local dot material.

---

# Spinner

Waiting, shown where it happens, with one clock. React: `Spinner`, `Spinner.Bar`, `Spinner.Status` and the `useWait` hook from `@unlocalhosted/metalui`. SwiftUI: `MetalSpinner`, `MetalSpinnerBar` and `.metalWait(_:into:)`. The `spinner` recipe holds the timing and every look; the ring reuses the button's wait arc (`button` recipe, `wait.*`) and draws the check glyph's tick.

## Where the wait is (pick the placement, not a widget)

| Where | What waits | How |
|---|---|---|
| On an action (a button, a key) | the key: held down, refusing presses; its glyph becomes the arc | `Button` `state`, from `useWait` (see below) |
| On a small item (row, chip, avatar) | a ring in the item's glyph slot; the rest of the item dims and refuses | `waiting={wait.busy}` on `Row` / `Chip`, `<Spinner phase={wait.phase}>` around the item's glyph; `Avatar` `waiting` waits on its rim |
| On a large item (card, image, panel) | the item's own edge: a light travels round its border; its words say what is happening | `Card` `waiting={wait.busy}`, your words in `Card.Description`, `Spinner.Status` beside it |
| In a field (search, combobox, validation) | a ring in the trailing slot, in place of the clear key | `{wait.showing ? <Spinner phase={wait.phase} /> : clearKey}` in `Field.Trail` |
| For the whole place (a page, a view) | first load: skeletons of what will arrive; a route change: a thin bar across the top, the old view kept and dimmed | `Skeleton.Swap loading={wait.busy}`; `<Spinner.Bar phase={wait.phase} />` in a positioned host |
| Background work (sync, upload) | the status lamp breathes; nothing is held | `<Led kind="waiting" gesture="breathe" />` while `wait.phase === 'shown'`, `live` + `flicker` when done, `failed` + `blink2` on failure, with words |
| Known amount | it fills instead of turning | `value` (0–100) on the ring or the bar; a card hands over to `Progress`; an `Attachment` takes `progress={null}` until the amount is known |

Never a spinner floating in the middle of a card or in a corner of the page.

## The clock: `useWait` (motion/wait.ts)

```tsx
const wait = useWait(work, ref?); // work: 'idle' | 'working' | 'done' | 'failed'
// wait.phase: 'idle' | 'quiet' | 'shown' | 'done' | 'failed'
// wait.busy: quiet or shown (hold the item, aria-busy)
// wait.showing: shown or done (the sign or its result is in the slot)
// wait.still: the work has run past `still` (say "Still …")
```

| Rule | Token (`--mu-r-spinner-self-*`) | Default |
|---|---|---|
| Show delay: nothing for fast work (`quiet`), then `shown` | `delay` | 400 ms |
| Once shown, at least this long on screen (no flash) | `minimum` | 600 ms |
| The result (`done`) stays this long, then `idle` on its own | `result` | 1400 ms |
| After this long, `still` is true | `still` | 8 s |

Work that ends inside the delay goes straight to its result: nothing, then the check. `failed` stays until the host moves on (it shows the failure in words and Try again). Pass `'idle'` instead of `'done'` when the result speaks for itself (a search's results). A `ref` makes the hook read the tokens where the host is, so a wrapper that sets them (a dense table, a docs panel) tunes every wait inside it. Combobox, Table and Card waits use this hook; don't write another timer.

The button: `state={wait.busy ? 'waiting' : wait.phase === 'done' ? 'done' : 'ready'}`, label `wait.phase === 'shown' ? 'Saving…' : wait.phase === 'done' ? 'Saved' : 'Save'` on `SwapText`, glyph a `MorphIcon` (`save` → `check`).

## Anatomy

- Ring: a 24-grid svg the host's glyph slot sizes (16, small 12 where the host has no size), `currentColor` (white on a primary key, ink2 in a row). The arc is the button's wait arc (r 8.5, stroke 1.9, 68 % of the ring). Known: a faint track (18 %) and a fill from twelve o'clock. Done: the check glyph's tick, drawn by a pen.
- Item: every direct part except the one holding the ring dims to 50 %; pointer events off.
- Rim (avatar): a 26 % arc on the avatar's ring, ink2, 1.6 s a turn.
- Edge (card): a 1.5 lit edge in the card's ink at 75 %, a 42 % comet tail, 2.8 s a lap; the card's border, not a box over it.
- Bar: 2 tall, the switch's lit fill, creeping to 86 % over 9 s (easing out, never arriving), completing in 260 ms and fading.

## States and motion

| Phase | Ring | Item | Bar |
|---|---|---|---|
| idle | the item's glyph | as it is | hidden |
| quiet | the glyph | held, dimmed, aria-busy | hidden |
| shown | glyph fades out (160 ms), arc fades in and turns (900 ms a turn, linear) | held, dimmed | creeps |
| known | the fill grows on the settle spring | held | scales to the value |
| done | arc fades, the tick draws (280 ms), after `result` the glyph returns | back | completes, fades |
| failed | the glyph (pass `sync-error` through a `MorphIcon`) | back; the host says why, with Try again | hidden |

A bare `<Spinner />` (no `phase`) shows itself after the show delay on mount: for code that can't use the hook.

Reduce Motion: nothing turns, creeps or travels; the arc, rim, edge and bar breathe in place (the progress breathe); the tick is whole at once.

## API

| React | SwiftUI |
|---|---|
| `Spinner` `phase` (from `useWait`) | `phase:` (`MetalWaitPhase`) |
| `value` (0–100, or null) | `value:` |
| `label` ("Loading"), `result` ("Done") | `label:`, `result:` |
| `size` (`regular` 16, `small` 12) | `size:` |
| children: the glyph it stands in for | `glyph:` view builder |
| `Spinner.Bar` `phase`, `value`, `label` | `MetalSpinnerBar(phase:value:)` |
| `Spinner.Status` `phase`, `label`, `result` | (the ring says it; `.accessibilityValue` on hosts) |
| `useWait(work, ref?)` | `.metalWait(work, into: $wait)` |
| `Row` / `Chip` / `Avatar` / `Card` `waiting` | `waiting:` on `MetalRow`, `MetalChip`, `MetalAvatar`, `MetalCard` |

```tsx
const [work, setWork] = React.useState<WaitWork>('idle');
const wait = useWait(work);

<Row variant="option" waiting={wait.busy}>
  <Spinner phase={wait.phase} label="Archiving notes.pdf" result="Archived notes.pdf">
    <MorphIcon name={wait.phase === 'failed' ? 'sync-error' : 'document'} />
  </Spinner>
  <Row.Text>notes.pdf</Row.Text>
</Row>
```

## Keyboard and accessibility

- `aria-busy` on the waiting thing (the hosts set it from `waiting`). A polite status says `label` when the sign shows and `result` when it is done, nothing in between: the ring carries one; a host whose sign is its own (card, avatar, lamp, bar) mounts `Spinner.Status` beside it, before the work starts. Keep it out of a button's content (it would join the button's name).
- With `value` the ring is a `progressbar` with `aria-valuenow`. A bare ring is a named `status`.
- A failure is said by the host, in words, with Try again; colour and glyph never carry it alone.

## Rules

- Put the wait where it is; one sign per wait (a waiting card's footer button is disabled, not spinning too).
- Constant speed: never ease or spring a turn.
- Measure when you can: switch to filling as soon as the amount is known.
- Say what is working ("Lifting the subject…"), and more after a long wait ("Still lifting…").
- Don't restyle the ring's colour: it is the slot's ink.

---

# Split pane

Two places side by side, or stacked, with a divider you can move. React: `SplitPane` from `@unlocalhosted/metalui` (the ARIA window-splitter pattern). SwiftUI: `MetalSplitPane` (work in progress; `HSplitView` and `NavigationSplitView` are the system's). A place: the divider is the `rule`'s hairline with the `switch` thumb as its grip; the `split-pane` recipe adds the hit area, the detents and the steps.

## Use it for

- A list beside its details, a canvas beside an inspector, an editor over its preview: two places whose balance people change.

## Don't use it for

- A sidebar that only opens and closes (use the sidebar place), or content that should reflow instead (use a responsive layout).

## Anatomy

- Two panes; the first takes `size` percent (default 30), the second the rest.
- Divider: a 1 hairline in a 12 hit area, with a 28 × 6 raised grip at its middle.

## States and motion

| State | Look | Motion |
|---|---|---|
| hover | the grip lifts | settle spring |
| dragging | the grip pressed; panes follow the pointer | one to one, no spring |
| let go near the default (3 %) | the default size | snaps on the part spring (a detent) |
| let go past half the minimum (collapsible) | the first pane shut | snaps on the part spring |
| let go under the minimum | the minimum | snaps on the part spring |
| keys | a step of 8 | settle spring |

Reduce Motion: snaps and steps land at once.

## API

| React | SwiftUI |
|---|---|
| `orientation` (`horizontal`, `vertical`) | `HSplitView` / `VSplitView` |
| `size`, `defaultSize` (30), `onSizeChange` | – |
| `min` (15), `max` (85), `collapsible` | `.frame(minWidth:)` |
| `label` (names the divider), two children | – |

## Keyboard and accessibility

- The divider is a focusable `separator` named by `label`, with its value in percent. ← → (↑ ↓ when stacked) step by 8, Home goes to the minimum (or shut, when collapsible), End to the maximum, Enter restores the default. A double-click restores it too.

## Rules

- Give each pane a real minimum; never let content crush.
- Keep the default where most people want it: the detent is there to find it again.

---

# LED and status badge

A lamp for a state, and a badge that names it. React: `Led`, `StatusBadge` from `@unlocalhosted/metalui`. SwiftUI: `MetalLED`, `MetalStatusBadge`. Sheet reference: KAMUI-16.

## Use it for

- `Led`: beside words that name a state (a badge, a readout, an engraving, a glass tag). Green live or ok, amber waiting or urgent, red failed, blue a link kind, off idle.
- `StatusBadge`: a system state in a corner or a row: `SYNC LIVE`, `SYNCING`, `SYNC OFFLINE · ADD KEY TO KEYCHAIN`, with the command that fixes it as its hint.

## Don't use it for

- Buttons or toggles. A badge is not pressable; a latched tool has its own LED inside the tool button.
- Colour alone. An LED always sits beside words.
- Success or warning banners. Use a toast (success always carries a check) or a notice.

## Not colour alone

Each state has three cues: the lamp's colour, its gesture and the words. The badge plays the state's own gesture unless you pass one: live steady, waiting breathe (while it lasts), failed blink2 (once, then lit), link steady, off steady and dark. Amber that means urgent rather than in progress passes `gesture="steady"`.

## Tones

| Tone | Look | Use it for |
|---|---|---|
| plate (default) | a raised pill with a defined edge (hairline and contact shadow) | most places |
| quiet | the lamp and the words, no plate | dense places on an opaque ground: tables, lists |
| strong | a plate tinted in the state's ink, the words in a deep ink of the same hue | one alert that has to be seen |

Strong on `off` is a plate.

## Transparent mode

A status part on a ground that lets what is behind show through: frost, glass, an image, a video. The lamp needs nothing (its socket is its ground). The badge is `solid`: its plate stays opaque with a 1 pt keyline round the edge, and a quiet badge takes its plate back. Pass `solid` on such grounds; Reduce Transparency (and low power) turns it on everywhere.

## Anatomy

- **LED**: a 6 pt lens (4 small) in a 1 pt dark socket with a light lip; a lit lamp has a halo in its ink.
- **Badge**: 26 tall pill, padding 11 at the ends, gap 7: the LED, then the state in mono 10.5 / 500, tracking .06em, uppercase, ink2 (strong: the state's deep ink).

## API

| React | SwiftUI |
|---|---|
| `Led kind size gesture` | `MetalLED(_:size:gesture:)` |
| `StatusBadge led hint tone solid gesture` + children | `MetalStatusBadge(_:led:hint:tone:solid:gesture:)` |

## Rules

- One LED per object. Its colour means what the list above says, nothing else; no new colours.
- The badge text is the state, short, uppercase; the fix is the hint, never the label.
- On a see-through ground the badge is solid; a quiet badge never sits there without its plate.
- One strong badge in a view.

## Accessibility

- The badge is a `status` region (announced when it changes). With a hint it is focusable, and the hint is its description and a tooltip on hover and focus.
- LEDs are decorative (`aria-hidden`): the words carry the state. The lit inks stay apart under simulated deuteranopia and protanopia (ΔE00 ≥ 20 for every pair).
- Reduce Motion holds every lamp lit; Reduce Transparency makes every badge solid.

## Tokens

`recipes.status` (`recipe-status-led-<kind>`, `recipe-status-badge`, `recipe-status-badge-strong-<kind>`, `text-status-strong-ink-<kind>`, `outline-status-badge-keyline`), `type-status-badge`, `status.gestures`. Swift: `MetalRecipes.status`.

---

# Stepper

The steps of a wizard: where you are, what's done, what's left, which step has a problem and which one waits. React: `Stepper` from `@unlocalhosted/metalui` (an ordered list with `aria-current="step"`; Base UI has no stepper). SwiftUI: `MetalStepper`. Every look is borrowed: the switch's sunk well (upcoming) and on look (the groove's fill), the switcher's thumb (current), the checkbox's on look (done), the field's invalid ring, the Spinner's ring. The `stepper` recipe holds the sizes and the motion. A component: you operate it to change which panel of the flow is shown.

## Use it for

- A task split into ordered steps that each hold part of a form: a checkout, a setup, an import.
- Showing a step with a problem (`error`) or a step that is working (`waiting`) where people look.

## Don't use it for

- Peers you switch between in any order with nothing ever "done": use `Tabs`.
- How far a task has come when the steps can't be visited: use `Progress` with `steps` ("Step 2 of 4").
- Pages of results: use `Pagination`.

## Anatomy

- Root (`Stepper`): `steps`, `value` / `defaultValue` / `onValueChange` (an index), `linear` (default true), `orientation` (horizontal, vertical).
- A step (`StepperStep`): `title`, `description`, `error`, `waiting`, `complete`, `disabled`.
- List (`Stepper.List`): `aria-label` (required), `layout` (stacked: titles under the indicators; inline: titles beside). Each step is a 24 round indicator (meta type, tabular) with its title (ui type) and a line (meta, ink3), padded 6 with a 10 radius; a step you can go to is a button. Grooves 3 thick run between the indicators, 6 clear of each. Vertical: the indicators in a column, the groove standing beside the titles; `Stepper.Panel`s placed in the list open under their step's title, the groove running beside them.
- Panel (`Stepper.Panel` `index`): one step's content; always mounted, `hidden` unless current; a `group` named by the step's title.
- Back (`Stepper.Back`) and Next (`Stepper.Next`): Buttons. Back is off on the first step. Next is primary; its words ("Continue", `children`) turn on the drum to `finish` ("Finish") on the last step, where it never advances: the host submits. Both take every Button prop (`state="waiting"` while a step works).

## States and motion

| State | Look | Motion |
|---|---|---|
| upcoming | the switch's sunk well, number in ink3, title in ink2 | – |
| current | under the switcher's raised thumb, number and title in ink | the thumb glides from step to step on the part spring (may overshoot) |
| done | the checkbox's on look with the set's `check`; the groove after it green | the groove fills on settle, drains on release (translate) |
| error | the invalid hairline ring on the indicator; the words under the title in the form error's ink; not done | – |
| waiting | the number gives way to the Spinner's ring after the show delay; its tick when done | `useWait`: nothing for fast work, a minimum on screen |
| unreachable | text, not a button; ink3 | – |
| disabled | 40 %, not a button | – |
| hover | a step you can go to lifts (the row's list hover) | the row's fade |
| focus | the green ring | – |
| panel arriving | – | drifts one nest from the way you went (trailing going forward) and fades, settle spring; the old one leaves at once; the first shows still |
| narrow | under 480 px (a container query on the list) a horizontal list keeps its titles for readers only and shows "Step 2 of 4 · Shipping" under the row | the line turns on the drum |

Reduce Motion: the thumb, the fill and the panel move at once; the panel fades.

## Rules

- A step is done once you've passed it, unless `complete` says otherwise; `error` always wins over done.
- `linear` (default): only steps up to the furthest you've reached are buttons. `linear={false}` for flows whose steps don't depend on each other.
- Refuse Continue by calling `event.preventDefault()` in `Stepper.Next`'s `onClick`, then set the step's `error` and the field's own error. Never refuse silently.
- Every `error` is words ("Add an address"); colour never says it alone.
- A step that works for more than a moment: set its `waiting` and `Stepper.Next`'s `state="waiting"` together, so the key and the step agree.
- Keep titles to one or two words; the description carries the rest.

## API

| React | SwiftUI |
|---|---|
| `Stepper` `steps`, `value`, `defaultValue`, `onValueChange`, `linear`, `orientation` | `MetalStepper(_ steps:, current:, linear:, orientation:, layout:, panel:)` |
| `StepperStep` `{ title, description, error, waiting, complete, disabled }` | `MetalStep(_ title:, description:, error:, waiting:, complete:, disabled:)` |
| `Stepper.List` `aria-label`, `layout` | the list is the view itself; `layout: .stacked / .inline` |
| `Stepper.Panel` `index` | `panel: { index in … }` |
| `Stepper.Back`, `Stepper.Next` `finish` | the host's `MetalButton`s on the `current` binding |

## Keyboard and accessibility

- An ordered list named by `aria-label`; the current step has `aria-current="step"`. Each step's name is "Step 2: Shipping" with its state in words ("completed", "has a problem: Add an address", "not available yet").
- Tab moves through the steps you can go to, then into the panel; there is no roving focus and no arrow keys (they would skip ahead).
- After Back or Continue, focus moves to the new panel (`tabIndex=-1`), so a reader hears where it landed; pressing a step keeps focus on the step.
- A waiting step is `aria-busy`; the Spinner says "Payment, working" when its ring shows and "Done" when it ends.

---

# Suggestion chip

One question the recognizer asks at middle confidence, beside its block. A composition block: `Chip` (suggestion) › `Chip.Text` + `Label` (small) + `Chip.Actions` › `IconButton` (mini) × 2. React: `SuggestionChip` from `@unlocalhosted/metalui`. SwiftUI: `MetalSuggestionChip`.

## Use it for

- A cue that would change behaviour, found at middle confidence: `Task?`, `Date friday?`, `Track as sleep?`, `Move to Done?`.

## Don't use it for

- A kind, a life glyph or anything decorative. Chips exist only for cues that change behaviour.
- High confidence (the cue applies quietly, with provenance on hover) or low confidence (nothing happens).
- More than one per block. Ask the most valuable question first; the rest wait.

## Confidence routing (a docs table, not props)

| Confidence | Numbers (p) | Choices | Life glyph | Lens | The surface |
|---|---|---|---|---|---|
| Apply (quiet) | p ≥ .85 | ≥ .70 | Layer 1, or ≥ .85 | p ≥ .5 | the cue appears, provenance on hover |
| Suggest | .60 ≤ p < .85 | .40 ≤ c < .70 | named in the engraving only | .3–.5: "maybe" at .5 | one suggestion chip |
| Nothing | p < .60 | < .40 | < .40 | < .3 | no change |

## Anatomy

`Chip variant="suggestion"`: a 20 tall frosted pill with a .5 green ring at .4 over a small raise, the question in ink2. `Label variant="small"`: the confidence (`0.72`), 2 after the question and 3 before the actions. `IconButton variant="mini"`: ✓ (`accept`, green on hover) and ×, 18 × 16. It sits beside the first line of its block (`offset-x` −2, `offset-y` 10 from the block's right edge).

## States and motion

| State | Look | Motion |
|---|---|---|
| arriving | from 3 above and .96, transparent | settle (no overshoot); Reduce Motion: fades in place |
| rest | opacity .62 | – |
| block hovered, or focus inside | opacity 1 | settle |
| button hover | a soft well, ink (✓: green-deep) | settle |
| button pressed | down 1 | – |
| writing | hidden (the host unmounts it) | – |

## API

| React | SwiftUI | Notes |
|---|---|---|
| `label` | `label:` | the question |
| `confidence` | `confidence:` | 0–1, printed to two places |
| `onAccept` / `onDismiss` | `onAccept:` / `onDismiss:` | the host applies or stores the correction |
| `hostHovered` | `hostHovered:` | force full opacity |

```tsx
<div className="mu-icon-trigger block">
  {text}
  <SuggestionChip label="Task?" confidence={0.72} onAccept={makeTask} onDismiss={notATask} />
</div>
```

## Rules

- Accepting finishes the block first, then applies, with Undo. Dismissing stores a correction for the exact text; the chip is never asked again.
- Never while writing, never for kinds or glyphs, at most one per block.
- The confidence is always shown. Hidden confidence is a bug.

## Accessibility

- The chip is a group named "Suggestion: Task? Confidence 0.72"; ✓ is "Accept" and × is "Dismiss", real buttons in the tab order with a 1.5 pt focus ring (dense strip).
- Focus inside the chip brightens it like hover.

## Tokens

Layout: `--mu-suggestion-*` (rest opacity, arrival, the confidence's margins). Look: the chip, label and icon-button recipes. Motion: `--mu-spring-settle`, `--mu-travel-settle`.

---

# Surface

A raised plate or card from a material. React: `Surface` from `@unlocalhosted/metalui`. SwiftUI: `MetalSurface`.

## Use it for

- Anything that floats or is raised: pills, cards, panels, popovers, strips, banners, readouts.

## Don't use it for

- Sunk fields and tracks: use `Well`. Pressable caps: use `Button` or `IconButton`.

## Props

- `material`: `raise` (a card), `raise-lite` (a lighter card), `raise-sm` (a pill), `frost` (a floating bar), `plate` (a palette), `panel` (a gathered panel), `pop` (a menu), `tip` (a hover label), `lens` (a pinned query plate), `graphite` (dark chrome over a blurred, saturated backdrop), `graphite-plain` (the same with no backdrop: a banner, a tip), `graphite-strip` (the same over a plain blur: a tool strip), `graphite-deep` (a readout), `graphite-glass` (a notice).
- `radius`: `pill`, `hero` (30), `card` (24), `plate` (18), `strip` (16), `region` (26), `tip` (11), `row` (12).
- `as`: the element (default `div`).

## Behaviour

- No role, no focus: it is a surface. Give it the role its content needs (`role="dialog"`, `role="status"`).
- Reduce Transparency: frosted materials turn opaque and lose their backdrop blur.

---

# Switch

A setting that is on or off and takes effect at once. React: `Switch` from `@unlocalhosted/metalui` (Base UI Switch). SwiftUI: `MetalSwitch`. Its look is the `switch` recipe.

## Use it for

- Settings that apply immediately: "Sync this canvas", "Share usage data", "Show the grid".

## Don't use it for

- A choice that needs Save (use a checkbox in a form), one of several options (use a switcher), or a task (use the checkbox in the margin).

## Anatomy

- Track: a sunk pill, 40 × 24 (small 32 × 20), padding 2, the track well; on, a soft green gradient with an inner shadow.
- Thumb: a raised round cap, 20 (small 16), the switcher thumb's material.

## States and motion

| State | Look |
|---|---|
| off | thumb left, plain well |
| on | thumb right (travel 16, small 12) on the part spring; track green, fading on settle |
| pressed | the thumb stretches 4 pt toward where it is going |
| focus | the green ring at offset 2, keyboard only |
| disabled | 40 % |

Reduce Motion: the thumb moves at once; the colour still fades.

## API

| React | SwiftUI |
|---|---|
| `checked`, `defaultChecked`, `onCheckedChange` | `isOn:` |
| `size` (`regular`, `small`) | `size:` |
| `disabled` | `.disabled()` |
| `label`, `description` (a row: the words toggle it; the description is read as its description) | the title (`MetalSwitch("Sync", isOn:)`) |
| `labelSide` (`end`: after the switch; `start`: a settings row, words left, switch right) | – |
| `aria-label` (no visible label) | `.accessibilityLabel` |

## Keyboard and accessibility

- A button with the switch role; Space toggles. Give it a visible `label` (the row is a native label, so the words toggle it), or `aria-label` when nothing visible names it. Never wire a click on its words by hand.

## Rules

- A switch acts at once. If the change needs confirming, it is not a switch.
- The label says what is on, not "Enable …": "Sync this canvas".

---

# Switcher

A pill of pills: one of a few options, always visible. React: `Switcher` from `@unlocalhosted/metalui` (Base UI RadioGroup + Radio). SwiftUI: `MetalSwitcher`. Sheet reference: the object sheet.

## Use it for

- Two to five mutually exclusive views or modes that are switched often: a lens's view (place · list · table · timeline · gallery), a colorway, a scale.

## Don't use it for

- More than five options, or options that need explaining: `Select`.
- Options that each own a panel: `Tabs` (same look, tab behaviour). Pages of the app: links. On or off: `Switch`.
- Actions. Each option is a state, not a command.

## Anatomy

- **Track**: a pill well (`well-top → well-bot`, `well`), padding 3.
- **Options**: 28 tall (regular) or 24 (compact, in a lens bar or strip), padded by the pill rule `h/2 − 1`, the `ui` role in ink2; an optional leading glyph at the control's icon size.
- **Thumb**: a raised cap (`thumb-hi → thumb-lo`, `raise-sm`) under the selected option, which reads in ink.

## States and motion

| State | Look | Motion |
|---|---|---|
| rest | ink2 labels, the thumb under the selection | – |
| hover | the label turns ink | settle |
| selected | the thumb glides to it | part spring (a track with ends: may overshoot against the stop) |
| focus | a 1.5 ring with no offset | – |
| disabled | 40 % | – |

First paint and resizes place the thumb without motion. Reduce Motion: the thumb moves at once; labels still recolour.

## API

| React | SwiftUI | Notes |
|---|---|---|
| `options` | `options:` | `{ value, label, icon?, disabled? }` |
| `value` / `defaultValue` / `onValueChange` | `selection:` (Binding) | |
| `size` | `size:` | `compact` (24), `regular` (28) |
| `aria-label` | `label:` | required |

```tsx
<Switcher aria-label="View" size="compact" value={mode} onValueChange={setMode}
  options={[{ value: 'place', label: 'place' }, { value: 'list', label: 'list' }, { value: 'table', label: 'table' }]} />
```

## Rules

- Two to five options, short labels, one word each where possible.
- The selection is the thumb, never a colour.
- An option switches a value instantly; if the change is slow, show progress in the view, not in the control.

## Accessibility

- Base UI RadioGroup: one tab stop, arrows move and select, Space selects; each option is a radio with its label.
- Give the group an `aria-label` that names what it switches.

## Tokens

`--mu-switcher-*`, `--mu-well*`, `--mu-thumb-hi`, `--mu-thumb-lo`, `--mu-raise-sm`, `--mu-spring-part`, `--mu-spring-settle`. Swift: `MetalSwitcherMetrics`.

---

# Table

Rows of a person's things, read across and compared down. React: `Table` (and `TableCell`) from `@unlocalhosted/metalui`. SwiftUI: `MetalTable` (and `MetalTableCell`). An object: engraved `label`s, `rule` hairlines, the row `checkbox`, the `row`'s rail, and the parts its cells are made of (`led`, `avatar`, `chip`, `meter`, `sparkline`, `skeleton`); the `table` recipe adds the densities, the cell sizes, the sticky frost and the narrow-width rules.

## Use it for

- Records: one row per thing you can open (invoices, issues, members, files, deployments): a primary column with a second line, status, a person, a date, row actions, selection, sort, a visible filter, pages.
- Numbers to compare (balances, usage, line items): figures aligned at the end, units in the header, deltas, trends, a totals row.
- Grouped (issues by status, payments by day): `groupBy` with counts and subtotals.
- A comparison matrix (plans × features, roles × permissions): `rowHeader`, `pin: 'start'`, `yes` and `check` cells.
- A live log (CI output, audit log, events): `live`, a level as `status`, time as `date` `format: 'time'`, ids as `code`.

## Don't use it for

- One thing's details (use `Properties`), layout (use a grid), or a handful of things (use cards).

## Anatomy

- Caption: names the table (title type), or hidden for assistive tech; with `filter`, "12 of 240" on the drum and a Clear key.
- Head: 32 tall, engraved labels, the unit after the label in ink3 ("Amount (€)"); a sortable label is a button with the `arrow` glyph. Sticky, on frost, inside a scroll container (`maxHeight`).
- Rows: `density` roomy 48 (touch), regular 40, compact 32 (a minimum: a second line grows it); padding 12 at the sides, parted by hairlines.
- Primary column (the first, or `primary`): takes the room that is left and truncates; `detail` is its second line in ink2; with `onRowAction` it is a button stretched over the row.
- Selection (optional): a first column of row checkboxes; select-all in the head.
- Reading guide: one plate (the menu's row highlight) under the hovered or focused row.
- Totals (a column's `total`): a sunk readout row at the foot (the well's fill, rounded ends), the `footer` label ("Total") engraved in the primary column; sticky at the bottom of a scroll container.
- Group header (`groupBy`): a 32 row on opaque frost, sticky under the head: a chevron, the name (engraved) and the count, then each totals column's subtotal.
- Pinned column (`pin: 'start'` on the first column): opaque frost; with selection or detail keys, those lead cells pin with it. The frame scrolls sideways; the caption stays put.
- Detail key (`expandRow`): a ghost chevron key in a lead column; the panel is a sunk well (radius 12, padding 12) inset 8 under its row.
- Columns key (`columnsMenu`): a ghost `eye` key at the caption's end opening a `Menu` of checkbox rows (the primary column can't hide). Resize grips (`resizable`): the hairline at a header's end.

## Cell kinds

A column says its `kind`; the kind sets alignment, type and the empty look. `cell` renders anything else. `TableCell` draws one value alone (in `Properties`, a card).

| Kind | Value | Look |
|---|---|---|
| `text` (default) | string | truncates with an ellipsis, the whole in a tooltip when cut; non-primary text stops at 280 |
| `number` | number | tabular, end-aligned; `digits`; the `unit` in the header |
| `currency` | number | two places, no symbol in the cell; the symbol of `currency` in the header |
| `percent` | a share, 0–1 | shown in hundreds; "%" in the header |
| `delta` | signed number | "+12.4" or "−3.2" with an up or down `arrow`; the arrow green when good, red when bad (`better`, up by default); zero in ink2 with no arrow |
| `date` | Date, ISO string or ms | `format` relative ("3h ago", "in 2 days", the exact time in a tooltip; a week or more becomes a short date), or `date`, `time`, `datetime` |
| `status` | `live` `waiting` `failed` `off`, or `{ status, label }` | a small LED and its word; `words` renames them ("Paid", "Due", "Overdue"); the LED never blinks in a table |
| `person` | `{ name, src? }` or several | avatar (small) and name; several overlap, 3 then "+N" |
| `tags` | string[] | up to two tag chips, then "+N" with the rest in a tooltip |
| `progress` | a share, 0–1 | a slim 12-lamp meter, its percent in a tooltip and said to assistive tech; green unless `warn`/`danger` say where it turns |
| `trend` | number[] | a mini sparkline 72 wide, named "from a to b" |
| `yes` | boolean | `check` for yes; nothing for no (said to assistive tech) |
| `check` | boolean (null: can't apply) | a row `Checkbox` named "<row>, <column>"; `onCheckedChange(row, checked)` on the column, read-only without it; null is "—" |
| `code` | string | monospaced; a copy key on hover and focus that turns to `check` |
| `actions` | – (`actions(row)`) | a `more` key at the row's end, on hover and focus, opening a `Menu`; one `primary` action with an icon shows as its own key beside it. An action's `icon` is an element (`<SendIcon />`), so the table ships only the glyphs it is given |
| empty | null, undefined, "" or [] | "—" in ink3 in every kind |

Real minus signs everywhere. Numbers are never red alone: a sign or a glyph carries it.

## States and motion

| State | Look | Motion |
|---|---|---|
| hover, focus | the guide plate under the row | the plate glides row to row on the settle spring |
| sort | the arrow points the way; rows reorder | the arrow morphs up ↔ down (settle); each row travels from where it was (settle) |
| selected | a quiet green tint; head checkbox mixed or ticked | the checkbox's own |
| opened | the row's green rail at the start | – |
| actions, copy | keys at the row's end | fade in on hover or focus (settle); always shown without hover (touch) |
| loading, no rows | `loadingRows` skeleton rows in the columns' shapes | the skeleton's own delay and sheen |
| loading, rows | the rows stay, `aria-busy` | they dim after the show delay (`useWait`, the spinner's item dim) |
| empty | `empty` (say what would be here, and the action that starts it) | – |
| nothing matches | `emptyFiltered` and Clear | – |
| failed | `sync-error`, `error.message`, Try again | – |
| totals | sums or means in the foot (`total: 'sum' \| 'mean' \| (rows) => value`) | figures turn on the drum (`SwapText`) when rows change |
| group closed / open | chevron along / down; rows hidden / shown | chevron turns a quarter on the part spring; groups below travel (settle); opening reveals the rows from under the header in step |
| pinned, scrolled | the first column holds; a shade at its edge | the shade fades in on settle only while something is under it |
| live, at the top | new rows at the top | they land (one nest above, object spring); the rest travel down (settle) |
| live, scrolled away | rows wait; "N new" key under the head (the count on the drum) | the key rises from a nest above (settle); pressing it scrolls to the top (smooth) and the rows land; coming back to the top does too |
| detail open | a sunk panel under the row, chevron down | the panel is revealed from its top edge (settle) while the rows below travel down in step; closing, the rows travel up |
| column sizing | the hairline thickens to a 3 grip | grip on the part spring under the pointer, focus or drag; the column follows the pointer one to one |
| narrow | under 720 priority 3 columns leave, under 560 priority 2 (and the side padding narrows to 8); their values join a line under the primary cell, each after its header in ink3 | – |

Reduce Motion: rows jump to their places, land and open at once; the arrow, the chevrons and the guide change at once.

## API

| React | SwiftUI |
|---|---|
| `columns` (`key`, `header`, `kind`, `unit`, `value`, `detail`, `cell`, `sortable`, `sortBy`, `align`, `priority`, `primary`, `actions`, `currency`, `digits`, `format`, `better`, `words`, `warn`, `danger`), `rows`, `rowKey` | `MetalTable(rows, columns: [MetalTableColumn(…)])` |
| `caption`, `captionHidden` | `caption:` |
| `density` | `density:` (`.roomy`, `.regular`, `.compact`) |
| `sort`, `defaultSort`, `onSortChange` | `sort:` binding |
| `selected`, `onSelectedChange`, `rowLabel` | `selection:` binding |
| `onRowAction`, `opened` | `onOpen:`, `opened:` |
| `filter` (`total`, `matched`, `onClear`) | `filter:` |
| `loading`, `loadingRows`, `error`, `empty`, `emptyFiltered` | `loading:`, `error:`, `empty:` |
| `maxHeight` | a fixed frame (the head is pinned) |
| `now` | `now:` |
| `TableCell` (`kind`, `value`, the format props, `onCheckedChange`) | `MetalTableCell(_:format:)` |
| column `total`, `footer` | `MetalTableColumn(total:)`, `footer:` |
| `groupBy`, `defaultCollapsed` | `groupBy:`, `collapsed:` |
| column `pin: 'start'`, `rowHeader` | `pin: true`, `rowHeader: true` |
| kind `check`, column `onCheckedChange` | `.check`, `MetalTableColumn(check:…, onChange:)` |
| `live` | `live:` |
| `expandRow` | `detail:` (returns `AnyView`) |
| `columnsMenu`, `resizable`, `columnsState`, `defaultColumnsState`, `onColumnsChange` | `columnsState:` binding (`MetalTableColumnsState`), `columnsMenu:`, `resizable:` |

## Patterns

- **Many rows at once**: `selected` plus a `ToolStrip` over the list with its `count` on the drum ("3 selected", `SwapText`), destructive verb last, × to clear. The table doesn't own the strip.
- **Pages**: `Pagination` under the table for records (sort across all pages on the host, show one page); a "Load more" `Button` for feeds. No infinite scroll until virtual rows.
- **Details**: open a row (`onRowAction`), mark it `opened`, and show its fields as `Properties` with `TableCell` values. For a little more without leaving the list, `expandRow` (a `Properties` in the panel reads well).
- **Totals**: give each summable column `total: 'sum'` (or `'mean'`, or a function); a column with a total should keep priority 1 (a leaving total joins the line under the label). Groups show the same totals as subtotals.
- **A permissions matrix**: rows are permissions (`rowHeader`), one `check` column per role with `onCheckedChange`; a role that always has it gets no handler (read-only); null where it can't apply.
- **A comparison matrix**: the plan column `rowHeader` and `pin: 'start'`, `maxHeight` so the head is pinned too; features as `yes` or number columns.
- **A live log**: newest first in `rows`, `live`, `maxHeight`; keep a cap on the host's list. The table never moves what you're reading.
- **Column choices**: `columnsMenu` and `resizable`, `onColumnsChange` to save `{ hidden, widths }` per person.

## Keyboard and accessibility

- A real `table` with a caption and column headers; a sortable header says `aria-sort` and its button is in the tab order. Row checkboxes are named "Select Lisbon"; select-all is mixed when some are chosen.
- With `onRowAction`, the primary cell is a button: Tab reaches it, ↩ or a click anywhere on the row opens, ↑ ↓ move between rows. The keys at the row's end are their own buttons ("More for Lisbon", "Copy INV-2045").
- Meters and trends are named by their column; a yes/no cell says Yes or No; an empty cell says none.
- While loading, the table is `aria-busy`.
- Group headers are `<th scope="rowgroup">` holding a button with `aria-expanded`; each group is its own `<tbody>`.
- `rowHeader` cells are `<th scope="row">`. Check cells are checkboxes named "<row>, <column>".
- The detail key says "Details for <row>" with `aria-expanded` and `aria-controls` the panel's row.
- The "N new" key is inert and hidden while nothing waits. Resize grips are `separator`s ("Size Due") in the tab order: ← → step 8, ↩ or a double-click resets.
- The columns menu rows are `menuitemcheckbox`; the menu stays open while you change several.

## Rules

- Say the kind, not the look; reach for `cell` only when no kind fits.
- Units in the header, bare tabular figures in the cells.
- Sort only columns where order means something.
- Give every column but the name a `priority` when the table can get narrow; never scroll records sideways (a matrix with `pin` may).
- Never push a reader: live rows wait while you're scrolled away.

## SwiftUI differences

- `total` is `.sum` or `.mean` (no function); figures turn with numeric text, not the drum.
- Pinned: only the first column and the lead cells hold; the sideways scroll is a `ScrollView`, so the caption stays above it.
- The columns menu is the system menu with toggles; resizing is a drag (and the adjustable action), with the resize cursor on macOS.
- Live rows land with an insertion transition (one nest above, object spring); the rest move with SwiftUI's layout animation.

---

# Tabs

Switches which panel is shown. React: `Tabs`, `TabList`, `TabPanel` from `@unlocalhosted/metalui`. SwiftUI: `MetalTabs`.

## Use it for

- Options that each own a panel: source views (React / Agent guide), the pages of a settings sheet, views of one object.

## Don't use it for

- Picking a value with no panel of its own (pen or marker, a connector look): `Switcher`.
- More than five or six options, or long labels: a `Select` or a side list.
- Moving between pages of the app: navigation links.

## Anatomy

`Tabs` holds the active tab. `TabList` is the switcher track: a well, tabs in ink2, the active tab a raised thumb in ink. One `TabPanel` per tab, anywhere inside `Tabs` (the list can sit in a head bar, the panel below).

## States and motion

| State | Look | Motion |
|---|---|---|
| rest | the track; active tab on the thumb | – |
| hover | label ink | .16 s |
| switch | thumb on the new tab | part spring glide, may overshoot against the end |
| new panel | – | 6 px drift from the side the thumb went, and a fade, settle spring |
| first panel | – | none |
| focus | 1.5 ring on the tab | – |
| disabled | 40 % | – |
| vertical | the track as a column, corners concentric with the thumb (17, compact 15), labels at the start | the panel drifts from above or below |

Keys: ← → move and choose (↑ ↓ when vertical), Home / End jump, Tab goes into the panel. Reduce Motion: the thumb moves at once, the panel only fades.

## API

`<Tabs orientation ("horizontal" | "vertical") value onValueChange defaultValue className>` (vertical: lay the list and panels side by side with `className`, e.g. `flex gap-16`, and give the list a width) · `<TabList items size ("regular" 28 | "compact" 24) aria-label />` · `<TabPanel value keepMounted>`

`items` is `[{ value, label, icon?, disabled? }]`.

---

# Textarea

Several lines of text. React: `Textarea` from `@unlocalhosted/metalui` (a native textarea; Base UI has no textarea part). SwiftUI: `MetalTextarea` (work in progress). Its well is the `well` recipe's field look; the `textarea` recipe adds the rows, the counter and the motion.

## Use it for

- A note, a description, a comment, a message: anything that may run past one line.

## Don't use it for

- One line (use a field), a number (use a number field), code (use a code card).

## Anatomy

- Well: the field well, radius 14, padding 11 × 14; text in the content type role (15 / 20).
- Counter (with `maxLength`): below the well at the right, meta type, `used/limit`.

## States and motion

| State | Look | Motion |
|---|---|---|
| rest | the field well, 3 rows (`minRows`) | – |
| focus | the flush green ring | – |
| grow / shrink | the well fits its text, between `minRows` and `maxRows` (8) | height on the settle spring, no overshoot; the text stays pinned to the top |
| full | at `maxRows` it stops growing and scrolls | – |
| near the limit | the counter shows at 80 % of `maxLength` | its row grows open on the settle spring as it fades in (the form error's motion) |
| at the limit | the counter turns red | – |
| refused | typing or pasting past the limit leaves the text alone | only the counter shakes on the refusal spring (reach: one nest, 6) |
| invalid | a red hairline ring | – |
| disabled | 40 % | – |

Reduce Motion: the height snaps and nothing shakes; the counter still turns red.

## API

| React | SwiftUI |
|---|---|
| `value`, `defaultValue`, `onChange` | `text:` |
| `size`: `large` (default, the content role), `regular`, `compact` (the ui role, Field's inset) | `size:` |
| `countFrom`: the share of `maxLength` where the counter shows (0 always, default 0.8) | – |
| `minRows`, `maxRows` | `minRows:`, `maxRows:` |
| `maxLength` | `limit:` |
| `invalid` | `invalid:` |
| `disabled`, `readOnly`, `placeholder`, and every textarea attribute | `.disabled()` |

`className` goes on the well; `style` and the rest go on the textarea.

## Keyboard and accessibility

- A native textarea: every editing key works as the platform expects. Tab leaves it.
- Give it a label: a visible `<label htmlFor>` or `aria-label`. The counter is linked by `aria-describedby`; reaching the limit is announced once ("Limit reached, N characters"), not on every keystroke.
- `invalid` sets `aria-invalid`; say what is wrong in text near it.

## Rules

- The well grows; the page never jumps. Growing is the settle spring, never a bounce.
- A refusal is local: only the counter moves, and the text is never trimmed or changed.
- Show the counter only when it helps (near the limit), or from the start (`countFrom={0}`) when the form states its limit.
- In a form of regular or compact Fields, give the textarea the same `size`.

---

# Time scrubber

Time as a dimension of the surface: drag or step back through what was written. A composition block. React: `TimeScrubber` (earlier `MemoryScrubber`) from `@unlocalhosted/metalui`. SwiftUI: `MetalTimeScrubber` (earlier `MetalMemoryScrubber`).

## Use it for

- Viewing the canvas as it was: blocks that did not exist yet fade out, edited ones show their old text, the world takes a faint sepia (the host's), and the past banner appears.

## Don't use it for

- Undo. Scrubbing only looks; it changes nothing.
- Picking a date for data (a due date, a range). Use a date field.

## Anatomy

330 × 50, bottom left of the canvas:
- a **readout** above: `Label variant="engraved"` with a tiny `Glyph` (the clock at 10, in the engraving's ink), `MEMORY · NOW` or `MEMORY · TUE 23 SEP · 14:10`, and `Button cap="link"` NOW while in the past;
- a `Slider` filling the box: its **track** well (10 tall) with the intent fill up to the knob, **marks** (2 × 4) for moments, **ticks** beneath with the day names (`MON` … `TODAY`, at most seven) as engraved labels, and the knurled 22 pt **knob**.

## States and motion

| State | Look | Motion |
|---|---|---|
| now | knob at the right end, `MEMORY · NOW` | – |
| dragging | the knob under the pointer, grabbing cursor | follows exactly; within 1 % of now it snaps to now |
| a click on the track, ← →, ⇧ ← → | the knob jumps an hour, or a day | part spring (instant under Reduce Motion) |
| past | the readout names the moment; `NOW` shows | – |
| focus | the 2 pt focus ring around the knob | – |

The knob is the one place the scrubber's own arrows win over selection nudges: the host must not nudge while it has focus.

## API

| React | SwiftUI | Notes |
|---|---|---|
| `start`, `end` | `range:` | ms / `ClosedRange<Date>` |
| `value`, `onValueChange` | `selection:` (Binding<Date?>) | `null`/`nil` is now |
| `marks` | `marks:` | block and edit moments |
| drag state | `onScrubChange:`, `isScrubbing:` | host can defer heavy analysis until release; an active drag has no jump spring |
| `format` | `format:` | the readout for a past moment |
| `title` | `title:` | the word before the moment, default MEMORY |
| `glyph` | (MetalIcon built in) | the clock at 10 |

## Rules

- Scrubbing never changes anything. ⎋ or NOW returns to the present.
- The readout always names the moment; the aria value text says it too.
- Only chrome that changes while in the past is the past banner.

## Accessibility

- A Base UI slider labelled "Scrub through time": ← → step an hour, Shift a day, Home and End jump to the start and now; its value text reads the moment ("TUE 23 SEP · 14:10", or "Now").
- NOW is a real button.
- Whole 330 × 50 box starts a scrub; readout text passes pointer hits through to slider, while NOW keeps its own hit target.

## Tokens

Layout and timing: `--mu-scrubber-*` (box, readout gap, glyph spacing, steps, snap). Look: the slider, label, glyph and button recipes. Swift: `MetalScrubberMetrics`.

---

# Toast

The result of a person's own action, with Undo. React: `ToastProvider` + `useToast()` from `@unlocalhosted/metalui` (Base UI Toast). SwiftUI: `MetalToastDeck` and `.metalToastDeck(_:)` (the deck), `MetalToast` and `.metalToast(_:)` (one at a time). Sheet reference: the object sheet; 

## Use it for

- What an action did, with Undo: "Moved 3 blocks", "Ticked · wrote [x] into the text", "Pinned as a live region · it updates as you write", "Correction remembered · for this exact text".
- An error that needs attention (it stays until resolved).

## Don't use it for

- Recognition. The surface never toasts, badges or sounds for what it recognised.
- Anything a person must read later. Several results in a row stack as a deck; it isn't a log.

## Anatomy

A 44 tall glass pill in the colorway (blur 22, its stack), padding 0 6 0 16, gap 12, the `ui` role; a detail after a middle dot; a count after a repeat (`×3`); an Undo cap (28 tall, a light top lip) with a sunk `⌘Z` keycap; a quiet 28 close key (×) that shows its cap on hover. Bone: a bone pill (`rgba(251,250,248,.92)`), ink `#1B1B1D`, detail `#6E6E72`, a bone cap (`#FFFFFF → #F0EFEB`). Graphite: a smoked pill (`rgba(30,30,33,.92)`), ink `#F2F2F0`, detail `#9A9AA0`, a graphite cap (`#3A3A3E → #2C2C2F`). Bottom centre, 92 above the dock. Success carries its check; an error its red mark.

The deck: toasts stack in depth, newest in front. Each card behind is a step smaller (×.95), peeks 8 past the card in front on the side away from the screen edge (a bottom deck peeks upward) and is 20 % dimmer, its words hidden. Three are drawn; the rest are counted above the back card (`+2`) and come forward as the front ones go. Fanned out, the cards stand 8 apart in a readable column.

## States and motion

| State | Motion |
|---|---|
| arrive | rises 8 from below, from .97, into the front on the object spring; every card behind steps back one on the same spring, in the same frame |
| fan out | pointer on the deck, or focus into it (Tab, F6): the cards spread into a column on the surface spring; every timer pauses |
| fold | pointer or focus leaves: back into the deck on the surface spring; timers resume |
| swipe | follows the pointer (down or right); past 40 on release it leaves the way it was thrown on release; short of it, springs home |
| close | the close key, or Esc on the focused toast: leaves on release; the next card comes forward |
| repeat | the same title, detail and tone as the front card: no new card; it presses to .96 and springs back on the part spring, counts `×2`, and its timer starts over |
| Undo pressed | the cap presses 1; the action is undone, the toast leaves |
| ⌘Z (Ctrl+Z) | the newest undoable toast's Undo runs, once, and it leaves; not while typing in a field (its own undo wins), and not when the host's handler called `preventDefault` (an editor that owns ⌘Z) |
| time out | undoable 5 s, plain 2.6 s, error never |
| Reduce Motion | no travel or scale: cards cross-fade into place; the repeat shows only the count |

## API

```tsx
// once, at the root
<ToastProvider><App /></ToastProvider>

// anywhere below
const toast = useToast();
toast.show({ title: 'Moved 3 blocks', undo: () => undo() });
toast.show({ title: 'Pinned as a live region', sub: 'it updates as you write', tone: 'success' });
toast.show({ title: 'Moved 3 blocks', undo }); // again: the front card counts ×2
```

```swift
@State private var deck = MetalToastDeck()
canvas.metalToastDeck(deck)
deck.show(.init("Moved 3 blocks", undo: { undo() }))   // again: the front card counts ×2

canvas.metalToast($toast)   // one at a time: toast: MetalToastModel? = .init("Moved 3 blocks", undo: { undo() })
```

## Rules

- The person's own actions only, and always Undo when the action can be undone.
- Say what happened, in the words of the action; a detail, if any, after the middle dot.
- Success carries its check; never colour alone.
- Errors stay until resolved; everything else goes by itself.
- Show results as they happen; the deck keeps the newest in front. Don't build your own queue or clear the deck to show the next one.
- The same result again is a repeat: let it count; don't reword it to force a new card.

## Accessibility

- Base UI Toast: one labelled region (Notifications), announced politely; a new card is always the front one, so only it is read out, and a repeat reads its new count. F6 moves focus into the deck and fans it out; Esc dismisses the focused toast. The Undo cap and the close key (Dismiss) are real buttons; ⌘Z does what Undo does (the host's shortcut). Cards not drawn are inert.

## Tokens

`--mu-toast-*`, `--mu-r-toast-deck-*` (step-scale, peek, dim, visible, gap, swipe, press), `--mu-backdrop`, `--mu-kbd-sunk-*`, `--mu-spring-object` (arrive), `--mu-spring-surface` (fan out, fold), `--mu-spring-part` (repeat), `--mu-spring-settle`, `--mu-spring-release`. Swift: `MetalToastMetrics`, `MetalRecipes.toast` (deck.*).

---

# Toggle

A latching push button, alone or in a row. React: `Toggle` and `ToggleGroup` from `@unlocalhosted/metalui`, on Base UI Toggle and ToggleGroup. SwiftUI: `MetalToggle` (work in progress). The cap is the `button` recipe and the lamp is the LED part; the `toggle` recipe adds the depths and the motion.

## Use it for

- A mode or a tool that stays on until you turn it off, shown as a key: "Grid", "Snap", Bold / Italic / Underline.
- `ToggleGroup` for a set of such keys, several at once (`multiple`) or at most one.
- `RadioKeys` with `RadioKey` when exactly one of the set is down (time slots, a call length): a radio group with the same latching keys.

## Don't use it for

- A setting in a list (use a switch), one of several views that is always chosen (use a switcher), or an action that happens once (use a button).

## Anatomy

- Key: the button cap (32 tall, pill, ui type).
- Lamp: the small LED at the start of the label; unlit off, green on. `lamp={false}` hides it for an icon key whose icon shows its state.
- Group: keys 4 apart in a row.

## States and motion

| State | Look | Motion |
|---|---|---|
| off | the raised cap, lamp dark | – |
| pressing | the pressed look, 2 down (past the catch) | 50 ms, linear |
| on | the pressed look, 1 down, lamp lit | rises to the latch on the part spring (may overshoot against the catch) |
| off again | raised, lamp dark | rises all the way on the release spring |
| focus | the green ring | – |
| disabled | 40 % | – |

Reduce Motion: the latch snaps to its depth; the lamp still lights.

## API

| React | SwiftUI |
|---|---|
| `Toggle` `pressed`, `defaultPressed`, `onPressedChange`, `value` (in a group), `lamp` | `isOn:` |
| `ToggleGroup` `value` (array), `defaultValue`, `onValueChange`, `multiple` | `selection:` |
| `RadioKeys` `value`, `defaultValue`, `onValueChange`, `className` (replaces the row layout); `RadioKey` `value`, `lamp`: exactly one down, as a radio group | – (a `Picker`) |
| `disabled` | `.disabled()` |

## Keyboard and accessibility

- A button with `aria-pressed`. Space or Enter latch and unlatch. In a group, arrow keys move between keys and Tab leaves the group.
- `RadioKeys` is a `radiogroup` of `radio` keys: one Tab stop (the chosen key), arrows move and choose at once.
- The label names it; an icon key needs `aria-label`.

## Rules

- The label names the mode, not the action: "Grid", not "Show grid".
- The lamp is the promise that it latches; keep it unless the icon itself shows the state.

---

# Tool strip

Verbs over a selection, adapted to what was clicked. A composition block on Base UI Toolbar. React: `ToolStrip` and `verbsFor` from `@unlocalhosted/metalui`. SwiftUI: `MetalToolStrip`, `MetalToolStrip.verbs(for:in:)` and `.metalToolStrip(over:)`.

## Use it for

- A click selection on the canvas. Each kind has its verbs: a text block **Tasks**, **Summarise**, **Region**; an image **Lift subject**, **Copy**, **Crop**; a link **Open**, **Copy link**; any one of them **Rename**; and every kind **Gather**, **Export**, **Send away** (with Undo). Several selected show only the verbs they share.
- Rows picked in a list (the task inbox): a count leads, verbs with choices open a menu, a close key ends the selection.

## Don't use it for

- A selection made by finishing (⎋, ⌘↩): that selection is quiet.
- While dragging, resizing, in the past, or with the palette open.
- App-level tools (select, write, region, ink). Those are the toolbar.

## Anatomy

- A plate of `Surface material="graphite-strip" radius="strip"` (16) under the keys, padding 4, gap 2.
- `Button cap="strip"` verbs (28 tall, radius 11, padding 10), each with its glyph (`icon`); on a canvas pass `wordClassName="sr-only"` so only glyphs show and the names are in tooltips.
- A `Rule tone="graphite"` 16 tall before the destructive verb, `Button cap="strip-danger"` in the warm red, always last.
- A More key (`more` glyph) before the destructive verb when the verbs don't fit.
- Placed (`anchor`): centred 12 above the selection's bounds, below them when there's no room above, kept 12 inside its positioned parent's edges.

## Choosing the verbs

```tsx
const items = verbsFor(selection.map((n) => n.kind), {
  text:  [tasks, summarise, region, rename, gather, exportIt, sendAway],
  image: [lift, copy, crop, rename, gather, exportIt, sendAway],
  link:  [open, copyLink, rename, gather, exportIt, sendAway],
});
<ToolStrip label={what} anchor={selectionBounds} items={items} wordClassName="sr-only" />
```

- The verbs every selected kind shares, in the first kind's order: list the shared verbs in the same order in every set so muscle memory holds.
- `single: true` (Rename) only for a selection of one.

## States and motion

| State | Look | Motion |
|---|---|---|
| appears (click selection) | the strip | rises 4 on part from the selection (comes down 4 when it sits below); instant under Reduce Motion |
| the selection changes (`items` or `label` changes) | the new verbs | settle spring: kept verbs glide from where they were, the plate's ends travel to the new width (two halves under a fixed clip; only transforms), leaving verbs fade where they stood (release), new ones fade in a beat later; at once under Reduce Motion |
| pan or zoom (`anchor` changes, nothing else) | the strip at the new place | follows at once |
| doesn't fit | the rest in More | – |
| button hover | `rgba(255,255,255,.08)`, white | settle |
| button pressed | down 1 on `rgba(0,0,0,.35)` | 50 ms, back on release |
| disabled | 40 %; the tooltip and accessible description say why (`disabledReason`) | – |
| waiting (`state`) | held down; the glyph turns into the arc after the show delay | the key's own wait |
| hold (`hold`, destructive) | a darker red fill runs across the key while held; runs only at the end | the Button's hold to confirm |

## API

| React | SwiftUI |
|---|---|
| `items: { label, onSelect, icon?, iconOnly?, menu?, destructive?, disabled?, disabledReason?, shortcut?, state?, hold?, single? }[]` | `items: [MetalToolStripItem]` (`icon:`, `iconOnly:`, `menu:`, `destructive:`, `disabled:`, `disabledReason:`, `shortcut:`, `state:`, `hold:`, `single:`) |
| `label` (what they act on; a new selection says something new) | `label:` |
| `count` (a lead before a separator, styled by you: `<span className="type-ui tabular-nums text-toolstrip-ink-hover"><SwapText value="3 selected" /></span>`) | `count:` (a string; it turns on the drum) |
| `wordClassName` (on every word: `sr-only` for glyphs only, `sr-only @lg:not-sr-only` for words when wide) | `glyphsOnly:` |
| `anchor: { x, y, width, height }` (the selection's bounds in the strip's positioned parent, after pan and zoom) | `.metalToolStrip(over: CGRect)` on the canvas (the strip in an overlay, placed the same way) |
| `verbsFor(kinds, sets)` | `MetalToolStrip.verbs(for:in:)` |

## Rules

- Verbs compose, and never own the data before or after.
- Every verb confirms with a toast that says what happened and offers Undo ("Made 3 tasks", "Sent away 3 blocks").
- One destructive verb, last, after the separator, never folded into More. Canvas delete is send away (DS-33), a plain press because it can be undone; an irreversible one holds to confirm (`hold`).
- A disabled verb always says why.
- A verb's glyph is the one whose act is that verb (`task`, `document`, `region`, `pen`, `group`, `share`, `send-away`, `capture`, `copy`, `fit`, `external`, `link`).

## Accessibility

- A Base UI toolbar named "Tools for 3 blocks": one tab stop, arrows between verbs (More included); the destructive verb is named, not only coloured.
- Glyph-only verbs keep their names (`aria-label`); the tooltip is visual. A disabled verb stays focusable and carries its reason as its accessible description. A waiting verb says `aria-busy`.

## Tokens

`--mu-toolstrip-*`, `.mu-frost-graphite`, `--mu-radius-plate`, `--mu-radius-row`, `--mu-spring-part`, `--mu-spring-settle`, `--mu-spring-release`, `--mu-travel-part`. Swift: `MetalToolStripMetrics`.

---

# Toolbar and tool button

A strip of tools. React: `Toolbar`, `ToolButton`, `ToolbarSeparator`, `ToolbarSearch` from `@unlocalhosted/metalui` (Base UI Toolbar, Toggle and Tooltip). SwiftUI: `MetalToolbar`, `MetalToolButton`, `MetalToolbarSeparator`. Sheet reference: the object sheet; 

## Use it for

- The canvas's tools (select, write, region, ink) as latched tools, and momentary actions (zoom, undo) beside them; a search well that opens the palette.

## Don't use it for

- Verbs over a selection (use the tool strip) or a form's actions (use buttons).
- Labelled actions: tools are icon-only with tooltips.

## Anatomy

- **Strip**: 48 tall (36 tools in a 6 nest), radius 24, so a true capsule; the strip frost in the colorway, or graphite (`variant="graphite"`) as the canvas uses in both colorways.
- **Tool**: a circular 36 cap (the button material), a 16 glyph in the icon ink; latched: pressed (`pressed-bg`, `pressed-sh`) with the LED part's live lamp (the status recipe: sunk socket and glow) at 4 pt, 5 in from its top right.
- **Separator**: a 1 × 22 engraved rule.
- **Search well**: a 36 tall pill well with the placeholder in ink3 and a `⌘K` keycap.
- **Tooltip**: a graphite label chip with the key, 10 above, after 120 ms: `SELECT · V`.

## States and motion

| State | Look | Motion |
|---|---|---|
| strip enters | – | one nest from its edge on surface |
| hover | ink glyph; the glyph's hover pose (the tool is its trigger) | the icon's own |
| pressed | down 1 into a well | 50 ms, back on release |
| latched | pressed + LED | instant |
| focus | a 1.5 ring, no offset | – |
| disabled | 40 % | – |

## API

```tsx
<Toolbar aria-label="Tools" variant="graphite">
  <ToolButton label="Select" shortcut="V" icon={<SelectIcon size={16} />} pressed={tool === 'select'} onPressedChange={() => setTool('select')} />
  <ToolButton label="Write" shortcut="T" icon={<TextIcon size={16} />} pressed={tool === 'write'} onPressedChange={() => setTool('write')} />
  <ToolbarSeparator />
  <ToolbarSearch onOpen={openPalette} icon={<SearchIcon size={14} />} />
</Toolbar>
```

## Rules

- Icon-only tools always have a tooltip with the key, and an accessible name.
- One latched tool at a time in a group; switching is instant.
- Glyphs from the set at 16: they play their hover from the whole tool.

## Accessibility

- Base UI Toolbar: one tab stop, arrows between tools; latched tools are toggles (`aria-pressed`); keys in `aria-keyshortcuts`.

## Tokens

`--mu-toolbar-*`, `.mu-frost-strip`, `.mu-frost-graphite`, `--mu-btn-*`, `--mu-pressed-*`, `--mu-r-status-led-live-*` (the LED part's lamp), `--mu-radius-card`. Swift: `MetalToolbarMetrics`.

---

# Tooltip

Names an icon-only control and its key, one hover away. React: `Tooltip`, `TooltipProvider` from `@unlocalhosted/metalui` (Base UI Tooltip). SwiftUI: `.metalTooltip(_:shortcut:edge:)`. Behaviour: the reference design's `#tip`.

## Use it for

- Every icon-only control: a tool, a lens bar pin, a close button. The name and its key.

## Don't use it for

- Where a cue came from: use the `ProvenanceTooltip` block (a wrapped note with its detail in `Tooltip.Dim`).
- Anything to click or read at length: use a popover or a menu. A tooltip holds no controls.
- A control that already shows its name in words.

## Anatomy

- **Chip**: the colorway's fill and shadow with no backdrop, radius 11, padding 6 × 10, 10 mono at 1.45, tracked .05em. Bone: a bone chip, ink `#1B1B1D`. Graphite: a graphite chip, ink `#E9E9EB`.
- **Key**: after a middle dot, dimmed (`#6E6E72` on bone, `#8E8E93` on graphite): `SELECT · V`.
- **Dim** (`Tooltip.Dim`): the same dimmed ink for any detail in a `label` node.
- **Wrap** (`wrap`): a longer note wraps at 280 instead of one line.
- **Delay and offset** (`delay`, `offset`): a note waits longer than a name (380 against 120) and can sit clear of a chip its trigger shows.
- **Placement**: 10 from the trigger, above by default; flips near the edge.

## States and motion

| State | Look | Motion |
|---|---|---|
| rest | nothing | – |
| hover / focus, 120 ms | the chip | fades in on settle |
| next trigger in the group | the next chip at once | instant |
| leave / press | gone | fades out on settle |

## API

```tsx
<TooltipProvider>
  <Tooltip label="Undo" shortcut="⌘Z">
    <button aria-label="Undo"><UndoIcon size={16} /></button>
  </Tooltip>
</TooltipProvider>
```

```swift
Button(action: undo) { MetalIcon(.undo, size: 16) }
    .accessibilityLabel("Undo")
    .metalTooltip("Undo", shortcut: "⌘Z")
```

## Rules

- Every icon-only control has one, and its own accessible name; the tooltip is visual.
- One line. Name, then key. No sentences, no punctuation beyond the middle dot. Only a block's note (`wrap`) runs longer.

## Accessibility

- The trigger carries `aria-label` (and `aria-keyshortcuts` when it has a key). Keyboard focus shows the tooltip as hover does.
- While a tooltip shows, the first ⎋ hides it and goes no further (WCAG 1.4.13: hover content is dismissable without moving focus); the next ⎋ reaches the panel around it. A panel that should close on the first ⎋ even over a tooltip listens in the capture phase (`onKeyDownCapture`), as the share panel block does.

## Tokens

The tooltip recipe, `--mu-tooltip-delay-ms`, `--mu-tooltip-gap`, `--mu-spring-settle`. Swift: `MetalTooltipMetrics`.

---

# Weather

Weather as an object. A custom block: a `Surface` (raise, card radius) with a dot-matrix sky sunk into a `Well` (field). React: `Weather`, `WeatherTile`, `WeatherGlyph` from `@unlocalhosted/metalui`. SwiftUI: `MetalWeather`, `MetalWeatherTile`.

## Use it for

- A place's weather now and ahead on a canvas or a home screen: the large widget (400 × 560) or a tile (180).
- A row or grid of tiles, one sky each.

## Don't use it for

- A forecast table or a chart of many days: use a table or a `Sparkline`.
- An icon beside words: use `WeatherGlyph` (7 × 7 dots) or a life icon.

## Anatomy

`Weather.Root` › `Weather.Header` (place in display, a summary in meta, an `Led` with Live or Paused and the clock in readout) › `Weather.Sky` (224 tall, radius 18; 46 × 28 dots on an 8 pitch, horizon on row 21) › `Weather.Now` on the sky's ground (the temperature in the pixel face, the condition in content, one readout) › `Weather.Hours` (six slots: an engraved label, a `WeatherGlyph`, the temperature in the pixel face at 24) › `Rule` › `Weather.Week` (a header row with the scale, then one row a day: name, glyph, low, a line of dots one a degree, high).

`WeatherTile` is `Weather.Root size="tile"` › `Weather.Sky` (21 × 21 dots, horizon on row 13) › `Weather.Now` (the condition engraved).

## The sky is a description

`sky` takes a `WeatherKind` or a `WeatherSky`:

| Field | What it draws |
|---|---|
| `clouds` | `{ x, y, size, dark }` each; they drift with the wind and wrap around |
| `overcast` | hides the sun, the moon and the stars |
| `rain` | 0.3 drizzle (sparse), 0.6 rain, 1 a slanting downpour |
| `snow` | flakes drifting down, pushed by the wind |
| `thunder` | a bolt from the second cloud every few seconds |
| `mist` | up to four bands sliding opposite ways over the ground |
| `wind`, `windFrom` | faster drift and gust streaks from the left (1) or the right (-1) |
| `heat` | shimmer rising off the ground |
| `birds` | up to three birds crossing a daytime sky |
| `moonPhase` | the moon's age 0–1; default the phase on `date`, else full |

`WEATHER_SKIES` has one per kind (clear, partly, cloud, drizzle, rain, storm, snow, sleet, mist, windy, heat). Spread one to change it: `{ ...WEATHER_SKIES.snow, wind: 0.9 }` is a blizzard. `weatherScene()` returns the paths per layer for a sky of any size.

## Time

`hour` places the sun on its arc between sunrise (07:30) and sunset (19:30), lowest at the ends; the horizon warms at dawn and dusk. After dark the moon crosses in its phase and stars twinkle. A host that wants the day to pass moves `hour` itself.

## Behaviour

- Everything that moves steps one frame every 166 ms (the recipe's `dot.frame`). `animate={false}` or reduced motion holds a single frame.
- The large widget is a region labelled "Weather in {place}"; the sky is an image labelled with the condition and temperature; the hours and the week are lists whose items read their values.
- Temperatures are shown as given, with a degree sign: pass them in the unit you show.

## API

| React | SwiftUI | Notes |
|---|---|---|
| `place`, `summary` | `place:`, `summary:` | |
| `hour` | `hour:` | 0–24 |
| `sky` | `sky:` | a kind or a `WeatherSky` |
| `condition`, `temp`, `feels`, `rain`, `wind` | same | the ground readout |
| `live`, `clock` | `live:`, `clock:` | null hides the status |
| `hours`, `days`, `scale` | same | at most 6 hours and 7 days; the scale fits 21 degrees |
| `date` | `date:` | the moon's phase |
| `animate` | `animate:` | |

## Tokens

The weather recipe: sizes, the dot pitch and frame, and the per-colorway inks (off, hz, hill, sun, moon, star, cloud, cloud-dark, rain, snow). The surface, well, status and rule recipes.

---

# Well

A sunk field or track. React: `Well`. SwiftUI: `MetalWell`.

## Use it for

- The field behind an input, the track of a slider or switcher, a drawn region on a canvas, a well in a dark strip.

## Props

- `variant`: `field`, `track`, `region`, `graphite`. `over` lights a region well green (a drop target).
- `radius`: `pill`, `field` (17), `region` (26), `strip` (15), `row` (12).

## Behaviour

- No role of its own; the control inside carries it. The over state changes on settle.

---

# Icons

`@unlocalhosted/metalui/icons` has 67 Soft Hardware glyphs: monoline + duotone on a 24×24 grid, with a 1.7 stroke. Each glyph has an authored **hover pose** (a reversible spring) and a **press one-shot**. Icons inherit `currentColor`. A static icon (`animate={false}`) at 16px or below uses a tuned small cut with a heavier stroke.

```tsx
import { SendAwayIcon, Icon } from '@unlocalhosted/metalui/icons';

<Button cap="destructive"><SendAwayIcon size={16} />Delete</Button>
<Icon name="synced" size={13} title="Synced" />
```

- **Triggering:** an icon inside any element with the class `mu-icon-trigger` plays from that element, and MetalUI Buttons already have it. Otherwise the icon plays from its own hover and press.
- **Accessibility:** icons without `title` are decorative (`aria-hidden`). Give icon-only controls an `aria-label`.
- **State glyphs morph:** `MorphIcon` (copy, check, plus, close, minus, menu, arrows, chevrons, send/stop, download/upload, eye/eye-off, save) transforms into another state glyph instead of being replaced: `<MorphIcon name={copied ? 'check' : 'copy'} size={14} />`.
- **On cue:** `act` plays the glyph's act whenever it turns to a new truthy value, for a result rather than a touch: `<Icon name="check" act={saves} />` plays on each save; `act` alone plays it as the icon arrives.
- **Static:** `animate={false}` keeps a glyph static. Reduced motion does this automatically.
- **SwiftUI and SVG:** the same glyphs ship as SF Symbols (planned), plus static and animated SVGs at `https://metalui.dev/icons/svg/<name>.svg`.

| Component | Name | Category | Hover | Press |
|---|---|---|---|---|
| `SelectIcon` | `select` | Tools | The pointer draws back, clicks its tip down, and a ring opens where it lands. | plays the same act |
| `TextIcon` | `text` | Tools | The T is lifted, struck down onto its foot like a piece of type, and the caret appears after it. | plays the same act |
| `NoteIcon` | `note` | Tools | The corner peels open, the lines are written fresh, and the corner is pressed back down. | plays the same act |
| `ImageIcon` | `image` | Tools | The sun dips behind the ridge, climbs into the sky with a flare of rays, and sets again. | plays the same act |
| `LinkIcon` | `link` | Tools | The two links are pulled apart on their bar, then snap back into each other and a spark squeezes out at the join. | plays the same act |
| `DrawIcon` | `draw` | Tools | The pencil lifts back, comes down on its point and pulls a stroke across the page, then goes back to its place. | plays the same act |
| `PenIcon` | `pen` | Tools | The nib writes a wave of ink, presses at the end of the line, and a drop of ink blooms and soaks in. | plays the same act |
| `MarkerIcon` | `marker` | Tools | The marker plants its chisel flat and sweeps right, laying a see-through band as far as it goes. | plays the same act |
| `LineIcon` | `line` | Tools | The end handle is picked up and dragged back, the pen presses the start, and the line is drawn out to snap onto its end. | plays the same act |
| `ArrowIcon` | `arrow` | Tools | The arrow is drawn back from its held tail and thrust at its mark; the head strikes, compresses into its tip, and rebounds. | plays the same act |
| `RectangleIcon` | `rectangle` | Tools | A handle grabs the far corner and drags the box in toward its pinned corner, then out past its size; let go, it springs back. | plays the same act |
| `EllipseIcon` | `ellipse` | Tools | A pen comes down on the ellipse and draws it again all the way round; the loop closes where it began. | plays the same act |
| `EraserIcon` | `eraser` | Tools | The eraser is pressed onto a scribble and rubbed left, right and left; the scribble goes a pass at a time and crumbs flick away. | plays the same act |
| `LayoutIcon` | `layout` | Tools | The panes are drawn apart, snap back onto the grid, and the gutter rule flashes where they seat. | plays the same act |
| `TidyIcon` | `tidy` | Tools | The loose pills are knocked square against the guide, and registration ticks flash where they sit flush. | plays the same act |
| `SearchIcon` | `search` | Tools | The lens is swept across the field and stops; the focus closes in and a glint crosses the glass. | plays the same act |
| `ZoomInIcon` | `zoom-in` | Tools | The lens is pushed in along its handle and the plus under it is magnified. | plays the same act |
| `ZoomOutIcon` | `zoom-out` | Tools | The lens is drawn back along its handle; the minus recedes and the old view closes in. | plays the same act |
| `FitIcon` | `fit` | Tools | The content grows to the frame and the four corners clamp onto it; the open sides of the frame flash shut. | plays the same act |
| `DuplicateIcon` | `duplicate` | Actions | The copy slides back onto the original, presses to take its impression, and is peeled off into place. | plays the same act |
| `SendAwayIcon` | `send-away` | Actions | The well turns and draws the dot round and down into its centre; it goes under with a gulp and a new dot rises on the rim. | plays the same act |
| `TrashIcon` | `trash` | Actions | The lid swings up on its hinge, hangs open, then falls shut; the bin gives under it and air puffs from the edge. | plays the same act |
| `GroupIcon` | `group` | Actions | The two cards lift, square up into one stack and drop into the folder, splaying back into place as the flap takes the landing. | plays the same act |
| `UngroupIcon` | `ungroup` | Actions | The two cards are pressed together into the tray, then let go: they spring up and apart and a crack of light opens down the seam. | plays the same act |
| `PinIcon` | `pin` | Actions | The pin is drawn up rocking on its point, then driven straight down; its shadow spreads and a shock runs out along the board where it lands. | plays the same act |
| `BoardIcon` | `board` | Actions | The ribbon is lifted and let drop; its top edge catches it, the tail runs on and springs back. | plays the same act |
| `ShareIcon` | `share` | Actions | The arrow crouches into the tray, pushes off and leaves; the next one rises in its place. | plays the same act |
| `UndoIcon` | `undo` | Actions | The hook winds forward, whips back about its centre and reels its tail in; the head's echo carries on, a step back. | plays the same act |
| `RedoIcon` | `redo` | Actions | The hook winds back, whips forward about its centre and reels its tail in; the head's echo carries on, a step on. | plays the same act |
| `MoreIcon` | `more` | Actions | The first dot is struck into the row; the knock runs through and kicks the last one out: there is more. | plays the same act |
| `CloseIcon` | `close` | Actions | A pen crosses it out: the first stroke marks down, the second strikes through it, and the crossing takes the impact. | plays the same act |
| `CheckIcon` | `check` | Actions | A pen writes the tick: down the short leg, pressed into the corner, flicked up the long leg, and the tip rings. | plays the same act |
| `SyncedIcon` | `synced` | Status | The satellite winds back, laps the core once and clicks home into its slot. | plays the same act |
| `OfflineIcon` | `offline` | Status | The lost satellite swings back toward its slot, falls a unit short and is thrown back out. | plays the same act |
| `SyncErrorIcon` | `sync-error` | Status | The orbit heaves to turn, catches on a stop and rattles against it; the mark jolts. | plays the same act |
| `CaptureIcon` | `capture` | Status | The corners close in and hunt for focus, lock, and the shutter blinks over the aperture. | plays the same act |
| `PasteIcon` | `paste` | Status | The clip levers open, the content drops onto the board, and the clip clamps it down. | plays the same act |
| `KeeperIcon` | `keeper` | Status | The character looks up at it, perks up, and nods it in with a slow blink; its ring tips with the nod. | plays the same act |
| `PlusIcon` | `plus` | Actions | The upright is lifted and driven into the waiting crossbar; the knock runs out to the bar's ends. | plays the same act |
| `MinusIcon` | `minus` | Actions | The bar is pried up off its tile, as if one were taken from it, and set back down; the tile takes its weight. | plays the same act |
| `ChevronIcon` | `chevron` | Actions | The chevron is drawn back and thrust the way it points; its arms fold in behind the point like a hinge, and an echo carries on. | plays the same act |
| `RegionIcon` | `region` | Tools | The frame is set down on the canvas, and its name writes into the head behind a caret. | plays the same act |
| `TaskIcon` | `task` | Tools | The box is pressed down; while it is held the tick is written, and released it springs back up with a click. | plays the same act |
| `TagIcon` | `tag` | Tools | The cord tugs the tag by its eyelet, and it swings there and comes to hang still. | plays the same act |
| `CalendarIcon` | `calendar` | Tools | Today's leaf curls up and flips over the binding, kicking the rings, and a fresh page is left. | plays the same act |
| `DocumentIcon` | `document` | Tools | A thumb folds the corner down, the page turns, and the next page's lines write in. | plays the same act |
| `ClockIcon` | `clock` | Status | An hour passes: the minute hand sweeps round as the hour hand steps one on, a tick marks the hour, and the hands are set back. | plays the same act |
| `MeIcon` | `me` | Tools | Today's point runs back along your days and climbs to today again, drawing the trend behind it. | plays the same act |
| `SeedIcon` | `seed` | Actions | The seed is dropped in and lands on its bottom; the sprout takes the blow, springs up, and its leaf swings. | plays the same act |
| `SendIcon` | `send` | Actions | The arrow crouches on the disc, pushes off its floor and launches; the floor springs back. | plays the same act |
| `StopIcon` | `stop` | Actions | The block is lifted and set down hard in the middle of the key; everything closes in on it and stops. | plays the same act |
| `AttachIcon` | `attach` | Actions | The clip is drawn back and slid onto a sheet; the sheet's edge shows under it as it bites. | plays the same act |
| `RetryIcon` | `retry` | Actions | The arrowhead backs up round the loop, erasing it, and goes again, drawing it. | plays the same act |
| `SaveIcon` | `save` | Actions | The disk is pushed home; as it seats the shutter catches and slides open, then springs shut. | plays the same act |
| `DownloadIcon` | `download` | Actions | The arrow is drawn up and comes down onto the floor, which takes it. | plays the same act |
| `UploadIcon` | `upload` | Actions | The arrow crouches and pushes up to the ceiling, which takes it. | plays the same act |
| `PersonIcon` | `person` | Tools | The figure looks up and nods; its shoulders follow, and a ring opens round its head. | plays the same act |
| `BellIcon` | `bell` | Status | The bell swings on its loop and the clapper, lagging, strikes the rim on each side. | plays the same act |
| `PaletteIcon` | `palette` | Tools | The palette is lifted on its thumb and each paint is dabbed in turn. | plays the same act |
| `CopyIcon` | `copy` | Actions | The copy is laid back on the original and pressed; a light passes down it and it is pulled off into place. | plays the same act |
| `ExternalIcon` | `external` | Actions | The arrow is drawn back into the frame and thrown out of its open corner; the frame gives behind it. | plays the same act |
| `SettingsIcon` | `settings` | Tools | The gear is wound back and turned forward a notch against a detent, clicks, and springs back home. | plays the same act |
| `FilterIcon` | `filter` | Tools | The funnel is shaken down once; the drop in its bowl is tossed up and falls back in. | plays the same act |
| `SortIcon` | `sort` | Tools | The up arrow is pushed up and the down arrow answers, pushed down: they pass like rows changing places. | plays the same act |
| `EyeIcon` | `eye` | Actions | The eye looks one way, then the other, and blinks; it opens wide and rays open over it. | plays the same act |
| `EyeOffIcon` | `eye-off` | Actions | The bar is drawn back and slid home across the eye; the eye shuts behind it and opens again. | plays the same act |
| `LockIcon` | `lock` | Status | The shackle is lifted and pushed home into the case, which takes it, and it clicks shut. | plays the same act |
