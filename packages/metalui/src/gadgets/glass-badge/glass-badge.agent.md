# Glass badge

A gadget for who you are, drawn from a spec. React: `<Gadget spec={glassBadge} value={signedIn ? 1 : 0} state={expired ? 'expired' : undefined} />` from `@unlocalhosted/metalui/gadgets`. The spec is `fixtures/glass-badge.gadget.json`. An Object (an emblem): it stands for the account others see, and is never a control.

## Use it for

- Settings › Account; the moment someone signs in.
- Showing a sign-in has run out: the lamp turns amber.

## Don't use it for

- A person's picture or name: that is an avatar.
- A sign-in button: gadgets are never controls.

## How it moves

The `glow` mechanism, held, on the settle spring, with no cells: `signed-in` (a boolean) raises the light behind the glass from 0.08 to 0.92; the person printed on the glass (the `friend` glyph, in the glass's own ink) stands dark against it. It is silent; the lamp rises green on sign-in. With reduced motion the light goes straight there.

## States

`signed-in` decides; `expired` is the host's.

| State | Light | Lamp |
|---|---|---|
| rest | nearly dark | off (signed out) |
| signed-in | lit | green, rising |
| expired | lit | amber (sign in again) |

It says: "Account, signed in".

In a rig: `signed-in` (boolean) in.
