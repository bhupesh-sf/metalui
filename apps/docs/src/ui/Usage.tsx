import * as React from 'react';
import { Tabs, TabList, TabPanel } from '@unlocalhosted/metalui';
import { useLocation } from 'react-router';
import { Code, Section, TokenTable } from './doc';
import { PARTS } from '../app/parts';

/* ─────────────────────────────────────────────────────────
 * USAGE · what someone building with the component reads first
 *
 *   install   the package (and its stylesheet, once), or the component copied into your project
 *             through the shadcn registry (metalui.dev/r/<name>.json)
 *   import    the named exports, read from the component's meta.json, so it is never stale
 *   example   the smallest real use, when the page gives one
 *   props     the API table from the component's agent guide (React and SwiftUI side by side)
 * The file's own source stays below, under Source, for people changing the component.
 * ───────────────────────────────────────────────────────── */

const PACKAGE = '@unlocalhosted/metalui';
const REGISTRY = 'https://metalui.dev/r';

export interface UsageMeta {
  name: string;
  react?: { export?: string };
}

/** The named exports a component offers, from meta.json's react.export ("RadioGroup, Radio"). */
export function exportsOf(meta: UsageMeta): string[] {
  const raw = meta.react?.export ?? '';
  // "Checkbox (Dimple)" names an older alias in parentheses; the import is the current name.
  return raw.replace(/\([^)]*\)/g, '').split(',').map((s) => s.trim()).filter(Boolean);
}

/** The API table of an agent guide ("## API", a markdown table), as rows of cells. */
export function apiRows(agent: string): string[][] {
  const at = agent.indexOf('\n## API');
  if (at < 0) return [];
  const rest = agent.slice(at + 7);
  const end = rest.search(/\n## /);
  const table = (end < 0 ? rest : rest.slice(0, end)).split('\n').filter((l) => l.trim().startsWith('|'));
  return table.slice(2).map((l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
}

/** Inline code in a table cell: `x` becomes <code>x</code>. */
function Cell({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`)/g);
  return <>{parts.map((p, i) => (p.startsWith('`') ? <code key={i}>{p.slice(1, -1)}</code> : <span key={i}>{p}</span>))}</>;
}

export function Usage({ meta, agent, example }: { meta: UsageMeta; agent: string; example?: string }) {
  const names = exportsOf(meta);
  const importLine = `import { ${names.join(', ')} } from '${PACKAGE}';`;
  const install = {
    package: `npm install ${PACKAGE}\n\n// once, at the root of your app\nimport '${PACKAGE}/styles.css';`,
    registry: `npx shadcn@latest add ${REGISTRY}/${meta.name}.json`,
  };
  const [how, setHow] = React.useState<'package' | 'registry'>('package');
  const rows = apiRows(agent);
  return (
    <div className="grid grid-cols-1 gap-20" data-testid="usage">
      <Tabs value={how} onValueChange={(v) => setHow(v as 'package' | 'registry')}>
        <Code
          code={install[how]}
          lang={how === 'package' ? 'tsx' : undefined}
          label="Install"
          head={<TabList size="compact" aria-label="Install" items={[{ value: 'package', label: 'Package' }, { value: 'registry', label: 'Copy into your project' }]} />}
          wrap={(lines) => (['package', 'registry'] as const).map((id) => <TabPanel key={id} value={id}>{id === how ? lines : null}</TabPanel>)}
        />
      </Tabs>
      {names.length > 0 && <Code code={example ? `${importLine}\n\n${example.trim()}` : importLine} lang="tsx" label="Usage" />}
      {rows.length > 0 && <TokenTable head={['React', 'SwiftUI']} mono={[]} rows={rows.map((r) => r.slice(0, 2).map((c, j) => <Cell key={j} text={c} />))} />}
    </div>
  );
}

/** Only this component's part of the theme: its utilities and its theme variables. */
export function cssFor(name: string, theme: string): string {
  const own = (u: string) => u === name || u.startsWith(`${name}-`) || u.startsWith(`recipe-${name}`) || new RegExp(`^[a-z-]+?-${name}(-|$)`).test(u);
  const vars = theme.split('\n').filter((l) => new RegExp(`^\\s*--[a-z]+-${name}-`).test(l));
  const blocks: string[] = [];
  const re = /@utility ([a-z0-9-]+) \{\n[\s\S]*?\n\}/g;
  for (let m = re.exec(theme); m; m = re.exec(theme)) if (own(m[1])) blocks.push(m[0]);
  if (!vars.length && !blocks.length) return theme;
  return [`/* ${name}: its theme values (from tokens.json) */`, '@theme inline {', ...vars, '}', '', `/* ${name}: its utilities */`, ...blocks].join('\n');
}

/** The Usage section for pages that do not use ComponentPage: finds its component by route. */
export function UsageSection({ agent, example }: { agent: string; example?: string }) {
  const { pathname } = useLocation();
  const meta = PARTS.find((m) => m.page === pathname) as UsageMeta | undefined;
  if (!meta) return null;
  return (
    <Section id="usage" title="Usage" lede="Install it, import it, use it.">
      <Usage meta={meta} agent={agent} example={example} />
    </Section>
  );
}

/** cssFor for pages that do not use ComponentPage: this route's component, or the whole theme. */
export function useOwnCss(theme: string) {
  const { pathname } = useLocation();
  const meta = PARTS.find((m) => m.page === pathname);
  return meta ? cssFor(meta.name, theme) : theme;
}
