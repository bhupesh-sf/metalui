import { defineConfig } from 'tsup';

// A bundler cannot drop an unused `const Button = React.forwardRef(...)`: a call at module level might have
// effects. These calls have none, so say so, and an app that imports one component ships one component.
// `X = Object.assign(Root, {...})` is marked only when its result is bound, never as a bare statement.
const PURE = [/(?<![\w.])(React\d*\.(?:forwardRef|createContext|memo|lazy)\()/g, /(= )(Object\.assign\()/g];
const markPure = (code: string) => code.replace(PURE[0], '/* @__PURE__ */ $1').replace(PURE[1], '$1/* @__PURE__ */ $2');

export default defineConfig({
  entry: ['src/index.ts', 'src/icons.ts', 'src/icons-life.ts', 'src/sound.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  external: ['react', 'react-dom', '@base-ui/react'],
  // Components use hooks and events; keep them client components under RSC.
  banner: { js: '"use client";' },
  plugins: [{ name: 'mark-pure', renderChunk(code, { path }) { return path.endsWith('.js') ? { code: markPure(code) } : null; } }],
});
