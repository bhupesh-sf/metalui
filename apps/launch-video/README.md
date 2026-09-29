# Launch video

The MetalUI launch video: under a minute, cut to a track, and built from the real components, so the picture and the library can't drift apart.

It runs on facts about the music rather than on someone's ear. A pipeline reads the track into a beat grid, bars, drum patterns and sections, cuts a bar-true edit, and writes the cues the video is timed from. Swap the track or the cut and everything downstream moves with it.

## The music pipeline

Needs `uv`, `ffmpeg` and `yt-dlp` (`brew install uv ffmpeg yt-dlp`). Run from this folder:

```bash
npm run music:fetch                 # download the track in music/song.json to music/out/ (not committed)
npm run music                       # analyze, edit, check
npm run music:spectrogram -- edit   # images of the edit with bars, sections and splices (or: source)
```

| Step | Reads | Writes |
|---|---|---|
| `fetch` | `music/song.json` (source) | `music/out/source.wav` |
| `analyze` | the source | `music/analysis.json`: tempo, bar 1, per-bar loudness and bands, 16-step drum grids, key, texture changes |
| `edit` | `analysis.json`, `music/edit.json`, `music/events.json` | `public/launch.m4a`, `src/cues.generated.json` (video bars, beats, splices), `src/meters.generated.json` (per-frame loudness, bands, drum hits at 60 fps), `src/events.generated.json` (each named sound, onset by onset: time, nearest sixteenth and how far off, pitch, strength) |
| `check` | all of it | pass/fail: one tempo fits the source; every run of the edit is the song's own samples exactly where the cues say (sample-exact, so time is kept through every splice); every splice is on a bar line; no splice clicks louder than the song itself does there; no splice a person heard as abrupt; under the cap; cues fresh. It also lists splices nobody has listened to yet |
| `contour <from> <to>` | the edit | how loud it sounds beat by beat between two video bars, K-weighted (the ear's weighting behind LUFS); raw RMS reads the sub, not what you hear |
| `spectrogram` | the source or the edit | `music/out/spectrograms/*.png` |

Three files are authored; everything else is generated, so don't hand-edit it.

- **`music/song.json`**: the source, and what each stretch of the song is, in song bars. Use `textureChanges` in `analysis.json` and the source spectrograms to find where sections turn.
- **`music/edit.json`**: the cut, as runs of song bars, counted in whole samples. Every splice is on a bar line by construction; `check` proves time is kept through it.
- **`music/events.json`**: sounds the picture answers one at a time (the intro's arcade blips, say): a span of video bars, a band, and the harmonic or percussive half of the mix. Shots read their onsets from `src/events.generated.json`; the blips turned out to be two per sixteenth and up to 50 ms off the grid, which a shot timed to the grid would have missed.
- **`music/listening.json`**: what a person heard at each splice, and in which edit (`"24→51": "abrupt"`). The measures can't hear whether a cut lands musically: drop 1 cut straight into the riser measured smoother than 90% of the song's own bar lines and sounded wrong, because a riser needs a dip to climb from. `check` fails on a negative verdict given for the current edit, asks for a re-listen once the edit changes, and lists splices nobody has heard.

### How it reads the track

- **Tempo** is one fixed grid, the BPM and phase whose beats sit on the most onset energy. Step-sequenced music doesn't change tempo, and a beat tracker slips wherever off-beat accents are loud. `driftMs` reports how well the grid fits, 32 beats at a time.
- **Bar 1** is the beat of four where bar boundaries line up with the most change (arrangements turn on the one), then the first audible bar.
- **Drums** come from the percussive half of the mix (HPSS), split into kick, snare and hat bands, and sampled on sixteenths. `x` is a clear hit, `·` a weak one.
- **What it can't do**: it doesn't hear. Instrument names in `song.json` are a reading of the spectrograms, and whether a splice lands musically is a person's call: log it in `listening.json`.

### Built transitions

Where a straight splice can't go, a run can be processed into a transition (`music/transitions.py`): `fx` over its own audio (`lowpass`/`highpass` along a `path` of `[beat, Hz]` points, so one filter can close and open again; `gain` along `[beat, dB]`; `mute` for a gap; `level`, loudness automation along `[beat, LU]` against the run's own loudness, applied after the layers and never inside a mute) and `layers` over it (`riser`, generated noise; `roll`, a snare hit lifted from the mix and gated, accelerating in doublings; `reverse`, the landing bar's first beat swelling into the downbeat; `sweep`, a pitched riser; `boom`, `crash` and `hit` for an impact). A run can play `times` over, looped on its bar line, to make room for a build. Positions are beats from the start of the run. A look-ahead limiter holds the run under -0.3 dBFS and reports how much it had to turn down; `gainDb` gives the whole edit headroom, since the track is mastered to full scale.

A gap needs a payoff. A run that ends in silence builds anticipation, and the run it lands on must declare `expect.payoff` and meet it: `weight`, the low end (30-250 Hz) crashing back against the build's last two beats; `slam`, the drop's first beat over the build's last sounding beat, K-weighted, because a bass return alone doesn't reach laptop and phone speakers; `lift`, over the drop it answers; and the build itself must run at least four bars, because anticipation takes time. Each measure is calibrated on a version the owner rejected: the 1.75-bar build that ended 1.5 LU under its drop fails `slam` and length. This track has no impact hits of its own and is mastered to the ceiling, so the climax is built: the build drains its low end, the landing ducks the music under an impact (`boom`, `crash`, `hit`) and swells back louder. The whole edit is then mastered (`master`: a loudness target and a ceiling), so that lift is kept in the design and the level is set once.

A run can declare the shape it must have, in `expect`: `dip` (how far below its start it falls) and `climb` (how much its build rises, and how close it arrives to the bar it lands on). `check` measures both K-weighted. The current transition replays drop 1's last four bars: the same chords as the final chorus it lands on, so nothing can clash. Borrowing the song's own breakdown and riser didn't work: they belong to a different section, in other chords, and their gap is written to lead into drop 2.

### Using another track

Point `source` in `song.json` at it (or drop a file at `music/out/source.<ext>`), run `fetch` and `analyze`, label the sections, write a cut in `edit.json`, and run `npm run music`. If the tempo lands on half or double time, set `"bpmHint"` in `song.json`.

## The video

Remotion, so the picture is React and the shots use the real MetalUI components.

```bash
npm run studio                          # Remotion Studio on http://localhost:4196: scrub, play with sound
npm run render -- Animatic --scale=0.5  # out/Animatic.mp4, soundtrack proven in sync to the millisecond
npm run check:timing                    # every sixteenth lands on its own frame and reads back as itself
```

- **`src/time.ts` is the one clock.** Shots place events in musical time, `frameAt(bar, beat, step)`, never in frames or seconds. Each event is rounded to a frame on its own: a beat is 25.35 frames at 60 fps, so adding frame counts drifts. `position(frame)` reads the music back, and `meter(name, frame)` gives loudness, a band or a drum hit, 0..1, for meters in the picture.
- **`src/storyboard.ts` is the storyboard**, authored in video bars: what the music does, what the picture does, and what lands on which count.
- **`Animatic`** plays the storyboard against the edit before any shot is built: the shot, bar.beat.16th, the beat LEDs, two seconds of kick, snare, hat and loudness either side of now, and every shot on a timeline with the splices marked.
- **`src/motion.ts` is the library's motion.** The same mass-class springs as the components (`tokens.json` springs), stepped by frame. `land(frame, at, mass)` launches a move early by its spring's time to contact, so it touches down on the beat (part 13 frames, object 15, hinge 16); `react` starts on the hit; `sweep` is for things the music sweeps, like a riser or the light. `check:timing` proves every spring touches down on its beat.
- **`src/Film.tsx` is the film.** Each storyboard shot in order over the edit: a built shot plays (registered in `SHOTS`), a shot not built yet shows its animatic card, so the minute is watchable at every stage.
- **`src/film/stage.tsx` is motion at film scale.** The library's motion is interface-sized (a 1 px press); a frame of video needs visible mass. A look-at `Camera` eases between poses in real perspective and takes a jolt (`punch`) from heavy landings; a `Table` is the lit ground; a `Drop` falls onto it with the object spring and touches down on its frame, its contact shadow sized to its footprint and tightening as it lands. The table stops the fall: the spring's overshoot becomes a squash, never a sink through the surface. Falls have character (`heavy` thuds and jolts the camera, `light` tumbles and bounces twice, `key` flips end over end), neighbours `hop` in sympathy with a heavy landing, and the film runs on a white design canvas whose dot grid ripples under every landing (`Table` with `impacts`: a ring runs out from each hit, swelling, darkening and pushing the dots it passes, bigger for heavier things). Looks (`LOOKS`) and `mixLook` remain for other scenes.
- **Shots use the real library.** Styles come from the same `tokens.css` and `theme.css` through Tailwind (`remotion.config.ts`), with every CSS transition and animation off: a frame renders on its own, so motion comes from the frame. Gadgets are drawn with `renderGadgetSvg` at each frame's pose (never `<Gadget>`, which animates itself on a clock).

### Designing a gadget for a shot

```bash
node scripts/gadget-sheet.mjs ../../packages/metalui/src/gadgets/fixtures/cell-grid.gadget.json \
  '{"_":{"value":3.5}}' '{"material":"clay","_":{"value":8,"host":"bone"}}'
```

Every variant (JSON merged over the spec, draw options under `_`) goes through the library's validator and renderer into one contact sheet, `out/<name>-sheet.png`. The validator holds the library's rules (a job's hue stations, for one), so a look chosen here is a look the library allows.
- **Rendering**: Remotion's own AAC mux lays the sound 2048 samples (42.7 ms at 48 kHz) late, because it doesn't record the encoder's priming. `npm run render` renders the picture muted and `music/pipeline.py master` adds the edit with ffmpeg, then measures the offset and fails above 1 ms.

## Licensing

The current track is *PartyInvaders* by ミドリノピザ. It isn't cleared: get the artist's permission before the video is published. The audio stays out of git.
