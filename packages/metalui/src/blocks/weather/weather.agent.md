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
