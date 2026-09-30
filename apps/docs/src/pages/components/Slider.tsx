import * as React from 'react';
import { Slider, Surface } from '@unlocalhosted/metalui';
import { SliderXray } from '../../ui/xray/SliderXray';
import reactSource from '../../../../../packages/metalui/src/components/slider/slider.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalSlider.swift?raw';
import agentSource from '../../../../../packages/metalui/src/components/slider/slider.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

export default function SliderPage() {
  const [v, setV] = React.useState(40);
  return (
    <ComponentPage
      title={"Slider"}
      lede={"A metal knob in a long groove, with a green fill up to the knob. Click the groove and the knob jumps there on a spring. Drag it and it follows your finger."}
      play={{ lede: "Click anywhere on the groove, drag the knob, or use the arrow keys (Shift for bigger steps).", node: (
          <Surface material="raise" radius="card" className="px-28 pt-20 pb-24" style={{ width: 416, maxWidth: "100%" }}>
          <div style={{ height: 48 }}>
            <Slider.Root value={v} min={0} max={100} step={1} largeStep={10} onValueChange={setV}>
              <Slider.Track />
              <Slider.Ticks ticks={[0, 0.25, 0.5, 0.75, 1].map((f) => ({ at: f, label: Math.round(f * 100) }))} />
              <Slider.Knob aria-label="Amount" />
            </Slider.Root>
          </div>
          </Surface>
        ) }}
      xray={<SliderXray />}
      capture="slider"
      sources={[
        { id: 'react', label: "React", code: reactSource },
        { id: 'css', label: "CSS", code: cssSource },
        { id: 'swift', label: "SwiftUI", code: swiftSource },
        { id: 'agent', label: "Agent guide", code: agentSource },
      ]}
      rules={[
        { id: "SL1", title: "A jump springs, a drag does not", body: "When you drag, your hand is already moving the knob, so a spring would only lag behind it.", origin: 'Ours' },
        { id: "SL2", title: "Marks mean something", body: "A notch in the groove is a step or an event, and a tick has a label. Never scatter them for texture: the knob is what you look at.", origin: 'Ours' },
        { id: "SL4", title: "Labels you can read", body: "Tick labels are plain small type at ink2 on a plain surface, never engraved type on a busy backdrop.", origin: 'Ours' },
        { id: "SL3", title: "Say the value in words", body: "Give the knob a value text a person would say, like a date and a time.", origin: 'Ours' },
      ]}
    />
  );
}
