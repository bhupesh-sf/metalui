import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Dimple, Region, RegionRow, SpatialFieldCanvas, SpatialFieldController, type SpatialFieldRect, type SpatialFieldRegion } from '@unlocalhosted/metalui';
import reactSource from '../../../../../packages/metalui/src/blocks/region/region.tsx?raw';
import spatialSource from '../../../../../packages/metalui/src/components/spatial-field/spatial-field.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import agentGuide from '../../../../../packages/metalui/src/blocks/region/region.agent.md?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalRegionView.swift?raw';
import { Bench, PageHeader, Rules, Section, SourceTabs } from '../../ui/doc';
import { UsageSection } from '../../ui/Usage';
import { SwiftCapture } from '../../ui/SwiftCapture';
import { SpatialFieldFoundation, type SpatialFoundationState } from '../../ui/SpatialFieldFoundation';

type Rid = 'todo' | 'done';
const RULES: Record<Rid, { rule: string; drop: string }> = {
  todo: { rule: 'makes tasks', drop: 'drop to make tasks' },
  done: { rule: 'marks tasks done', drop: 'drop to mark tasks done' },
};

/* Two regions and one block. Drag the block over a region: it lights and says what the drop will do.
 * Drop it: the block lands inside on the object spring, the count rises. Double-click a name to rename it. */
