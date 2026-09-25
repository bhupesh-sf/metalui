# Thumbwheel

A gadget for the past, drawn from a spec. React: `<Gadget spec={thumbwheel} value={-daysBack} />` from `@unlocalhosted/metalui/gadgets`. The spec is `fixtures/thumbwheel.gadget.json`. An Object (an emblem): it stands for looking back in time, and is never a control.

## Use it for

- The past: a memory scrubber's emblem, the banner that says you are looking at an earlier day.
- How far back you are: a click a day, amber once you are off now.

## Don't use it for

- A count: that's the counter drum.
- Scrubbing time itself: that's the time scrubber component.

## How it moves

The `turn` mechanism, held, on the part spring, with the gadget's own 30 detents: `offset` (−30 to 0 days) rolls a Drum of ticks, one tick a day, clicking in stone at each; it stops hard at now and at thirty days back. With reduced motion it goes straight there.

## States

The offset decides.

| State | Offset | Lamp |
|---|---|---|
| rest | now (0) | off |
| past | 1 to 6 days back | amber, steady |
| far | a week or more back | amber, breathing |

It says where it is: "When, now", "When, in the past", "When, long ago".

In a rig: `offset` (number −30 to 0 days) in, `in-past` (boolean: anywhere but now) out.
