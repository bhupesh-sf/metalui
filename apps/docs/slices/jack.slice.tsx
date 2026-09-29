import { expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { COLORWAYS, capture, openPage } from './harness';

const all = (root: ParentNode, css: string) => [...root.querySelectorAll(css)];
const svgs = (id: string) => all(page.getByTestId(id).element(), 'svg[role="img"]');

// The Jack Part on Parts › Jack: five socket states, detail by size, and jacks set into a slab.
for (const colorway of COLORWAYS) {
  test(`jacks in ${colorway}`, async () => {
    await openPage('/components/jack', colorway);
    await expect.poll(() => svgs('jack-states').length).toBe(5);
    const states = svgs('jack-states');
    expect(states[0].getAttribute('data-lit') ?? '').toBe('');
    for (const [i, lit] of ['live', 'link', 'waiting', 'failed'].entries()) {
      expect(states[i + 1].getAttribute('data-lit')).toBe(lit);
      expect(all(states[i + 1], `[data-lit="${lit}"]`)).toHaveLength(1);   // the glow sits in the socket
    }
    // Twelve knurls on every nut, a socket that is a hole through it.
    expect(all(states[0], '[data-part="jack"] path[stroke]')).toHaveLength(12);
    await capture(`jack-${colorway}`, page.getByTestId('jack-states').element());
  });
}

test('detail follows size, and the flat tier has no filters', async () => {
  await openPage('/components/jack', 'bone');
  const tiers = svgs('jack-tiers');
  expect(tiers.map((e) => e.getAttribute('data-tier'))).toEqual(['full', 'full', 'lite', 'flat']);
  expect(tiers[3].querySelectorAll('filter').length).toBe(0);
});

test('jacks sit in a slab, and the panel answers as metal', async () => {
  await openPage('/components/jack', 'graphite');
  const panel = page.getByTestId('jack-panel').element();
  expect(all(panel, '[data-cut="hole"]')).toHaveLength(2);
  expect(all(panel, '[data-part="jack"]')).toHaveLength(2);
  expect(all(panel, '[data-lit="link"]')).toHaveLength(1);
  await userEvent.click(page.getByRole('switch', { name: /^Lit/ }));
  await expect.poll(() => all(panel, '[data-lit]').length).toBe(0);
});
