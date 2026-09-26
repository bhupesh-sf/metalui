import { expect, test } from '@playwright/test';
import { COLORWAYS, open } from './helpers';

async function captureFan(page: import('@playwright/test').Page, name: string) {
  await page.waitForTimeout(650); // part spring reaches its final layout
  const box = (await page.getByRole('toolbar', { name: 'Canvas tools' }).boundingBox())!;
  const x = Math.max(0, box.x - 160);
  const y = Math.max(0, box.y - 450);
  await page.screenshot({ path: `docs/captures/web/${name}.png`, clip: {
    x, y, width: Math.min(640, 1280 - x), height: Math.min(box.y + box.height + 16 - y, 900 - y),
  } });
}

for (const colorway of COLORWAYS) {
  test(`Fan opens one cell and folds with keyboard and outside press in ${colorway}`, async ({ page }) => {
    await open(page, '/components/fan', colorway);
    const fan = page.getByRole('toolbar', { name: 'Canvas tools' });
    await expect(fan).toContainText('Canvas');
    await captureFan(page, `fan-rest-${colorway}`);

    const tool = fan.getByRole('button', { name: 'Tool: Select' });
    await tool.focus();
    await page.keyboard.press('Enter');
    await expect(tool).toHaveAttribute('aria-expanded', 'true');
    await expect(fan.getByRole('option', { name: 'Write · T' })).toBeFocused();
    await captureFan(page, `fan-picker-${colorway}`);
    await page.keyboard.press('ArrowUp');
    await expect(fan.getByRole('option', { name: 'Region · ⌥-drag' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(tool).toBeFocused();
    await expect(tool).toHaveAttribute('aria-expanded', 'false');

    await tool.click();
    await fan.getByRole('option', { name: 'Pen · P' }).click();
    const pen = fan.getByRole('button', { name: 'Tool: Pen' });
    const ink = fan.getByRole('button', { name: 'Ink', exact: true }).first();
    await ink.click();
    await expect(ink).toHaveAttribute('aria-expanded', 'true');
    for (const name of ['Red', 'Blue', 'Green', 'Amber', 'Fine', 'Regular', 'Bold']) {
      await expect(fan.getByRole('button', { name, exact: true })).toBeVisible();
    }
    await captureFan(page, `fan-ink-${colorway}`);
    await pen.click();
    await expect(pen).toHaveAttribute('aria-expanded', 'true');
    await expect(ink).toHaveAttribute('aria-expanded', 'false');
    await page.mouse.click(5, 5);
    await expect(pen).toHaveAttribute('aria-expanded', 'false');
    await expect(pen).toBeFocused();

    await pen.click();
    await fan.getByRole('option', { name: 'Select · V' }).click();
    await page.getByText('A text block', { exact: true }).click();
    const textTray = fan.getByRole('button', { name: 'Text actions' });
    await textTray.click();
    for (const name of ['Tasks', 'Summarise', 'Gather', 'Region', 'Export', 'Send away']) {
      await expect(fan.getByRole('button', { name, exact: true })).toBeVisible();
    }
    await captureFan(page, `fan-text-${colorway}`);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await fan.getByRole('button', { name: 'Tool: Select' }).click();
    const reducedChoice = fan.getByRole('option', { name: 'Write · T' });
    await expect(reducedChoice).toBeVisible();
    const reducedStyle = await reducedChoice.evaluate((el) => ({
      property: getComputedStyle(el).transitionProperty,
      transform: getComputedStyle(el).transform,
    }));
    expect(reducedStyle.property).toBe('opacity');
    expect(reducedStyle.transform).not.toBe('none');
  });
}
