import type { DotInk } from '../dot-display/dot-display';

/* The weather design's skies (Main.dc.html sky() and mini()), drawn as ink indices for the dot
 * display instead of SVG paths. One picture per clock time and frame; the display steps it. */

export type WeatherKind = 'clear' | 'partly' | 'cloud' | 'rain' | 'storm' | 'snow' | 'mist' | 'windy' | 'heat';
/** When the sun is up, in hours (Lisbon in late September: 07:30 to 19:30). */
export interface SunHours { rise: number; set: number }
export const DEFAULT_SUN: SunHours = { rise: 7.5, set: 19.5 };

const LAYERS = ['off', 'glow', 'star', 'moon', 'sun', 'ray', 'heat', 'bird', 'snow', 'rain', 'bolt', 'cloud', 'cloudDark', 'fog', 'wind', 'hill', 'hz'] as const;
type Layer = (typeof LAYERS)[number];
const L = Object.fromEntries(LAYERS.map((l, i) => [l, i])) as Record<Layer, number>;

/** The sky's inks, in layer order. */
export const SKY_INKS: readonly DotInk[] = [
  'off', ['sun', 0.32], 'star', 'moon', 'sun', 'sun', ['sun', 0.5], 'hill', 'snow', 'rain', 'sun',
  'cloud', 'cloud-dark', ['cloud', 0.7], 'cloud-dark', 'hill', 'hz',
];

const wrap = (v: number, n: number) => ((v % n) + n) % n;

