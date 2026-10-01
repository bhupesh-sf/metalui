import type { CDPSession, Page } from '@playwright/test';

export type IdleSample = {
  /** Renderer CPU milliseconds consumed per second of wall time while the page is at rest. */
  cpuMsPerS: number;
  scriptMsPerS: number;
  layoutMsPerS: number;
  styleMsPerS: number;
  layoutsPerS: number;
  styleRecalcsPerS: number;
  /** Animations still running with infinite iterations, by target. */
  infiniteAnimations: string[];
  /** Animations still running with finite iterations after settle (intros that never end). */
  runningFinite: number;
  windowMs: number;
};

const KEYS = ['ProcessTime', 'ScriptDuration', 'LayoutDuration', 'RecalcStyleDuration', 'LayoutCount', 'RecalcStyleCount'] as const;

async function metrics(cdp: CDPSession) {
  const { metrics } = await cdp.send('Performance.getMetrics');
  const m: Record<string, number> = {};
  for (const { name, value } of metrics) m[name] = value;
  return m;
}

/** Waits for the page to settle, then measures what it does while nothing is happening. */
export async function measureIdle(page: Page, { settleMs = 3000, windowMs = 10_000 } = {}): Promise<IdleSample> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable', { timeDomain: 'timeTicks' });
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(0, 0); // keep the pointer off every control
  await page.waitForTimeout(settleMs);

  const a = await metrics(cdp);
  const t0 = Date.now();
  await page.waitForTimeout(windowMs);
  const b = await metrics(cdp);
  const secs = (Date.now() - t0) / 1000;
  const d = (k: (typeof KEYS)[number]) => (b[k] - a[k]) / secs;

  const anims = await page.evaluate(() =>
    document.getAnimations().filter((x) => x.playState === 'running').map((x) => {
      const t = x.effect?.getTiming();
      const target = (x.effect as KeyframeEffect | null)?.target as Element | null;
      const sel = target ? `${target.tagName.toLowerCase()}${target.className && typeof target.className === 'string' ? '.' + target.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}` : '?';
      const name = (x as CSSAnimation).animationName ?? (x as CSSTransition).transitionProperty ?? 'waapi';
      return { sel, name, infinite: t?.iterations === Infinity };
    }),
  );

  return {
    cpuMsPerS: d('ProcessTime') * 1000,
    scriptMsPerS: d('ScriptDuration') * 1000,
    layoutMsPerS: d('LayoutDuration') * 1000,
    styleMsPerS: d('RecalcStyleDuration') * 1000,
    layoutsPerS: d('LayoutCount'),
    styleRecalcsPerS: d('RecalcStyleCount'),
    infiniteAnimations: anims.filter((x) => x.infinite).map((x) => `${x.sel} [${x.name}]`),
    runningFinite: anims.filter((x) => !x.infinite).length,
    windowMs,
  };
}
