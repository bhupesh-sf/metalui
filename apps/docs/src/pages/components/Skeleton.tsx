import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Button, Skeleton } from '@unlocalhosted/metalui';
import reactSource from '../../../../../packages/metalui/src/components/skeleton/skeleton.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import agentSource from '../../../../../packages/metalui/src/components/skeleton/skeleton.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * SHEEN TUNER: the page's DialKit panel
 *
 *   delay   the beat before the shapes show
 *   sweep   one pass of the light
 *   reload  load again to watch the beat, the sheen and the arrival
 * ───────────────────────────────────────────────────────── */

const NOTES = [
  { who: 'Ana', text: 'Pick up the prints on Thursday, and ask about the matte paper.' },
  { who: 'Ben', text: 'Two copies of the plan, one folded for the car.' },
];

function Note({ who, text }: { who: string; text: string }) {
  return (
    <div className="flex items-start gap-12">
      <span className="grid size-32 flex-none place-items-center rounded-full bg-ink/10 type-ui text-ink">{who[0]}</span>
      <div className="grid gap-4"><span className="type-ui text-ink">{who}</span><span className="type-body text-ink2">{text}</span></div>
    </div>
  );
}

function NoteShape() {
  return (
    <div className="flex items-start gap-12">
      <Skeleton.Circle size={32} />
      <div className="grid flex-1 gap-8"><Skeleton width={72} /><Skeleton.Text lines={2} /></div>
    </div>
  );
}

function Notes({ ms, label }: { ms: number; label: string }) {
  const [loading, setLoading] = React.useState(true);
  const [run, setRun] = React.useState(0);
  React.useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), ms);
    return () => clearTimeout(t);
  }, [ms, run]);
  return (
    <div className="grid w-full max-w-[400px] gap-16">
      <Skeleton.Swap loading={loading} label={label} fallback={<div className="grid gap-16">{NOTES.map((n) => <NoteShape key={n.who} />)}</div>}>
        <div className="grid gap-16">{NOTES.map((n) => <Note key={n.who} {...n} />)}</div>
      </Skeleton.Swap>
      <Button className="justify-self-start" onClick={() => setRun((r) => r + 1)}>Load again</Button>
    </div>
  );
}

function SheenTuner() {
  const d = useDialKit('Skeleton sheen', {
    delay: [300, 0, 1000],
    sweep: [1600, 600, 4000],
    load: [2400, 200, 6000],
  });
  const vars = { '--mu-r-skeleton-self-delay': `${d.delay}ms`, '--mu-r-skeleton-self-sweep': `${d.sweep}ms` } as React.CSSProperties;
  return <div data-testid="skeleton-sheen-tuner" className="flex w-full justify-center" style={vars}><Notes ms={d.load} label="Loading tuned notes" /></div>;
}

export default function SkeletonPage() {
  return (
    <ComponentPage
      title="Skeleton"
      lede="Where content will be, before it arrives. It waits a beat so fast loads never flash it, then shows the shape of what is coming with a soft sheen; the content lands in the same place."
      play={{ lede: 'Load the notes again and watch the shapes hand over to the content.', caption: 'a circle · a name · two lines', node: <div className="flex w-full justify-center"><Notes ms={2400} label="Loading notes" /></div> }}
      more={[{ id: 'sheen', title: 'Tune the sheen', lede: 'The Skeleton sheen panel sets the beat before the shapes show, one pass of the light, and how long the load takes.', node: <SheenTuner /> }]}
      usage={`<Skeleton.Swap loading={loading} label="Loading notes" fallback={
  <div className="flex gap-12">
    <Skeleton.Circle size={32} />
    <Skeleton.Text lines={2} />
  </div>
}>
  <Note {...note} />
</Skeleton.Swap>`}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'SK1', title: 'Draw what is coming', body: 'The shapes stand where the content will land, so nothing moves when it arrives.', origin: 'Ours' },
        { id: 'SK2', title: 'Wait a beat', body: 'Shapes show only after 300 ms; a fast load goes straight to content.', origin: 'Ours' },
        { id: 'SK3', title: 'A sheen, not a pulse', body: 'One soft light passes across; nothing throbs.', origin: 'Ours' },
      ]}
    />
  );
}
