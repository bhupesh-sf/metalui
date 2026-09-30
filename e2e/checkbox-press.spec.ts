import { expect, test } from '@playwright/test';
import { COLORWAYS, open } from './helpers';

// Checkbox press: the press points at the result. Unticked, the well takes the dark on look while held;
// ticked, it goes light; releasing commits and dragging off cancels. A checkbox group's row presses
// the same from anywhere on the row.
const wellBg = (el: import('@playwright/test').Locator) => el.evaluate((e) => getComputedStyle(e).backgroundImage);

for (const colorway of COLORWAYS) {
  test(`press previews, release commits, drag-off cancels, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/checkbox-group', colorway);
    const group = page.getByRole('group', { name: 'Export contents', exact: true });
    const photos = group.getByRole('checkbox').nth(2);
    const notes = group.getByRole('checkbox').nth(1);
    const rest = await wellBg(photos);
    const on = await wellBg(notes);

    // Held on an unticked box: the on look; dragged off: nothing changes.
    const b = (await photos.boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await expect.poll(() => wellBg(photos)).toBe(on);
    await page.mouse.move(b.x + 300, b.y + 200, { steps: 4 });
    await page.mouse.up();
    await expect(photos).not.toBeChecked();
    await expect.poll(() => wellBg(photos)).toBe(rest);

    // Held on a ticked box's label: it goes light; released, it unticks.
    const label = group.getByText('Notes', { exact: true });
    const l = (await label.boundingBox())!;
    await page.mouse.move(l.x + 4, l.y + l.height / 2);
    await page.mouse.down();
    await expect.poll(() => wellBg(notes)).toBe(rest);
    await page.mouse.up();
    await expect(notes).not.toBeChecked();
  });
}
