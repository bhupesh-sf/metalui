import * as React from 'react';
import {
  Fan,
  IconButton,
  InkPicks,
  WidthPicks,
  Switcher,
  inkColor,
  type FanOption,
  type Ink,
  type InkWidth,
} from '@unlocalhosted/metalui';
import { SelectIcon, TextIcon, RegionIcon, PenIcon, DrawIcon, MarkerIcon, LineIcon, ArrowIcon, RectangleIcon, EllipseIcon, EraserIcon, MoreIcon, ImageIcon, TaskIcon, DocumentIcon, GroupIcon, DownloadIcon, SendAwayIcon, CaptureIcon, DuplicateIcon } from '@unlocalhosted/metalui/icons';
import reactSource from '../../../../../packages/metalui/src/components/fan/fan.tsx?raw';
import agentSource from '../../../../../packages/metalui/src/components/fan/fan.agent.md?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalFan.swift?raw';
import { ComponentPage } from '../../ui/ComponentPage';
import { SwiftCapture } from '../../ui/SwiftCapture';

type Tool = 'select' | 'write' | 'region' | 'pen' | 'pencil' | 'marker' | 'line' | 'arrow' | 'rectangle' | 'ellipse' | 'eraser';
const TOOLS: FanOption<Tool>[] = [
  { value: 'select', label: 'Select', shortcut: 'V', icon: <SelectIcon size={16} /> },
  { value: 'write', label: 'Write', shortcut: 'T', icon: <TextIcon size={16} /> },
  { value: 'region', label: 'Region', shortcut: '⌥-drag', icon: <RegionIcon size={16} /> },
  { value: 'pen', label: 'Pen', shortcut: 'P', icon: <PenIcon size={16} /> },
  { value: 'pencil', label: 'Pencil', shortcut: 'N', icon: <DrawIcon size={16} /> },
  { value: 'marker', label: 'Marker', shortcut: 'M', icon: <MarkerIcon size={16} /> },
  { value: 'line', label: 'Line', shortcut: 'L', icon: <LineIcon size={16} /> },
  { value: 'arrow', label: 'Arrow', shortcut: 'A', icon: <ArrowIcon size={16} /> },
  { value: 'rectangle', label: 'Rectangle', shortcut: 'R', icon: <RectangleIcon size={16} /> },
  { value: 'ellipse', label: 'Ellipse', shortcut: 'O', icon: <EllipseIcon size={16} /> },
  { value: 'eraser', label: 'Eraser', shortcut: 'E', icon: <EraserIcon size={16} /> },
];
const INKING: Tool[] = ['pen', 'pencil', 'marker', 'line', 'arrow', 'rectangle', 'ellipse'];
type Selection = 'none' | 'text' | 'image';

/* A tray's actions are glyph keys: the name is the tooltip and the accessible name, and the glyph
 * plays its act on hover and press. */
const Action = ({ label, icon }: { label: string; icon: React.ReactNode }) => <IconButton variant="tool" label={label} title={label} icon={icon} />;
const TEXT_ACTIONS = [
  { label: 'Tasks', icon: <TaskIcon size={16} /> },
  { label: 'Summarise', icon: <DocumentIcon size={16} /> },
  { label: 'Gather', icon: <GroupIcon size={16} /> },
  { label: 'Region', icon: <RegionIcon size={16} /> },
  { label: 'Export', icon: <DownloadIcon size={16} /> },
  { label: 'Send away', icon: <SendAwayIcon size={16} /> },
];
const IMAGE_ACTIONS = [
  { label: 'Lift subject', icon: <CaptureIcon size={16} /> },
  { label: 'Copy', icon: <DuplicateIcon size={16} /> },
  { label: 'Gather', icon: <GroupIcon size={16} /> },
  { label: 'Export', icon: <DownloadIcon size={16} /> },
  { label: 'Send away', icon: <SendAwayIcon size={16} /> },
];

function Bead({ ink }: { ink: Ink }) {
  return <span aria-hidden style={{ display: 'block', width: '1em', height: '1em', borderRadius: '50%', background: inkColor(ink) }} />;
}

/* A canvas toolbar as a Fan: the label says what the bar is about, the tool fans upward from the
 * bottom of the screen, and the tray holds what goes with the moment (inks and widths while
 * drawing, the selection's actions when something is selected). */
