# Weather

A slim raised slab with a dot sky sunk into it. React: `Weather`, `WeatherTile`, and `sky` / `mini` for the pictures. SwiftUI: `MetalWeather`, `MetalWeatherTile`, `MetalSky`.

## Use it for

- The weather where someone is or is going: a tile on a board, the large widget when there is room.

## Props

- Tile: `kind` (`clear`, `partly`, `cloud`, `rain`, `storm`, `snow`, `mist`, `windy`, `heat`), `temp` ("21°"), `name` ("Clear"), `meta` ("Rain 10%"), `clock` (the hour there, 0–24), `sun` (`{ rise, set }` hours), `phase` (offsets the frame), `aria-label`.
- Large: `place`, `summary`, `live` and `status`, `clockText`, `clock`, `kind`, `temp`, `condition`, `detail`, `skyLabel`, `hours` (six: now, then every three hours), `days` (seven, `sun`/`partly`/`cloud`/`rain` with `lo` and `hi`), `scale` (one dot per degree, 21 dots), `now`, `format`.

## Behaviour

- The sky is drawn for the clock: the sun on its arc by day, the moon and stars by night, a warm glow at dawn and dusk, clouds, rain, a bolt, snow, fog, wind or heat by kind. It steps with the dot display (6 a second) and holds under reduced motion.
- Slab 400 × 560 (tile 180), rim 16 (tile 6), well radius 18. Doto for temperatures, the label role for engravings.
- Each sky is an image named in words; hours are a list, the week a table, every row named in full.

## Don't

- Don't tint the sky with a mood or brand colour: the px colours are the family.
- Don't add more dots for detail. 21 across for a tile, 46 for the large sky.