function Board({ dim, past }: { dim: boolean; past: boolean }) {
  const [names, setNames] = React.useState<Record<Rid, string>>({ todo: 'To do', done: 'Done' });
  const [renaming, setRenaming] = React.useState<Rid | null>(null);
  const [inRegion, setInRegion] = React.useState<Rid | null>(null);
  const [over, setOver] = React.useState<Rid | null>(null);
  const [held, setHeld] = React.useState(false);
  const board = React.useRef<HTMLDivElement>(null);
  const block = React.useRef<HTMLDivElement>(null);
  const refs = { todo: React.useRef<HTMLDivElement>(null), done: React.useRef<HTMLDivElement>(null) };
  const controller = React.useMemo(() => new SpatialFieldController(), []);
  const home = React.useRef({ x: 24, y: 300 });
  const position = React.useRef(home.current);
  const bounds = React.useRef({ left: 0, top: 0 });
  const size = React.useRef({ width: 120, height: 40 });
  const regions = React.useRef<SpatialFieldRegion[]>([]);
  const currentRegion = React.useRef<Rid | null>(null);
  const currentTarget = React.useRef<Rid | null>(null);
  const drag = React.useRef<{ pointerId: number; startX: number; startY: number; origin: { x: number; y: number } } | null>(null);

  const objectRect = (point = position.current): SpatialFieldRect => ({ ...point, ...size.current });
  const setBlockPosition = (point: { x: number; y: number }, moving: boolean) => {
    position.current = point;
    if (!block.current) return;
    block.current.style.transition = moving ? 'none' : `transform var(--mu-spring-${currentRegion.current ? 'object' : 'settle'}-d) var(--mu-spring-${currentRegion.current ? 'object' : 'settle'})`;
    block.current.style.transform = `translate3d(${point.x}px, ${point.y}px, 0)${moving ? ' translateY(-3px) scale(1.01)' : ''}`;
  };
  const scene = () => controller.setScene({ regions: regions.current, object: objectRect() });
  const measure = () => {
    const stage = board.current, object = block.current;
    if (!stage || !object || !refs.todo.current || !refs.done.current) return;
    const origin = stage.getBoundingClientRect();
    bounds.current = { left: origin.left, top: origin.top };
    const rect = object.getBoundingClientRect();
    size.current = { width: rect.width, height: rect.height };
    regions.current = (['todo', 'done'] as Rid[]).map((id) => {
      const r = refs[id].current!.getBoundingClientRect();
      return { id, rect: { x: r.left - origin.left, y: r.top - origin.top, width: r.width, height: r.height } };
    });
    if (currentRegion.current && !drag.current) {
      const r = regions.current.find((entry) => entry.id === currentRegion.current)!.rect;
      setBlockPosition({ x: r.x + 22, y: r.y + 56 }, false);
    }
    scene();
  };
  const targetAt = (clientX: number, clientY: number): Rid | null => {
    const x = clientX - bounds.current.left, y = clientY - bounds.current.top;
    return (['todo', 'done'] as Rid[]).find((id) => {
      if (past && id === 'done') return false;
      const r = regions.current.find((entry) => entry.id === id)?.rect;
      return r && x > r.x && x < r.x + r.width && y > r.y && y < r.y + r.height;
    }) ?? null;
  };
  const setTarget = (target: Rid | null) => {
    if (currentTarget.current === target) return;
    currentTarget.current = target;
    setOver(target);
  };
  const cancel = () => {
    const active = drag.current;
    if (!active && !currentTarget.current) return;
    drag.current = null;
    if (active) setBlockPosition(active.origin, false);
    setHeld(false);
    setTarget(null);
    scene();
    controller.endProjection(true);
  };
  const commit = (target: Rid | null) => {
    drag.current = null;
    currentRegion.current = target;
    const r = target && regions.current.find((entry) => entry.id === target)?.rect;
    setBlockPosition(r ? { x: r.x + 22, y: r.y + 56 } : home.current, false);
    setInRegion(target);
    setHeld(false);
    setTarget(null);
    scene();
    controller.endProjection(false);
  };

  React.useEffect(() => {
    const observer = new ResizeObserver(measure);
    for (const element of [board.current, block.current, refs.todo.current, refs.done.current]) if (element) observer.observe(element);
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    window.addEventListener('blur', cancel);
    measure();
    return () => { observer.disconnect(); window.removeEventListener('scroll', measure, true); window.removeEventListener('resize', measure); window.removeEventListener('blur', cancel); controller.detach(); };
  }, [controller]);

  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const next = { x: active.origin.x + event.clientX - active.startX, y: active.origin.y + event.clientY - active.startY };
    setBlockPosition(next, true);
    const target = targetAt(event.clientX, event.clientY);
    setTarget(target);
    controller.setProjection(objectRect(next), target);
  };

  return (
    <div ref={board} className="relative h-[360px] w-full max-w-[720px]" data-testid="region-board">
      <SpatialFieldCanvas controller={controller} />
      <div className="absolute left-0 top-0 flex gap-24">
        {(['todo', 'done'] as Rid[]).map((r) => (
          <Region
            key={r}
            ref={refs[r]}
            data-region={r}
            name={names[r]}
            rule={RULES[r].rule}
            dropRule={RULES[r].drop}
            count={inRegion === r ? 1 : 0}
            over={over === r}
            dim={dim && r === 'todo'}
            past={past && r === 'done'}
            renaming={renaming === r}
            onDoubleClick={() => setRenaming(r)}
            onRename={(n) => { setNames((s) => ({ ...s, [r]: n })); setRenaming(null); }}
            onRenameCancel={() => setRenaming(null)}
            width={300}
            height={250}
          />
        ))}
      </div>
      <div
        ref={block}
        data-testid="drag-block"
        role="button"
        tabIndex={0}
        aria-label="Send the poster. Drag into a region, or use left and right arrows then Enter; Escape cancels."
        className="type-content absolute cursor-grab select-none touch-none rounded-plate px-14 py-8 text-ink material-raised"
        style={{ left: 0, top: 0, transform: 'translate3d(24px, 300px, 0)', zIndex: 2 }}
        data-held={held || undefined}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          measure();
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, origin: { ...position.current } };
          setHeld(true);
          controller.setProjection(objectRect(), null);
        }}
        onPointerMove={move}
        onPointerUp={(e) => { if (!drag.current || drag.current.pointerId !== e.pointerId) return; move(e); commit(targetAt(e.clientX, e.clientY)); }}
        onPointerCancel={cancel}
        onLostPointerCapture={cancel}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { e.preventDefault(); cancel(); return; }
          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            const target = e.key === 'ArrowLeft' ? 'todo' : 'done';
            if (past && target === 'done') return;
            setTarget(target);
            controller.setProjection(objectRect(), target);
          }
          if (e.key === 'Enter' && currentTarget.current) { e.preventDefault(); commit(currentTarget.current); }
        }}
      >
        send the poster
      </div>
    </div>
  );
}

