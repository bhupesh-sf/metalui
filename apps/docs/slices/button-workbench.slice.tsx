import { expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { COLORWAYS, mouse, openPage } from './harness';

const bench = () => document.querySelector('.button-workbench')!;
const wb = () => page.elementLocator(bench());
/** A `.bw-meter` (or any matching element) in the workbench whose text holds `has`: Playwright's filter({ hasText }). */
const meter = (has: string, css = '.bw-meter') => [...bench().querySelectorAll(css)].find((e) => e.textContent!.includes(has))?.textContent ?? '';
const reveal = (el: Element) => el.scrollIntoView({ block: 'center' });
const centre = (el: Element): [number, number] => { const r = el.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; };

for (const colorway of COLORWAYS) {
  test(`button workbench shares graphical controls and X-ray in ${colorway}`, async () => {
    await openPage('/components/button', colorway);
    const preview = () => bench().querySelector('.xr-solid .mu-button')!;
    await expect.poll(() => preview().textContent).toBe('New Canvas');
    await userEvent.fill(wb().getByRole('textbox', { name: 'Button label' }), 'Create');
    await expect.poll(() => preview().textContent).toBe('Create');
    (wb().getByRole('slider', { name: 'Button height' }).element() as HTMLElement).focus();
    await userEvent.keyboard('{ArrowUp}');
    await expect.poll(() => meter('Height')).toContain('34px');
    expect(parseFloat(getComputedStyle(preview()).height)).toBeCloseTo(34, 1);
    (wb().getByRole('slider', { name: 'Side padding' }).element() as HTMLElement).focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect.poll(() => meter('Padding')).toContain('17px');
    await expect.element(wb().getByText('Automatic padding follows height')).toBeVisible();
    await userEvent.click(wb().getByRole('button', { name: 'X-ray', exact: true }));
    await expect.poll(() => bench().querySelector('.button-xray')!.getAttribute('data-xray')).toBe('true');
    await expect.poll(() => bench().querySelector('.xr-label')?.textContent).toBe('Create');
    await expect.poll(() => meter('size', '.xr-card .ed-readout')).toContain('34pt');
    await userEvent.click(wb().getByText('Precise values and presets'));
    await expect.element(page.elementLocator(bench().querySelector('.dialkit-root')!)).toBeVisible();
    await userEvent.click(wb().getByRole('button', { name: 'Reset', exact: true }));
    await expect.poll(() => meter('Height')).toContain('32px');
    await userEvent.click(wb().getByRole('button', { name: 'Preview', exact: true }));
    await expect.poll(() => preview().textContent).toBe('New Canvas');
  });
}

test('button object handles tune geometry and light by dragging', async () => {
  await openPage('/components/button', 'bone');
  const height = wb().getByRole('slider', { name: 'Button height' }).element();
  reveal(height);
  const [hx, hy] = centre(height);
  await mouse.drag([hx, hy], [hx, hy - 16], { steps: 4 });
  await expect.poll(() => meter('Height')).toContain('40px');

  const light = wb().getByRole('slider', { name: 'Light direction and strength' }).element();
  reveal(light);
  const [lx, ly] = centre(light);
  await mouse.drag([lx, ly - 68], [lx + 50, ly - 50], { steps: 4 });
  await expect.poll(() => meter('Direction')).toContain('45°');
  await userEvent.click(wb().getByRole('button', { name: 'X-ray', exact: true }));
  await expect.poll(() => meter('size', '.xr-card .ed-readout')).toContain('40pt');
});
