import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import tokens from '../../../tokens/tokens.json';
import { COLORWAYS, capture, openPage, until } from './harness';

// Gadget materials (tokens.gadgets): seven materials at three weights on Foundations › Materials,
// lit by one filter per material, with the host changing the world around them, and a strike
// that always shows (the body gives) and delights only where motion is welcome (the glint).
const G = tokens.gadgets;
const sheet = () => page.getByTestId('gadget-materials');
const count = (css: string) => document.querySelectorAll(css).length;
/** A strike, as Playwright's dispatchEvent('pointerdown', { buttons: 1 }) sends it. */
const strike = (el: Element) => el.dispatchEvent(new PointerEvent('pointerdown', { buttons: 1, bubbles: true, cancelable: true, composed: true }));
/**
 * A swatch, at rest: the shared page keeps the last slice's colorway on <html> until the site's effect
 * sets this one, so the colours cross-fade first (CSS transitions a fresh page never runs; harness
 * candidate). A strike is read from rest.
 */
async function swatch(material: string, weight: string) {
  const el = sheet().element().querySelector(`[data-gadget-material="${material}"][data-weight="${weight}"]`)!;
  await until(() => [...el.querySelectorAll('*')].every((e) => e.getAnimations().length === 0));
  return el;
}

for (const colorway of COLORWAYS) {
  test(`gadget materials in ${colorway}`, async () => {
    await openPage('/foundations/materials', colorway);
    await expect.element(sheet()).toHaveAttribute('data-host', colorway);
    expect(sheet().element().querySelectorAll('[data-gadget-material]')).toHaveLength(21);
    // One filter per material, shared by its three weights; full detail at this size.
    expect(count('filter[data-material]')).toBe(7);
    expect(document.querySelector('filter[data-material="clay"]')!.getAttribute('data-tier')).toBe('full');
    // A dark host deepens the cast shadow (gadgets.host.graphite.shadow).
    const castAlpha = document.querySelector('filter[data-material="clay"] feFlood')!.getAttribute('flood-opacity');
    expect(Number(castAlpha)).toBeCloseTo(G.materials.clay.shadow.cast[3] * G.host[colorway].shadow, 3);
    // Only matte materials fleck; glass and metal never do.
    expect(count('filter[data-material="stone"] feFuncA')).toBe(1);
    expect(count('filter[data-material="glass"] feFuncA')).toBe(0);
    await capture(`gadget-materials-${colorway}`, sheet().element());
  });
}

test('a strike gives, and a glossy body glints', async () => {
  await openPage('/foundations/materials', 'bone');
  const glass = await swatch('glass', '0.5');
  strike(glass);
  const running = {
    body: glass.querySelector('[data-part="body"]')!.getAnimations().length,
    glint: glass.querySelector('[data-part="glint"]')!.getAnimations().length,
  };
  expect(running.body).toBeGreaterThan(0);
  expect(running.glint).toBeGreaterThan(0);

  // Matte stone gives but never glints.
  const stone = await swatch('stone', '0.5');
  strike(stone);
  expect(stone.querySelector('[data-part="glint"]')!.getAnimations().length).toBe(0);
});

test('with reduced motion the body still gives, but nothing glints', async () => {
  await openPage('/foundations/materials', 'graphite', { media: { 'prefers-reduced-motion': 'reduce' } });
  const metal = await swatch('metal', '0.1');
  strike(metal);
  const running = {
    body: metal.querySelector('[data-part="body"]')!.getAnimations().length,
    glint: metal.querySelector('[data-part="glint"]')!.getAnimations().length,
  };
  expect(running.body).toBeGreaterThan(0);
  expect(running.glint).toBe(0);
});
