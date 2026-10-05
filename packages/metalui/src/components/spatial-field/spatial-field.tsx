'use client';

import * as React from 'react';
import { motionReduced, onMotionChange } from '../../motion/reduced';

export type SpatialFieldRect = Readonly<{ x: number; y: number; width: number; height: number }>;
export type SpatialFieldRegion = Readonly<{ id: string; rect: SpatialFieldRect }>;
export type SpatialFieldScene = Readonly<{
  regions: readonly SpatialFieldRegion[];
  /** All stationary visible footprints. The host omits objects currently carried. */
  objects?: readonly SpatialFieldRect[];
  /** One-object shorthand for a small Place. */
  object?: SpatialFieldRect;
}>;

type Tween = { from: number; to: number; start: number; ms: number };
type Recipe = {
  spacing: number; radius: number; clearance: number; carryReach: number; targetReach: number;
  baseOpacity: number; carryOpacity: number; targetOpacity: number; push: number; recoveryMs: number;
  mark: string; target: string;
};

const MAX_MARKS = 12_000;
const MAX_PIXELS = 8_000_000;

function distanceToRect(x: number, y: number, rect: SpatialFieldRect): number {
  return Math.hypot(Math.max(rect.x - x, 0, x - rect.x - rect.width), Math.max(rect.y - y, 0, y - rect.y - rect.height));
}

