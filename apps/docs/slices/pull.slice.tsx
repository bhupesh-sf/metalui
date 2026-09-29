import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { COLORWAYS, capture, openPage } from './harness';

const all = (root: ParentNode, css: string) => [...root.querySelectorAll(css)];
const looks = () => all(page.getByTestId('pull-looks').element(), 'svg[role="img"]');

// The Pull Part on Parts › Pull: a bar standing out in front of its drawer front on two posts, with
// its shadow; a recess cut into the front instead, with no posts and no shadow.
for (const colorway of COLORWAYS) {
  test(`pulls in ${colorway}`, async () => {
    await openPage('/components/pull', colorway);
    await expect.poll(() => looks().length).toBe(3);
    expect(looks().map((e) => e.querySelector('[data-part="pull"]')!.getAttribute('data-style'))).toEqual(['bar', 'recess', 'bar']);
    expect(all(looks()[0], '[data-part="pull"] rect')).toHaveLength(2);
    expect(all(looks()[0], '[data-part="pull.shadow"]')).toHaveLength(1);
    expect(all(looks()[1], '[data-part="pull.shadow"]')).toHaveLength(0);
    // A bar stands out below the front's edge; a recess lies inside the front.
    const box = (i: number, part: string) => looks()[i].querySelector(`[data-part="${part}"]`)!.getBoundingClientRect();
    const [front, bar] = [box(0, 'pull.front'), box(0, 'pull')];
    expect(bar.y + bar.height).toBeGreaterThan(front.y + front.height);
    const [front2, slot] = [box(1, 'pull.front'), box(1, 'pull')];
    expect(slot.y).toBeGreaterThan(front2.y);
    expect(slot.y + slot.height).toBeLessThan(front2.y + front2.height);
    await capture(`pull-${colorway}`, page.getByTestId('pull-looks').element());
  });
}
