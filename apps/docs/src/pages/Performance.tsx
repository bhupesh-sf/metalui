import * as React from 'react';
import { Led } from '@unlocalhosted/metalui';
import { PageHeader, Rules, Section, Table } from '../ui/doc';

/* ─────────────────────────────────────────────────────────
 * PERFORMANCE · what the library costs, measured on a machine that is not a laptop
 *
 *   method   what is measured and why it stands in for battery
 *   latest   the last published run, read from the bench-results branch when the page opens
 *   limits   what these numbers do not prove
 * The numbers are produced by bench/run.sh (docs/PERFORMANCE.md), never typed in here.
 * ───────────────────────────────────────────────────────── */

const SUMMARY = 'https://raw.githubusercontent.com/vijayksingh/metalui/bench-results/summary.json';
const REPO = 'https://github.com/vijayksingh/metalui';

interface Summary {
  schemaVersion: number;
  sha: string;
  startedAt: string;
  valid: boolean;
  host: { name: string; cpu: string; cpus: number; memGB: number; hypervisor?: string; node: string; playwright: string };
  load: { before: number; after: number; max: number };
  idle: {
    pages: number;
    atRest: number;
    chromeLoops: string[];
    baseline: { layoutsPerS: number; styleRecalcsPerS: number } | null;
    notAtRest: { path: string; loops: Record<string, number>; layoutsPerS: number; styleRecalcsPerS: number }[];
    durations: { baselineCpuMsPerS: number | null } | null;
  };
  bundle?: { package: { raw: number; gzip: number; brotli: number }; singleImport: Record<string, { gzip: number; raw: number }> };
}

type Load = { state: 'loading' } | { state: 'none' } | { state: 'ready'; summary: Summary };

