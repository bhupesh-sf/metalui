import { expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { COLORWAYS, capture, openPage, until } from './harness';

/* A capture of a region of the window, as Playwright's clip: a transparent frame over it, captured.
 * Local; a harness candidate (capture takes an element only). */
async function captureClip(name: string, clip: { x: number; y: number; width: number; height: number }) {
  const frame = document.createElement('div');
  Object.assign(frame.style, { position: 'fixed', left: `${clip.x}px`, top: `${clip.y}px`, width: `${clip.width}px`, height: `${clip.height}px`, pointerEvents: 'none', zIndex: '2147483647' });
  document.body.append(frame);
  try { await capture(name, frame); } finally { frame.remove(); }
}

// live toasts only: the x-ray section holds a still one with the same part classes
const live = () => [...document.querySelectorAll('.mu-toast:not(#x-ray *)')];
const liveWith = (text: string) => live().find((t) => t.textContent!.includes(text));

// Toast: the result of your own action, one at a time, with Undo that undoes.
for (const colorway of COLORWAYS) {
  test(`act, see the result, undo it in ${colorway}`, async () => {
    await openPage('/components/toast', colorway);
    await userEvent.click(page.getByRole('button', { name: 'Move 3 blocks' }));
    await expect.poll(() => live().length).toBe(1);
    const toast = live()[0];
    await expect.poll(() => toast.textContent).toContain('Moved 3 blocks');
    await Promise.all(toast.getAnimations().map((a) => a.finished));
    await captureClip(`toast-${colorway}`, { x: 340, y: 700, width: 600, height: 180 });
    // One at a time: the next result replaces it.
    await userEvent.click(page.getByRole('button', { name: 'Pin a lens' }));
    await expect.element(page.elementLocator(await until(() => liveWith('Pinned as a live region')))).toBeVisible();
    await userEvent.click(page.getByRole('button', { name: 'Correct a cue' }));
    await userEvent.click(page.elementLocator(await until(() => liveWith('Correction remembered'))).getByRole('button', { name: /Undo/ }));
    await expect.element(page.getByText('Correction forgotten')).toBeVisible();
  });
}
