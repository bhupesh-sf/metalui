#!/usr/bin/env node
// Frames of the web weather sky (blocks/weather weatherScene), as dot indices in
// WEATHER_SKY_LAYERS order, for the SwiftUI twin's parity test.
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const bundle = await build({
  entryPoints: [resolve(root, 'packages/metalui/src/blocks/weather/weather.tsx')],
  bundle: true, write: false, format: 'esm', platform: 'node', jsx: 'automatic',
  external: ['react', 'react-dom', '@base-ui/*', '@base-ui-components/*'],
  loader: { '.css': 'empty' },
});
// Written beside node_modules so the bundle's react import resolves; removed once loaded.
const temp = resolve(root, 'node_modules/.weather-fixtures.mjs');
writeFileSync(temp, bundle.outputFiles[0].text);
const { weatherScene, WEATHER_SKIES, WEATHER_SKY_LAYERS } = await import(pathToFileURL(temp).href);
rmSync(temp);

const PITCH = 8;
function dots(paths, cols, rows) {
  const out = new Array(cols * rows).fill(0);
  WEATHER_SKY_LAYERS.forEach((layer, index) => {
    for (const [, x, y] of (paths[layer] ?? '').matchAll(/M([\d.]+) ([\d.]+)/g)) {
      out[Math.floor(Number(y) / PITCH) * cols + Math.floor(Number(x) / PITCH)] = index;
    }
  });
  return out;
}
const grids = [{ cols: 21, rows: 21, horizon: 13 }, { cols: 46, rows: 28, horizon: 21 }];
const cases = [];
Object.keys(WEATHER_SKIES).forEach((kind, i) => {
  for (const hour of [7.6, 9, 13.5, 19.4, 23]) for (const g of grids) {
    const tick = i * 7 + Math.round(hour);
    cases.push({ kind, hour, tick, ...g, dots: dots(weatherScene({ ...g, hour, sky: WEATHER_SKIES[kind], tick }), g.cols, g.rows) });
  }
});
// Skies of one's own: a blizzard blowing right to left, a thin moon, a heavy sleet in wind.
const own = {
  blizzard: { ...WEATHER_SKIES.snow, wind: 0.9, windFrom: -1 },
  crescent: { moonPhase: 0.12 },
  gale: { ...WEATHER_SKIES.sleet, rain: 0.8, wind: 0.6 },
};
for (const [name, sky] of Object.entries(own)) for (const g of grids) for (const tick of [0, 5, 17]) {
  cases.push({ kind: name, sky, hour: 22, tick, ...g, dots: dots(weatherScene({ ...g, hour: 22, sky, tick }), g.cols, g.rows) });
}
const dir = resolve(root, 'swift/Tests/MetalUITests/Fixtures');
mkdirSync(dir, { recursive: true });
writeFileSync(resolve(dir, 'weather.json'), `${JSON.stringify({ layers: WEATHER_SKY_LAYERS, cases })}\n`);
console.log(`${cases.length} weather frames: ${resolve(dir, 'weather.json')}`);
