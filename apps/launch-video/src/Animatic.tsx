import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from 'remotion';
import { storyboard, shotAt, type Act } from './storyboard';
import { DURATION, FPS, audioFile, bars, frameAt, meter, position, splices, type MeterName } from './time';

/**
 * The animatic: the storyboard played against the edit, before any shot is built. It shows where
 * each shot sits, what the music is doing, and what must land on which count, so the timing can be
 * judged at full speed and scrubbed frame by frame.
 */
// Flat inks only: the --mu-led-* tokens are the LED's radial gradients, for LEDs.
export function Animatic() {
  return (
    <>
      <AnimaticCard />
      <Audio src={staticFile(audioFile)} />
    </>
  );
}

const ACT_TONE: Record<Act, string> = {
  build: 'var(--mu-blue)',
  play: 'var(--mu-green)',
  drop: 'var(--mu-orange)',
  gap: 'var(--mu-ink3)',
  peak: 'var(--mu-red)',
  end: 'var(--mu-ink)',
};

const mono = '"Martian Mono Variable", ui-monospace, monospace';
const sans = '"Geist Variable", system-ui, sans-serif';

/** The storyboard card for the current frame, without sound: what Film shows for a shot not built yet. */
export function AnimaticCard() {
  const frame = useCurrentFrame();
  const pos = position(frame);
  const bar = Math.max(1, Math.min(bars.length, pos.bar));
  const shot = shotAt(bar);
  const section = bars[bar - 1]?.section;
  const before = frame < frameAt(1);

  return (
    <AbsoluteFill data-mu-colorway="graphite" style={{ background: 'var(--mu-s-lo)', color: 'var(--mu-ink)', fontFamily: sans, padding: 72 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontFamily: mono, fontSize: 22, letterSpacing: 2, color: ACT_TONE[shot.act], textTransform: 'uppercase' }}>
            {shot.act} · {shot.id}
            {shot.layer ? ` · layer: ${shot.layer}` : ''}
          </div>
          <h1 style={{ fontSize: 88, fontWeight: 600, margin: '12px 0 0', letterSpacing: -2 }}>{shot.title}</h1>
        </div>
        <Counter bar={before ? 0 : bar} beat={before ? 0 : pos.beat} step={before ? 0 : pos.step} frame={frame} />
      </header>

      <section style={{ marginTop: 40, display: 'grid', gridTemplateColumns: '180px 1fr', rowGap: 18, fontSize: 34, lineHeight: 1.25, maxWidth: 1500 }}>
        <Label>music</Label>
        <div style={{ color: 'var(--mu-ink2)' }}>{shot.music}</div>
        <Label>picture</Label>
        <div>{shot.picture}</div>
        <Label>sync</Label>
        <div style={{ color: ACT_TONE[shot.act] }}>{shot.sync}</div>
      </section>

      <div style={{ position: 'absolute', left: 72, right: 72, bottom: 250 }}>
        <BeatLeds beat={before ? 0 : pos.beat} phase={pos.phase} />
        <Lanes frame={frame} />
      </div>

      <Timeline frame={frame} section={section} />
    </AbsoluteFill>
  );
}

