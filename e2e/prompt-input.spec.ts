import { expect, test, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Prompt input: a group named "Message" whose well grows from one row; ↩ sends and ⇧↩ breaks the line;
// Send is disabled with nothing to send; while busy Send reads Stop and ⎋ stops; attach (picked, dropped,
// pasted) hands files to the host, which shows them above the well; disabled says why.

const playground = (page: Page) => page.locator('section', { hasText: 'Playground' }).first();

for (const colorway of COLORWAYS) {
  test(`write, send, stop, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/prompt-input', colorway);
    const section = playground(page);
    const input = section.getByRole('group', { name: 'Message' });
    const well = input.getByRole('textbox', { name: 'Message' });
    const send = input.getByRole('button', { name: 'Send' });
    await expect(send).toBeDisabled();

    // The well grows with a new line (⇧↩), and ↩ doesn't break it.
    const h0 = (await well.boundingBox())!.height;
    await well.fill('Draft a release note');
    await well.press('Shift+Enter');
    await well.pressSequentially('and keep it short');
    await expect.poll(async () => (await well.boundingBox())!.height).toBeGreaterThan(h0);
    await expect(send).toBeEnabled();
    await section.screenshot({ path: capture(`prompt-input-${colorway}`) });

    await well.press('Enter');
    await expect(section.getByTestId('sent')).toHaveText('Sent: Draft a release note\nand keep it short');
    await expect(well).toHaveValue('');
    const stop = input.getByRole('button', { name: 'Stop' });
    await expect(stop).toBeEnabled();
    await well.fill('next one');
    await well.press('Enter'); // busy: ↩ doesn't send
    await expect(well).toHaveValue('next one');
    await well.press('Escape');
    await expect(input.getByRole('button', { name: 'Send' })).toBeVisible();
    await expect(well).toBeFocused();
  });
}

test('attach by picking, dropping and pasting; files alone can be sent', async ({ page }) => {
  await open(page, '/components/prompt-input', 'bone');
  const input = playground(page).getByRole('group', { name: 'Message' });
  await input.locator('[data-attach-input]').setInputFiles({ name: 'brief.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF') });
  await expect(input.getByRole('group', { name: 'brief.pdf' })).toBeVisible();
  await expect(input.getByRole('button', { name: 'Send' })).toBeEnabled();

  // A drop on the plate lights its edge while over it, then hands the files over.
  const data = await page.evaluateHandle(() => { const dt = new DataTransfer(); dt.items.add(new File(['x'], 'photo.png', { type: 'image/png' })); return dt; });
  await input.dispatchEvent('dragover', { dataTransfer: data });
  await expect(input).toHaveAttribute('data-over', '');
  await input.dispatchEvent('drop', { dataTransfer: data });
  await expect(input).not.toHaveAttribute('data-over', '');
  await expect(input.getByRole('group', { name: 'photo.png' })).toBeVisible();

  // Pasting a file into the well attaches it.
  await input.getByRole('textbox').evaluate((el) => {
    const dt = new DataTransfer();
    dt.items.add(new File(['y'], 'notes.txt', { type: 'text/plain' }));
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  });
  await expect(input.getByRole('group', { name: 'notes.txt' })).toBeVisible();

  await input.getByRole('button', { name: 'Send' }).click();
  await expect(playground(page).getByTestId('sent')).toHaveText('Sent: + 3 files');
});

test('offline: disabled, and says why', async ({ page }) => {
  await open(page, '/components/prompt-input', 'bone');
  const input = page.locator('#offline').getByRole('group', { name: 'Message' });
  await expect(input.getByRole('textbox')).toBeDisabled();
  await expect(input.getByRole('button', { name: 'Send' })).toBeDisabled();
  await expect(input.getByRole('button', { name: 'Attach files' })).toBeDisabled();
  await expect(input).toContainText("You're offline");
  await expect(input.locator('.mu-led')).toHaveAttribute('data-kind', 'waiting');
});

test('Reduce Motion: Send turns to Stop in place', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/prompt-input', 'bone');
  const input = playground(page).getByRole('group', { name: 'Message' });
  await input.getByRole('textbox').fill('hello');
  await input.getByRole('textbox').press('Enter');
  await expect(input.getByRole('button', { name: 'Stop' })).toBeVisible();
});
