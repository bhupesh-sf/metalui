# Feature slices

A slice proves what a person can see and do on the docs site, through the site itself: a real Chrome page, the site's own route table mounted at a route, real mouse and keys. Vitest runs them in browser mode with WebdriverIO. No Playwright.

```bash
npm run slices                 # every slice, headless
npm run slices -- button       # the slices whose file names match
npm run slices:watch -w @metalui/docs   # re-run what an edit touches, in a visible browser
CAPTURE=1 npm run slices       # also write the docs captures (docs/captures/web)
```

Slices take turns (one real mouse, one window) and share one page, so the site's modules and stylesheet load once per run. `openPage` starts every slice clean: it remounts the site, restores the desktop window (1280 × 900) and clears emulated media.

## Writing one

One file per component, `<name>.slice.tsx`, the component's page as the boundary. Test what a person sees and does, never the implementation. Read real values from `tokens/tokens.json`; never type a number the recipe owns.

```tsx
import { expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { COLORWAYS, openPage, press, release } from './harness';

for (const colorway of COLORWAYS) {
  test(`… in ${colorway}`, async () => {
    await openPage('/components/button', colorway);
    const button = page.getByRole('button', { name: 'Cancel' }).first();
    await userEvent.hover(button);
    await expect.element(button).toBeVisible();
  });
}
```

## The harness (`harness.tsx`)

| | |
|---|---|
| `openPage(path, colorway, { media, viewport, reload })` | Mount the site at a route, fresh: storage cleared, colorway set before the mount, settled (scroll restoration done). `media: { 'prefers-reduced-motion': 'reduce' }`, `viewport: [375, 812]`, `reload: true` keeps storage, like a page reload. |
| `press(el, [dx, dy])`, `release(el)` | A real held press at an element's centre (or an offset from it): CSS `:active`, pointer capture. |
| `pointer(el, steps)` | Real mouse steps relative to an element's centre, in one call: `{ to: [dx, dy], ms }`, `{ down: true }`, `{ up: true }`, `{ pause: ms }`. |
| `mouse.move(x, y, { steps })`, `mouse.down()`, `mouse.up()` | The mouse in page coordinates (clientX/clientY). The button stays held between calls. |
| `mouse.drag(from, to, { steps, hold })` | A whole drag in one call. Use it whenever the page captures the pointer: Chrome drops pointer capture at the end of every WebDriver call (the button stays held, the capture does not). To look mid-drag, start it, check during `hold`, then await it. |
| `until(read)` | Wait for something the page reaches on its own. |
| `sleep(ms)` | Only for a real duration a slice is about (a delay, a hold). |
| `capture(name, el)` | A docs capture, written only with `CAPTURE=1`. |

From `vitest/browser`: `page.getByRole / getByText / getByTestId / getByLabelText` (locators: `.element()`, `.elements()`, `.first()`, `.last()`, `.nth(i)`), `userEvent.click / hover / keyboard / type / fill / tab`, `expect.element(locator).toBeVisible() / toHaveTextContent() / toHaveAttribute() / toBeDisabled() / toHaveFocus()`, `expect.poll(fn)`.

A slice runs inside the page, so read the page directly: `el.getBoundingClientRect()`, `getComputedStyle(el)`, `el.getAnimations()`. Time-dependent behaviour (a flick, a delay) runs on a clock the slice controls (`vi.useFakeTimers({ toFake: ['performance', 'requestAnimationFrame', 'setTimeout'] })`) or is timed inside the page, never by sleeping and hoping.

## Porting a Playwright spec

| Playwright (`e2e/*.spec.ts`) | Slice |
|---|---|
| `open(page, path, colorway)` | `await openPage(path, colorway)` |
| `page.emulateMedia({ reducedMotion: 'reduce' })` then `open` | `openPage(path, colorway, { media: { 'prefers-reduced-motion': 'reduce' } })` |
| `page.setViewportSize({ width, height })` | `openPage(…, { viewport: [width, height] })` |
| `page.getByRole(…)`, `getByTestId`, `getByText` | the same on `page` from `vitest/browser` |
| `page.locator(css)` | `page.elementLocator(el)`, or `document.querySelector(css)` for a plain read |
| `locator.boundingBox()` | `el.getBoundingClientRect()` |
| `locator.evaluate(fn)` | call `fn(el)` |
| `page.evaluate(fn)` | call `fn()` |
| `expect(locator).toHaveText(t)` | `await expect.element(locator).toHaveTextContent(t)` |
| `expect(locator).toHaveCount(n)` | `await expect.poll(() => locator.elements().length).toBe(n)` |
| `locator.click()` / `.hover()` | `await userEvent.click(locator)` / `await userEvent.hover(locator)` |
| `page.keyboard.press('ArrowUp')` | `await userEvent.keyboard('{ArrowUp}')` (`'{Shift>}{Enter}{/Shift}'` for chords) |
| `page.keyboard.type('abc')` | `await userEvent.keyboard('abc')` |
| `page.mouse.move/down/up` | `mouse.move(x, y, { steps })`, `mouse.down()`, `mouse.up()`; a drag the page captures (a handle, a block, a slider thumb) is one `mouse.drag(from, to, { hold })` |
| `page.waitForTimeout(ms)` | `await sleep(ms)` only when the wait is the point; otherwise `until`/`expect.poll` |
| `page.clock.install()` / `runFor(ms)` | `vi.useFakeTimers({ toFake: [...] })` / `vi.advanceTimersByTime(ms)` |
| `page.screenshot({ path: capture(name) })` | `await capture(name, el)` |
