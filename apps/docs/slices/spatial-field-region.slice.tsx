import { expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { mouse, openPage, pointer, until } from './harness';

// Region: the field under the board answers the carried block, and the target it would drop into.
const centre = (r: DOMRect): [number, number] => [r.x + r.width / 2, r.y + r.height / 2];

function board() {
  const el = page.getByTestId('region-board').element();
  const done = el.querySelector('[data-region="done"]')!;
  return {
    el, done,
    doneLocator: page.elementLocator(done),
    block: page.elementLocator(el.querySelector('[data-testid="drag-block"]')!),
    canvas: el.querySelector('canvas')!,
    count: () => done.querySelector('.mu-region-count'),
    rule: () => (done.querySelector('.mu-region-rule')?.textContent ?? '').replace(/\s+/g, ' ').trim(),
  };
}

test('Region field responds to the carried block and follows the selected target', async () => {
  await openPage('/components/region', 'bone');
  const { canvas, done, doneLocator, block, count, rule } = board();
  const readField = () => {
    const context = canvas.getContext('2d')!;
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let visible = 0;
    for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 0) visible++;
    return { visible, image: canvas.toDataURL() };
  };

  await expect.poll(() => readField().visible).toBeGreaterThan(0);
  const rest = readField();
  const start = block.element().getBoundingClientRect();
  const destination = done.getBoundingClientRect();
  // The block captures the pointer, so the drag is one gesture: held over done, read, then let go.
  const gesture = mouse.drag([start.x + 20, start.y + 12], centre(destination), { steps: 8, hold: 2000 });
  await until(() => done.hasAttribute('data-over'));
  await expect.element(doneLocator).toHaveAttribute('data-over', '');
  await expect.poll(rule).toBe('drop to mark tasks done');
  await expect.poll(() => readField().image).not.toBe(rest.image);
  await gesture;
  await expect.element(doneLocator).not.toHaveAttribute('data-over');
  await expect.poll(() => count()?.textContent).toBe('1');
});

test('Region field and target reset on cancelled drag', async () => {
  await openPage('/components/region', 'graphite');
  const { done, doneLocator, block, count } = board();
  const start = block.element().getBoundingClientRect();
  const destination = done.getBoundingClientRect();
  // Pressed and carried over done in one call, and still held (never let go): then Escape.
  const [bx, by] = centre(start), [dx, dy] = centre(destination);
  await pointer(block.element(), [{ to: [start.x + 20 - bx, start.y + 12 - by] }, { down: true }, { to: [dx - bx, dy - by] }]);
  await expect.element(doneLocator).toHaveAttribute('data-over', '');
  await userEvent.keyboard('{Escape}');
  await expect.element(doneLocator).not.toHaveAttribute('data-over');
  // Hidden: gone, or not shown.
  await expect.poll(() => { const c = count() as HTMLElement | null; return !c || c.offsetParent === null || getComputedStyle(c).visibility === 'hidden'; }).toBe(true);
  await expect.poll(() => block.element().getBoundingClientRect().x).toBeCloseTo(start.x, 0);
});

test('keyboard target uses the same Region projection with reduced motion', async () => {
  await openPage('/components/region', 'bone');
  const motion = page.getByRole('checkbox', { name: 'Motion (off = Reduce Motion)' });
  if ((motion.element() as HTMLInputElement).checked || motion.element().getAttribute('aria-checked') === 'true') await userEvent.click(motion);
  await expect.element(motion).not.toBeChecked();
  const { doneLocator, block, count, rule } = board();
  (block.element() as HTMLElement).focus();
  await userEvent.keyboard('{ArrowRight}');
  await expect.element(doneLocator).toHaveAttribute('data-over', '');
  await expect.poll(rule).toBe('drop to mark tasks done');
  await userEvent.keyboard('{Enter}');
  await expect.element(doneLocator).not.toHaveAttribute('data-over');
  await expect.poll(() => count()?.textContent).toBe('1');
});
