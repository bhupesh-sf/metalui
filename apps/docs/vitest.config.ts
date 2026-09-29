import { defineConfig, mergeConfig } from 'vitest/config';
import { defineBrowserCommand, webdriverio } from '@vitest/browser-webdriverio';
import site from './vite.config';

/* Feature slices: each runs inside a real Chrome page with the docs site mounted at a route (the same
 * route table the site uses), so a slice reads real layout, computed styles and running animations,
 * and drives real input. No page loads between slices: the site's modules are compiled once.
 *
 *   npm run slices              every slice, headless
 *   npm run slices -- button    the slices whose file names match
 *   npm run slices:watch        re-run what an edit touches, with the UI
 *   CAPTURE=1 npm run slices    also write the docs captures (docs/captures/web)
 */

type Step = { to: [number, number]; ms?: number } | { down: true } | { up: true } | { pause: number };

/**
 * Real mouse input through WebDriver: moves are offsets from the element's centre. The button stays
 * held between calls, so a slice can press, look, then release (CSS :active needs a real press).
 */
const pointer = defineBrowserCommand<[selector: string, steps: Step[]]>(async (ctx, selector, steps) => {
  const b = ctx.browser;
  let act = b.action('pointer', { parameters: { pointerType: 'mouse' } });
  for (const s of steps) {
    if ('to' in s) act = act.move({ duration: s.ms ?? 0, origin: b.$(selector), x: Math.round(s.to[0]), y: Math.round(s.to[1]) });
    else if ('down' in s) act = act.down({ button: 0 });
    else if ('up' in s) act = act.up({ button: 0 });
    else act = act.pause(s.pause);
  }
  await act.perform(true);
});

export default mergeConfig(
  site,
  defineConfig({
    define: { __CAPTURE__: JSON.stringify(Boolean(process.env.CAPTURE)) },
    test: {
      include: ['slices/**/*.slice.tsx'],
      testTimeout: 30_000,
      browser: {
        enabled: true,
        headless: true,
        provider: webdriverio({
          capabilities: { 'goog:chromeOptions': { args: ['--force-device-scale-factor=2', '--disable-gpu-vsync'] } },
        }),
        instances: [{ browser: 'chrome' }],
        viewport: { width: 1280, height: 900 },
        commands: { pointer },
      },
    },
  }),
);