function useSummary(): Load {
  const [load, setLoad] = React.useState<Load>({ state: 'loading' });
  React.useEffect(() => {
    const ctl = new AbortController();
    fetch(SUMMARY, { signal: ctl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((summary: Summary) => setLoad(summary?.schemaVersion === 1 ? { state: 'ready', summary } : { state: 'none' }))
      .catch((e) => { if (e?.name !== 'AbortError') setLoad({ state: 'none' }); });
    return () => ctl.abort();
  }, []);
  return load;
}

const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`;

function Latest({ s }: { s: Summary }) {
  const when = new Date(s.startedAt).toISOString().slice(0, 16).replace('T', ' ');
  const quiet = s.idle.notAtRest.length === 0;
  return (
    <>
      <p className="m-0 flex max-w-measure items-start gap-8 type-ui text-ink2" data-testid="perf-run">
        <span className="flex h-[1.5em] flex-none items-center"><Led kind={s.valid ? 'live' : 'waiting'} size="small" /></span>
        <span className="min-w-0">
          Run of <a className="text-ink underline underline-offset-2" href={`${REPO}/commit/${s.sha}`}>{s.sha.slice(0, 8)}</a> on {when} UTC, on {s.host.name}: {s.host.cpu}, {s.host.cpus} vCPU, {s.host.memGB} GB{s.host.hypervisor ? `, ${s.host.hypervisor}` : ''}.
        </span>
      </p>
      {!s.valid && (
        <p className="m-0 mt-8 max-w-measure type-ui text-ink2" data-testid="perf-invalid">
          Another job was using that machine (load {s.load.before} to {s.load.after}, limit {s.load.max}), so the durations are withheld. The counters below do not depend on load and still hold.
        </p>
      )}
      <div className="mt-20">
        <Table
          head={['At rest', 'Result', 'What it means']}
          mono={[]}
          rows={[
            ['Pages measured', `${s.idle.pages}`, 'Every page of this site, on the production build.'],
            ['Pages that do nothing beyond the docs chrome', `${s.idle.atRest} of ${s.idle.pages}`, quiet ? 'None runs a loop, a layout or extra style work while idle.' : 'The rest are listed below with what they run.'],
            ['Docs chrome', s.idle.baseline ? `${s.idle.baseline.layoutsPerS} layouts/s, ${s.idle.baseline.styleRecalcsPerS} style recalcs/s` : 'n/a', s.idle.chromeLoops.length ? `Every page carries: ${s.idle.chromeLoops.join(', ')}.` : 'Nothing runs.'],
            ...(s.idle.durations?.baselineCpuMsPerS != null ? [['Renderer CPU at rest (baseline page)', `${s.idle.durations.baselineCpuMsPerS} ms/s`, 'CPU milliseconds the page uses each second while idle. Lower is better; zero is the goal.']] : []),
          ]}
        />
      </div>
      {s.idle.notAtRest.length > 0 && (
        <div className="mt-20" data-testid="perf-busy">
          <Table
            head={['Page', 'Running at rest', 'Layouts/s', 'Style recalcs/s']}
            mono={[0]}
            rows={s.idle.notAtRest.map((r) => [r.path, Object.entries(r.loops).map(([k, n]) => (n > 1 ? `${k} x${n}` : k)).join('; ') || 'repaints', String(r.layoutsPerS), String(r.styleRecalcsPerS)])}
          />
        </div>
      )}
      {s.bundle && (
        <div className="mt-20" data-testid="perf-bundle">
          <Table
            head={['What an app ships', 'Size (gzip)', 'Raw']}
            mono={[0]}
            rows={[
              ['All of @unlocalhosted/metalui (JS and CSS)', kb(s.bundle.package.gzip), kb(s.bundle.package.raw)],
              ...Object.entries(s.bundle.singleImport).map(([name, v]) => [`import { ${name} }`, kb(v.gzip), kb(v.raw)]),
            ]}
          />
        </div>
      )}
    </>
  );
}

export default function PerformancePage() {
  const load = useSummary();
  return (
    <>
      <PageHeader
        title="Performance"
        lede="A laptop battery pays for work done while nobody is looking. MetalUI is built so a page at rest costs nothing, motion runs on the compositor, and one switch turns the expensive effects off. These numbers are measured on a separate machine and published as they come."
        tags={[{ label: 'Measured off a laptop', led: 'green' }, { label: 'Counters, not joules', led: 'amber' }]}
      />
      <Section id="latest" title="Latest run" lede="Read from the bench-results branch when this page opens; nothing on it is typed in by hand.">
        {load.state === 'loading' && <p className="m-0 type-ui text-ink3">Loading the latest run.</p>}
        {load.state === 'none' && <p className="m-0 max-w-measure type-ui text-ink2" data-testid="perf-none">No run has been published yet. When one is, it appears here with the machine it ran on and a link to the commit.</p>}
        {load.state === 'ready' && <Latest s={load.summary} />}
      </Section>
      <Section id="method" title="What is measured" lede="A virtual machine cannot read a battery, so the harness measures the work that drains one.">
        <Table
          head={['Measure', 'How', 'Why it matters']}
          mono={[]}
          rows={[
            ['Running infinite animations', 'document.getAnimations() after the page settles', 'A loop keeps the compositor, and often the GPU, awake forever.'],
            ['Layouts and style recalcs per second', 'DevTools Performance.getMetrics, ten seconds apart', 'Each one is a main-thread wake-up. At rest the right number is zero.'],
            ['Renderer CPU per second', 'The same counters, only when the machine was quiet', 'The closest software stand-in for idle power.'],
            ['Bytes shipped', 'Raw, gzip and brotli per file, and per export through a bundler', 'Bytes are parse and compile work, and radio time.'],
          ]}
        />
      </Section>
      <Section id="rules" title="The rules the library keeps" lede="Each rule has a check that fails when it breaks; the full list is docs/PERFORMANCE.md in the repository.">
        <Rules
          rules={[
            { id: 'P1', title: 'Nothing runs at rest', body: 'No frame loop, interval or infinite animation on an idle page. A loop is allowed while its state is active and stops when it ends.', origin: 'Ours' },
            { id: 'P2', title: 'What cannot be seen does not tick', body: 'In a hidden tab or scrolled away, clocks and loops stop, and catch up when they wake.', origin: 'Ours' },
            { id: 'P3', title: 'Only transform and opacity animate', body: 'Width, height, shadows and filters cost layout or paint every frame, so they stay out of transitions.', origin: 'Web platform' },
            { id: 'P4', title: 'One switch for the expensive effects', body: 'prefers-reduced-transparency, prefers-reduced-data or data-mu-power="low" turns every frosted surface opaque and drops its blur.', origin: 'Ours' },
            { id: 'P5', title: 'One import ships one component', body: 'Importing Button does not pull in the rest of the library.', origin: 'Ours' },
          ]}
        />
      </Section>
      <Section id="limits" title="What these numbers do not prove" lede="They measure work, not energy.">
        <Rules
          rules={[
            { id: 'L1', title: 'No joules', body: 'The machine renders in software, which turns GPU work into CPU time. Numbers compare one commit with another; they are not the watts a laptop draws.', origin: 'Ours' },
            { id: 'L2', title: 'Chromium only', body: 'Most MacBook users are on Safari. Counters (loops, wake-ups, bytes) carry across engines; durations do not.', origin: 'Ours' },
            { id: 'L3', title: 'A shared machine is noisy', body: 'When another job is running the harness marks the run invalid and withholds durations. Counters do not depend on load.', origin: 'Ours' },
          ]}
        />
      </Section>
    </>
  );
}
