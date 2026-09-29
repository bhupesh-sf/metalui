import { expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { COLORWAYS, capture, openPage } from './harness';

/** The large day in a colorway's bench. (Scoped by the bench's test id: a locator made from the section
 *  itself goes by its label, which holds the ticking clock.) The tile holds no image or tear button of its own. */
const dayOf = (colorway: string) => page.getByTestId(`day-${colorway}`);

// The Day object on Components › Day: the page, the year and the line; tearing moves to the next
// day; reduced motion tears at once.
for (const colorway of COLORWAYS) {
  test(`day widget in ${colorway}`, async () => {
    await openPage('/components/day', colorway);
    const day = dayOf(colorway);
    await expect.element(day.getByRole('img', { name: /^Day \d+ of 36[56]: \d+ days left$/ })).toBeVisible();
    expect(day.element().querySelector('section.mu-day blockquote')!.textContent).not.toBe('');
    expect(page.getByTestId(`day-${colorway}`).element().querySelectorAll('section.mu-day-tile')).toHaveLength(1);
    await capture(`day-${colorway}`, page.getByTestId(`day-${colorway}`).element());
  });
}

test('tearing the page shows the next day', async () => {
  await openPage('/components/day', 'bone');
  const day = dayOf('bone');
  const tear = day.getByRole('button', { name: /Tear off this page/ });
  const before = tear.element().getAttribute('aria-label');
  const next = before!.match(/go to (.+)\.$/)![1];
  await userEvent.click(tear);
  await expect.poll(() => day.getByRole('button', { name: /Tear off this page/ }).element().getAttribute('aria-label')).toMatch(new RegExp(`^${next.split(' ')[0]} `));
  await expect.element(page.getByText(/^Torn off; now showing/)).toBeVisible();
});

test('reduced motion tears at once', async () => {
  await openPage('/components/day', 'graphite', { media: { 'prefers-reduced-motion': 'reduce' } });
  const day = dayOf('graphite');
  const tear = day.getByRole('button', { name: /Tear off this page/ });
  const next = tear.element().getAttribute('aria-label')!.match(/go to (\w+) /)![1];
  await userEvent.click(tear);
  await expect.poll(() => day.getByRole('button', { name: /Tear off this page/ }).element().getAttribute('aria-label')).toMatch(new RegExp(`^${next} `));
});
