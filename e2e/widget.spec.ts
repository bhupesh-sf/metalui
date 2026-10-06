import { expect, test, type Page } from '@playwright/test';
import { COLORWAYS, capture, open } from './helpers';

// Widget: model JSON rendered with our components. A booking reply hands its action and the field values
// to the host; the editor follows the JSON as it is typed; hostile JSON runs nothing, follows no
// javascript: URL, pollutes no prototype and throws nothing; the published schema is served.

/** Fails the test on any page error or dialog (an alert() that got through). */
function guard(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => { errors.push(`dialog: ${d.message()}`); void d.dismiss(); });
  return errors;
}

async function setJson(page: Page, json: unknown) {
  const box = page.getByLabel('Widget JSON');
  await box.fill(typeof json === 'string' ? json : JSON.stringify(json));
}

for (const colorway of COLORWAYS) {
  test(`a booking reply hands Book and the values to the host, in ${colorway}`, async ({ page }) => {
    const errors = guard(page);
    await open(page, '/components/widget', colorway);
    const reply = page.getByTestId('widget-reply');
    await expect(reply.locator('article h3')).toHaveText('Table for 2, Friday');
    await expect(reply.locator('dl dt')).toHaveText(['Guests', 'Deposit (€)']);
    await expect(reply.getByText('Day', { exact: true })).toBeVisible();
    await reply.getByLabel('Name on the booking').fill('Ana Duarte');
    await reply.getByRole('button', { name: 'Book' }).click();
    const log = page.getByTestId('widget-log').first();
    await expect(log).toContainText('"name":"book"');
    await expect(log).toContainText('"venue":"casa-lume"');
    await expect(log).toContainText('"day":"2026-10-09"');
    await expect(log).toContainText('"time":"20:30"');
    await expect(log).toContainText('"guest":"Ana Duarte"');
    // keys keep their own width in the column
    const key = await reply.getByRole('button', { name: 'Book' }).boundingBox();
    const card = await reply.locator('article').boundingBox();
    expect(key!.width).toBeLessThan(card!.width / 2);
    expect(errors).toEqual([]);
    await page.locator('section', { hasText: 'Playground' }).first().screenshot({ path: capture(`widget-${colorway}`) });
  });
}

test('the editor follows the JSON: a list whose items are keys', async ({ page }) => {
  const errors = guard(page);
  await open(page, '/components/widget', 'bone');
  const live = page.getByTestId('widget-live');
  await setJson(page, { type: 'List', label: 'Flights', children: [{ type: 'ListItem', text: 'TP 1944', badge: '€49', action: { type: 'action', name: 'pick', payload: { flight: 'TP1944' } } }, { type: 'ListItem', text: 'FR 8312' }] });
  await expect(live.getByRole('list', { name: 'Flights' }).locator('> li')).toHaveCount(2);
  await live.getByRole('button', { name: /TP 1944/ }).click();
  await expect(page.getByTestId('widget-log').last()).toContainText('"flight":"TP1944"');
  await setJson(page, [{ type: 'Progress', label: 'Imported', value: 38 }, { type: 'Meter', label: 'Storage', value: 71 }, { type: 'Alert', kind: 'failed', title: 'Import stopped' }]);
  await expect(live.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '38');
  await expect(live.getByRole('meter')).toHaveAttribute('aria-valuenow', '71');
  await expect(live.getByText('Import stopped')).toBeVisible();
  expect(errors).toEqual([]);
});

