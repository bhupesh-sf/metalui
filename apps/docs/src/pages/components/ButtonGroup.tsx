import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Button, ButtonGroup, MenuItem, SplitButton } from '@unlocalhosted/metalui';
import { type SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';
import reactSource from '../../../../../packages/metalui/src/components/button-group/button-group.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import agentSource from '../../../../../packages/metalui/src/components/button-group/button-group.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * CLUSTER TUNER: the page's DialKit panel
 *
 *   gap      the space between keys in the tray
 *   corner   the inner corners of the keys
 *   chevron  the spring the chevron turns on
 * ───────────────────────────────────────────────────────── */

function Examples({ onDid }: { onDid: (s: string) => void }) {
  const [zoom, setZoom] = React.useState(100);
  return (
    <div className="grid justify-items-center gap-20">
      <ButtonGroup aria-label="History">
        <Button onClick={() => onDid('Undid')}>Undo</Button>
        <Button onClick={() => onDid('Redid')}>Redo</Button>
      </ButtonGroup>
      <ButtonGroup aria-label="Zoom">
        <Button onClick={() => setZoom((z) => Math.max(25, z - 25))} aria-label="Zoom out">−</Button>
        <Button onClick={() => setZoom(100)}>{zoom} %</Button>
        <Button onClick={() => setZoom((z) => Math.min(400, z + 25))} aria-label="Zoom in">+</Button>
      </ButtonGroup>
      <SplitButton
        menuLabel="More export options"
        heading="EXPORT AS"
        menu={(
          <>
            <MenuItem onSelect={() => onDid('Exported PNG')}>PNG</MenuItem>
            <MenuItem onSelect={() => onDid('Exported SVG')}>SVG</MenuItem>
            <MenuItem onSelect={() => onDid('Copied the link')}>Copy link</MenuItem>
          </>
        )}
      >
        <Button cap="primary" onClick={() => onDid('Exported PDF')}>Export PDF</Button>
      </SplitButton>
    </div>
  );
}

function ClusterTuner() {
  const d = useDialKit('Button cluster', {
    gap: [2, 0, 8],
    corner: [8, 0, 16],
    chevron: { type: 'select', options: SPRING_NAMES, default: 'part' },
  });
  const vars = { ...springVars('part', d.chevron as SpringName), '--mu-r-button-group-tray-gap': `${d.gap}px`, '--mu-r-button-group-key-radius': `${d.corner}px` } as React.CSSProperties;
  return <div data-testid="button-cluster-tuner" style={vars}><Examples onDid={() => {}} /></div>;
}

export default function ButtonGroupPage() {
  const [did, setDid] = React.useState<string | null>(null);
  return (
    <ComponentPage
      title="Button group"
      lede="Related actions as one cluster of keys in a sunk tray: each key presses on its own while its neighbours stay still. A split button pairs the main action with a chevron for the other ways to do it."
      play={{ lede: 'Press the keys, or open the export chevron.', caption: did ?? 'history · zoom · split export', node: <Examples onDid={setDid} /> }}
      more={[{ id: 'cluster', title: 'Tune the cluster', lede: 'The Button cluster panel sets the space between keys, their inner corners, and the chevron\'s spring.', node: <ClusterTuner /> }]}
      usage={`<ButtonGroup aria-label="History">
  <Button onClick={undo}>Undo</Button>
  <Button onClick={redo}>Redo</Button>
</ButtonGroup>

<SplitButton menuLabel="More export options" menu={
  <>
    <MenuItem onSelect={exportPng}>PNG</MenuItem>
    <MenuItem onSelect={exportSvg}>SVG</MenuItem>
  </>
}>
  <Button cap="primary" onClick={exportPdf}>Export PDF</Button>
</SplitButton>`}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'BG1', title: 'One set, separate keys', body: 'The tray makes them one set; each key still presses alone.', origin: 'Ours' },
        { id: 'BG2', title: 'Actions, not choices', body: 'A group runs actions; for a choice that stays, use a switcher or a toggle group.', origin: 'Ours' },
        { id: 'BG3', title: 'The main action first', body: 'A split button leads with what most people want; the chevron holds the rest.', origin: 'Ours' },
      ]}
    />
  );
}
