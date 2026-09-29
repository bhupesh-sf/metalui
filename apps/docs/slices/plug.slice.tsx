import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { COLORWAYS, capture, mouse, openPage } from './harness';

const all = (root: ParentNode, css: string) => [...root.querySelectorAll(css)];

// The Plug Part on Parts › Plug: plain and accent plugs with their stubs, detail by size, and a plug
// seated in a jack that runs the seat mechanism when pressed.
for (const colorway of COLORWAYS) {
  test(`plugs in ${colorway}`, async () => {
    await openPage('/components/plug', colorway);
    const plugs = () => all(page.getByTestId('plug-states').element(), 'svg[role="img"]');
    await expect.poll(() => plugs().length).toBe(4);
    expect(plugs().map((e) => e.getAttribute('data-accent'))).toEqual([null, 'true', null, 'true']);
    expect(plugs().map((e) => e.querySelector('[data-stub]')?.getAttribute('data-stub') ?? 'none')).toEqual(['none', 'up', 'left', 'right']);
    // Six knurls on every plug, and its shadow is a layer of its own.
    expect(all(plugs()[0], '[data-part="plug"] path[stroke^="rgba"]')).toHaveLength(6);
    expect(all(plugs()[0], '[data-part="plug.shadow"]')).toHaveLength(1);
    await capture(`plug-${colorway}`, page.getByTestId('plug-states').element());
  });
}

test('detail follows size, and the flat tier has no filters', async () => {
  await openPage('/components/plug', 'bone');
  const tiers = all(page.getByTestId('plug-tiers').element(), 'svg[role="img"]');
  expect(tiers.map((e) => e.getAttribute('data-tier'))).toEqual(['full', 'full', 'lite', 'flat']);
  expect(tiers[3].querySelectorAll('filter').length).toBe(0);
});

test('pressing a seated plug lifts it, brings it home, and lights the socket', async () => {
  await openPage('/components/plug', 'graphite');
  // The page is shared: take the mouse off wherever the last slice left it.
  await mouse.move(0, 0);
  const seat = page.getByTestId('plug-seat').element() as HTMLElement;
  expect(all(seat, '[data-lit]')).toHaveLength(0);
  // Timed in the page: the plug's highest point over the press, and where it rests after.
  const g = seat.querySelector('[data-part="plug"]')!, rest = g.getBoundingClientRect().y;
  let lift = 0;
  seat.click();
  const t0 = performance.now();
  await new Promise<void>((done) => { const f = () => { lift = Math.max(lift, rest - g.getBoundingClientRect().y); if (performance.now() - t0 < 1200) requestAnimationFrame(f); else done(); }; f(); });
  expect(g.isConnected).toBe(true);
  expect(lift).toBeGreaterThan(4);
  expect(Math.abs(g.getBoundingClientRect().y - rest)).toBeLessThan(0.5);
  await expect.poll(() => all(seat, '[data-lit="live"]').length).toBe(1);
});
