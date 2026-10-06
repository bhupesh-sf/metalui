import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { COLORWAYS, capture, openPage, userEvent } from './harness';

const section = (text: string) => [...document.querySelectorAll('section')].find((s) => s.textContent!.includes(text))!;
const verbs = () => [...document.querySelectorAll<HTMLElement>('[data-testid="strip-canvas"] [role="toolbar"] > [data-verb]')]
  .map((k) => k.dataset.verb).filter((v) => !v!.endsWith('-rule'));

// Tool strip: clicking a kind raises its verbs over it; adding another keeps the verbs they share; arrows move
// between verbs; Send away is set apart and says Undo.
for (const colorway of COLORWAYS) {
  test(`the strip adapts to what was clicked in ${colorway}`, async () => {
    await openPage('/components/tool-strip', colorway);
    await userEvent.click(page.getByRole('button', { name: 'Text block Poster brief' }));
    await expect.poll(verbs).toEqual(['Tasks', 'Summarise', 'Region', 'Rename', 'Gather', 'Export', 'Send away']);
    const strip = page.getByRole('toolbar', { name: 'Tools for Poster brief' });
    await userEvent.click(strip.getByRole('button', { name: 'Tasks' }));
    await userEvent.keyboard('{ArrowRight}');
    await expect.element(strip.getByRole('button', { name: 'Summarise' })).toHaveFocus();
    await userEvent.keyboard('{Shift>}');
    await userEvent.click(page.getByRole('button', { name: 'Image venue.jpg' }));
    await userEvent.keyboard('{/Shift}');
    await expect.poll(verbs).toEqual(['Gather', 'Export', 'Send away']);
    await userEvent.click(page.getByRole('toolbar', { name: 'Tools for 2 things' }).getByRole('button', { name: 'Send away' }));
    await expect.element(page.getByText('Sent away 2 things · Undo')).toBeVisible();
    await capture(`tool-strip-${colorway}`, section('Over a selection'));
  });
}
