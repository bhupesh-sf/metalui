import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Link, PreviewCard } from '@unlocalhosted/metalui';
import reactSource from '../../../../../packages/metalui/src/components/preview-card/preview-card.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import agentSource from '../../../../../packages/metalui/src/components/preview-card/preview-card.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * HOVER TUNER: the page's DialKit panel
 *
 *   delay   the steady hover before the card shows
 *   close   how long it lingers after the pointer leaves
 * The values are read when the card mounts, so move off and back to feel a change.
 * ───────────────────────────────────────────────────────── */

const WCAG = { title: 'Use of color', description: 'Why a link needs more than colour to be seen: an underline, a weight, a shape.', host: 'w3.org' };
const BASE = { title: 'Base UI', description: 'Unstyled, accessible parts for building a component library.', host: 'base-ui.com' };

function Sentence({ label }: { label: string }) {
  return (
    <p className="m-0 max-w-[440px] type-lead text-ink" aria-label={label}>
      Links here follow{' '}
      <PreviewCard preview={WCAG}><Link href="https://www.w3.org/WAI/WCAG22/Understanding/use-of-color" external>the colour rule</Link></PreviewCard>
      , and the parts come from{' '}
      <PreviewCard preview={BASE}><Link href="https://base-ui.com" external>Base UI</Link></PreviewCard>.
    </p>
  );
}

function HoverTuner() {
  const d = useDialKit('Preview hover', {
    delay: [600, 0, 1500],
    close: [300, 0, 1200],
  });
  React.useEffect(() => {
    const el = document.documentElement;
    el.style.setProperty('--mu-r-preview-card-self-delay', `${d.delay}px`);
    el.style.setProperty('--mu-r-preview-card-self-close', `${d.close}px`);
    return () => { el.style.removeProperty('--mu-r-preview-card-self-delay'); el.style.removeProperty('--mu-r-preview-card-self-close'); };
  });
  return <div data-testid="preview-hover-tuner"><Sentence label="Tuned sentence" /></div>;
}

export default function PreviewCardPage() {
  return (
    <ComponentPage
      title="Preview card"
      lede="What is behind a link, seen by resting on it. It waits for a steady hover so passing over never flashes it, then rises out of the link like a popover, and lingers long enough to move onto it."
      play={{ lede: 'Rest the pointer on a link, or Tab to it.', caption: 'two external links', node: <div className="flex min-h-[220px] items-start justify-center pt-8"><Sentence label="Example sentence" /></div> }}
      more={[{ id: 'hover', title: 'Tune the hover', lede: 'The Preview hover panel sets the steady hover before the card shows and how long it lingers.', node: <HoverTuner /> }]}
      usage={`<PreviewCard preview={{ title: 'Base UI', description: 'Unstyled, accessible parts.', host: 'base-ui.com' }}>
  <Link href="https://base-ui.com" external>Base UI</Link>
</PreviewCard>`}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'PC1', title: 'A glance, not a gate', body: 'Nothing in the card is needed to use the page; the link says where it goes.', origin: 'Ours' },
        { id: 'PC2', title: 'Steady hover only', body: 'It waits 600 ms, so passing over a link never flashes it.', origin: 'Ours' },
        { id: 'PC3', title: 'Room to reach it', body: 'It lingers after the pointer leaves, so you can move onto it.', origin: 'Ours' },
      ]}
    />
  );
}
