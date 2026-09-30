import { defineConfig, mergeConfig } from 'vitest/config';
import { defineBrowserCommand, webdriverio } from '@vitest/browser-webdriverio';
import type { UserConfig } from 'vite';
import siteConfig from './vite.config';

const site = siteConfig as UserConfig;

/* Feature slices: each runs inside a real Chrome page with the docs site mounted at a route (the same
 * route table the site uses), so a slice reads real layout, computed styles and running animations,
 * and drives real input. No page loads between slices: the site's modules are compiled once.
 *
 *   npm run slices              every slice, headless
 *   npm run slices -- button    the slices whose file names match
 *   npm run slices:watch        re-run what an edit touches, with the UI
 *   CAPTURE=1 npm run slices    also write the docs captures (docs/captures/web)
 */

/**
 * A CSS media feature the page should see (prefers-reduced-motion, prefers-contrast, …): Chrome's
 * DevTools emulation, reached through WebDriver BiDi's goog:cdp extension. Applies to the whole page,
 * frames included; pass [] to clear.
 */
const media = defineBrowserCommand<[features: { name: string; value: string }[]]>(async (ctx, features) => {
  const b = ctx.browser as unknown as { send: (m: { method: string; params: object }) => Promise<{ result: Record<string, unknown> }> };
  const tree = await b.send({ method: 'browsingContext.getTree', params: {} });
  const top = (tree.result.contexts as { context: string }[])[0].context;
  const { result } = await b.send({ method: 'goog:cdp.getSession', params: { context: top } });
  await b.send({ method: 'goog:cdp.sendCommand', params: { method: 'Emulation.setEmulatedMedia', params: { features }, session: result.session } });
});

/**
 * The mouse through Chrome's DevTools protocol (Input.dispatchMouseEvent), for speed: trusted events
 * (CSS :active, pointer capture), sent straight to the page with no WebDriver element lookup per step,
 * and a whole gesture in one call. Coordinates are the window's (the harness converts from the frame).
 * The DevTools session is opened once per browser and reused; the button's state is kept here between
 * calls, so a press held across calls stays held.
 */
type Caps = { capabilities: Record<string, { debuggerAddress?: string } | undefined> };
type Socket = { send: (method: string, params: object) => Promise<unknown> };
const sockets = new WeakMap<object, Promise<Socket>>();
/** A DevTools socket straight to the page under test (ChromeDriver reports the browser's address). */
function devtools(browser: object): Promise<Socket> {
  let s = sockets.get(browser);
  if (!s) {
    s = (async () => {
      const at = (browser as Caps).capabilities['goog:chromeOptions']?.debuggerAddress;
      const targets = (await (await fetch(`http://${at}/json/list`)).json()) as { type: string; url: string; webSocketDebuggerUrl: string }[];
      const page = targets.find((t) => t.type === 'page' && t.url.startsWith('http'));
      if (!page) throw new Error(`no page to drive at ${at}`);
      const ws = new WebSocket(page.webSocketDebuggerUrl);
      await new Promise((ok, fail) => { ws.onopen = ok; ws.onerror = fail; });
      let id = 0;
      const waiting = new Map<number, (m: { error?: { message: string } }) => void>();
      ws.onmessage = (m) => { const msg = JSON.parse(String(m.data)); waiting.get(msg.id)?.(msg); waiting.delete(msg.id); };
      return {
        send: (method, params) => new Promise((ok, fail) => {
          const n = ++id;
          waiting.set(n, (msg) => (msg.error ? fail(new Error(msg.error.message)) : ok(msg)));
          ws.send(JSON.stringify({ id: n, method, params }));
        }),
      };
    })();
    sockets.set(browser, s);
  }
  return s;
}
/**
 * Real input for a slice, straight to the page over the DevTools socket: a list of Input.* calls
 * (dispatchMouseEvent, dispatchKeyEvent, insertText), sent in order, each once the page has taken the
 * last. The harness builds them (slices/harness.tsx); one call per gesture.
 */
const devtoolsInput = defineBrowserCommand<[calls: { method: string; params: object }[]]>(async (ctx, calls) => {
  const cdp = await devtools(ctx.browser);
  for (const c of calls) {
    if (!c.method.startsWith('Input.')) throw new Error(`devtoolsInput sends input only, not ${c.method}`);
    await cdp.send(c.method, c.params);
  }
});

export default mergeConfig(
  site,
  defineConfig({
    define: { __CAPTURE__: JSON.stringify(Boolean(process.env.CAPTURE)) },
    // Shards run side by side (scripts/slices.mjs): each pre-bundles into its own cache, or they race
    // on one and a shard fails to import.
    ...(process.env.SLICE_SHARD ? { cacheDir: `node_modules/.vite/slices-${process.env.SLICE_SHARD}` } : {}),
    test: {
      include: ['slices/**/*.slice.tsx'],
      // One real mouse, one window: slices take turns. They share one page too, so the site's
      // modules and stylesheet load once for the whole run (openPage starts each slice clean).
      fileParallelism: false,
      isolate: false,
      testTimeout: 30_000,
      browser: {
        enabled: true,
        headless: true,
        provider: webdriverio({
          capabilities: { 'goog:chromeOptions': { args: ['--force-device-scale-factor=2'] } },
        }),
        instances: [{ browser: 'chrome' }],
        viewport: { width: 1280, height: 900 },
        commands: { media, devtoolsInput },
      },
    },
  }),
);
