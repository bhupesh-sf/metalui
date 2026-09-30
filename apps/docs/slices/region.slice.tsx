import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import tokens from '../../../tokens/tokens.json';
import { COLORWAYS, capture, openPage, pointer, userEvent, mouse } from './harness';

const section = (text: string) => [...document.querySelectorAll('section')].find((s) => s.textContent!.includes(text))!;
const settled = (el: Element) => Promise.all(el.getAnimations().map((a) => a.finished));
/** A colour as the browser computes it (a token's rgba(…,.45) reads rgba(…, 0.45)). */
function computed(color: string) {
  const probe = document.createElement('i');
  probe.style.color = color;
  document.body.append(probe);
  const c = getComputedStyle(probe).color;
  probe.remove();
  return c;
}


// Region: dragging a block over a region lights it and says the drop; dropping lands it inside and counts it;
// double-click renames; dim and past states.
for (const colorway of COLORWAYS) {
  test(`drag a block into Done in ${colorway}`, async () => {
    await openPage('/components/region', colorway);
    const board = page.getByTestId('region-board').element();
    const done = board.querySelector('[data-region="done"]')!;
    const block = page.getByTestId('drag-block').element();
    const b = block.getBoundingClientRect(), g = done.getBoundingClientRect();
    await mouse.move(b.x + 20, b.y + 10);
    await mouse.down();
    await mouse.move(g.x + g.width / 2, g.y + g.height / 2, { steps: 8 });
    await expect.element(page.elementLocator(done)).toHaveAttribute('data-over', '');
    await expect.poll(() => done.querySelector('.mu-region-rule')?.textContent?.trim()).toBe('drop to mark tasks done');
    await settled(done);
    const ring = getComputedStyle(done).boxShadow;
    // the region is a sheet on the canvas: over, a green 1 pt ring round its edge, lifted (recipe region-over)
    expect(ring.startsWith(`${computed(tokens.region['over-ring'])} 0px 0px 0px 1px`)).toBe(true);
    await capture(`region-over-${colorway}`, section('Drop a block'));
    await mouse.up();
    await expect.element(page.elementLocator(done)).not.toHaveAttribute('data-over', '');
    await expect.poll(() => done.querySelector('.mu-region-count')?.textContent?.trim()).toBe('1');
    await settled(block);
    const nb = block.getBoundingClientRect(), ng = done.getBoundingClientRect();
    expect(nb.x).toBeGreaterThan(ng.x);
    expect(nb.x + nb.width).toBeLessThan(ng.x + ng.width);
    // Rename by double-click.
    await userEvent.dblClick(page.elementLocator(board.querySelector('[data-region="todo"] .mu-region-name')!));
    const field = page.elementLocator(board).getByRole('textbox', { name: 'Region name' });
    // Replace the name as a person does: select it all and type (WebDriver's fill clears first, and the
    // cleared field re-renders under it).
    (field.element() as HTMLInputElement).select();
    await userEvent.keyboard('Doing');
    await userEvent.keyboard('{Enter}');
    await expect.poll(() => board.querySelector('[data-region="todo"] .mu-region-name')?.textContent?.trim()).toBe('Doing');
    await expect.poll(() => board.querySelector('[data-region="todo"]')!.getAttribute('aria-label')).toMatch(/Region Doing/);
    await capture(`region-states-${colorway}`, section('a pinned lens with rows'));
  });
}
