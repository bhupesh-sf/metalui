import { Config } from '@remotion/cli/config';

// Tailwind v4 over the stylesheet, so the real components get the same utilities the site builds
// from theme.css (and the repo's one Tailwind, not a copy pinned by a plugin).
Config.overrideWebpackConfig((config) => ({
  ...config,
  module: {
    ...config.module,
    rules: (config.module?.rules ?? []).map((rule) => {
      if (!rule || rule === '...' || typeof rule !== 'object' || !String(rule.test).includes('css')) return rule;
      const use = Array.isArray(rule.use) ? rule.use : rule.use ? [rule.use] : [];
      return { ...rule, use: [...use, require.resolve('@tailwindcss/webpack', { paths: [process.cwd()] })] };
    }),
  },
}));
