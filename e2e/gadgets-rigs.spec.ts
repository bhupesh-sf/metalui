import { expect, test, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// The five catalog rigs on Gadgets › Rigs, each wired by patch cables through a kind of map: driven from
// the page, values arrive at the far gadgets and set what they show. Reduced motion delivers at once.
const inRig = (page: Page, rig: string, inst: string) => page.getByTestId(rig).locator(`svg[data-inst="${inst}"]`);
const stateOf = (page: Page, rig: string, inst: string) => inRig(page, rig, inst).getAttribute('data-state');

for (const colorway of COLORWAYS) {
  test(`the rigs in ${colorway}`, async ({ page }) => {
    await open(page, '/gadgets/rigs', colorway);
    const shapes: [string, number, number][] = [['sync-rig', 3, 2], ['storage-rig', 3, 2], ['capture-rig', 3, 2], ['canvas-rig', 3, 2], ['settings-rig', 3, 1]];
    for (const [id, gadgets, cords] of shapes) {
      await expect(page.getByTestId(id).locator('svg[data-gadget]')).toHaveCount(gadgets);
      await expect(page.getByTestId(id).locator('[data-layer="cables"] > [data-cable]')).toHaveCount(cords);
      await page.getByTestId(id).screenshot({ path: capture(`rig-${id.replace('-rig', '')}-${colorway}`) });
    }
  });
}

test.describe('with values delivered at once', () => {
  test.beforeEach(async ({ page }) => { await page.emulateMedia({ reducedMotion: 'reduce' }); await open(page, '/gadgets/rigs', 'bone'); });

  test('sync health: a failed sync drops the needle; a finished one raises it and counts one off pending', async ({ page }) => {
    await page.getByRole('radio', { name: 'failed' }).click();
    await expect(page.getByTestId('sync-rig-log')).toHaveText('sync.healthy → health.value: 10');
    await expect(inRig(page, 'sync-rig', 'sync')).toHaveAttribute('data-state', 'failed');
    await page.getByRole('radio', { name: 'done' }).click();
    await expect(page.getByTestId('sync-rig-log')).toHaveText('sync.done → pending.count: 11');
    await expect(inRig(page, 'sync-rig', 'health').locator('desc')).toHaveText('Health: 90%');
  });

  test('storage: the drawer filling moves the gauge, and past its line the bin is armed', async ({ page }) => {
    for (let i = 0; i < 6; i++) await page.getByRole('button', { name: 'File a card' }).first().click();
    await expect(inRig(page, 'storage-rig', 'used').locator('desc')).toHaveText('Used: 100%');
    expect(await stateOf(page, 'storage-rig', 'trash')).toBe('armed');
    expect(await stateOf(page, 'storage-rig', 'local')).toBe('full');
    await page.getByRole('button', { name: 'Clear it out' }).first().click();
    await expect(inRig(page, 'storage-rig', 'trash')).toHaveAttribute('data-state', 'rest');
  });

  test('capture: a picture taken counts one more and lights another cell', async ({ page }) => {
    await page.getByRole('button', { name: 'Take' }).click();
    await expect(page.getByTestId('capture-rig-log')).toHaveText('today.count → memory.fill: 0.65');
    await expect(inRig(page, 'capture-rig', 'take')).toHaveAttribute('data-state', 'taken');
    await expect(inRig(page, 'capture-rig', 'memory').locator('[data-part="cell"]')).toHaveAttribute('data-lit', '10.4');
    await page.getByRole('switch', { name: 'First run' }).click();
    await expect(inRig(page, 'capture-rig', 'memory')).toHaveAttribute('data-state', 'first-run');
  });

  test('canvas status: a find is counted onto the blocks; looking back stops the search', async ({ page }) => {
    await page.getByRole('button', { name: 'Find' }).click();
    await expect(page.getByTestId('canvas-rig-log')).toHaveText('find.found → blocks.count: 3');
    await expect(inRig(page, 'canvas-rig', 'blocks').locator('desc')).toHaveText('Streak: 3 days');
    await page.getByRole('button', { name: 'Look back' }).click();
    await expect(page.getByTestId('canvas-rig-log')).toHaveText('when.in-past → find.query: false');
    await expect(inRig(page, 'canvas-rig', 'find')).toHaveAttribute('data-state', 'rest');
    await expect(inRig(page, 'canvas-rig', 'when')).toHaveAttribute('data-state', 'past');
  });

  test('settings: the rocker selects the faders’ mix', async ({ page }) => {
    await page.getByRole('switch', { name: 'Sound setting' }).click();
    await expect(page.getByTestId('settings-rig-log')).toHaveText('sound.on → prefs.mix: 0.8');
    await expect(inRig(page, 'settings-rig', 'sound')).toHaveAttribute('data-state', 'on');
    await page.getByRole('switch', { name: 'Sound setting' }).click();
    await expect(page.getByTestId('settings-rig-log')).toHaveText('sound.on → prefs.mix: 0.2');
  });
});

test('a value travels its cord as a bead and the far gadget answers on arrival', async ({ page }) => {
  await open(page, '/gadgets/rigs', 'bone');
  await page.getByTestId('settings-rig').scrollIntoViewIfNeeded();
  await page.getByRole('switch', { name: 'Sound setting' }).click();
  await expect(page.getByTestId('settings-rig').locator('[data-bead]')).toHaveCount(1);
  await expect(page.getByTestId('settings-rig').locator('[data-bead]')).toHaveCount(0);
  await expect(page.getByTestId('settings-rig-log')).toHaveText('sound.on → prefs.mix: 0.8');
});
