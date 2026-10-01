import { defineConfig } from '@playwright/test';

// Benchmarks run against the production build (vite preview), never the dev server:
// dev adds HMR, the agentation toolbar and unminified code, all of which are idle cost.
const port = process.env.METALUI_BENCH_PORT ?? '4194';
export default defineConfig({
  testDir: 'scenarios',
  testMatch: '**/*.bench.ts',
  timeout: 120_000,
  workers: 1,
  fullyParallel: false,
  reporter: [['list']],
  use: { baseURL: `http://127.0.0.1:${port}`, viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 },
  webServer: {
    command: `npm exec -w @metalui/docs -- vite preview --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !!process.env.METALUI_BENCH_PORT,
  },
});
