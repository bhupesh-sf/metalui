import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { COLORWAYS, capture, openPage, pointer, sleep, until, userEvent, emulateMedia, mouse } from './harness';

declare const __CAPTURE__: boolean;

/** A point in the window, as WebDriver's offset from the page's middle. */

/**
 * A capture of a region of the window: a transparent pane over it, captured as an element. (Local: the
 * harness's capture takes an element, and the fan's capture is the region around the toolbar.)
 */
async function captureRect(name: string, clip: { x: number; y: number; width: number; height: number }) {
  const pane = document.createElement('div');
  Object.assign(pane.style, { position: 'fixed', left: `${clip.x}px`, top: `${clip.y}px`, width: `${clip.width}px`, height: `${clip.height}px`, pointerEvents: 'none', zIndex: '2147483647' });
  document.body.append(pane);
  try { await capture(name, pane); } finally { pane.remove(); }
}

/**
 * Clicks once the target is ready for it, as Playwright's click waits (actionability): its box the same
 * over consecutive frames, and the target the one a click at its centre would hit. A cell of the fan
 * springs open from under the tool, so a click too soon lands on its neighbour. (Local; a harness candidate.)
 */
async function clickStill(locator: ReturnType<typeof page.getByRole>) {
  const el = await until(() => locator.query());
  let last = '';
  await until(() => {
    const r = el.getBoundingClientRect(), now = `${r.x},${r.y},${r.width},${r.height}`, still = now === last;
    last = now;
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return still && !!hit && el.contains(hit);
  });
  await userEvent.click(locator);
}

async function captureFan(name: string) {
  if (!__CAPTURE__) return;
  const bar = page.getByRole('toolbar', { name: 'Canvas tools' }).element();
  bar.scrollIntoView({ block: 'nearest' });
  await sleep(650); // part spring reaches its final layout
  const box = bar.getBoundingClientRect();
  const x = Math.max(0, box.x - 160);
  const y = Math.max(0, box.y - 450);
  await captureRect(name, { x, y, width: Math.min(640, 1280 - x), height: Math.min(box.y + box.height + 16 - y, 900 - y) });
}

for (const colorway of COLORWAYS) {
  test(`Fan opens one cell and folds with keyboard and outside press in ${colorway}`, async () => {
    await openPage('/components/fan', colorway);
    const fan = page.getByRole('toolbar', { name: 'Canvas tools' });
    await expect.poll(() => fan.element().textContent).toContain('Canvas');
    await captureFan(`fan-rest-${colorway}`);

    const tool = fan.getByRole('button', { name: 'Tool: Select' });
    (tool.element() as HTMLElement).focus();
    await userEvent.keyboard('{Enter}');
    await expect.element(tool).toHaveAttribute('aria-expanded', 'true');
    await expect.element(fan.getByRole('option', { name: 'Write · T' })).toHaveFocus();
    await captureFan(`fan-picker-${colorway}`);
    await userEvent.keyboard('{ArrowUp}');
    await expect.element(fan.getByRole('option', { name: 'Region · ⌥-drag' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await expect.element(tool).toHaveFocus();
    await expect.element(tool).toHaveAttribute('aria-expanded', 'false');

    await clickStill(tool);
    await clickStill(fan.getByRole('option', { name: 'Pen · P' }));
    const pen = fan.getByRole('button', { name: 'Tool: Pen' });
    const ink = fan.getByRole('button', { name: 'Ink', exact: true }).first();
    await clickStill(ink);
    await expect.element(ink).toHaveAttribute('aria-expanded', 'true');
    for (const name of ['Red', 'Blue', 'Green', 'Amber', 'Fine', 'Regular', 'Bold']) {
      await expect.element(fan.getByRole('button', { name, exact: true })).toBeVisible();
    }
    await captureFan(`fan-ink-${colorway}`);
    await clickStill(pen);
    await expect.element(pen).toHaveAttribute('aria-expanded', 'true');
    await expect.element(ink).toHaveAttribute('aria-expanded', 'false');
    await mouse.click(5, 5);
    await expect.element(pen).toHaveAttribute('aria-expanded', 'false');
    await expect.element(pen).toHaveFocus();

    await clickStill(pen);
    await clickStill(fan.getByRole('option', { name: 'Select · V' }));
    await clickStill(page.getByText('A text block', { exact: true }));
    const textTray = fan.getByRole('button', { name: 'Text actions' });
    await clickStill(textTray);
    for (const name of ['Tasks', 'Summarise', 'Gather', 'Region', 'Export', 'Send away']) {
      await expect.element(fan.getByRole('button', { name, exact: true })).toBeVisible();
    }
    await captureFan(`fan-text-${colorway}`);
    await emulateMedia({ 'prefers-reduced-motion': 'reduce' });
    await clickStill(fan.getByRole('button', { name: 'Tool: Select' }));
    const reducedChoice = fan.getByRole('option', { name: 'Write · T' });
    await expect.element(reducedChoice).toBeVisible();
    const style = getComputedStyle(reducedChoice.element());
    expect(style.transitionProperty).toBe('opacity');
    expect(style.transform).not.toBe('none');
  });
}
