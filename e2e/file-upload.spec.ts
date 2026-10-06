import { expect, test, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// File upload layouts: an Attachment's picture, tiles with their own ring, a gallery that reorders and
// opens a picture in a dialog, a composer row that counts, a table of files with rings, and an avatar
// upload beside a compact drop zone.
const region = (page: Page, name: string) => page.getByRole('region', { name, exact: true });
const section = (page: Page, id: string) => page.locator(`section#${id}`);

// A real 1×1 PNG, so the picture loads.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

for (const colorway of COLORWAYS) {
  test(`pictures and tiles: a preview, a ring while uploading, a failure that retries, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/attachment', colorway);
    const pictures = region(page, 'Pictures');
    await pictures.scrollIntoViewIfNeeded();
    // The row's picture fills the type well once it loads.
    const row = pictures.getByRole('group', { name: 'Alfama at dusk.png' }).first();
    await expect(row.locator('img.mu-attachment-preview')).toBeVisible();
    // A tile uploading: its picture dims and Progress's ring counts.
    const tram = pictures.getByRole('group', { name: 'Tram 28.jpg' });
    await expect(tram.getByRole('progressbar', { name: 'Uploading Tram 28.jpg' })).toBeVisible();
    await expect(tram.locator('.mu-attachment-window')).toHaveAttribute('data-dim', '');
    // A document tile engraves its extension.
    await expect(pictures.getByRole('group', { name: 'Tickets.pdf' })).toContainText('pdf');
    const failed = pictures.getByRole('group', { name: 'Miradouro.jpg' });
    await expect(failed.getByRole('alert')).toHaveText('Connection lost');
    await expect(tram.getByRole('progressbar')).toBeHidden({ timeout: 6000 });
    await expect(tram).toContainText('2.1 MB');
    await page.waitForTimeout(400);
    await section(page, 'pictures').screenshot({ path: capture(`file-upload-tiles-${colorway}`) });

    await failed.getByRole('button', { name: 'Try again Miradouro.jpg' }).click();
    await expect(failed.getByRole('alert')).toHaveCount(0);
    await expect(failed.getByRole('progressbar')).toBeVisible();

    await pictures.getByRole('button', { name: 'Remove Tickets.pdf' }).click();
    await expect(pictures.getByRole('group', { name: 'Tickets.pdf' })).toHaveCount(0);
  });

  test(`gallery: open a picture, reorder by keys, in ${colorway}`, async ({ page }) => {
    await open(page, '/components/attachment', colorway);
    const gallery = region(page, 'Listing photos');
    await gallery.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await section(page, 'gallery').screenshot({ path: capture(`file-upload-gallery-${colorway}`) });

    // A click on the picture opens it bigger.
    await gallery.getByRole('group', { name: 'Kitchen.jpg' }).locator('.mu-attachment-window').click();
    const dialog = page.getByRole('dialog', { name: 'Kitchen.jpg' });
    await expect(dialog.getByRole('img', { name: 'Kitchen.jpg' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    // The open key is the keyboard's way in.
    await gallery.getByRole('button', { name: 'Open Bedroom.jpg' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: 'Bedroom.jpg' })).toBeVisible();
    await page.keyboard.press('Escape');

    // Space lifts the first photo, → moves it one place, Space drops it.
    const list = gallery.getByRole('list', { name: 'Photo order' });
    const first = list.getByRole('listitem').first();
    await first.focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Space');
    await expect(list.getByRole('listitem').first().getByRole('group')).toHaveAccessibleName('Kitchen.jpg');
    await expect(list.getByRole('listitem').nth(1).getByRole('group')).toHaveAccessibleName('Living room.jpg');
  });
}

test('gallery: dropped images arrive as tiles with their own ring, then their picture', async ({ page }) => {
  await open(page, '/components/attachment', 'bone');
  const gallery = region(page, 'Listing photos');
  await gallery.getByLabel('Add photos').setInputFiles([{ name: 'Terrace.png', mimeType: 'image/png', buffer: PNG }]);
  const tile = gallery.getByRole('group', { name: 'Terrace.png' });
  await expect(tile.getByRole('progressbar', { name: 'Uploading Terrace.png' })).toBeVisible();
  await expect(tile.locator('img.mu-attachment-preview')).toBeVisible();
  await expect(tile.getByRole('progressbar')).toBeHidden({ timeout: 6000 });
});

test('composer row: four thumbnails, the rest counted, the total said', async ({ page }) => {
  await open(page, '/components/attachment', 'bone');
  const composer = region(page, 'Message attachments');
  await composer.scrollIntoViewIfNeeded();
  await expect(composer.getByRole('group')).toHaveCount(4);
  await expect(composer.getByRole('img', { name: '2 more' })).toBeVisible();
  await expect(composer.locator('.mu-attachment-count')).toContainText('6 files · 13 MB');
  // A compact tile is the window alone; its name and size are its title.
  await expect(composer.getByRole('group', { name: 'Tram 28.jpg' })).toHaveAttribute('title', 'Tram 28.jpg · 2.1 MB');
  await page.waitForTimeout(400);
  await section(page, 'composer').screenshot({ path: capture('file-upload-composer-bone') });
  await composer.getByRole('button', { name: 'Remove Alfama at dusk.png' }).click();
  await expect(composer.getByRole('img', { name: '1 more' })).toBeVisible();
  await expect(composer.locator('.mu-attachment-count')).toContainText('5 files');
});

test('table of files: a ring per row that fills, fails and ticks', async ({ page }) => {
  await open(page, '/components/attachment', 'graphite');
  const uploads = region(page, 'Uploads');
  await uploads.scrollIntoViewIfNeeded();
  await expect(uploads.getByRole('progressbar', { name: 'Q3 report.pdf: Uploaded' })).toHaveAttribute('data-progress', 'complete');
  await expect(uploads.getByRole('progressbar', { name: /^Board deck\.key: Uploading/ })).toHaveAttribute('data-progress', 'running');
  const recording = uploads.getByRole('progressbar', { name: 'Recording.mov: Failed: Connection lost' });
  await expect(recording).toHaveAttribute('data-progress', 'failed', { timeout: 6000 });
  await expect(uploads.getByRole('row', { name: /Recording\.mov/ })).toContainText('Failed: Connection lost');
  await page.waitForTimeout(400);
  await section(page, 'table').screenshot({ path: capture('file-upload-table-graphite') });
});

test('avatar upload: the photo shows at once, waits while it uploads, and can be removed', async ({ page }) => {
  await open(page, '/components/drop-zone', 'bone');
  const photo = region(page, 'Profile photo');
  await photo.scrollIntoViewIfNeeded();
  const avatar = photo.getByRole('img', { name: 'Ana Rocha' });
  await expect(avatar).toContainText('AR');
  await photo.getByLabel('Add a photo').setInputFiles([{ name: 'Me.png', mimeType: 'image/png', buffer: PNG }]);
  await expect(avatar.locator('img')).toBeVisible();
  await expect(avatar).toHaveAttribute('aria-busy', 'true');
  await expect(avatar).not.toHaveAttribute('aria-busy', 'true', { timeout: 5000 });
  await expect(photo.getByLabel('Replace your photo')).toBeAttached();
  await page.waitForTimeout(300);
  await section(page, 'avatar').screenshot({ path: capture('file-upload-avatar-bone') });
  await photo.getByLabel('Replace your photo').setInputFiles([{ name: 'Big.png', mimeType: 'image/png', buffer: Buffer.alloc(2_100_000) }]);
  await expect(photo.getByRole('alert')).toContainText('Big.png is larger than 2 MB');
  await photo.getByRole('button', { name: 'Remove photo' }).click();
  await expect(avatar.locator('img')).toHaveCount(0);
  await expect(photo.getByLabel('Add a photo')).toBeAttached();
});

test('reduced motion: a tile appears and goes at once; the ring still fills', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/components/attachment', 'graphite');
  const pictures = region(page, 'Pictures');
  await pictures.getByRole('button', { name: 'Upload a photo' }).click();
  const tile = pictures.getByRole('group').last();
  expect(await tile.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
  await expect(tile.getByRole('progressbar')).toBeVisible();
  await page.waitForTimeout(400);
  await section(page, 'pictures').screenshot({ path: capture('file-upload-tiles-reduced-graphite') });
});
