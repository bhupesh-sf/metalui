import { expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { COLORWAYS, capture, openPage } from './harness';

const all = (root: ParentNode, css: string) => [...root.querySelectorAll(css)];
const looks = () => all(document.querySelector('[data-testid="backlight-looks"]')!, 'svg[role="img"]');

// The Backlight Part on Parts › Backlight: a glow, a beam and blips inside a bezel's glass, under
// the glass's surface; the beam turns and the light dims.
for (const colorway of COLORWAYS) {
  test(`backlights in ${colorway}`, async () => {
    await openPage('/components/backlight', colorway);
    await expect.poll(() => looks().length).toBe(4);
    expect(looks().map((e) => all(e, '[data-part="backlight"]').map((b) => b.getAttribute('data-shape')).join(','))).toEqual(['glow', 'beam', 'dot,dot,dot', 'glow']);
    // The light is inside the glass: after the glass, before its surface, clipped to it.
    const beam = looks()[1];
    expect(all(beam, '[data-part="glass"], [data-part="backlight"], [data-part="glass.glare"]').map((x) => x.getAttribute('data-part'))).toEqual(['glass', 'backlight', 'glass.glare']);
    expect(beam.querySelector('[data-part="bezel.light"]')!.getAttribute('clip-path')).toMatch(/url\(#/);
    // A beam: slices fading behind a bright leading edge.
    expect(all(beam, '[data-shape="beam"] path[fill]')).toHaveLength(14);
    await capture(`backlight-${colorway}`, page.getByTestId('backlight-looks').element());
  });
}

test('the beam turns and the light dims with its controls', async () => {
  await openPage('/components/backlight', 'bone');
  const box = page.getByTestId('backlight-looks').element();
  const heading = () => box.querySelector('[data-shape="beam"]')!.getAttribute('transform');
  expect(heading()).toBe('rotate(40 200 196)');
  (page.getByRole('slider', { name: 'Heading' }).element() as HTMLElement).focus();
  await userEvent.keyboard('{End}');
  await expect.poll(heading).toBe('rotate(359 200 196)');
  (page.getByRole('slider', { name: 'Alpha' }).element() as HTMLElement).focus();
  await userEvent.keyboard('{Home}');
  const glowAlpha = () => {
    const c = box.querySelector('[data-shape="glow"] circle')!;
    const id = c.getAttribute('fill')!.match(/#([^)]+)/)![1];
    return document.getElementById(id)!.querySelector('stop')!.getAttribute('stop-opacity');
  };
  await expect.poll(glowAlpha).toBe('0');
});
