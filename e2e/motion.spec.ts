import { expect, test } from '@playwright/test';
import { open } from './helpers';

// Rows in a list (Motion foundations): a removed row leaves on release and the rows after it close the gap;
// a new row lands; under Reduce Motion it all happens at once.
test('a removed row leaves and the rest close up; a new row lands', async ({ page }) => {
  await open(page, '/foundations/motion', 'bone');
  const bench = page.getByTestId('rows-bench');
  const list = bench.getByRole('list', { name: 'Errands' });
  const framer = list.getByRole('listitem').filter({ hasText: 'Book the framer' });
  const tripod = list.getByRole('listitem').filter({ hasText: 'Return the tripod' });
  const was = (await tripod.boundingBox())!.y;
  // Watch the row below from before the press: it should glide up into the gap, not jump.
  const glided = tripod.evaluate((el) => new Promise<boolean>((done) => {
    const end = performance.now() + 1500;
    const look = () => (el.getAnimations().length ? done(true) : performance.now() > end ? done(false) : requestAnimationFrame(look));
    look();
  }));
  await bench.getByRole('button', { name: 'Remove Book the framer' }).click();
  expect(await framer.evaluate((el) => el.getAnimations().length)).toBeGreaterThan(0);
  await expect(framer).toHaveCount(0);
  expect(await glided).toBe(true);
  await expect.poll(async () => (await tripod.boundingBox())!.y).toBeLessThan(was);

  await bench.getByRole('button', { name: 'Add a row' }).click();
  await expect(list.getByRole('listitem')).toHaveCount(4);
  expect(await list.getByRole('listitem').first().evaluate((el) => el.getAnimations().length)).toBeGreaterThan(0);
});

test('Reduce Motion: rows leave and arrive at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/foundations/motion', 'bone');
  const bench = page.getByTestId('rows-bench');
  const list = bench.getByRole('list', { name: 'Errands' });
  await bench.getByRole('button', { name: 'Remove Book the framer' }).click();
  await expect(list.getByRole('listitem')).toHaveCount(3);
  expect(await list.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
});
