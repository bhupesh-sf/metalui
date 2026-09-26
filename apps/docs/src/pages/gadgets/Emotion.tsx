import * as React from 'react';
import { Button, Switch } from '@unlocalhosted/metalui';
import { GADGETS, Gadget, JOBS, emotionChecks, resolveFeel, samTargets, scoreStudy, STUDY_SIZES, type GadgetSpec, type Session } from '@unlocalhosted/metalui/gadgets';
import { createSound } from '@unlocalhosted/metalui/sound';
import { Bench, PageHeader, Rules, Section } from '../../ui/doc';

// The catalog, in shelf order: the gadgets a study shows.
const ALL = Object.values(import.meta.glob<GadgetSpec>('../../../../../packages/metalui/src/gadgets/fixtures/*.gadget.json', { eager: true, import: 'default' }));
const shelf = (n: string) => { const i = (GADGETS.set.order as readonly string[]).indexOf(n); return i < 0 ? Infinity : i; };
const CATALOG = [...ALL].sort((a, b) => shelf(a.name) - shelf(b.name));
const PATCH_BAY = CATALOG.find((g) => g.name === 'patch-bay')!, CHORD = CATALOG.find((g) => g.name === 'keycap-chord')!;
// The protocol's numbers (model §6): 3 s a gadget, 30 plays in two minutes, synced / waiting / failed.
const SHOW_MS = 3000, PLAYS = 30, PLAYS_MS = 120_000;
const STATES = [['connected', 'synced'], ['syncing', 'waiting'], ['failed', 'failed']] as const;
const SESSIONS_KEY = 'metalui:emotion-sessions';

/** A shuffle the same for one participant every time (a small seeded generator). */
function shuffled<T>(xs: T[], seed: string): T[] {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const rnd = () => { h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909); return ((h >>>= 0) % 10000) / 10000; };
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

const readSessions = (): Session[] => { try { return JSON.parse(localStorage.getItem(SESSIONS_KEY) ?? '[]'); } catch { return []; } };
const writeSessions = (s: Session[]) => { try { localStorage.setItem(SESSIONS_KEY, JSON.stringify(s)); } catch { /* the page still scores what is loaded */ } };

/** One scale (nine points for SAM, seven for annoyance), labelled at its ends. */
function Scale({ label, low, high, value, onChange, points = 9 }: { label: string; low: string; high: string; value?: number; onChange: (v: number) => void; points?: number }) {
  return (
    <fieldset className="m-0 flex flex-col gap-6 border-0 p-0">
      <legend className="type-ui text-ink">{label}</legend>
      <div className="flex items-center gap-8">
        <span className="type-label engraved w-72 text-right">{low}</span>
        <div role="radiogroup" aria-label={label} className="flex gap-4">
          {Array.from({ length: points }, (_, i) => i + 1).map((n) => (
            <label key={n} className="flex flex-col items-center gap-2">
              <input type="radio" name={label} aria-label={`${label} ${n}`} checked={value === n} onChange={() => onChange(n)} />
              <span className="type-readout text-ink3">{n}</span>
            </label>
          ))}
        </div>
        <span className="type-label engraved w-72">{high}</span>
      </div>
    </fieldset>
  );
}