export default function RegionPage() {
  const d = useDialKit('Region', {
    dim: false,
    past: false,
    spatial: { state: { type: 'select', options: ['rest', 'carry', 'target'], default: 'target' } },
  });
  const [ticked, setTicked] = React.useState(false);
  return (
    <>
      <PageHeader
        title="Region"
        lede="A drawn rectangle with a name that carries a rule. Done ticks what lands, To do makes tasks, a date dates, any other name tags. Arrangement is structure, and it is reversible: drag a block out and the rule comes off. A pinned lens is a region too: a frosted plate that lists its matches."
      />

      <Section title="Drop a block" lede="Drag the block: one content-aware field clears the Regions and moves around the carried footprint. The chosen Region lights and says what the drop will do. Drop to land on the object spring; use left or right arrow then Enter for the keyboard path. Double-click a name to rename. Dials: dim and past.">
        <Bench caption={`${d.dim ? 'To do dimmed' : ''}${d.past ? ' · Done in the past' : ''}`.trim() || 'rest'} on="canvas" className="wide min-h-[400px] items-start justify-start">
          <Board dim={d.dim} past={d.past} />
        </Bench>
      </Section>

      <UsageSection
        agent={agentGuide}
        example={`<Region name="Done" rule="marks tasks done" dropRule="drop to mark tasks done" count={3} width={320} height={260} />
<Region name="open tasks" rule="lens · live" lens width={300} height={220}>
  <RegionRow meta="FRI">Send the poster</RegionRow>
</Region>`}
      />

      <Section id="spatial-response" title="Spatial response foundation" lede="The moving board above is the live specimen. This fixed comparison shows the shared React and Swift appearance: a quiet grid at rest, space cleared around Region paper and the block, and marks that move around the carried footprint and tint near the chosen target. Dial: rest, carry, target.">
        <Bench on="canvas" caption={`${d.spatial.state}: response marks · Region paper remains local`} className="wide min-h-[280px] items-start justify-start">
          <SpatialFieldFoundation state={d.spatial.state as SpatialFoundationState} />
        </Bench>
        <SwiftCapture name={`spatial-field-${d.spatial.state}`} />
      </Section>

      <Section title="States and a lens">
        <Bench tone="page" on="canvas" caption="rest · over · dim · a pinned lens with rows">
          <div className="flex flex-wrap gap-24">
            <Region name="friday" rule="dates them friday" count={2} width={220} height={150} />
            <Region name="Done" rule="marks tasks done" dropRule="drop to mark tasks done" over width={220} height={150} />
            <Region name="#poster" rule="tags them #poster" dim width={220} height={150} />
            <Region name="" width={220} height={150} />
            <Region name="open tasks" rule="lens · live" lens width={300} height={200}>
              <RegionRow lead={<Dimple checked={ticked} onCheckedChange={setTicked} aria-label="Send the poster" />} meta="FRI" checked={ticked}>Send the poster</RegionRow>
              <RegionRow lead={<Dimple aria-label="Call the printer" />} meta="TUE">Call the printer</RegionRow>
              <RegionRow lead={<Dimple aria-label="Book the room" />}>Book the room</RegionRow>
            </Region>
          </div>
        </Bench>
        <SwiftCapture name="region" />
      </Section>

      <Section title="Source">
        <SourceTabs tabs={[
          { id: 'react', label: 'React', code: reactSource },
          { id: 'spatial-field', label: 'Spatial field', code: spatialSource },
          { id: 'css', label: 'CSS', code: cssSource },
          { id: 'swift', label: 'SwiftUI', code: swiftSource },
          { id: 'agent', label: 'Agent guide', code: agentGuide },
        ]} />
      </Section>

      <Section title="Rules">
        <Rules
          rules={[
            { id: 'R1', title: 'Placement is meaning, and reversible', body: 'A drop applies the rule with a toast that names it and offers Undo; dragging out takes it off.', origin: 'reference brief' },
            { id: 'R2', title: 'The over state says what the drop will do', body: 'The rule is rewritten as its drop: drop to mark tasks done. Colour is never alone.', origin: 'reference design' },
            { id: 'R3', title: 'A drop is a landing', body: 'The block settles inside the edges on the object spring, a stop; it never lands on a neighbour.', origin: 'DS-20, T5b' },
            { id: 'R4', title: 'Radius by size', body: '30 when the short side is at least 240, else 24: always on the ladder.', origin: 'DS-14' },
          ]}
        />
      </Section>
    </>
  );
}
