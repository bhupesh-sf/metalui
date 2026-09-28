// Emotion validation (docs/proposals/tiles/model.md §6): what each gadget should make a person feel,
// and the checks that need no person, run before a study so it does not spend people on known failures.
// The study itself (SAM ratings, job identification, material naming, state discrimination, annoyance)
// runs on Gadgets › Emotion; its pass rules are here, so the page and any report score it the same way.
import { GADGETS } from './gadgets.generated';
import { SOUND } from '../sound/recipes.generated';
import type { Feel, GadgetSpec } from './spec';
import { resolve } from './resolve';
import { deltaE, simulateCvd } from './color';
import { LAMP_COLORS } from './parts/led';

/** SAM targets (Bradley & Lang, 9 points) for a feel: pleasure 1 + 8v, arousal 1 + 8a, dominance 9 − 8w. */
export const samTargets = (f: Feel) => ({ pleasure: 1 + 8 * f.v, arousal: 1 + 8 * f.a, dominance: 9 - 8 * f.w });

export interface EmotionCheck { id: string; title: string; ok: boolean; detail: string }

/** The model's known failure modes that a machine can see, over a catalog. */
export function emotionChecks(catalog: GadgetSpec[]): EmotionCheck[] {
  const out: EmotionCheck[] = [];
  // Dark bodies read as disabled when their idle lamp is dim.
  const dark = catalog.filter((g) => { const r = resolve(g); return r.states.rest.body.L < GADGETS.set.bands[1] && (g.states.rest.lamp?.[0] ?? 'off') === 'off'; });
  out.push({ id: 'dark-idle', title: 'A dark body keeps its idle lamp bright', ok: dark.length === 0,
    detail: dark.length ? `${dark.map((g) => g.name).join(', ')}: a dark body at rest with an idle (off) lamp, which is not lifted.` : 'No dark body rests with a dim lamp.' });
  // First run and capture are good news: pleased (v ≥ 0.8) and rising, never flickering.
  const moments = catalog.flatMap((g) => Object.entries(g.states).filter(([name]) => name === 'first-run' || (g.job === 'take' && name !== 'rest')).map(([name, st]) => ({ g, name, st })));
  const off = moments.filter(({ g, st }) => (st.feel?.v ?? g.feel.v) < 0.8 || st.lamp?.[1] === 'flicker' || st.lamp?.[1] !== 'rise');
  out.push({ id: 'good-news', title: 'First run and capture read as good news', ok: off.length === 0,
    detail: off.length ? off.map(({ g, name, st }) => `${g.name} ${name}: v ${st.feel?.v ?? g.feel.v}, lamp ${st.lamp?.[1] ?? 'steady'}`).join('; ') + ' (needs v ≥ 0.8 and a rise).' : 'Every first run and capture is pleased and rises.' });
  // A short earcon reads as this app, not a notification from another: 250 ms at most.
  const long = Object.entries(SOUND.beeper.earcons).filter(([k]) => !k.startsWith('$')).map(([k, e]) => {
    // Each note is [pitch, onset ms, length ms, gain]: the earcon ends when its last note does.
    const notes = (e as unknown as { notes: number[][] }).notes;
    return [k, Math.max(...notes.map(([, at, dur]) => at + dur))] as const;
  }).filter(([, ms]) => ms > 250);
  out.push({ id: 'earcon-length', title: 'Earcons stay under 250 ms', ok: long.length === 0,
    detail: long.length ? long.map(([k, ms]) => `${k} ${ms} ms`).join(', ') + '.' : 'Every earcon is 250 ms or shorter.' });
  // The state lamps stay apart for red–green colour blindness.
  const signals = ['live', 'waiting', 'failed'] as const, hex = (s: string) => s.match(/\w\w/g)!.map((h) => parseInt(h, 16) / 255);
  const toOklab = ([r, g, b]: number[]) => {
    const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4), [R, G, B] = [r, g, b].map(lin);
    const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B), m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B), s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
    const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
    return [L, Math.hypot(a, bb), ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360] as [number, number, number];
  };
  const lch = Object.fromEntries(signals.map((s) => [s, toOklab(hex(LAMP_COLORS[s][1]))]));
  const close = signals.flatMap((a, i) => signals.slice(i + 1).map((b) => [a, b, deltaE(simulateCvd(lch[a], 'deuteranopia'), simulateCvd(lch[b], 'deuteranopia'))] as const)).filter(([, , d]) => d < GADGETS.set.cvdDeltaE);
  out.push({ id: 'lamp-cvd', title: 'State lamps stay apart for colour blindness', ok: close.length === 0,
    detail: close.length ? close.map(([a, b, d]) => `${a} and ${b}: ΔE ${d.toFixed(3)}`).join('; ') + ' under deuteranopia; the form change must carry the state.' : 'live, waiting and failed stay apart under deuteranopia.' });
  return out;
}

// ---------- The study: its answers and its pass rules ----------

export const STUDY_SIZES = [64, 160] as const;
export interface SamAnswer { gadget: string; size: number; pleasure: number; arousal: number; dominance: number }
export interface Session {
  participant: string;
  hears: boolean;
  sam: SamAnswer[];
  jobs: { gadget: string; answer: string }[];
  materials: { gadget: string; answer: string }[];
  states: { shown: string; answer: string; filter: 'none' | 'deuteranopia' }[];
  annoyance?: number;
}