function Label({ children }: { children: string }) {
  return <div style={{ fontFamily: mono, fontSize: 20, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--mu-ink3)', paddingTop: 8 }}>{children}</div>;
}

function Counter({ bar, beat, step, frame }: { bar: number; beat: number; step: number; frame: number }) {
  const s = frame / FPS;
  return (
    <div style={{ textAlign: 'right', fontFamily: mono }}>
      <div style={{ fontSize: 96, fontWeight: 500, fontVariantNumeric: 'tabular-nums', letterSpacing: -2 }}>
        {String(bar).padStart(2, '0')}.{beat}.{step + 1}
      </div>
      <div style={{ fontSize: 22, color: 'var(--mu-ink3)', fontVariantNumeric: 'tabular-nums' }}>
        bar.beat.16th · {s.toFixed(2)}s · f{frame} / {DURATION}
      </div>
    </div>
  );
}

/** Four LEDs, the current beat lit; the light decays through the beat so every onset reads as a flash. */
function BeatLeds({ beat, phase }: { beat: number; phase: number }) {
  return (
    <div style={{ display: 'flex', gap: 18, marginBottom: 28 }}>
      {[1, 2, 3, 4].map((b) => {
        const on = b === beat;
        const glow = on ? 1 - phase * 0.7 : 0;
        return (
          <div
            key={b}
            style={{
              width: 34, height: 34, borderRadius: 17,
              background: on ? 'var(--mu-led-amber)' : 'var(--mu-led-off)',
              opacity: on ? 0.3 + glow * 0.7 : 1,
              boxShadow: on ? `0 0 ${24 * glow}px var(--mu-orange)` : 'none',
            }}
          />
        );
      })}
    </div>
  );
}

/** Two seconds either side of now, one lane per reading: the hits you are about to cut on are visible before they land. */
function Lanes({ frame }: { frame: number }) {
  const lanes: { name: MeterName; tone: string }[] = [
    { name: 'kick', tone: 'var(--mu-orange)' },
    { name: 'snare', tone: 'var(--mu-green)' },
    { name: 'hat', tone: 'var(--mu-blue)' },
    { name: 'loud', tone: 'var(--mu-ink2)' },
  ];
  const span = 2 * FPS;
  const cols = 240;
  return (
    <div style={{ position: 'relative', display: 'grid', rowGap: 8 }}>
      {lanes.map(({ name, tone }) => (
        <div key={name} style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'end', height: 44 }}>
          <Label>{name}</Label>
          <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%', gap: 1 }}>
            {Array.from({ length: cols }, (_, i) => {
              const f = frame - span + Math.round((i / cols) * span * 2);
              const v = f < 0 || f >= DURATION ? 0 : meter(name, f);
              const past = f <= frame;
              return <div key={i} style={{ flex: 1, height: `${Math.max(2, v * 100)}%`, background: tone, opacity: past ? 0.9 : 0.35 }} />;
            })}
          </div>
        </div>
      ))}
      <div style={{ position: 'absolute', top: -8, bottom: -8, left: `calc(120px + (100% - 120px) / 2)`, width: 2, background: 'var(--mu-ink)' }} />
    </div>
  );
}

/** Every shot across the whole minute, the splices, and the playhead. */
function Timeline({ frame, section }: { frame: number; section?: string | null }) {
  const x = (f: number) => `${(f / DURATION) * 100}%`;
  return (
    <div style={{ position: 'absolute', left: 72, right: 72, bottom: 72, height: 130 }}>
      <div style={{ position: 'relative', height: 64 }}>
        {storyboard.map((s) => {
          const a = frameAt(s.bars[0]);
          const b = Math.min(DURATION, frameAt(s.bars[1] + 1));
          const current = frame >= a && frame < b;
          return (
            <div
              key={s.id}
              style={{
                position: 'absolute', left: x(a), width: `calc(${x(b - a)} - 3px)`, top: 0, bottom: 0, borderRadius: 8, overflow: 'hidden',
                fontFamily: mono, fontSize: 15, color: current ? 'var(--mu-s-lo)' : 'var(--mu-ink2)', padding: '8px 8px', whiteSpace: 'nowrap',
              }}
            >
              <div style={{ position: 'absolute', inset: 0, background: ACT_TONE[s.act], opacity: current ? 1 : 0.28 }} />
              <span style={{ position: 'relative' }}>{s.id}</span>
            </div>
          );
        })}
        {splices.map((s) => (
          <div key={s.t} style={{ position: 'absolute', left: x(s.t * FPS), top: -10, bottom: -10, width: 3, background: 'var(--mu-green)' }} />
        ))}
        <div style={{ position: 'absolute', left: x(frame), top: -18, bottom: -18, width: 4, background: 'var(--mu-ink)', borderRadius: 2 }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 22, fontFamily: mono, fontSize: 18, color: 'var(--mu-ink3)' }}>
        <span>song section · {section ?? 'pickup'}</span>
        <span>green ticks are splices · 141.97 BPM · 4/4</span>
      </div>
    </div>
  );
}