/** A dot-matrix sky: cols × rows dots, horizon on row hz, for one clock time (hours) and one frame. */
export function sky(cols: number, rows: number, hz: number, kind: WeatherKind, clock: number, tick: number, sunHours: SunHours = DEFAULT_SUN) {
  const grid = new Uint8Array(cols * rows);
  const big = cols > 30;
  const put = (x: number, y: number, layer: Layer) => {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= cols || y >= hz) return;
    grid[y * cols + x] = L[layer];
  };
  const { rise, set } = sunHours;
  const day = clock >= rise && clock <= set;
  const td = (clock - rise) / (set - rise);
  const tn = wrap(clock - set, 24) / (24 - (set - rise));
  const arc = (t: number) => [3 + t * (cols - 7), hz - 1 - Math.sin(Math.PI * t) * (hz - (big ? 8 : 6))];
  const covered = kind === 'cloud' || kind === 'rain' || kind === 'storm' || kind === 'snow';

  // Dawn and dusk warm the dots along the horizon.
  if (day && (td < 0.1 || td > 0.9) && !covered) {
    for (let gy = hz - 4; gy < hz; gy++) for (let gx = 0; gx < cols; gx++) if ((gx + gy) % 2 === 0 && (gy >= hz - 2 || gx % 4 === 0)) put(gx, gy, 'glow');
  }

  if (!day && !covered) {
    const stars = big ? 14 : 6;
    for (let s = 0; s < stars; s++) {
      if (wrap(tick + s * 3, 9) === 0) continue;
      put(wrap(s * 17 + 5, cols), wrap(s * 7 + 1, hz - 4), 'star');
    }
  }

  if (!covered) {
    const r = big ? 3.5 : 2.6;
    if (day) {
      const p = arc(td), sx = Math.round(p[0]!), sy = Math.round(p[1]!);
      for (let dx = -4; dx <= 4; dx++) for (let dy = -4; dy <= 4; dy++) if (dx * dx + dy * dy <= r * r + 0.3) put(sx + dx, sy + dy, 'sun');
      const orth = wrap(tick, 4) < 2;
      const dirs = orth ? [[0, -1], [0, 1], [-1, 0], [1, 0]] : [[-0.72, -0.72], [0.72, -0.72], [-0.72, 0.72], [0.72, 0.72]];
      for (const d of dirs) for (let k = r + 1.6; k <= r + 2.8; k += 1) put(sx + d[0]! * k, sy + d[1]! * k, 'ray');
      if (kind === 'clear') {
        const birds = big ? 2 : 1;
        for (let b = 0; b < birds; b++) {
          const bx = wrap(Math.floor(cols * 0.55) + b * 7 + Math.floor(tick / 2), cols + 4) - 2, by = (big ? 6 : 4) + b * 3;
          if (wrap(tick, 2) === 0) { put(bx - 1, by - 1, 'bird'); put(bx, by, 'bird'); put(bx + 1, by - 1, 'bird'); }
          else { put(bx - 1, by, 'bird'); put(bx, by, 'bird'); put(bx + 1, by, 'bird'); }
        }
      }
    } else {
      const q = arc(tn), mx = Math.round(q[0]!), my = Math.round(q[1]!);
      const shape = big
        ? ['...MMM.', '.MMM...', 'MMM....', 'MMM....', 'MMM....', '.MMM...', '...MMM.']
        : ['.MMM.', 'MM...', 'MM...', 'MM...', '.MMM.'];
      const half = (shape.length - 1) / 2;
      shape.forEach((row, iy) => {
        for (let ix = 0; ix < row.length; ix++) if (row.charAt(ix) === 'M') put(mx + ix - half, my + iy - half, 'moon');
      });
    }
  }

  if (kind === 'heat') {
    for (let hx = 1; hx < cols; hx += 4) for (let hy = hz - 7; hy < hz; hy++) {
      if (wrap(hy + tick, 3) === 0) put(hx + wrap(hy + tick, 2), hy, 'heat');
    }
  }

  if (kind === 'snow') {
    const flakes = big ? 34 : 12;
    for (let f = 0; f < flakes; f++) {
      const fy = wrap(f * 7 + Math.floor(tick / 2), hz);
      const fx = wrap(f * 13 + Math.round(Math.sin(tick / 3 + f) * 1), cols);
      put(fx, fy, 'snow');
    }
  }

  const drift = tick * (kind === 'windy' ? 0.9 : 0.25);
  const scaleW = (w: number) => Math.max(2, Math.round(w * (0.55 + 0.45 * cols / 46)));
  const clouds: [number, number, number, Layer][] = [];
  const cloud = (fx: number, fy: number, w: number, layer: Layer) => {
    w = scaleW(w);
    const span = cols + 2 * w + 4;
    const cx = wrap(Math.round(fx * cols + drift), span) - w - 2, cy = Math.round(fy * hz);
    clouds.push([cx, cy, w, layer]);
  };
  if (kind === 'partly') { cloud(0.18, 0.24, 3, 'cloud'); cloud(0.62, 0.42, 5, 'cloud'); }
  if (kind === 'cloud') { cloud(0.1, 0.24, 4, 'cloud'); cloud(0.45, 0.4, 5, 'cloudDark'); cloud(0.8, 0.2, 4, 'cloud'); cloud(0.65, 0.62, 3, 'cloud'); }
  if (kind === 'rain') { cloud(0.22, 0.2, 5, 'cloudDark'); cloud(0.68, 0.3, 5, 'cloudDark'); }
  if (kind === 'storm') { cloud(0.12, 0.18, 6, 'cloudDark'); cloud(0.52, 0.24, 6, 'cloudDark'); cloud(0.92, 0.14, 5, 'cloudDark'); }
  if (kind === 'snow') { cloud(0.25, 0.14, 5, 'cloud'); cloud(0.72, 0.2, 4, 'cloud'); }
  if (kind === 'windy') { cloud(0.4, 0.26, 3, 'cloud'); }

  for (const [cx, cy, w] of clouds) {
    if (kind === 'rain' || kind === 'storm') {
      const fast = kind === 'storm' ? 2 : 1;
      for (let x = cx - w + 1; x <= cx + w - 1; x++) {
        if (wrap(x, 2) !== 0) continue;
        for (let y = cy + 2; y < hz; y++) if (wrap(y - tick * fast + x * 3, 4) === 0) put(x - (kind === 'storm' ? wrap(y, 2) : 0), y, 'rain');
      }
    }
  }
  if (kind === 'storm' && clouds.length && wrap(tick, 18) < 3 && wrap(tick, 18) !== 1) {
    const c0 = clouds[1] ?? clouds[0]!;
    let lx = c0[0];
    for (let ly = c0[1] + 2, step = 0; ly < hz; ly++, step++) { lx += wrap(step, 6) < 3 ? -1 : 1; put(lx, ly, 'bolt'); put(lx + 1, ly, 'bolt'); }
  }
  for (const [cx, cy, w, layer] of clouds) {
    for (let x = cx - w + 1; x <= cx + w - 1; x++) put(x, cy + 1, layer);
    for (let x = cx - w; x <= cx + w; x++) put(x, cy, layer);
    for (let x = cx - w + 1; x <= cx + w - 2; x++) put(x, cy - 1, layer);
    for (let x = cx - 1; x <= cx + 2; x++) put(x, cy - 2, layer);
    put(cx - w + 2, cy - 2, layer); put(cx - w + 3, cy - 2, layer);
    put(cx, cy - 3, layer); put(cx + 1, cy - 3, layer);
  }

  if (kind === 'mist') {
    const bands = big ? [2, 5, 8, 11] : [2, 4, 7];
    bands.forEach((d, i) => {
      const dir = i % 2 ? -1 : 1;
      for (let x = 0; x < cols; x++) if (wrap(x + dir * Math.floor(tick / 2) + i * 3, 9) < 5) put(x, hz - d, 'fog');
    });
  }
  if (kind === 'windy') {
    const gusts = big ? 7 : 4;
    for (let g = 0; g < gusts; g++) {
      const wy = 2 + wrap(g * 5, hz - 4), wx = wrap(g * 17 + tick * 2, cols + 8) - 4, len = 3 + (g % 3);
      for (let k = 0; k < len; k++) put(wx + k, wy, 'wind');
      put(wx + len, wy - 1, 'wind');
    }
  }

  // Hills on the horizon.
  for (let x = 0; x < cols; x++) {
    const h = Math.max(0, Math.round(3 - Math.abs(x - cols * 0.8) / 2.4)) + Math.max(0, Math.round(1.6 - Math.abs(x - cols * 0.12) / 2.2));
    for (let y = hz - h; y < hz; y++) grid[y * cols + x] = L.hill;
    if (hz < rows) grid[hz * cols + x] = L.hz;
  }
  return grid;
}