const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b), m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : NaN; };
/** A free-text material answer coded to one of the seven (or nothing). */
export function codeMaterial(answer: string): string | null {
  const a = answer.toLowerCase();
  const words: Record<string, string[]> = { clay: ['clay', 'plastic', 'putty', 'matte'], ceramic: ['ceramic', 'porcelain', 'china', 'glaze'], resin: ['resin', 'acrylic', 'jelly', 'translucent'],
    stone: ['stone', 'concrete', 'granite', 'rock'], glass: ['glass', 'crystal'], metal: ['metal', 'steel', 'aluminium', 'aluminum', 'brass', 'copper', 'chrome'], rubber: ['rubber', 'silicone'] };
  return Object.entries(words).find(([, ws]) => ws.some((w) => a.includes(w)))?.[0] ?? null;
}

export interface StudyResult { id: string; title: string; ok: boolean | null; detail: string }

/** Scores sessions against the model's pass rules (§6). null: not enough answers yet. */
export function scoreStudy(sessions: Session[], catalog: GadgetSpec[]): StudyResult[] {
  const out: StudyResult[] = [];
  // 1. SAM: median within ±1 on all three for most gadgets; none off by more than 3.
  const perGadget = catalog.map((g) => {
    const t = samTargets(g.feel), rows = sessions.flatMap((s) => s.sam.filter((a) => a.gadget === g.name));
    if (!rows.length) return null;
    const off = (['pleasure', 'arousal', 'dominance'] as const).map((k) => Math.abs(median(rows.map((r) => r[k])) - t[k]));
    return { g: g.name, off };
  }).filter(Boolean) as { g: string; off: number[] }[];
  const within = perGadget.filter((p) => p.off.every((o) => o <= 1)).length, wild = perGadget.filter((p) => p.off.some((o) => o > 3)).map((p) => p.g);
  const need = Math.ceil((10 / 12) * catalog.length);
  out.push({ id: 'sam', title: 'SAM: pleasure, arousal and dominance on target', ok: perGadget.length < catalog.length ? null : within >= need && !wild.length,
    detail: `${within} of ${perGadget.length} gadgets within ±1 on all three (need ${need}); ${wild.length ? `off by more than 3: ${wild.join(', ')}` : 'none off by more than 3'}.` });
  // 2. Job identification: ≥ 70 % per gadget, no confusion pair above 20 %.
  const jobRows = catalog.map((g) => { const as = sessions.flatMap((s) => s.jobs.filter((j) => j.gadget === g.name)); return { g, as }; }).filter((r) => r.as.length);
  const lowJob = jobRows.filter(({ g, as }) => as.filter((a) => a.answer === g.job).length / as.length < 0.7).map(({ g }) => g.name);
  const confused = jobRows.flatMap(({ g, as }) => [...new Set(as.map((a) => a.answer))].filter((j) => j !== g.job && as.filter((a) => a.answer === j).length / as.length > 0.2).map((j) => `${g.name} → ${j}`));
  out.push({ id: 'jobs', title: 'Job identification', ok: jobRows.length < catalog.length ? null : !lowJob.length && !confused.length,
    detail: `${lowJob.length ? `under 70 %: ${lowJob.join(', ')}` : 'every gadget at 70 % or more'}; ${confused.length ? `confused over 20 %: ${confused.join(', ')}` : 'no confusion over 20 %'}.` });
  // 3. Material naming: ≥ 60 % per gadget; glass, metal and rubber ≥ 75 %.
  const matRows = catalog.map((g) => { const m = resolve(g).material, as = sessions.flatMap((s) => s.materials.filter((x) => x.gadget === g.name)); return { g, m, share: as.length ? as.filter((a) => codeMaterial(a.answer) === m).length / as.length : NaN }; }).filter((r) => !Number.isNaN(r.share));
  const lowMat = matRows.filter(({ m, share }) => share < (['glass', 'metal', 'rubber'].includes(m) ? 0.75 : 0.6)).map(({ g, m, share }) => `${g.name} (${m}, ${Math.round(share * 100)} %)`);
  out.push({ id: 'materials', title: 'Material naming', ok: matRows.length < catalog.length ? null : !lowMat.length, detail: lowMat.length ? `too low: ${lowMat.join(', ')}.` : `${matRows.length} gadgets named well enough.` });
  // 4. State discrimination: ≥ 90 % with sound, ≥ 80 % seen only, ≥ 80 % under deuteranopia.
  const rate = (pick: (s: Session) => boolean, filter: 'none' | 'deuteranopia') => { const as = sessions.filter(pick).flatMap((s) => s.states.filter((x) => x.filter === filter)); return as.length ? as.filter((a) => a.answer === a.shown).length / as.length : NaN; };
  const withSound = rate((s) => s.hears, 'none'), seen = rate((s) => !s.hears, 'none'), cvd = rate(() => true, 'deuteranopia');
  const pct = (x: number) => (Number.isNaN(x) ? 'no answers' : `${Math.round(x * 100)} %`);
  out.push({ id: 'states', title: 'State discrimination', ok: [withSound, seen, cvd].some(Number.isNaN) ? null : withSound >= 0.9 && seen >= 0.8 && cvd >= 0.8,
    detail: `with sound ${pct(withSound)} (need 90), seen only ${pct(seen)} (need 80), deuteranopia ${pct(cvd)} (need 80).` });
  // 5. Annoyance: median ≥ 5 on "would you leave sound on".
  const ann = sessions.map((s) => s.annoyance).filter((x): x is number => x !== undefined), m = median(ann);
  out.push({ id: 'annoyance', title: 'Annoyance', ok: ann.length ? m >= 5 : null, detail: ann.length ? `median ${m} of 7 (need 5).` : 'no answers.' });
  return out;
}
