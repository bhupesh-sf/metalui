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
| `check` | all of it | pass/fail: one tempo fits the source and the edit straight through the splices, the edit's beats sit on the cue grid, no splice clicks louder than the song itself does there, the edit is under the cap, the cues are fresh |
| `spectrogram` | the source or the edit | `music/out/spectrograms/*.png` |

Two files are authored; everything else is generated, so don't hand-edit it.

- **`music/song.json`**: the source, and what each stretch of the song is, in song bars. Use `textureChanges` in `analysis.json` and the source spectrograms to find where sections turn.
- **`music/edit.json`**: the cut, as runs of song bars. Every splice is on a bar line by construction; `check` proves the groove survives it.

### How it reads the track

- **Tempo** is one fixed grid, the BPM and phase whose beats sit on the most onset energy. Step-sequenced music doesn't change tempo, and a beat tracker slips wherever off-beat accents are loud. `driftMs` reports how well the grid fits, 32 beats at a time.
- **Bar 1** is the beat of four where bar boundaries line up with the most change (arrangements turn on the one), then the first audible bar.
- **Drums** come from the percussive half of the mix (HPSS), split into kick, snare and hat bands, and sampled on sixteenths. `x` is a clear hit, `·` a weak one.
- **What it can't do**: it doesn't hear. Instrument names in `song.json` are a reading of the spectrograms, so a person should listen to the splices before a cut is locked.

### Using another track

Point `source` in `song.json` at it (or drop a file at `music/out/source.<ext>`), run `fetch` and `analyze`, label the sections, write a cut in `edit.json`, and run `npm run music`. If the tempo lands on half or double time, set `"bpmHint"` in `song.json`.

## Licensing

The current track is *PartyInvaders* by ミドリノピザ. It isn't cleared: get the artist's permission before the video is published. The audio stays out of git.
