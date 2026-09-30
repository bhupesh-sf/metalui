import { afterEach, beforeEach, expect, onTestFinished, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import { COLORWAYS, capture, openPage, pointer, until, userEvent } from './harness';

// The sound foundation (tokens.sound), as a reader meets it on Foundations → Sound:
// off until asked, acts and states obey the Plays setting, a muted material stays
// silent, the beeper lights its lamp, and the settings (never "on") are remembered.
const last = () => page.getByTestId('sound-last');
const lastText = () => (last().element().textContent ?? '').replace(/\s+/g, ' ').trim();
const settings = () => page.getByTestId('sound-settings');
/** A strike, as Playwright's dispatchEvent('pointerdown') sends it. */
const strike = (m: string) => document.querySelector(`[data-sound-material="${m}"]`)!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, composed: true }));
/** A Base UI switch by its aria-label: the locator engine's role query does not name these (harness candidate). */
const toggle = (name: string) => page.elementLocator(document.querySelector(`[role="switch"][aria-label="${name}"]`)!);
const stoneBox = () => page.elementLocator([...document.querySelectorAll('label')].find((l) => l.textContent?.includes('Stone'))!).getByRole('checkbox');
// Each test starts as a fresh browser would: nothing remembered (the shared page keeps storage between slices).
beforeEach(() => { localStorage.removeItem('mu-sound'); });
afterEach(() => { vi.useRealTimers(); });

test('sound is off until the person turns it on', async () => {
  await openPage('/foundations/sound', 'bone');
  await expect.element(settings()).toHaveAttribute('data-on', 'false');

  strike('clay');
  await expect.poll(lastText).toMatch(/Clay · \d+ Hz · silent \(sound is off\)/);

  await userEvent.click(toggle('Sound'));
  await expect.element(settings()).toHaveAttribute('data-on', 'true');
  strike('clay');
  await expect.poll(lastText).toMatch(/^Clay · \d+ Hz · peak -?\d+(\.\d)? dBFS$/);
});

test('each material strikes at its own pitch', async () => {
  await openPage('/foundations/sound', 'bone');
  await userEvent.click(toggle('Sound'));
  const hz = async (m: string) => {
    strike(m);
    const name = m[0].toUpperCase() + m.slice(1);
    await expect.poll(lastText).toContain(name);
    return Number(lastText().match(/(\d+) Hz/)![1]);
  };
  // Glass tinks high, metal clangs low: the two the owner heard as too alike must stay apart.
  const glass = await hz('glass'), metal = await hz('metal');
  expect(glass).toBeGreaterThan(metal * 2.2);
  expect(await hz('ceramic')).toBeGreaterThan(await hz('clay'));
});

