import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { COLORWAYS, capture, openPage } from './harness';

const section = (text: string) => [...document.querySelectorAll('section')].find((s) => s.textContent!.includes(text))!;

// LEDs, status badges and keycaps: the state is in words for assistive tech, and a key speaks its name.
for (const colorway of COLORWAYS) {
  test(`status and keys read as words in ${colorway}`, async () => {
    await openPage('/components/status', colorway);
    const badges = page.getByRole('status');
    expect(badges.elements().length).toBeGreaterThan(0);
    expect(badges.first().element().textContent!.trim()).not.toBe('');
    await capture(`status-${colorway}`, section('LEDs and badges'));
    await openPage('/components/kbd', colorway);
    await expect.element(page.elementLocator(document.querySelector('kbd[aria-label="Command K"]')!)).toBeVisible();
    await capture(`kbd-${colorway}`, section('Where keys sit'));
  });
}
