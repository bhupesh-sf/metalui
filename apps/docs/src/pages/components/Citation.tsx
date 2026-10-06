import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Citation, Message, type CitationSource } from '@unlocalhosted/metalui';
import reactSource from '../../../../../packages/metalui/src/components/citation/citation.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalCitation.swift?raw';
import agentSource from '../../../../../packages/metalui/src/components/citation/citation.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * CITATION PAGE · where an answer's words came from
 *
 *   play      an answer with numbered marks after its claims; rest on a mark for the source's preview
 *             card, press it to go there; the sources fold under the answer ("3 sources")
 *   tune      DialKit: how many sources, the preview's description, the list open
 * ───────────────────────────────────────────────────────── */

const SOURCES: CitationSource[] = [
  { href: 'https://metalui.dev/foundations/motion', title: 'Motion', description: 'Springs, travel and the one low-power switch.' },
  { href: 'https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions', title: 'Animation from interactions', description: 'WCAG 2.2: motion triggered by interaction can be turned off.' },
  { href: 'https://developer.apple.com/design/human-interface-guidelines/motion', title: 'Motion · Human Interface Guidelines', description: 'Use motion to communicate, not to decorate.' },
];

function Answer({ sources = SOURCES, open }: { sources?: CitationSource[]; open?: boolean }) {
  return (
    <Message from="assistant" model="Thorough">
      <p className="m-0">
        Every move in MetalUI rides one of a few named springs <Citation n={1} source={sources[0]} />, and each can be
        turned off: Reduce Motion swaps travel for a fade, as the guidelines ask
        {sources[1] && <> <Citation n={2} source={sources[1]} /></>}
        {sources[2] && <> <Citation n={3} source={sources[2]} /></>}.
      </p>
      <Citation.Sources sources={sources} open={open} />
    </Message>
  );
}

/* CITATION TUNER: the page's DialKit panel. How many sources the answer cites, whether the preview has a
 * description, and the list open. */
function Tuner() {
  const d = useDialKit('Citation', {
    sources: [3, 1, 3],
    description: true,
    open: true,
  });
  const sources = SOURCES.slice(0, Math.round(d.sources)).map((s) => ({
    ...s,
    description: d.description ? s.description : undefined,
  }));
  return (
    <div data-testid="citation-tuner" className="grid w-full max-w-[520px] justify-self-center">
      <Answer sources={sources} open={d.open} />
    </div>
  );
}

export default function CitationPage() {
  return (
    <ComponentPage
      capture="citation"
      title="Citation"
      lede="Where an answer's words came from: a numbered mark after a claim that opens its source, and the sources folded under the answer with the same numbers."
      play={{ lede: 'Rest on a number for the source\'s preview card; press it to open the source. Open "3 sources" for the list under the answer.', caption: 'an answer with its sources', wide: true, node: <div className="flex w-full justify-center"><div className="w-full max-w-[520px]"><Answer /></div></div> }}
      more={[
        { id: 'tune', title: 'Tune a citation', lede: 'The Citation panel sets how many sources the answer cites, the preview\'s description and the list open.', node: <Tuner /> },
      ]}
      usage={`<p>
  Springs carry every move <Citation n={1} source={{ href, title, description }} />.
</p>
<Citation.Sources sources={sources} />`}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'swift', label: 'SwiftUI', code: swiftSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'CI1', title: 'One number, two places', body: 'The mark\'s number is the list\'s: number sources in the order the answer first cites them.', origin: 'Ours' },
        { id: 'CI2', title: 'A cue that says where it came from', body: 'The same idea as the provenance tooltip; a source has a title and a place to go, so it previews as a card.', origin: 'Ours' },
        { id: 'CI3', title: 'The link cue\'s pill', body: 'A citation is a link at rest, so it wears the link cue\'s pill, with its number in place of the host.', origin: 'Ours' },
      ]}
    />
  );
}
