import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { COLORWAYS, capture, openPage, userEvent } from './harness';

const section = (text: string) => [...document.querySelectorAll('section')].find((s) => s.textContent!.includes(text))!;

// Tool strip: verbs over a selection; arrows move between them; Send away is set apart and says Undo.
for (const colorway of COLORWAYS) {
  test(`run a verb over a selection in ${colorway}`, async () => {
    await openPage('/components/tool-strip', colorway);
    const strip = page.getByRole('toolbar', { name: 'Tools for 3 blocks' });
    await userEvent.click(strip.getByRole('button', { name: 'Summarise' }));
    await expect.poll(() => section('Over a selection').textContent).toContain('Summarise');
    await userEvent.keyboard('{ArrowRight}');
    await expect.element(strip.getByRole('button', { name: 'Gather' })).toHaveFocus();
    await userEvent.click(strip.getByRole('button', { name: 'Send away' }));
    await expect.element(page.getByText('Sent away 3 blocks · Undo')).toBeVisible();
    await capture(`tool-strip-${colorway}`, section('Over a selection'));
  });
}
