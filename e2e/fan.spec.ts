import { expect, test, type Locator, type Page } from '@playwright/test';
import { COLORWAYS, open } from './helpers';

async function captureFan(page: Page, name: string) {
  const bar = page.getByRole('toolbar', { name: 'Canvas tools' });
  await bar.scrollIntoViewIfNeeded();
  await page.waitForTimeout(650); // part spring reaches its final layout
  const box = (await bar.boundingBox())!;
  const x = Math.max(0, box.x - 200);
  const y = Math.max(0, box.y - 200);
  await page.screenshot({ path: `docs/captures/web/${name}.png`, clip: {
    x, y, width: Math.min(640, 1280 - x), height: Math.min(box.y + box.height + 72 - y, 900 - y),
  } });
}

const box = async (l: Locator) => (await l.boundingBox())!;
/** Polls until a key has finished its travel (its box stops moving). */
async function settled(l: Locator) {
  let last = '';
  await expect.poll(async () => { const b = JSON.stringify(await l.boundingBox()); const same = b === last; last = b; return same; }, { intervals: [120] }).toBe(true);
}

for (const colorway of COLORWAYS) {
  test(`Fan: the tool grid, the ink tray and one open cell in ${colorway}`, async ({ page }) => {
    await open(page, '/components/fan', colorway);
    const fan = page.getByRole('toolbar', { name: 'Canvas tools' });
    await expect(fan).toContainText('Canvas');
    await captureFan(page, `fan-rest-${colorway}`);

    // The grid unfolds from the cap, focus on the current (latched) choice.
    const tool = fan.getByRole('button', { name: 'Tool: Select' });
    await tool.focus();
    await page.keyboard.press('Enter');
    await expect(tool).toHaveAttribute('aria-expanded', 'true');
    const select = fan.getByRole('option', { name: 'Select · V' });
    await expect(select).toBeFocused();
    await expect(select).toHaveAttribute('aria-selected', 'true');
    await expect(select).toHaveAttribute('data-pressed', '');
    const opt = (name: string) => fan.getByRole('option', { name });
    await settled(opt('Select · V'));
    await captureFan(page, `fan-picker-${colorway}`);

    // Rows are groups: place / freehand / shapes, the shapes row just above the cap, the cap's column in the grid.
    const cap = await box(tool);
    const [s, w, pen, eraser, line, arrow] = await Promise.all(['Select · V', 'Write · T', 'Pen · P', 'Eraser · E', 'Line · L', 'Arrow · A'].map((n) => box(opt(n))));
    expect(Math.abs(s.y - w.y)).toBeLessThan(2); // the latched key sits one step down
    expect(Math.abs(pen.y - eraser.y)).toBeLessThan(1);
    expect(pen.y).toBeGreaterThan(s.y + s.height - 1);
    expect(line.y).toBeGreaterThan(pen.y + pen.height - 1);
    expect(line.y + line.height).toBeLessThanOrEqual(cap.y + 1);
    expect(Math.abs(arrow.x - cap.x)).toBeLessThan(1);
    expect(eraser.x).toBeGreaterThan(pen.x + 3 * pen.width);
    // Staggered by distance: the key right above the cap leaves first, the far corner last.
    const delay = (n: string) => opt(n).evaluate((el) => parseFloat((el as HTMLElement).style.transitionDelay.match(/calc\((\d+)/)?.[1] ?? '0'));
    expect(await delay('Arrow · A')).toBe(0);
    expect(await delay('Select · V')).toBeGreaterThan(await delay('Pencil · N'));

    // Arrows move in two dimensions; down past the bottom row returns to the cap.
    await page.keyboard.press('ArrowRight');
    await expect(opt('Write · T')).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(opt('Pencil · N')).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(opt('Arrow · A')).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(tool).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(tool).toBeFocused();
    await expect(tool).toHaveAttribute('aria-expanded', 'false');

    // The demo's switcher sits clear of the open grid.
    await tool.click();
    await settled(opt('Select · V'));
    const switcher = await box(page.getByRole('radiogroup', { name: 'Pretend selection' }).or(page.getByLabel('Pretend selection')).first());
    expect(switcher.y).toBeGreaterThan(cap.y + cap.height);

    // Inking: the label is a glyph named Ink; the tray holds two named groups, latched choices, strokes in the ink.
    await opt('Pen · P').click();
    const pen2 = fan.getByRole('button', { name: 'Tool: Pen' });
    await expect(fan.getByRole('img', { name: 'Ink' })).toBeVisible();
    const tray = fan.getByRole('button', { name: 'Ink and width', exact: true });
    await tray.click();
    await expect(tray).toHaveAttribute('aria-expanded', 'true');
    await expect(fan.getByRole('group', { name: 'Ink' })).toBeVisible();
    await expect(fan.getByRole('group', { name: 'Width' })).toBeVisible();
    for (const name of ['Ink: plain', 'Ink: red', 'Ink: blue', 'Ink: green', 'Ink: amber', 'Width: fine', 'Width: regular', 'Width: bold']) {
      await expect(fan.getByRole('button', { name, exact: true })).toBeVisible();
    }
    await fan.getByRole('button', { name: 'Ink: red', exact: true }).click();
    await expect(fan.getByRole('button', { name: 'Ink: red', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(fan.getByRole('button', { name: 'Width: regular', exact: true })).toHaveAttribute('aria-pressed', 'true');
    const bold = fan.getByRole('button', { name: 'Width: bold', exact: true }).locator('span');
    const stroke = () => bold.evaluate((el) => {
      const red = document.createElement('i'); red.style.color = 'var(--mu-r-draw-ink-red)'; document.body.append(red);
      const want = getComputedStyle(red).color; red.remove();
      const cs = getComputedStyle(el);
      return { w: parseFloat(cs.width), h: parseFloat(cs.height), red: cs.backgroundColor === want };
    });
    await expect.poll(stroke).toEqual({ w: 20, h: 10, red: true });
    const fold = fan.getByRole('button', { name: 'Fold Ink and width' });
    await expect(fold.locator('svg')).toHaveCount(1);
    await expect(fold).not.toContainText('‹');
    await page.mouse.move(5, 5);
    await captureFan(page, `fan-ink-${colorway}`);

    // One open: the picker folds the tray; a press outside folds the picker.
    await pen2.click();
    await expect(pen2).toHaveAttribute('aria-expanded', 'true');
    await expect(tray).toHaveAttribute('aria-expanded', 'false');
    await page.mouse.click(5, 5);
    await expect(pen2).toHaveAttribute('aria-expanded', 'false');
    await expect(pen2).toBeFocused();

    await pen2.click();
    await opt('Select · V').click();
    await page.getByText('A text block', { exact: true }).click();
    const textTray = fan.getByRole('button', { name: 'Text actions' });
    await textTray.click();
    for (const name of ['Tasks', 'Summarise', 'Gather', 'Region', 'Export', 'Send away']) {
      await expect(fan.getByRole('button', { name, exact: true })).toBeVisible();
    }
    await captureFan(page, `fan-text-${colorway}`);

    // Reduce Motion: keys appear in their cells without travel.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await fan.getByRole('button', { name: 'Tool: Select' }).click();
    const reducedChoice = opt('Write · T');
    await expect(reducedChoice).toBeVisible();
    const reducedStyle = await reducedChoice.evaluate((el) => ({
      property: getComputedStyle(el).transitionProperty,
      transform: getComputedStyle(el).transform,
    }));
    expect(reducedStyle.property).toBe('opacity');
    expect(reducedStyle.transform).not.toBe('none');
  });
}
