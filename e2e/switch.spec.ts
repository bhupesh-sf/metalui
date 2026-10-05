import { expect, test } from '@playwright/test';
import { COLORWAYS, open } from './helpers';

// Switch with a label: the words name it, the line under them describes it, and clicking the words toggles it.
for (const colorway of COLORWAYS) {
  test(`a labelled switch is named by its words and toggled by them in ${colorway}`, async ({ page }) => {
    await open(page, '/components/switch', colorway);
    const digests = page.getByRole('switch', { name: 'Email digests', exact: true });
    await expect(digests).toHaveAccessibleDescription('A roundup of what you missed.');
    await expect(digests).not.toBeChecked();
    await page.getByText('Email digests', { exact: true }).click();
    await expect(digests).toBeChecked();
    await page.getByText('A roundup of what you missed.').click();
    await expect(digests).not.toBeChecked();
    await digests.focus();
    await page.keyboard.press('Space');
    await expect(digests).toBeChecked();
  });
}