function Play() {
  const [tool, setTool] = React.useState<Tool>('select');
  const [ink, setInk] = React.useState<Ink>('ink');
  const [width, setWidth] = React.useState<InkWidth>('regular');
  const [selection, setSelection] = React.useState<Selection>('none');
  const inking = INKING.includes(tool);
  const label = inking ? 'Ink' : selection === 'text' ? 'Text' : selection === 'image' ? 'Image' : tool === 'write' ? 'Write' : 'Canvas';
  return (
    <div className="flex w-full flex-col items-center gap-16">
      <Switcher size="compact" aria-label="Pretend selection" value={selection} onValueChange={setSelection} options={[{ value: 'none', label: 'Nothing selected' }, { value: 'text', label: 'A text block' }, { value: 'image', label: 'An image' }]} />
      <div style={{ paddingTop: '26rem' }} className="flex items-end justify-center">
        <Fan aria-label="Canvas tools">
          <Fan.Label>{label}</Fan.Label>
          <Fan.Picker label="Tool" value={tool} options={TOOLS} onValueChange={setTool} />
          {inking ? (
            <Fan.Tray label="Ink" icon={<Bead ink={ink} />}>
              <InkPicks value={ink} onValueChange={setInk} />
              <WidthPicks value={width} onValueChange={setWidth} ink={ink} />
            </Fan.Tray>
          ) : selection === 'text' ? (
            <Fan.Tray label="Text actions" icon={<MoreIcon size={16} />}>
              {TEXT_ACTIONS.map((a) => <Action key={a.label} {...a} />)}
            </Fan.Tray>
          ) : selection === 'image' ? (
            <Fan.Tray label="Image actions" icon={<ImageIcon size={16} />}>
              {IMAGE_ACTIONS.map((a) => <Action key={a.label} {...a} />)}
            </Fan.Tray>
          ) : null}
        </Fan>
      </div>
    </div>
  );
}

function Both() {
  const [tool, setTool] = React.useState<Tool>('write');
  return (
    <Fan aria-label="Modes">
      <Fan.Label>Writing</Fan.Label>
      <Fan.Picker label="Mode" direction="both" value={tool} options={TOOLS.slice(0, 3)} onValueChange={setTool} />
    </Fan>
  );
}

export default function FanPage() {
  return (
    <ComponentPage
      title="Fan"
      lede="A small control bar whose cells open in place. It shows only the current state; the current choice fans its siblings out, and the options cap stretches into more controls."
      play={{ on: 'table', lede: 'Press the tool to fan the tools up. Pick a pen: the label reads Ink and the tray holds inks and widths. Pick Select, then choose A text block: the tray holds its actions. Escape or a press outside folds whatever is open.', node: <Play /> }}
      capture="fan-rest"
      more={[{ id: 'both-ways', title: 'Both ways', lede: 'Centred on its cap, above and below: for a bar in the middle of a surface.', node: <div style={{ padding: '6rem 0' }} className="flex justify-center"><Both /></div> },
        { id: 'swift-states', title: 'SwiftUI states', lede: 'Same tool fan and contextual trays rendered headlessly from the SwiftUI twin. Reduce Motion keeps each tool in its open slot.', node: <div className="grid gap-6"><SwiftCapture name="fan-picker" maxWidth={680} /><SwiftCapture name="fan-picker-reduced" maxWidth={680} /><SwiftCapture name="fan-ink" maxWidth={680} /><SwiftCapture name="fan-text" maxWidth={680} /></div> }]}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'swift', label: 'SwiftUI', code: swiftSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'FN1', title: 'Open in place', body: 'Choices fan out from the cap you pressed, and more controls stretch out of the options cap. Never a dropdown menu.', origin: 'Owner, 2026-09-26' },
        { id: 'FN2', title: 'One open', body: 'Opening a cell folds any other. Escape or a press outside folds it, and focus returns to its cap.', origin: 'Fan' },
        { id: 'FN3', title: 'The moment decides', body: 'The label and the tray follow what you are doing: drawing shows inks and widths; a selection shows its own actions first.', origin: 'The old toolbar' },
      ]}
    />
  );
}