function inside(x: number, y: number, rect: SpatialFieldRect): boolean {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

/** One viewport painter. Host owns scene geometry, target choice and drop result. */
export class SpatialFieldController {
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private scene: SpatialFieldScene | null = null;
  private carried: SpatialFieldRect | null = null;
  private recoveryFootprint: SpatialFieldRect | null = null;
  private targetId: string | null = null;
  private paintTargetId: string | null = null;
  private recipe: Recipe | null = null;
  private width = 0;
  private height = 0;
  private scale = 1;
  private visible = true;
  private enabled = true;
  private reducedMotion = false;
  private frame = 0;
  private dirty = false;
  private carry: Tween = { from: 0, to: 0, start: 0, ms: 0 };
  private target: Tween = { from: 0, to: 0, start: 0, ms: 0 };
  private resizeObserver: ResizeObserver | null = null;
  private intersectionObserver: IntersectionObserver | null = null;
  private themeObserver: MutationObserver | null = null;
  private unwatchMotion: (() => void) | null = null;
  private mask = new Uint8Array(0);
  private maskSpacing = 0;
  private maskColumns = 0;
  private maskRows = 0;
  private maskDirty = true;

  attach(canvas: HTMLCanvasElement) {
    this.detach();
    this.canvas = canvas;
    this.context = canvas.getContext('2d', { alpha: true });
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.intersectionObserver = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      if (this.visible) this.invalidate();
      else this.stop();
    });
    this.intersectionObserver.observe(canvas);
    this.unwatchMotion = onMotionChange(this.onMediaChange);
    const refresh = () => { this.refreshTheme(); this.onMediaChange(); };
    this.themeObserver = new MutationObserver(refresh);
    this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-mu-colorway'] });
    document.addEventListener('visibilitychange', this.onVisibility);
    this.resize();
    refresh();
  }

  detach() {
    this.stop();
    this.resizeObserver?.disconnect();
    this.intersectionObserver?.disconnect();
    this.themeObserver?.disconnect();
    this.unwatchMotion?.();
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.resizeObserver = null;
    this.intersectionObserver = null;
    this.themeObserver = null;
    this.unwatchMotion = null;
    this.canvas = null;
    this.context = null;
    this.recipe = null;
  }

  private onVisibility = () => {
    if (document.hidden) this.stop();
    else this.invalidate();
  };

  private onMediaChange = () => {
    this.setReducedMotion(motionReduced(this.canvas));
  };

  setScene(scene: SpatialFieldScene) {
    this.scene = scene;
    this.maskDirty = true;
    this.invalidate();
  }

  setEnabled(enabled: boolean) {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    if (enabled) this.invalidate();
    else this.stop();
  }

  setProjection(carried: SpatialFieldRect, targetId: string | null) {
    const wasCarrying = this.carried !== null;
    const changedTarget = this.targetId !== targetId;
    this.carried = carried;
    this.recoveryFootprint = carried;
    this.targetId = targetId;
    if (!wasCarrying) {
      this.carry = this.tween(this.carry, 1, 100);
      this.maskDirty = true;
    }
    if (changedTarget) {
      if (targetId) this.paintTargetId = targetId;
      this.target = this.tween(this.target, targetId ? 1 : 0, 140);
    }
    this.invalidate();
  }

  endProjection(cancelled: boolean) {
    this.carried = null;
    this.targetId = null;
    const duration = cancelled ? 0 : this.recipe?.recoveryMs ?? 0;
    this.carry = this.tween(this.carry, 0, duration);
    this.target = this.tween(this.target, 0, cancelled ? 0 : Math.min(duration, 140));
    if (cancelled || this.reducedMotion || !duration) this.recoveryFootprint = null;
    this.maskDirty = true;
    this.invalidate();
  }

  setReducedMotion(reduced: boolean) {
    if (this.reducedMotion === reduced) return;
    this.reducedMotion = reduced;
    if (reduced) {
      this.carry = this.tween(this.carry, this.carried ? 1 : 0, 0);
      this.target = this.tween(this.target, this.targetId ? 1 : 0, 0);
      if (!this.carried) this.recoveryFootprint = null;
    }
    this.invalidate();
  }

  refreshTheme() {
    if (!this.canvas) return;
    const style = getComputedStyle(this.canvas);
    const value = (name: string) => Number.parseFloat(style.getPropertyValue(`--mu-spatial-field-${name}`));
    this.recipe = {
      spacing: value('mark-spacing'), radius: value('mark-radius'), clearance: value('clearance'),
      carryReach: value('carry-reach'), targetReach: value('target-reach'),
      baseOpacity: value('base-opacity'), carryOpacity: value('carry-opacity'), targetOpacity: value('target-opacity'),
      push: value('push'), recoveryMs: value('recovery-ms'),
      mark: style.getPropertyValue('--mu-spatial-field-mark').trim(),
      target: style.getPropertyValue('--mu-spatial-field-target').trim(),
    };
    this.maskDirty = true;
    this.invalidate();
  }

  private resize() {
    const canvas = this.canvas;
    if (!canvas) return;
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (!width || !height) { this.width = this.height = 0; this.stop(); return; }
    const scale = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(MAX_PIXELS / (width * height)));
    const pixelsWide = Math.max(1, Math.floor(width * scale));
    const pixelsHigh = Math.max(1, Math.floor(height * scale));
    if (canvas.width !== pixelsWide || canvas.height !== pixelsHigh) {
      canvas.width = pixelsWide;
      canvas.height = pixelsHigh;
    }
    this.width = width; this.height = height; this.scale = scale;
    this.maskDirty = true;
    this.invalidate();
  }

  private tween(previous: Tween, to: number, duration: number): Tween {
    const now = performance.now();
    return { from: this.level(previous, now), to, start: now, ms: this.reducedMotion ? 0 : duration };
  }

  private level(tween: Tween, now: number): number {
    if (!tween.ms) return tween.to;
    const fraction = Math.min(1, Math.max(0, (now - tween.start) / tween.ms));
    const eased = fraction * fraction * (3 - 2 * fraction);
    return tween.from + (tween.to - tween.from) * eased;
  }

  private invalidate() {
    this.dirty = true;
    if (!this.frame && this.enabled && this.visible && !document.hidden && this.context && this.width && this.height) {
      this.frame = requestAnimationFrame(this.paint);
    }
  }

  private stop() {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  private buildMask(scene: SpatialFieldScene, spacing: number, columns: number, rows: number, clearance: number) {
    if (!this.maskDirty && this.maskSpacing === spacing && this.maskColumns === columns && this.maskRows === rows) return;
    const count = columns * rows;
    if (this.mask.length !== count) this.mask = new Uint8Array(count);
    else this.mask.fill(0);
    const cover = (rect: SpatialFieldRect, pad: number, region: boolean) => {
      const x0 = Math.max(0, Math.ceil((rect.x - pad) / spacing - 0.5));
      const y0 = Math.max(0, Math.ceil((rect.y - pad) / spacing - 0.5));
      const x1 = Math.min(columns - 1, Math.floor((rect.x + rect.width + pad) / spacing - 0.5));
      const y1 = Math.min(rows - 1, Math.floor((rect.y + rect.height + pad) / spacing - 0.5));
      for (let row = y0; row <= y1; row++) for (let col = x0; col <= x1; col++) {
        const x = (col + 0.5) * spacing, y = (row + 0.5) * spacing;
        if (region ? inside(x, y, rect) : distanceToRect(x, y, rect) <= pad) this.mask[row * columns + col] = 1;
      }
    };
    for (const region of scene.regions) cover(region.rect, 0, true);
    for (const object of scene.objects ?? (this.carried || !scene.object ? [] : [scene.object])) cover(object, clearance, false);
    this.maskSpacing = spacing;
    this.maskColumns = columns;
    this.maskRows = rows;
    this.maskDirty = false;
  }

  private paint = (now: number) => {
    this.frame = 0;
    const ctx = this.context, recipe = this.recipe, scene = this.scene;
    if (!ctx || !recipe || !scene || !this.width || !this.height || !this.enabled || !this.visible || document.hidden) return;
    this.dirty = false;
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    if (!Number.isFinite(recipe.spacing) || recipe.spacing <= 0 || !recipe.mark) return;
    const spacing = Math.max(recipe.spacing, Math.sqrt(this.width * this.height / MAX_MARKS));
    const columns = Math.ceil(this.width / spacing), rows = Math.ceil(this.height / spacing);
    this.buildMask(scene, spacing, columns, rows, recipe.clearance);
    const carryLevel = this.level(this.carry, now);
    const targetLevel = this.level(this.target, now);
    const object = this.carried ?? this.recoveryFootprint;
    const region = scene.regions.find((r) => r.id === this.paintTargetId)?.rect;
    for (let row = 0; row < rows; row++) {
      const y = (row + 0.5) * spacing;
      for (let col = 0; col < columns; col++) {
        if (this.mask[row * columns + col]) continue;
        const x = (col + 0.5) * spacing;
        const distance = object ? distanceToRect(x, y, object) : Number.POSITIVE_INFINITY;
        if (distance <= recipe.clearance) continue;
        const near = object ? Math.max(0, 1 - (distance - recipe.clearance) / recipe.carryReach) : 0;
        const response = near * near * carryLevel;
        const edge = region ? Math.max(0, 1 - distanceToRect(x, y, region) / recipe.targetReach) * targetLevel : 0;
        const opacity = Math.min(1, recipe.baseOpacity + response * recipe.carryOpacity + edge * recipe.targetOpacity);
        if (opacity <= 0) continue;
        let drawX = x, drawY = y;
        if (response > 0 && object && distance > 0) {
          const nearestX = Math.max(object.x, Math.min(x, object.x + object.width));
          const nearestY = Math.max(object.y, Math.min(y, object.y + object.height));
          drawX += (x - nearestX) / distance * recipe.push * response;
          drawY += (y - nearestY) / distance * recipe.push * response;
        }
        ctx.globalAlpha = opacity;
        ctx.fillStyle = edge > response ? recipe.target : recipe.mark;
        ctx.beginPath();
        ctx.arc(drawX, drawY, recipe.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    if (this.target.to === 0 && now >= this.target.start + this.target.ms) this.paintTargetId = null;
    if (!this.carried && this.carry.to === 0 && now >= this.carry.start + this.carry.ms) this.recoveryFootprint = null;
    if (this.dirty || now < this.carry.start + this.carry.ms || now < this.target.start + this.target.ms) this.invalidate();
  };
}

export function SpatialFieldCanvas({ controller }: { controller: SpatialFieldController }) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    if (!ref.current) return;
    controller.attach(ref.current);
    return () => controller.detach();
  }, [controller]);
  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />;
}
