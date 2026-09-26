import * as React from 'react';
import { SelectionFrame, Surface } from '@unlocalhosted/metalui';
import { SurfaceField, createSurfaceFieldController } from 'surface-field';
import { useColorway } from '../app/colorway';
import './surface-field-demo.css';

type Point = { x: number; y: number };

function useReducedMotion() {
  const [reduced, setReduced] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    const system = window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('rm');
    try { return system || localStorage.getItem('metalui:motion') === 'off'; } catch { return system; }
  });
  React.useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const read = () => setReduced(media.matches || document.documentElement.classList.contains('rm'));
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    media.addEventListener('change', read);
    read();
    return () => { observer.disconnect(); media.removeEventListener('change', read); };
  }, []);
  return reduced;
}

/** A docs-only host adapter: object geometry and gestures drive one field without React renders per frame. */
export function SurfaceFieldDemo() {
  const controller = React.useMemo(createSurfaceFieldController, []);
  const { colorway } = useColorway();
  const reduced = useReducedMotion();
  const stage = React.useRef<HTMLDivElement>(null);
  const first = React.useRef<HTMLElement>(null);
  const second = React.useRef<HTMLElement>(null);
  const moving = React.useRef<HTMLElement>(null);
  const offset = React.useRef<Point>({ x: 0, y: 0 });
  const drag = React.useRef<{ pointerId: number; start: Point; origin: Point; rect: DOMRect } | null>(null);
  const [held, setHeld] = React.useState(false);
  const [position, setPosition] = React.useState('Start');
  const [visible, setVisible] = React.useState(true);

  const publish = React.useCallback(() => {
    const root = stage.current;
    if (!root) return;
    const bounds = root.getBoundingClientRect();
    const carried = moving.current;
    if (carried && !drag.current) {
      const box = carried.getBoundingClientRect();
      const dx = Math.max(bounds.left + 12 - box.left, Math.min(bounds.right - 12 - box.right, 0));
      const dy = Math.max(bounds.top + 12 - box.top, Math.min(bounds.bottom - 12 - box.bottom, 0));
      if (dx || dy) {
        offset.current = { x: offset.current.x + dx, y: offset.current.y + dy };
        carried.style.transform = `translate3d(${offset.current.x}px, ${offset.current.y}px, 0)`;
      }
    }
    const rects = ([['one', first.current], ['two', second.current], ['moving', moving.current]] as const)
      .flatMap(([id, element]) => {
        if (!element) return [];
        const r = element.getBoundingClientRect();
        return [{ id, parent: null, left: r.left - bounds.left, top: r.top - bounds.top, right: r.right - bounds.left, bottom: r.bottom - bounds.top }];
      });
    controller.setScene({ root, rects });
  }, [controller]);

  React.useEffect(() => {
    const root = stage.current;
    if (!root) return;
    const observer = new ResizeObserver(publish);
    for (const element of [root, first.current, second.current, moving.current]) if (element) observer.observe(element);
    publish();
    return () => { observer.disconnect(); controller.setScene(null); };
  }, [controller, publish]);

  React.useEffect(() => {
    const root = stage.current;
    if (!root) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    const frame = requestAnimationFrame(() => controller.refreshTheme());
    return () => cancelAnimationFrame(frame);
  }, [colorway, controller]);

  const place = (next: Point) => {
    offset.current = next;
    if (moving.current) moving.current.style.transform = `translate3d(${next.x}px, ${next.y}px, 0)`;
  };

  const down = (event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0 || !stage.current || !moving.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      pointerId: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
      origin: { ...offset.current },
      rect: moving.current.getBoundingClientRect(),
    };
    setHeld(true);
    controller.setFootprint({ pointerId: event.pointerId, rects: [drag.current.rect], ids: ['moving'], initial: true });
  };

  const move = (event: React.PointerEvent<HTMLElement>) => {
    const current = drag.current;
    const root = stage.current;
    const element = moving.current;
    if (!current || current.pointerId !== event.pointerId || !root || !element) return;
    const bounds = root.getBoundingClientRect();
    const x = Math.max(bounds.left + 12 - current.rect.left, Math.min(bounds.right - 12 - current.rect.right, event.clientX - current.start.x));
    const y = Math.max(bounds.top + 12 - current.rect.top, Math.min(bounds.bottom - 12 - current.rect.bottom, event.clientY - current.start.y));
    place({ x: current.origin.x + x, y: current.origin.y + y });
    controller.setFootprint({ pointerId: event.pointerId, rects: [element.getBoundingClientRect()], ids: ['moving'] });
  };

  const end = (event: React.PointerEvent<HTMLElement>, cancelled = false) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    if (cancelled) place(current.origin);
    drag.current = null;
    setHeld(false);
    setPosition(cancelled ? 'Move cancelled' : 'Note moved');
    publish();
  };

  const keyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    const step = event.shiftKey ? 20 : 8;
    const delta: Record<string, Point> = {
      ArrowLeft: { x: -step, y: 0 }, ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step }, ArrowDown: { x: 0, y: step },
    };
    const change = delta[event.key];
    if (!change || !stage.current || !moving.current) return;
    event.preventDefault();
    const root = stage.current.getBoundingClientRect();
    const box = moving.current.getBoundingClientRect();
    const dx = Math.max(root.left + 12 - box.left, Math.min(root.right - 12 - box.right, change.x));
    const dy = Math.max(root.top + 12 - box.top, Math.min(root.bottom - 12 - box.bottom, change.y));
    place({ x: offset.current.x + dx, y: offset.current.y + dy });
    setPosition(`Note moved ${event.key.replace('Arrow', '').toLowerCase()}`);
    publish();
  };

  return (
    <div className="mu-field-demo-wrap">
      <div ref={stage} className="mu-field-demo rounded-card" data-testid="surface-field-demo">
        {visible && <SurfaceField
          controller={controller}
          interactionRoot={stage}
          gap={22}
          focusRadius={310}
          baseOpacity={0.07}
          maxOpacity={0.29}
          surfacePadding={12}
          tint={0}
          breathe={0}
          wander={false}
          still={reduced}
          cursorPush={reduced ? 0 : 1}
          ripplePush={reduced ? 0 : 3}
          style={{ position: 'absolute', inset: 0, color: 'var(--mu-ink2)' }}
        />}
        <Surface ref={first} material="raise-lite" radius="card" className="mu-field-demo-note mu-field-demo-one absolute">
          <span className="type-label engraved">IDEA</span><span className="type-ui text-ink">Sketch the shape</span>
        </Surface>
        <Surface ref={second} material="raise-lite" radius="card" className="mu-field-demo-note mu-field-demo-two absolute">
          <span className="type-label engraved">PLAN</span><span className="type-ui text-ink">Give it a place</span>
        </Surface>
        <Surface
          ref={moving}
          material="raise-lite"
          radius="card"
          className="mu-field-demo-note mu-field-demo-moving absolute"
          role="group"
          aria-label="Movable note. Drag or use arrow keys; hold Shift for larger keyboard steps."
          tabIndex={0}
          data-testid="surface-field-moving-note"
          data-held={held || undefined}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={(event) => end(event)}
          onPointerCancel={(event) => end(event, true)}
          onKeyDown={keyDown}
        >
          <span className="type-label engraved">MOVE</span><span className="type-ui text-ink">Carry this note</span>
          <SelectionFrame state={held ? 'selected' : 'rest'} radius={24} handles="none" entrance={false} />
        </Surface>
      </div>
      <div className="mu-field-demo-caption">
        <span>Drag note or focus it and press arrow keys. Dots clear around each object.</span>
        <span className="sr-only" aria-live="polite">{position}</span>
      </div>
    </div>
  );
}
