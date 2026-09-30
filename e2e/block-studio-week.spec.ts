import { expect, test, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Studio week block: a readout puts its measure on the matrix, ‹ › step weeks, every hour reads from
// the keyboard, change is said in words against the same point last week, and the matrix redraws as
// a scan (at once under reduced motion).
const block = (page: Page) => page.getByRole('region', { name: /^Lisbon Studio,/ });

for (const colorway of COLORWAYS) {
  test(`reads the week by measure and by hour, in ${colorway}`, async ({ page }) => {
    await open(page, '/blocks/studio-week', colorway);
    const b = block(page);
    await expect(b.getByRole('heading', { name: 'This week' })).toBeVisible();
    await expect(b).toContainText('28 Sept – 4 Oct');

    // A readout is a radio: pressing one puts it on the matrix.
    const regions = b.getByRole('radio', { name: /Regions formed/ });
    await regions.click();
    await expect(regions).toHaveAttribute('aria-checked', 'true');
    await expect(b.getByRole('img', { name: /Regions formed by hour/ })).toBeVisible();

    // The keyboard reads any hour: focus starts at now; ← goes back an hour; ↑ a day.
    const matrix = b.getByRole('img', { name: /by hour/ });
    await matrix.focus();
    await expect(b).toContainText('Wed 30 Sept · 10:00–11:00');
    await page.keyboard.press('ArrowLeft');
    await expect(b).toContainText('Wed 30 Sept · 09:00–10:00');
    await page.keyboard.press('ArrowUp');
    await expect(b).toContainText('Tue 29 Sept · 09:00–10:00');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect(b).toContainText('still to come');

    await b.getByRole('radio', { name: /Notes written/ }).click();
    await matrix.hover({ position: { x: 150, y: 20 } });
    await page.waitForTimeout(700);
    await b.screenshot({ path: capture(`block-studio-week-${colorway}`) });
  });
}

test('steps back a week, and the change is against the same point last week', async ({ page }) => {
  await open(page, '/blocks/studio-week', 'bone');
  const b = block(page);
  await expect(b).toContainText('Compared with this time last week');
  await expect(b.getByRole('button', { name: 'Week after' })).toBeDisabled();
  const notes = b.getByRole('radio', { name: /Notes written/ });
  const before = await notes.innerText();
  await b.getByRole('button', { name: 'Week before' }).click();
  await expect(b.getByRole('heading', { name: 'Last week' })).toBeVisible();
  await expect(b).toContainText('21 Sept – 27 Sept');
  await expect(b).toContainText('Compared with the week before');
  await expect.poll(() => notes.innerText()).not.toBe(before);
  for (const r of await b.getByRole('radio').all()) await expect(r).toContainText(/\d[\d,]* (more|fewer)|\d+ pts? (up|down)|\d+ min (more|less)|the same/);
});

test('the recognizer says confirmed of recognised for every kind', async ({ page }) => {
  await open(page, '/blocks/studio-week', 'bone');
  const r = block(page).getByRole('region', { name: 'Recognizer' });
  for (const kind of ['Dates', 'Times', 'Amounts', 'Tags', 'People', 'Colours']) await expect(r).toContainText(new RegExp(`${kind}\\s*\\d+ of \\d+`));
  await expect(r.getByRole('meter')).toHaveCount(6);
});

test('the matrix redraws as a scan; under reduced motion at once', async ({ page }) => {
  await open(page, '/blocks/studio-week', 'bone');
  const b = block(page);
  const lit = () => b.locator('svg.dot-display path[data-ink]').evaluateAll((ps) => ps.map((p) => p.getAttribute('d')?.length ?? 0).join(','));
  const start = await lit();
  await b.getByRole('radio', { name: /Time in the past/ }).click();
  const mid = await lit();
  await page.waitForTimeout(800);
  const end = await lit();
  expect(end).not.toBe(start);
  expect(mid).not.toBe(end); // part way through the scan the picture is neither old nor new

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await b.getByRole('radio', { name: /Notes written/ }).click();
  const at = await lit();
  await page.waitForTimeout(400);
  expect(await lit()).toBe(at);
});

test('the layout follows the block\'s own width', async ({ page }) => {
  await open(page, '/blocks/studio-week', 'bone');
  const b = block(page);
  // the chosen key sits 1px lower (pressed), so rows are counted to the nearest 20px
  const rowsOf = () => b.getByRole('radiogroup').evaluate((el) => new Set([...el.querySelectorAll('[role=radio]')].map((t) => Math.round((t as HTMLElement).getBoundingClientRect().top / 20))).size);
  await b.evaluate((el) => { (el as HTMLElement).style.width = '860px'; });
  await expect.poll(rowsOf).toBe(1);
  await b.evaluate((el) => { (el as HTMLElement).style.width = '360px'; });
  await expect.poll(rowsOf).toBe(2);
});