test('hostile JSON runs nothing, links nowhere unsafe and throws nothing', async ({ page }) => {
  const errors = guard(page);
  await open(page, '/components/widget', 'graphite');
  const live = page.getByTestId('widget-live');
  await setJson(page, [
    { type: 'Script', src: 'https://evil.example/x.js' },
    { type: '__proto__', polluted: true },
    { type: 'constructor' },
    { type: 'Card', title: 'Click me', href: 'javascript:alert(1)', description: '<img src=x onerror=alert(1)>' },
    { type: 'Card', title: 'Data', href: 'data:text/html,<script>alert(1)</script>' },
    { type: 'Markdown', text: 'A [relative](/admin/delete), a [script](javascript:alert(1)), [data](data:text/html,hi) and [safe](https://metalui.dev).' },
    { type: 'Button', label: 'Run', onClick: 'alert(1)', dangerouslySetInnerHTML: { __html: '<b>x</b>' }, action: { type: 'action', name: 'run', payload: { ok: true } } },
    { type: 'ListItem', text: 'Outside a list' },
    { type: 'Meter', label: 'No value' },
    { type: 'Card', title: 'Bad footer', footer: [{ type: 'Card', title: 'Not a button' }] },
  ]);
  await expect(live.locator('[data-widget-fallback]')).toHaveCount(6); // Script, __proto__, constructor, the ListItem, the Meter, the footer's Card (the cards with unsafe hrefs stay, without the link)
  await expect(live.locator('a[href^="javascript"], a[href^="data"], a[href^="/"], script, img, b')).toHaveCount(0);
  await expect(live.getByText('<img src=x onerror=alert(1)>')).toBeVisible(); // text, not HTML
  await expect(live.locator('a', { hasText: 'safe' })).toHaveAttribute('href', 'https://metalui.dev');
  await expect(live.getByText('relative', { exact: false })).toBeVisible();
  await live.getByRole('button', { name: 'Run' }).click();
  await expect(page.getByTestId('widget-log').last()).toContainText('"payload":{"ok":true}');
  await expect(page.getByTestId('widget-issues')).toContainText('unknown node "Script"');
  expect(await page.evaluate(() => ({} as Record<string, unknown>).polluted)).toBeUndefined();
  expect(errors).toEqual([]);
  await page.getByTestId('widget-editor').screenshot({ path: capture('widget-hostile-graphite') });
});

test('invalid JSON, too deep and too many: a fallback, never a throw', async ({ page }) => {
  const errors = guard(page);
  await open(page, '/components/widget', 'bone');
  const live = page.getByTestId('widget-live');
  await setJson(page, '{ "type": "Card", "title": ');
  await expect(live.locator('[data-widget-fallback]')).toHaveCount(1);
  let deep: Record<string, unknown> = { type: 'Badge', text: 'bottom' };
  for (let i = 0; i < 20; i++) deep = { type: 'Card', title: `Level ${20 - i}`, children: [deep] };
  await setJson(page, deep);
  await expect(live.locator('article')).toHaveCount(8);
  await expect(live.locator('[data-widget-fallback]')).toHaveCount(1);
  await setJson(page, Array.from({ length: 500 }, (_, i) => ({ type: 'Badge', text: `b${i}` })));
  await expect(live.locator('.mu-badge, [data-widget-fallback]')).toHaveCount(100); // an array holds 100 at most
  expect(errors).toEqual([]);
});

test('the schema is published beside AI.md', async ({ request }) => {
  const res = await request.get('/widgets.schema.json');
  expect(res.ok()).toBe(true);
  const schema = await res.json();
  expect(schema.$defs.Card.required).toEqual(['type', 'title']);
  expect(schema.$defs.Card.properties.href.pattern).toBe('^(https?:|mailto:)');
  expect(Object.keys(schema.$defs)).toEqual(expect.arrayContaining(['Card', 'List', 'ListItem', 'Badge', 'Button', 'Field', 'Select', 'DatePicker', 'Properties', 'Markdown', 'Progress', 'Meter', 'Alert', 'action']));
  expect(await (await request.get('/llms.txt')).text()).toContain('/widgets.schema.json');
});

test('under Reduce Motion the widget renders whole; at 375 nothing scrolls sideways', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 375, height: 800 });
  await open(page, '/components/widget', 'bone');
  await expect(page.getByTestId('widget-reply').locator('article h3')).toHaveText('Table for 2, Friday');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await page.locator('section', { hasText: 'Playground' }).first().screenshot({ path: capture('widget-375-bone') });
});
