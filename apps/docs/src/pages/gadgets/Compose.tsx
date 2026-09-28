import * as React from 'react';
import { Segmented } from '@unlocalhosted/metalui';
import { Gadget, Rig, resolveFeel, pigment, validateGadget, validateRig, type GadgetSpec, type Problem, type RigSpec } from '@unlocalhosted/metalui/gadgets';
import reading from '../../../../../packages/metalui/src/gadgets/fixtures/reading.rig.json';
import patchBay from '../../../../../packages/metalui/src/gadgets/fixtures/patch-bay.gadget.json';
import { Bench, PageHeader, Rules, Section } from '../../ui/doc';

// Every catalog gadget, so a rig may name any of them.
const CATALOG = Object.fromEntries(Object.values(import.meta.glob<GadgetSpec>('../../../../../packages/metalui/src/gadgets/fixtures/*.gadget.json', { eager: true, import: 'default' }))
  .map((g) => [g.name, g])) as Record<string, GadgetSpec>;

const text = (v: unknown) => JSON.stringify(v, null, 2);
const invented = { ...patchBay, parts: [...patchBay.parts, { id: 'antenna', part: 'antenna', at: [120, 80], role: 'trim' }] };
const clash = { ...reading, name: 'two-streaks', title: 'Two streaks', gadgets: { streak: { gadget: 'counter-drum', at: [0, 0] }, again: { gadget: 'counter-drum', at: [1, 0] } }, cables: [{ from: 'streak.count', to: 'again.count' }] };
const PRESETS = {
  reading: { label: 'Reading rig', spec: text(reading) },
  'patch-bay': { label: 'Patch bay', spec: text(patchBay) },
  invented: { label: 'An invented part', spec: text(invented) },
  clash: { label: 'A colour clash', spec: text(clash) },
} as const;
type Preset = keyof typeof PRESETS;

type Result =
  | { kind: 'json'; message: string }
  | { kind: 'problems'; problems: Problem[] }
  | { kind: 'gadget'; spec: GadgetSpec }
  | { kind: 'rig'; spec: RigSpec };

/** Reads and checks a spec: a gadget or a rig, by its $schema. */
function check(source: string): Result {
  let value: unknown;
  try { value = JSON.parse(source); } catch (e) { return { kind: 'json', message: (e as Error).message }; }
  const rig = typeof value === 'object' && value !== null && (value as { $schema?: string }).$schema === 'metalui/rig@1';
  const v = rig ? validateRig(value, CATALOG) : validateGadget(value);
  if (!v.ok) return { kind: 'problems', problems: v.problems };
  return rig ? { kind: 'rig', spec: v.spec as RigSpec } : { kind: 'gadget', spec: v.spec as GadgetSpec };
}

/** What each gadget resolves to: its material, station and colours. */
function Resolved({ rows }: { rows: { inst: string; spec: GadgetSpec }[] }) {
  return (
    <table className="type-ui w-full border-collapse text-left" data-testid="compose-resolved">
      <thead><tr className="type-label engraved"><th>Gadget</th><th>Material</th><th>Station</th><th>Body</th><th>Accent</th></tr></thead>
      <tbody>
        {rows.map(({ inst, spec }) => {
          const r = resolveFeel(spec), swatch = (c: { L: number; C: number; H: number }) => pigment(c.L, c.C, c.H).srgb;
          return (
            <tr key={inst} data-inst={inst} data-material={r.material} data-body={swatch(r.body)}>
              <td>{inst}</td><td>{r.material}</td><td className="type-readout">{r.station}°</td>
              <td><span className="inline-flex items-center gap-8"><span className="inline-block size-12 rounded-full" style={{ background: swatch(r.body) }} /><code className="type-readout">{swatch(r.body)}</code></span></td>
              <td><span className="inline-block size-12 rounded-full" style={{ background: swatch(r.accent) }} /></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function ComposePage() {
  const [preset, setPreset] = React.useState<Preset>('reading');
  const [source, setSource] = React.useState<string>(PRESETS.reading.spec);
  const result = React.useMemo(() => check(source), [source]);
  const choose = (p: string) => { setPreset(p as Preset); setSource(PRESETS[p as Preset].spec); };
  const rows = result.kind === 'gadget' ? [{ inst: result.spec.name, spec: result.spec }]
    : result.kind === 'rig' ? Object.entries(result.spec.gadgets).map(([inst, slot]) => ({ inst, spec: typeof slot.gadget === 'string' ? CATALOG[slot.gadget] : slot.gadget }))
      : [];
  return (
    <>
      <PageHeader
        title="Compose"
        lede="Write a gadget or a rig as JSON and see it checked against the catalog as you type: a problem names what is wrong and how to fix it; a valid spec is drawn live, with the colours its job and feel resolve to. This is the bench an assistant composes on, from the Gadgets section of AI.md alone."
      />
      <Section title="The bench" lede="Start from an example, or paste your own. A spec with $schema metalui/rig@1 is a rig; anything else is read as a gadget.">
        <Segmented aria-label="Example" value={preset} onValueChange={choose} options={Object.entries(PRESETS).map(([value, p]) => ({ value, label: p.label }))} />
        <div className="mt-16 grid gap-24 lg:grid-cols-2">
          <label className="flex min-w-0 flex-col gap-8">
            <span className="type-label engraved">Spec</span>
            <textarea aria-label="Spec" data-testid="compose-source" spellCheck={false} value={source} onChange={(e) => setSource(e.target.value)}
              className="type-doc-code material-stage min-h-[480px] w-full resize-y rounded-plate p-16 text-ink outline-none focus-visible:focus-ring" />
          </label>
          <div className="flex min-w-0 flex-col gap-16" data-testid="compose-result" data-kind={result.kind}>
            {result.kind === 'json' && <p role="alert" className="type-ui text-ink">This is not JSON yet: {result.message}</p>}
            {result.kind === 'problems' && (
              <ul role="alert" className="m-0 flex list-none flex-col gap-12 p-0" data-testid="compose-problems">
                {result.problems.map((p, i) => (
                  <li key={i} data-code={p.code} className="flex flex-col gap-4">
                    <span className="type-readout text-ink3">{p.code} · {p.path}</span>
                    <span className="type-ui text-ink">{p.message}</span>
                    {p.fix && <span className="type-ui text-ink2">{p.fix}</span>}
                  </li>
                ))}
              </ul>
            )}
            {result.kind === 'gadget' && <Bench caption={`${result.spec.name} · ${result.spec.job}`}><Gadget spec={result.spec} size={260} data-testid="compose-gadget" /></Bench>}
            {result.kind === 'rig' && <Bench caption={`${result.spec.name} · ${result.spec.grid.join(' × ')}`}><Rig spec={result.spec} catalog={CATALOG} width={480} data-testid="compose-rig" /></Bench>}
            {rows.length > 0 && <div className="min-w-0 overflow-x-auto"><Resolved rows={rows} /></div>}
          </div>
        </div>
      </Section>
      <Section title="Rules">
        <Rules
          rules={[
            { id: 'C1', title: 'From the catalog', body: 'Parts, mechanisms, jobs and maps are closed lists. A spec that needs a new one says so; it is a design task for a person.' },
            { id: 'C2', title: 'Every problem has a fix', body: 'The checker names the path, what is wrong and what to do instead: another Part, a free station, a port of the right kind.' },
            { id: 'C3', title: 'Colours are resolved, never picked', body: 'A spec sets a job and a feel; its material and colours follow, the same on the web and in SwiftUI.' },
          ]}
        />
      </Section>
    </>
  );
}