test('states only silences acts but not the beeper, whose lamp lights', async () => {
  await openPage('/foundations/sound', 'graphite');
  await userEvent.click(toggle('Sound'));
  await userEvent.click(page.getByRole('radio', { name: 'States only' }));
  await expect.element(settings()).toHaveAttribute('data-plays', 'states');

  strike('metal');
  await expect.poll(lastText).toMatch(/Metal · \d+ Hz · silent \(states only\)/);

  const done = document.querySelector('[data-earcon="done"]')!;
  // The lamp's light is timed by the page: run on a clock the slice controls.
  const now = performance.now();
  vi.useFakeTimers({ toFake: ['performance', 'requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
  vi.advanceTimersByTime(now);
  await userEvent.click(page.elementLocator(done));
  await expect.poll(lastText).toBe('beep · done');
  const lamp = () => done.querySelector('[data-kind]')!.getAttribute('data-kind');
  await expect.poll(lamp).toBe('live');
  vi.advanceTimersByTime(3000);
  await expect.poll(lamp).toBe('off');
});

test('a muted material stays silent, and settings survive a reload but sound does not', async () => {
  await openPage('/foundations/sound', 'bone');
  await userEvent.click(toggle('Sound'));
  await userEvent.click(page.getByRole('radio', { name: 'States only' }));
  await userEvent.click(page.getByRole('radio', { name: 'Acts and states' }));
  await userEvent.click(stoneBox());
  strike('stone');
  await expect.poll(lastText).toMatch(/Stone · \d+ Hz · silent \(material muted\)/);

  // A reload: the site mounted afresh, storage kept.
  await openPage('/foundations/sound', 'bone', { reload: true });
  await expect.element(settings()).toHaveAttribute('data-on', 'false');
  await expect.element(stoneBox()).not.toBeChecked();
});

for (const colorway of COLORWAYS) {
  test(`sound page in ${colorway}`, async () => {
    await openPage('/foundations/sound', colorway);
    const section = (text: string) => [...document.querySelectorAll('section')].find((s) => s.textContent?.includes(text))!;
    expect(section('The library exposes three settings')).toBeTruthy();
    expect(section('Seven materials, closed')).toBeTruthy();
    await capture(`sound-settings-${colorway}`, section('The library exposes three settings'));
    await capture(`sound-materials-${colorway}`, section('Seven materials, closed'));
  });
}

test('a part dragged along a groove scrapes, faster is louder, and it stops when let go', async () => {
  await openPage('/foundations/sound', 'bone');
  const track = page.getByTestId('slide-track');
  const cap = () => track.getByRole('slider', { name: 'Slide the cap' }).element();
  let end = 0, pressed = false;
  const onDown = () => { pressed = true; };
  addEventListener('pointerdown', onDown, true);
  onTestFinished(() => removeEventListener('pointerdown', onDown, true));
  /**
   * Press at the groove's left and drag to its right in `steps` moves a frame apart, hold, then let go.
   * The groove captures the pointer, so the drag is one gesture; `pointer` (not `mouse.drag`) because
   * the speed is the point, and each step takes its frame, as a hand's would.
   */
  const drag = (steps: number) => {
    track.element().scrollIntoView({ block: 'center' });
    const grooveEl = track.element().querySelector('.touch-none')!, groove = grooveEl.getBoundingClientRect();
    const x0 = 30 - groove.width / 2, x1 = groove.width / 2 - 30;
    end = Math.round(((groove.width - 30) / groove.width) * 100);
    pressed = false;
    return pointer(grooveEl, [{ to: [x0, 0] }, { down: true },
      ...Array.from({ length: steps }, (_, i) => ({ to: [x0 + ((x1 - x0) * (i + 1)) / steps, 0] as [number, number], ms: 16 })),
      { pause: 2500 }, { up: true }]);
  };
  /** Pressed, and held at the far end (to the pixel WebDriver rounds to): every move has landed. */
  const arrived = () => until(() => pressed && Math.abs(Number(cap().getAttribute('aria-valuenow')) - end) <= 1);
  // Off: it says so, and makes no sound.
  let gesture = drag(4);
  await arrived();
  expect(lastText()).toBe('Clay · sliding · silent (sound is off)');
  await gesture;
  // On: a fast drag is faster than a slow one, and letting go stops it.
  await userEvent.click(toggle('Sound'));
  await userEvent.click(track.getByRole('radio', { name: 'Stone' }));
  gesture = drag(3);
  await arrived();
  expect(lastText()).toBe('Stone · sliding');
  const fast = Number(track.element().getAttribute('data-speed'));
  await gesture;
  await expect.element(track).toHaveAttribute('data-speed', '0.00');
  gesture = drag(60);
  await arrived();
  const slow = Number(track.element().getAttribute('data-speed'));
  await gesture;
  expect(fast).toBeGreaterThan(slow);
  // A key nudges it: a short scrape.
  (cap() as HTMLElement).focus();
  await userEvent.keyboard('{ArrowLeft}');
  await expect.element(track.getByRole('slider')).not.toHaveAttribute('aria-valuenow', '90');
});
