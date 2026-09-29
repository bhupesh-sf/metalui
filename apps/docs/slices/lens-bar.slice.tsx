import { expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { COLORWAYS, capture, openPage } from './harness';

const section = (has: string) => [...document.querySelectorAll('section')].find((s) => s.textContent!.includes(has))!;

// Lens bar (the FilterBar composition): names the question, counts, says the source; switches views;
// close ends it.
for (const colorway of COLORWAYS) {
  test(`switch views and close a lens in ${colorway}`, async () => {
    await openPage('/components/lens-bar', colorway);
    const bar = page.getByRole('toolbar', { name: 'Filter: open tasks about the poster' });
    await expect.poll(() => bar.element().textContent).toContain('open tasks about the poster');
    await expect.poll(() => bar.element().textContent).toContain('6');
    const views = bar.getByRole('radiogroup', { name: 'View' });
    await userEvent.click(views.getByRole('radio').nth(1));
    await expect.element(views.getByRole('radio').nth(1)).toBeChecked();
    await capture(`lens-bar-${colorway}`, section('Playground'));
    await userEvent.click(bar.getByRole('button', { name: 'Close', exact: true }));
    await expect.poll(() => bar.elements().length).toBe(0);
    await expect.element(page.getByText(/Closed\. Use Open again/)).toBeVisible();
    // A selection lens has no pin; the me lens has no views.
    expect(page.getByRole('toolbar', { name: 'Filter: me' }).getByRole('radiogroup').elements()).toHaveLength(0);
  });
}
