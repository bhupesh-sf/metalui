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
