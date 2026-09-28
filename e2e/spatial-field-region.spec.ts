import { expect, test } from '@playwright/test';
import { open } from './helpers';

test('Region field responds to the carried block and follows the selected target', async ({ page }) => {
  await open(page, '/components/region', 'bone');
  const board = page.getByTestId('region-board');
  const canvas = board.locator('canvas');
  const block = board.getByTestId('drag-block');
  const done = board.locator('[data-region="done"]');
  const readField = () => canvas.evaluate((element) => {
    const surface = element as HTMLCanvasElement;
    const context = surface.getContext('2d')!;
    const pixels = context.getImageData(0, 0, surface.width, surface.height).data;
    let visible = 0;
    for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 0) visible++;
    return { visible, image: surface.toDataURL() };
  });

  await expect.poll(async () => (await readField()).visible).toBeGreaterThan(0);
  const rest = await readField();
  const start = (await block.boundingBox())!;
  const destination = (await done.boundingBox())!;
  await page.mouse.move(start.x + 20, start.y + 12);
  await page.mouse.down();
  await page.mouse.move(destination.x + destination.width / 2, destination.y + destination.height / 2, { steps: 8 });
  await expect(done).toHaveAttribute('data-over', '');
  await expect(done.locator('.mu-region-rule')).toHaveText('drop to mark tasks done');
  await expect.poll(async () => (await readField()).image).not.toBe(rest.image);
  await page.mouse.up();
  await expect(done).not.toHaveAttribute('data-over', '');
  await expect(done.locator('.mu-region-count')).toHaveText('1');
});

test('Region field and target reset on cancelled drag', async ({ page }) => {
  await open(page, '/components/region', 'graphite');
  const board = page.getByTestId('region-board');
  const block = board.getByTestId('drag-block');
  const done = board.locator('[data-region="done"]');
  const start = (await block.boundingBox())!;
  const destination = (await done.boundingBox())!;
  await page.mouse.move(start.x + 20, start.y + 12);
  await page.mouse.down();
  await page.mouse.move(destination.x + destination.width / 2, destination.y + destination.height / 2);
  await expect(done).toHaveAttribute('data-over', '');
  await page.keyboard.press('Escape');
  await expect(done).not.toHaveAttribute('data-over', '');
  await expect(done.locator('.mu-region-count')).toBeHidden();
  await expect.poll(async () => (await block.boundingBox())!.x).toBeCloseTo(start.x, 0);
});

test('keyboard target uses the same Region projection with reduced motion', async ({ page }) => {
  await open(page, '/components/region', 'bone');
  await page.getByRole('checkbox', { name: 'Motion (off = Reduce Motion)' }).uncheck();
  const board = page.getByTestId('region-board');
  const block = board.getByTestId('drag-block');
  const done = board.locator('[data-region="done"]');
  await block.focus();
  await block.press('ArrowRight');
  await expect(done).toHaveAttribute('data-over', '');
  await expect(done.locator('.mu-region-rule')).toHaveText('drop to mark tasks done');
  await block.press('Enter');
  await expect(done).not.toHaveAttribute('data-over', '');
  await expect(done.locator('.mu-region-count')).toHaveText('1');
});