// 7 × 7 dot glyphs for the hour row. S sun, M moon, C cloud, D dark cloud, R rain, Z bolt, F fog, N snow, W wind.
const MINI: Record<string, string[]> = {
  sun: ['...S...', '.S...S.', '..SSS..', 'S.SSS.S', '..SSS..', '.S...S.', '...S...'],
  moon: ['..MMM..', '.MM....', 'MM.....', 'MM.....', 'MM.....', '.MM....', '..MMM..'],
  partly: ['S.S....', '.SSS...', 'SSSCC..', '.SCCCC.', 'CCCCCCC', '.CCCCC.', '.......'],
  partlyNight: ['MM.....', 'M......', 'M..CC..', 'MMCCCC.', 'CCCCCCC', '.CCCCC.', '.......'],
  cloud: ['.......', '..CC...', '.CCCCC.', 'CCCCCCC', 'CCCCCCC', '.CCCCC.', '.......'],
  rain: ['..DD...', '.DDDDD.', 'DDDDDDD', '.DDDDD.', '.......', '.R.R.R.', 'R.R.R..'],
  storm: ['..DD...', '.DDDDD.', 'DDDDDDD', '..Z...R', '.ZZ..R.', '..Z....', '.Z.....'],
  mist: ['FFFFF..', '.......', '..FFFFF', '.......', 'FFFFF..', '.......', '.FFFFFF'],
  snow: ['N..N..N', '.......', '.N..N..', '.......', 'N..N..N', '.......', '.N..N..'],
  windy: ['WWWWW..', '.....W.', 'WWWWW..', '.......', 'WWWWWW.', '......W', 'WWWW...'],
  heat: ['.SSS...', 'SSSSS..', '.SSS...', '.......', 'S.S.S.S', '.S.S.S.', '.......'],
};
const MINI_LAYER: Record<string, Layer> = { S: 'sun', M: 'moon', C: 'cloud', D: 'cloudDark', R: 'rain', Z: 'bolt', F: 'fog', N: 'snow', W: 'wind' };

/** A 7 × 7 glyph for one hour, in SKY_INKS. The mini glyph draws fog at full strength. */
export function mini(kind: WeatherKind, day: boolean) {
  const key = kind === 'clear' ? (day ? 'sun' : 'moon') : kind === 'partly' && !day ? 'partlyNight' : kind;
  const out = new Uint8Array(49);
  (MINI[key] ?? MINI.cloud!).forEach((row, y) => {
    for (let x = 0; x < 7; x++) { const l = MINI_LAYER[row.charAt(x)]; if (l) out[y * 7 + x] = L[l]; }
  });
  return out;
}
/** The mini glyphs' inks: the sky's, with fog at full strength (the design fills it plainly). */
export const MINI_INKS: readonly DotInk[] = SKY_INKS.map((ink, i) => (i === L.fog ? 'cloud' : ink));
