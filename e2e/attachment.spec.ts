import { expect, test } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Attachment: a new file lands and uploads to done; a failed one says why and retries; a removed one
// leaves before it goes.
const tray = (page: import('@playwright/test').Page) => page.getByRole('region', { name: 'Attachments', exact: true });

for (const colorway of COLORWAYS) {
  test(`attaches, uploads, fails and retries, removes, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/attachment', colorway);
    const long = tray(page).getByRole('group', { name: /^Tram map of Lisbon/ });
    await expect(long).toContainText('.pdf');
    await expect(long).toContainText('2.5 MB');
    const failed = tray(page).getByRole('group', { name: 'Hotel booking.pdf' });
    await expect(failed.getByRole('alert')).toHaveText('Too large, 25 MB at most');

    await tray(page).getByRole('button', { name: 'Attach a file' }).click();
    const added = tray(page).getByRole('group').last();
    await expect(added.getByRole('progressbar')).toBeVisible();
    await expect(added).toHaveClass(/attachment-land/);
    await expect(added.getByRole('progressbar')).toBeHidden({ timeout: 5000 });
    await page.waitForTimeout(300);
    await tray(page).screenshot({ path: capture(`attachment-${colorway}`) });

    await failed.getByRole('button', { name: 'Try again' }).click();
    await expect(failed.getByRole('alert')).toHaveCount(0);
    await expect(failed.getByRole('progressbar')).toBeVisible();

    await long.getByRole('button', { name: /^Remove Tram map/ }).click();
    await expect(long).toHaveAttribute('data-leaving', '');
    await expect(long).toHaveCount(0);
  });
}
