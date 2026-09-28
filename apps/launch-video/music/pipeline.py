"""The launch video's music pipeline.

A person can't hand the track to the video by ear, so this reads it into facts the video runs on:

  fetch     download the source track (song.json) to music/out/, and decode it to WAV
  analyze   one fixed tempo grid, bar 1, per-bar loudness and bands, 16-step drum grids,
            the key, and where the texture changes -> music/analysis.json
  edit      cut the bar runs in edit.json into the launch edit -> public/launch.m4a,
            src/cues.generated.json (bars, beats, splices) and src/meters.generated.json
            (per-frame loudness, bands and drum onsets, for meters in the picture)
  check     re-read the finished edit and prove it: one tempo straight through the splices,
            no clicks, under the length cap, cues fresh
  spectrogram   images of the track and the edit with bar lines and section names, for a
            reviewer (person or model) to read what the numbers can't say

Authored inputs: song.json (source and section labels), edit.json (the cut).
Everything else is generated; never hand-edit it.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np

MUSIC = Path(__file__).resolve().parent
APP = MUSIC.parent
OUT = MUSIC / "out"
SOURCE_WAV = OUT / "source.wav"
EDIT_WAV = OUT / "launch.wav"
ANALYSIS = MUSIC / "analysis.json"
SONG = MUSIC / "song.json"
EDIT = MUSIC / "edit.json"
PUBLIC_AUDIO = APP / "public" / "launch.m4a"
CUES = APP / "src" / "cues.generated.json"
METERS = APP / "src" / "meters.generated.json"

SR = 22050  # analysis rate; the edit is cut from the source at its own rate
BANDS = {"sub": (20, 120), "low": (120, 500), "mid": (500, 2500), "high": (2500, 11000)}
DRUMS = {"kick": (30, 120), "snare": (1200, 5000), "hat": (7000, 11000)}
METER_FPS = 60
NOTES = "C C# D D# E F F# G G# A A# B".split()


def load_json(path: Path) -> dict:
    return json.loads(path.read_text())


def write_json(path: Path, data: dict, indent: int | None = 1) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=indent, default=lambda o: o.item() if hasattr(o, "item") else str(o)) + "\n")


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()[:16]


def db(x):
    return 20 * np.log10(np.asarray(x) + 1e-7)


def load_mono(path: Path):
    import librosa

    y, _ = librosa.load(path, sr=SR, mono=True)
    return y


# ---------------------------------------------------------------- fetch


def cmd_fetch(_args) -> None:
    song = load_json(SONG)
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("source.*"):
        old.unlink()
    # YouTube serves some clients SABR-only streams; walk the clients until one hands over a file.
    for client in ["default", "tv", "web_safari", "ios", "mweb"]:
        extra = [] if client == "default" else ["--extractor-args", f"youtube:player_client={client}"]
        run = subprocess.run(
            ["yt-dlp", "-q", "--no-playlist", "-f", "bestaudio/best", *extra, "-o", str(OUT / "source.%(ext)s"), song["source"]],
            capture_output=True, text=True,
        )
        got = [p for p in OUT.glob("source.*") if p.suffix != ".wav"]
        if got:
            print(f"fetched with the {client} client: {got[0].name}")
            break
        print(f"  {client}: {run.stderr.strip().splitlines()[-1] if run.stderr.strip() else 'no file'}")
    else:
        sys.exit("fetch failed with every client; update yt-dlp or drop a file at music/out/source.<ext>")
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(got[0]), "-vn", "-ac", "2", "-ar", "44100", str(SOURCE_WAV)], check=True)
    print(f"decoded -> {SOURCE_WAV.relative_to(APP)}")


# ---------------------------------------------------------------- analysis


def fit_grid(y, bpm_hint: float | None = None) -> dict:
    """One fixed tempo for the whole track: the BPM and phase whose beats sit on the most onset energy.

    Step-sequenced music (this track is KORG Gadget) never changes tempo, so a single grid beats a
    beat tracker, which slips wherever off-beat accents are loud. The drift report says how well it fits.
    """
    import librosa

    hop = 64
    fr = SR / hop
    oe = librosa.onset.onset_strength(y=y, sr=SR, hop_length=hop)
    dur = len(y) / SR
    prior = bpm_hint or float(np.atleast_1d(librosa.feature.tempo(onset_envelope=oe, sr=SR, hop_length=hop))[0])

    def scores(bpm, phases):
        per = 60 / bpm
        idx = ((phases[:, None] + per * np.arange(int(dur / per))[None, :]) * fr).astype(int)
        return oe[np.clip(idx, 0, len(oe) - 1)].mean(1)

    best = (-1.0, prior, 0.0)
    for bpm in np.arange(prior - 4, prior + 4, 0.02):
        ph = np.arange(0, 60 / bpm, 0.004)
        s = scores(bpm, ph)
        if s.max() > best[0]:
            best = (float(s.max()), float(bpm), float(ph[s.argmax()]))
    _, bpm0, ph0 = best
    for bpm in np.arange(bpm0 - 0.03, bpm0 + 0.03, 0.002):
        ph = np.arange(ph0 - 0.01, ph0 + 0.01, 0.0005)
        s = scores(bpm, ph)
        if s.max() > best[0]:
            best = (float(s.max()), float(bpm), float(ph[s.argmax()]))
    score, bpm, phase = best
    per = 60 / bpm
    phase %= per

    # Drift: the best local nudge for each 32-beat window. Small everywhere means one grid really fits.
    drift = []
    offs = np.arange(-0.06, 0.0605, 0.002)
    for w in range(0, int(dur / per), 32):
        ts = phase + per * np.arange(w, w + 32)
        ts = ts[ts < dur - 0.1]
        if len(ts) < 8 or oe[(ts * fr).astype(int)].mean() < oe.mean() * 0.5:
            continue  # a tail or a silence has no beats to fit
        sc = [oe[np.clip(((ts + o) * fr).astype(int), 0, len(oe) - 1)].mean() for o in offs]
        drift.append({"t": round(float(ts[0]), 2), "ms": round(float(offs[int(np.argmax(sc))] * 1000))})
    return {"bpm": round(bpm, 3), "beat": per, "phase": phase, "score": round(float(score / oe.mean()), 2), "drift": drift}


def band_frames(y, hop: int):
    import librosa

    S = np.abs(librosa.stft(y, n_fft=2048, hop_length=hop))
    f = librosa.fft_frequencies(sr=SR, n_fft=2048)
    return {k: np.sqrt((S[(f >= lo) & (f < hi)] ** 2).mean(0)) for k, (lo, hi) in BANDS.items()}, S, f


def drum_onsets(y, hop: int):
    """Per-frame onset strength for kick, snare and hat, from the percussive half of the mix."""
    import librosa

    D = librosa.stft(y, n_fft=2048, hop_length=hop)
    _, P = librosa.decompose.hpss(D, margin=2.0)
    Pm = np.abs(P)
    f = librosa.fft_frequencies(sr=SR, n_fft=2048)
    env = {}
    for k, (lo, hi) in DRUMS.items():
        e = librosa.onset.onset_strength(S=librosa.amplitude_to_db(Pm[(f >= lo) & (f < hi)]), sr=SR, hop_length=hop)
        env[k] = e / (np.percentile(e, 97) * 0.55 + 1e-9)  # 1.0 = a clear hit
    return env


def pick_downbeat(y, beat: float, phase: float) -> int:
    """Which beat of four starts the bar: the phase where bar boundaries line up with the most change.

    Arrangements change on the one, so bars cut at the true downbeat differ most from their neighbours.
    """
    hop = 256
    fr = SR / hop
    B, _, _ = band_frames(y, hop)
    M = np.stack([db(v) for v in B.values()])
    n = int((len(y) / SR - phase) / beat)
    per_beat = np.stack([M[:, int((phase + i * beat) * fr): int((phase + (i + 1) * beat) * fr)].mean(1) for i in range(n)], 1)
    novelty = []
    for p in range(4):
        k = (n - p) // 4
        bars = per_beat[:, p: p + 4 * k].reshape(len(B), k, 4).mean(2)
        novelty.append(float(np.linalg.norm(np.diff(bars, axis=1), axis=0).sum()))
    return int(np.argmax(novelty))


def key_of(y) -> dict:
    import librosa

    chroma = librosa.feature.chroma_cqt(y=y, sr=SR).mean(1)
    major = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
    minor = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
    cands = [(np.corrcoef(np.roll(major, i), chroma)[0, 1], f"{NOTES[i]} major") for i in range(12)]
    cands += [(np.corrcoef(np.roll(minor, i), chroma)[0, 1], f"{NOTES[i]} minor") for i in range(12)]
    cands.sort(reverse=True)
    return {"best": cands[0][1], "confidence": round(float(cands[0][0]), 2), "runnersUp": [c[1] for c in cands[1:3]]}


def cmd_analyze(_args) -> None:
    song = load_json(SONG)
    y = load_mono(SOURCE_WAV)
    dur = len(y) / SR
    grid = fit_grid(y, song.get("bpmHint"))
    beat = grid["beat"]
    bar = 4 * beat
    shift = pick_downbeat(y, beat, grid["phase"])
    t0 = grid["phase"] + shift * beat

    hop = 128
    fr = SR / hop
    B, _, _ = band_frames(y, hop)
    loud = np.sqrt(sum(v ** 2 for v in B.values()) / len(B))
    drums = drum_onsets(y, hop)

    # Bar 1 is the first downbeat whose bar is audible.
    while t0 - bar >= 0:
        t0 -= bar
    ceiling = db(loud).max()

    def bar_stats(a, b):
        ia, ib = int(a * fr), max(int(a * fr) + 1, int(b * fr))
        return {"loud": round(float(db(loud[ia:ib].mean())), 1), **{k: round(float(db(v[ia:ib].mean())), 1) for k, v in B.items()}}

    starts = list(np.arange(t0, dur, bar))
    while starts and bar_stats(starts[0], starts[0] + bar)["loud"] < ceiling - 30:
        starts.pop(0)
    first = float(starts[0])

    def steps(env, a):
        v = []
        for k in range(16):
            c = int((a + k * beat / 4) * fr)
            v.append(float(env[max(0, c - 2): c + 4].max()) if c < len(env) else 0.0)
        return "".join("x" if s > 1 else ("·" if s > 0.6 else "-") for s in v)

    bars = []
    for i, a in enumerate(starts):
        b = min(a + bar, dur)
        bars.append({"n": i + 1, "t": round(float(a), 3), **bar_stats(a, b), "drums": {k: steps(e, a) for k, e in drums.items()}})

    # Where the texture changes: the band profile of the two bars after a line against the two before.
    vec = np.array([[r[k] for k in BANDS] for r in bars])
    change = [0.0] + [float(np.linalg.norm(vec[i: i + 2].mean(0) - vec[max(0, i - 2): i].mean(0))) for i in range(1, len(bars))]
    order = sorted(range(len(bars)), key=lambda i: -change[i])
    changes = sorted(bars[i]["n"] for i in order[:18])

    analysis = {
        "$generated": "music/pipeline.py analyze. Do not edit.",
        "source": {"file": SOURCE_WAV.name, "sha": sha(SOURCE_WAV), "seconds": round(dur, 3)},
        "bpm": grid["bpm"],
        "beatSeconds": round(beat, 6),
        "barSeconds": round(bar, 6),
        "firstDownbeat": round(first, 4),
        "gridScore": grid["score"],
        "driftMs": grid["drift"],
        "key": key_of(y),
        "textureChanges": changes,
        "bars": bars,
    }
    write_json(ANALYSIS, analysis)
    worst = max(abs(d["ms"]) for d in grid["drift"])
    print(f"{grid['bpm']} BPM, beat {beat * 1000:.2f} ms, bar 1 at {first:.3f}s, {len(bars)} bars, drift within ±{worst} ms, key {analysis['key']['best']}")
    print(f"texture changes at bars {changes}")


# ---------------------------------------------------------------- edit


def song_bar_start(an: dict, n: int) -> float:
    return an["firstDownbeat"] + (n - 1) * an["barSeconds"]


def section_of(song: dict, n: int) -> str | None:
    for s in song["sections"]:
        if s["bars"][0] <= n <= s["bars"][1]:
            return s["id"]
    return None


def cmd_edit(_args) -> None:
    import soundfile as sf

    an = load_json(ANALYSIS)
    song = load_json(SONG)
    plan = load_json(EDIT)
    audio, sr = sf.read(SOURCE_WAV, always_2d=True)
    audio = audio.T
    total = audio.shape[1] / sr
    xf = int(plan["crossfadeMs"] / 1000 * sr)
    bar = an["barSeconds"]

    pieces, runs = [], []
    t_video = 0.0
    for i, p in enumerate(plan["pieces"]):
        a, b = p["bars"]
        start = 0.0 if (i == 0 and a == 1) else song_bar_start(an, a)
        end = min(total, song_bar_start(an, a) + plan["tailSeconds"]) if b == "end" else song_bar_start(an, b + 1)
        pieces.append(audio[:, int(start * sr): int(end * sr) + xf].copy())
        runs.append({"songBars": [a, b], "why": p.get("why"), "videoStart": round(t_video, 4), "songStart": round(start, 4), "seconds": round(end - start, 4)})
        t_video += end - start

    out = pieces[0]
    for p in pieces[1:]:
        ramp = np.linspace(0, 1, xf)
        out[:, -xf:] = out[:, -xf:] * (1 - ramp) + p[:, :xf] * ramp
        out = np.concatenate([out, p[:, xf:]], axis=1)
    out = out[:, : int(t_video * sr)]
    fade = int(plan["tailFadeMs"] / 1000 * sr)
    out[:, -fade:] *= np.linspace(1, 0, fade)
    OUT.mkdir(parents=True, exist_ok=True)
    sf.write(EDIT_WAV, out.T, sr)
    PUBLIC_AUDIO.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(EDIT_WAV), "-c:a", "aac", "-b:a", "192k", str(PUBLIC_AUDIO)], check=True)
    duration = out.shape[1] / sr

    # Video bars: the first run keeps its pickup, so video bar 1 sits where song bar 1 did.
    pickup = an["firstDownbeat"] if (plan["pieces"][0]["bars"][0] == 1) else 0.0
    by_n = {r["n"]: r for r in an["bars"]}
    vbars = []
    for run in runs:
        a, b = run["songBars"]
        last = an["bars"][-1]["n"] if b == "end" else b
        for sn in range(a, last + 1):
            t = pickup + len(vbars) * bar
            if t >= duration:
                break
            src = by_n[sn]
            vbars.append({"n": len(vbars) + 1, "t": round(t, 4), "songBar": sn, "section": section_of(song, sn), "loud": src["loud"], "drums": src["drums"]})
    # A splice is a jump in the song. Runs that simply continue (bar 16 then bar 17) aren't one.
    splices = [
        {"t": r["videoStart"], "from": runs[i - 1]["songBars"], "to": r["songBars"], "songLanding": r["songStart"]}
        for i, r in enumerate(runs)
        if i > 0 and r["songBars"][0] != runs[i - 1]["songBars"][1] + 1
    ]

    cues = {
        "$generated": "music/pipeline.py edit. Do not edit; change music/edit.json and re-run.",
        "inputs": {"source": an["source"]["sha"], "edit": sha(EDIT), "song": sha(SONG)},
        "audio": PUBLIC_AUDIO.name,
        "seconds": round(duration, 4),
        "bpm": an["bpm"],
        "beatSeconds": an["beatSeconds"],
        "barSeconds": an["barSeconds"],
        "firstDownbeat": round(pickup, 4),
        "rule": "time of (bar, beat, step) = firstDownbeat + (bar-1)*barSeconds + (beat-1)*beatSeconds + step*beatSeconds/4. Round each event to a frame on its own; never add frame counts.",
        "runs": runs,
        "splices": splices,
        "bars": vbars,
    }
    write_json(CUES, cues)
    write_json(METERS, meters(out.mean(0), sr, duration), indent=None)
    print(f"edit {duration:.2f}s, {len(vbars)} bars, {len(splices)} splices -> {PUBLIC_AUDIO.relative_to(APP)}, {CUES.relative_to(APP)}, {METERS.relative_to(APP)}")


def meters(mono, sr: int, duration: float) -> dict:
    """Per-frame readings of the finished edit, 0..1, for needles, scopes, LEDs and faders in the picture."""
    import librosa

    y = librosa.resample(mono.astype(np.float32), orig_sr=sr, target_sr=SR)
    hop = 128
    fr = SR / hop
    B, _, _ = band_frames(y, hop)
    B["loud"] = np.sqrt(sum(v ** 2 for v in B.values()) / 4)
    drums = drum_onsets(y, hop)
    frames = int(np.ceil(duration * METER_FPS))
    out = {"$generated": "music/pipeline.py edit. Do not edit.", "fps": METER_FPS, "frames": frames}
    for k, v in {**B, **drums}.items():
        is_drum = k in DRUMS
        x = v if is_drum else db(v)
        lo, hi = (0.0, 1.5) if is_drum else (np.percentile(x, 2), np.percentile(x, 99.5))
        samples = [x[min(len(x) - 1, int(f / METER_FPS * fr)): min(len(x), int((f + 1) / METER_FPS * fr) + 1)].max() for f in range(frames)]
        out[k] = [round(float(np.clip((s - lo) / (hi - lo), 0, 1)), 3) for s in samples]
    return out


# ---------------------------------------------------------------- check


def cmd_check(_args) -> None:
    import soundfile as sf

    an = load_json(ANALYSIS)
    plan = load_json(EDIT)
    cues = load_json(CUES)
    fails = []

    def expect(ok: bool, what: str) -> None:
        print(("  ok    " if ok else "  FAIL  ") + what)
        if not ok:
            fails.append(what)

    worst = max(abs(d["ms"]) for d in an["driftMs"])
    expect(worst <= 15, f"one tempo fits the source: drift within ±{worst} ms (limit 15)")
    expect(cues["inputs"] == {"source": an["source"]["sha"], "edit": sha(EDIT), "song": sha(SONG)}, "cues are fresh for source, edit.json and song.json")
    expect(cues["seconds"] <= plan["maxSeconds"], f"edit is {cues['seconds']:.2f}s (cap {plan['maxSeconds']}s)")

    # The edit, re-read cold: if the splices kept time, one grid still fits it and lands on the cue grid.
    y = load_mono(EDIT_WAV)
    grid = fit_grid(y, an["bpm"])
    expect(abs(grid["bpm"] - an["bpm"]) < 0.05, f"edit tempo {grid['bpm']} matches the source {an['bpm']}")
    worst = max(abs(d["ms"]) for d in grid["drift"])
    expect(worst <= 15, f"one tempo fits the edit straight through the splices: drift within ±{worst} ms")
    beat = cues["beatSeconds"]
    off = ((grid["phase"] - cues["firstDownbeat"]) / beat) % 1 * beat
    off = min(off, beat - off) * 1000
    expect(off <= 10, f"the edit's beats sit on the cue grid (off by {off:.1f} ms)")

    # A click is a sample jump the music doesn't have: compare each splice with the source's own
    # jump where the edit lands (a drop's hit is loud in both; a bad cut is loud only in the edit).
    edit, sr = sf.read(EDIT_WAV, always_2d=True)
    source, _ = sf.read(SOURCE_WAV, always_2d=True)
    w = int(0.005 * sr)

    def jump(audio, t):
        i = int(t * sr)
        return float(np.abs(np.diff(audio[max(0, i - w): i + w].mean(1))).max())

    for s in cues["splices"]:
        j, natural = jump(edit, s["t"]), jump(source, s["songLanding"])
        expect(j <= natural * 1.25 + 0.01, f"no click at the {s['from']}→{s['to']} splice ({s['t']:.2f}s): jump {j:.3f}, the song's own {natural:.3f}")

    if fails:
        sys.exit(f"{len(fails)} check(s) failed")
    print("all checks pass")


# ---------------------------------------------------------------- spectrogram


def cmd_spectrogram(args) -> None:
    import librosa
    import librosa.display
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    an = load_json(ANALYSIS)
    song = load_json(SONG)
    if args.which == "edit":
        cues = load_json(CUES)
        y = load_mono(EDIT_WAV)
        lines = [(b["t"], f"{b['n']}" + (f" {b['section']}" if b["section"] and (b["n"] == 1 or cues["bars"][b["n"] - 2]["section"] != b["section"]) else "")) for b in cues["bars"]]
        marks = [s["t"] for s in cues["splices"]]
    else:
        y = load_mono(SOURCE_WAV)
        starts = {s["bars"][0]: s["id"] for s in song["sections"]}
        lines = [(b["t"], f"{b['n']}" + (f" {starts[b['n']]}" if b["n"] in starts else "")) for b in an["bars"]]
        marks = []
    dur = len(y) / SR
    M = librosa.power_to_db(librosa.feature.melspectrogram(y=y, sr=SR, n_mels=128, hop_length=256, fmax=11000), ref=np.max)
    dest = OUT / "spectrograms"
    dest.mkdir(parents=True, exist_ok=True)
    span = args.seconds
    for i, a in enumerate(np.arange(0, dur, span)):
        fig, ax = plt.subplots(figsize=(22, 6), dpi=80)
        librosa.display.specshow(M, sr=SR, hop_length=256, x_axis="time", y_axis="mel", fmax=11000, ax=ax, cmap="magma")
        ax.set_xlim(a, min(dur, a + span))
        for j, (t, label) in enumerate(lines):
            if a <= t <= a + span:
                ax.axvline(t, color="cyan", lw=1.2 if j % 4 == 0 else 0.4, alpha=0.8)
                ax.text(t + 0.05, 9500, label, color="white", fontsize=11, weight="bold")
        for t in marks:
            if a <= t <= a + span:
                ax.axvline(t, color="lime", lw=2.5)
        plt.tight_layout()
        path = dest / f"{args.which}-{i:02d}.png"
        plt.savefig(path)
        plt.close()
        print(path.relative_to(APP))


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("fetch").set_defaults(fn=cmd_fetch)
    sub.add_parser("analyze").set_defaults(fn=cmd_analyze)
    sub.add_parser("edit").set_defaults(fn=cmd_edit)
    sub.add_parser("check").set_defaults(fn=cmd_check)
    sp = sub.add_parser("spectrogram")
    sp.add_argument("which", choices=["source", "edit"])
    sp.add_argument("--seconds", type=float, default=24)
    sp.set_defaults(fn=cmd_spectrogram)
    args = ap.parse_args()
    for tool in ["ffmpeg"] + (["yt-dlp"] if args.cmd == "fetch" else []):
        if not shutil.which(tool):
            sys.exit(f"{tool} is missing (brew install {tool})")
    args.fn(args)


if __name__ == "__main__":
    main()
