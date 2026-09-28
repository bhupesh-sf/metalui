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
| `edit` | `analysis.json`, `music/edit.json` | `public/launch.m4a`, `src/cues.generated.json` (video bars, beats, splices), `src/meters.generated.json` (per-frame loudness, bands, drum hits at 60 fps) |
| `check` | all of it | pass/fail: one tempo fits the source; every run of the edit is the song's own samples exactly where the cues say (sample-exact, so time is kept through every splice); every splice is on a bar line; no splice clicks louder than the song itself does there; no splice a person heard as abrupt; under the cap; cues fresh. It also lists splices nobody has listened to yet |
| `spectrogram` | the source or the edit | `music/out/spectrograms/*.png` |

Three files are authored; everything else is generated, so don't hand-edit it.

- **`music/song.json`**: the source, and what each stretch of the song is, in song bars. Use `textureChanges` in `analysis.json` and the source spectrograms to find where sections turn.
- **`music/edit.json`**: the cut, as runs of song bars, counted in whole samples. Every splice is on a bar line by construction; `check` proves time is kept through it.
- **`music/listening.json`**: what a person heard at each splice (`"24→51": "abrupt"`). The measures can't hear whether a cut lands musically: drop 1 cut straight into the riser measured smoother than 90% of the song's own bar lines and sounded wrong, because a riser needs a dip to climb from. `check` fails on a splice heard as abrupt and lists the ones nobody has heard.

### How it reads the track

- **Tempo** is one fixed grid, the BPM and phase whose beats sit on the most onset energy. Step-sequenced music doesn't change tempo, and a beat tracker slips wherever off-beat accents are loud. `driftMs` reports how well the grid fits, 32 beats at a time.
- **Bar 1** is the beat of four where bar boundaries line up with the most change (arrangements turn on the one), then the first audible bar.
- **Drums** come from the percussive half of the mix (HPSS), split into kick, snare and hat bands, and sampled on sixteenths. `x` is a clear hit, `·` a weak one.
- **What it can't do**: it doesn't hear. Instrument names in `song.json` are a reading of the spectrograms, and whether a splice lands musically is a person's call: log it in `listening.json`.

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
- **Shots use the real library.** Styles come from the same `tokens.css` and `theme.css` through Tailwind (`remotion.config.ts`), with every CSS transition and animation off: a frame renders on its own, so motion comes from the frame. Gadgets are drawn with `renderGadgetSvg` at each frame's pose (never `<Gadget>`, which animates itself on a clock). The `emissive` class keeps only a gadget's light (cell glow, halo, backlight, lamp), to lay over the same gadget drawn in a dim room.

### Designing a gadget for a shot

```bash
node scripts/gadget-sheet.mjs src/gadgets/step-row.gadget.json \
  '{"_":{"value":3.5}}' '{"material":"clay","_":{"value":8,"host":"bone"}}'
```

Every variant (JSON merged over the spec, draw options under `_`) goes through the library's validator and renderer into one contact sheet, `out/<name>-sheet.png`. The validator holds the library's rules (a job's hue stations, for one), so a look chosen here is a look the library allows.
- **Rendering**: Remotion's own AAC mux lays the sound 2048 samples (42.7 ms at 48 kHz) late, because it doesn't record the encoder's priming. `npm run render` renders the picture muted and `music/pipeline.py master` adds the edit with ffmpeg, then measures the offset and fails above 1 ms.

## Licensing

The current track is *PartyInvaders* by ミドリノピザ. It isn't cleared: get the artist's permission before the video is published. The audio stays out of git.
