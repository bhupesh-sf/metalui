import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { COLORWAYS, capture, openPage } from './harness';

const all = (root: ParentNode, css: string) => [...root.querySelectorAll(css)];
const looks = () => all(page.getByTestId('cell-looks').element(), 'svg[role="img"]');
const opacities = (root: Element, css: string) => all(root, css).map((e) => Number(e.getAttribute('opacity')));

// The Cell Part on Parts › Cell: a grid of resin cells lit from the bottom row up, the one filling now
// part way, each lit cell spilling a halo; the dials reshape the grid.
for (const colorway of COLORWAYS) {
  test(`cells in ${colorway}`, async () => {
    await openPage('/components/cell', colorway);
    await expect.poll(() => looks().length).toBe(4);
    const glow = (i: number) => opacities(looks()[i], '[data-part="cell.glow"] [data-cell]');
    expect(glow(0)).toEqual(Array(16).fill(0));
    // 6.5 lit, in reading order: the bottom row full, then the next row up from its left, the seventh half.
    expect(glow(1)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0.5, 0, 1, 1, 1, 1]);
    expect(glow(2)).toEqual(Array(16).fill(1));
    expect(glow(3)).toEqual([1, 0, 0, 1, 1, 1]);
    expect(looks()[3].getAttribute('aria-label')).toBe('3 by 2 cells, 4 lit');
    // A lit cell's halo spills around it; a dark one's is out.
    const halo = opacities(looks()[1], '[data-part="cell.halo"] [data-cell]');
    expect(halo[12]).toBeGreaterThan(0);
    expect(halo[0]).toBe(0);
    await capture(`cell-${colorway}`, page.getByTestId('cell-looks').element());
  });
}