/** A gadget shown for its moment with one act; then it steps aside for the question. */
function Shown({ spec, size, state, sound, onDone }: { spec: GadgetSpec; size: number; state?: string; sound: ReturnType<typeof createSound> | null; onDone?: () => void }) {
  const [act, setAct] = React.useState(0);
  React.useEffect(() => { const a = window.setTimeout(() => setAct(1), 200), d = onDone && window.setTimeout(onDone, SHOW_MS); return () => { window.clearTimeout(a); if (d) window.clearTimeout(d); }; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <Gadget spec={spec} size={size} state={state} act={act} sound={sound} data-testid="study-gadget" />;
}

type Step =
  | { kind: 'setup' }
  | { kind: 'sam'; i: number; shown: boolean }
  | { kind: 'job'; i: number }
  | { kind: 'material'; i: number }
  | { kind: 'state'; i: number }
  | { kind: 'annoyance'; played: number }
  | { kind: 'done' };

/** The study, one participant at a time. */
function Runner({ onSaved }: { onSaved: () => void }) {
  const sound = React.useMemo(() => createSound(), []);
  const [participant, setParticipant] = React.useState('');
  const [hears, setHears] = React.useState(false);
  const [step, setStep] = React.useState<Step>({ kind: 'setup' });
  const [session, setSession] = React.useState<Session | null>(null);
  const [sam, setSam] = React.useState<{ pleasure?: number; arousal?: number; dominance?: number }>({});
  const [pick, setPick] = React.useState('');
  const trials = React.useMemo(() => ({
    sam: shuffled(CATALOG.flatMap((g) => STUDY_SIZES.map((size) => ({ g, size }))), `${participant}:sam`),
    jobs: shuffled(CATALOG, `${participant}:job`),
    materials: shuffled(CATALOG, `${participant}:material`),
    states: shuffled((['none', 'deuteranopia'] as const).flatMap((filter) => STATES.map(([state, name]) => ({ state, name, filter }))), `${participant}:state`),
  }), [participant]);
  const heard = hears ? sound : null;
  const next = (s: Step) => { setPick(''); setSam({}); setStep(s); };
  // The annoyance test: the keycap chord plays 30 times over two minutes, then one question.
  React.useEffect(() => {
    if (step.kind !== 'annoyance' || step.played >= PLAYS) return;
    const t = window.setTimeout(() => setStep({ kind: 'annoyance', played: step.played + 1 }), PLAYS_MS / PLAYS);
    return () => window.clearTimeout(t);
  }, [step]);

  if (step.kind === 'setup') return (
    <form className="flex flex-col items-start gap-16" onSubmit={async (e) => {
      e.preventDefault();
      if (hears) await sound.enable();
      setSession({ participant: participant.trim(), hears, sam: [], jobs: [], materials: [], states: [] });
      next({ kind: 'sam', i: 0, shown: true });
    }}>
      <label className="flex flex-col gap-6 type-ui text-ink">Participant
        <input aria-label="Participant" required value={participant} onChange={(e) => setParticipant(e.target.value)} className="type-ui material-stage rounded-key px-12 py-8 text-ink outline-none focus-visible:focus-ring" />
      </label>
      <label className="flex items-center gap-12 type-ui text-ink"><Switch aria-label="Sees and hears" checked={hears} onCheckedChange={setHears} />Sees and hears (off: sees only)</label>
      <Button type="submit" disabled={!participant.trim()}>Start</Button>
    </form>
  );
  if (!session) return null;
  const save = (s: Session) => setSession(s);
  if (step.kind === 'sam') {
    const { g, size } = trials.sam[step.i];
    const done = sam.pleasure && sam.arousal && sam.dominance;
    return (
      <div className="flex flex-col gap-16" data-testid="study-step" data-step="sam">
        <p className="type-readout text-ink3">Feeling {step.i + 1} of {trials.sam.length}</p>
        {step.shown ? <div className="grid h-[180px] place-items-center"><Shown key={step.i} spec={g} size={size} sound={heard} onDone={() => setStep({ ...step, shown: false })} /></div> : (
          <>
            <Scale label="Pleasure" low="unhappy" high="happy" value={sam.pleasure} onChange={(v) => setSam({ ...sam, pleasure: v })} />
            <Scale label="Arousal" low="calm" high="excited" value={sam.arousal} onChange={(v) => setSam({ ...sam, arousal: v })} />
            <Scale label="Dominance" low="controlled" high="in control" value={sam.dominance} onChange={(v) => setSam({ ...sam, dominance: v })} />
            <Button disabled={!done} onClick={() => {
              save({ ...session, sam: [...session.sam, { gadget: g.name, size, pleasure: sam.pleasure!, arousal: sam.arousal!, dominance: sam.dominance! }] });
              next(step.i + 1 < trials.sam.length ? { kind: 'sam', i: step.i + 1, shown: true } : { kind: 'job', i: 0 });
            }}>Next</Button>
          </>
        )}
      </div>
    );
  }
  if (step.kind === 'job') {
    const g = trials.jobs[step.i];
    return (
      <div className="flex flex-col gap-16" data-testid="study-step" data-step="job">
        <p className="type-readout text-ink3">What is it for? {step.i + 1} of {trials.jobs.length}</p>
        <Gadget spec={g} size={64} data-testid="study-gadget" />
        <div role="radiogroup" aria-label="Job" className="flex flex-wrap gap-12">
          {JOBS.map((j) => <label key={j} className="flex items-center gap-6 type-ui text-ink"><input type="radio" name="job" aria-label={j} checked={pick === j} onChange={() => setPick(j)} />{j}</label>)}
        </div>
        <Button disabled={!pick} onClick={() => { save({ ...session, jobs: [...session.jobs, { gadget: g.name, answer: pick }] }); next(step.i + 1 < trials.jobs.length ? { kind: 'job', i: step.i + 1 } : { kind: 'material', i: 0 }); }}>Next</Button>
      </div>
    );
  }
  if (step.kind === 'material') {
    const g = trials.materials[step.i];
    return (
      <div className="flex flex-col gap-16" data-testid="study-step" data-step="material">
        <p className="type-readout text-ink3">What is it made of? {step.i + 1} of {trials.materials.length}</p>
        <Gadget spec={g} size={160} data-testid="study-gadget" />
        <input aria-label="Material" value={pick} onChange={(e) => setPick(e.target.value)} className="type-ui material-stage w-fit rounded-key px-12 py-8 text-ink outline-none focus-visible:focus-ring" />
        <Button disabled={!pick.trim()} onClick={() => { save({ ...session, materials: [...session.materials, { gadget: g.name, answer: pick.trim() }] }); next(step.i + 1 < trials.materials.length ? { kind: 'material', i: step.i + 1 } : { kind: 'state', i: 0 }); }}>Next</Button>
      </div>
    );
  }
  if (step.kind === 'state') {
    const t = trials.states[step.i];
    return (
      <div className="flex flex-col gap-16" data-testid="study-step" data-step="state" data-filter={t.filter}>
        <p className="type-readout text-ink3">Which is it? {step.i + 1} of {trials.states.length}</p>
        <div style={t.filter === 'deuteranopia' ? { filter: 'url(#study-deuteranopia)' } : undefined}><Shown key={step.i} spec={PATCH_BAY} size={160} state={t.state} sound={heard} /></div>
        <div role="radiogroup" aria-label="State" className="flex gap-12">
          {STATES.map(([, name]) => <label key={name} className="flex items-center gap-6 type-ui text-ink"><input type="radio" name="state" aria-label={name} checked={pick === name} onChange={() => setPick(name)} />{name}</label>)}
        </div>
        <Button disabled={!pick} onClick={() => { save({ ...session, states: [...session.states, { shown: t.name, answer: pick, filter: t.filter }] }); next(step.i + 1 < trials.states.length ? { kind: 'state', i: step.i + 1 } : { kind: 'annoyance', played: 0 }); }}>Next</Button>
      </div>
    );
  }
  if (step.kind === 'annoyance') {
    return (
      <div className="flex flex-col gap-16" data-testid="study-step" data-step="annoyance" data-played={step.played}>
        <p className="type-readout text-ink3">{step.played < PLAYS ? `Listen: ${step.played} of ${PLAYS} plays` : 'Would you leave the sound on?'}</p>
        <Gadget spec={CHORD} size={160} act={step.played} sound={heard} data-testid="study-gadget" />
        {step.played >= PLAYS && (
          <>
            <Scale label="Leave sound on" low="never" high="gladly" points={7} value={sam.pleasure} onChange={(v) => setSam({ pleasure: v })} />
            <Button disabled={!sam.pleasure} onClick={() => {
              const done = { ...session, annoyance: sam.pleasure! };
              save(done); writeSessions([...readSessions(), done]); onSaved(); next({ kind: 'done' });
            }}>Finish</Button>
          </>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-col items-start gap-12" data-testid="study-step" data-step="done">
      <p className="type-ui text-ink">Saved {session.participant}'s session on this machine. Thank them.</p>
      <Button onClick={() => { setParticipant(''); setSession(null); next({ kind: 'setup' }); }}>Next participant</Button>
    </div>
  );
}

export default function EmotionPage() {
  const checks = React.useMemo(() => emotionChecks(CATALOG), []);
  const [sessions, setSessions] = React.useState<Session[]>(() => readSessions());
  const results = React.useMemo(() => scoreStudy(sessions, CATALOG), [sessions]);
  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(sessions, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'metalui-emotion-sessions.json'; a.click(); URL.revokeObjectURL(url);
  };
  const load = async (file: File) => { const more = JSON.parse(await file.text()) as Session[]; const all = [...sessions, ...more]; writeSessions(all); setSessions(all); };
  return (
    <>
      <svg width="0" height="0" aria-hidden className="absolute">
        {/* Machado et al. (2009) deuteranopia at full severity, the simulation the set rules use. */}
        <filter id="study-deuteranopia"><feColorMatrix type="matrix" values="0.367 0.861 -0.228 0 0  0.280 0.673 0.047 0 0  -0.012 0.043 0.969 0 0  0 0 0 1 0" /></filter>
      </svg>
      <PageHeader
        title="Emotion"
        lede="Whether the gadgets make people feel what their feel says: the study from the model, run with people, and the checks a machine can make first so a study is never spent on a known failure. Tuning after a study changes the model's coefficients and material tables, never one gadget."
      />
      <Section id="targets" title="What each should feel like" lede="A gadget's feel is its targets on the Self-Assessment Manikin (nine points): pleasure 1 + 8v, arousal 1 + 8a, dominance 9 − 8w.">
        <div className="overflow-x-auto">
          <table className="type-ui w-full border-collapse text-left" data-testid="emotion-targets">
            <thead><tr className="type-label engraved"><th /><th>Gadget</th><th>Job</th><th>Material</th><th>Feel</th><th>Pleasure</th><th>Arousal</th><th>Dominance</th></tr></thead>
            <tbody>{CATALOG.map((g) => { const t = samTargets(g.feel), r = resolveFeel(g); return (
              <tr key={g.name} data-gadget={g.name}>
                <td><Gadget spec={g} size={48} /></td><td>{g.title}</td><td>{g.job}</td><td>{r.material}</td>
                <td className="type-readout">{g.feel.v} {g.feel.a} {g.feel.w}</td><td className="type-readout">{t.pleasure.toFixed(1)}</td><td className="type-readout">{t.arousal.toFixed(1)}</td><td className="type-readout">{t.dominance.toFixed(1)}</td>
              </tr>); })}</tbody>
          </table>
        </div>
      </Section>
      <Section id="pre-checks" title="Before anyone looks" lede="The model's known failure modes a machine can see. They are reported, never forced: each one is a question for the study or for its owner.">
        <ul className="m-0 flex list-none flex-col gap-12 p-0" data-testid="emotion-checks">
          {checks.map((c) => (
            <li key={c.id} data-check={c.id} data-ok={c.ok} className="flex flex-col gap-4">
              <span className="type-ui text-ink">{c.ok ? '✓' : '!'} {c.title}</span>
              <span className="type-ui text-ink2">{c.detail}</span>
            </li>
          ))}
        </ul>
      </Section>
      <Section id="run" title="Run the study" lede="One participant at a time, colour vision screened, half seeing only and half seeing and hearing: 28 feelings (every gadget at 64 and 160 px, 3 s each with one act), the job of each at 64 px, what each is made of, synced, waiting and failed (half of them through a deuteranopia filter), and 30 plays of the keycap chord in two minutes. Sessions are kept on this machine until you download them.">
        <Bench caption="the protocol, model §6">
          <div className="w-full"><Runner onSaved={() => setSessions(readSessions())} /></div>
        </Bench>
      </Section>
      <Section id="results" title="Results" lede={`Scored against the pass rules once every gadget has answers. ${sessions.length} session${sessions.length === 1 ? '' : 's'} so far; the model asks for 24.`}>
        <ul className="m-0 flex list-none flex-col gap-12 p-0" data-testid="emotion-results">
          {results.map((r) => (
            <li key={r.id} data-result={r.id} data-ok={String(r.ok)} className="flex flex-col gap-4">
              <span className="type-ui text-ink">{r.ok === null ? '·' : r.ok ? '✓' : '✗'} {r.title}</span>
              <span className="type-ui text-ink2">{r.detail}</span>
            </li>
          ))}
        </ul>
        <div className="mt-16 flex flex-wrap items-center gap-12">
          <Button onClick={download} disabled={!sessions.length}>Download sessions</Button>
          <label className="type-ui text-ink">Add sessions <input type="file" accept="application/json" aria-label="Add sessions" onChange={(e) => { const f = e.target.files?.[0]; if (f) void load(f); }} /></label>
        </div>
      </Section>
      <Section title="Rules">
        <Rules
          rules={[
            { id: 'V1', title: 'People decide', body: 'Only a study says whether a feel lands. The checks here spare it the known failures; they never replace it.' },
            { id: 'V2', title: 'Tune the model, not a gadget', body: 'A failure moves a coefficient or a material table, so every gadget with that feel moves together.' },
            { id: 'V3', title: 'Meaning never rides on hue', body: 'Run the job test again with a non-Western cohort before the site ships; states are carried by form and lamp, never colour alone.' },
          ]}
        />
      </Section>
    </>
  );
}
