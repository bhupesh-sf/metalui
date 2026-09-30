import * as React from 'react';
import { useDialKit } from 'dialkit';
import { type SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import { MetricsDashboard } from '../../blocks/metrics-dashboard/metrics-dashboard';
import source from '../../blocks/metrics-dashboard/metrics-dashboard.tsx?raw';
import { BlockPage } from '../../ui/BlockPage';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';

/* ─────────────────────────────────────────────────────────
 * DASHBOARD TUNER: the page's DialKit panel
 *
 *   glide    the spring the lifted plate glides between tiles on, and the line morphs and draws on
 *   slow     stretches time, to watch the line morph and the rows travel
 * ───────────────────────────────────────────────────────── */

function Tuned() {
  const d = useDialKit('Dashboard', {
    glide: { type: 'select', options: SPRING_NAMES, default: 'settle' },
    slow: [1, 1, 10],
  });
  const vars = springVars('settle', d.glide as SpringName, d.slow) as React.CSSProperties;
  return <div data-testid="dashboard-tuner" className="w-full" style={vars}><MetricsDashboard site="tuned.example" /></div>;
}

export default function MetricsDashboardPage() {
  return (
    <BlockPage
      title="Metrics dashboard"
      lede="A small analytics view you can explore: a range, four key measures that pick what's charted, one chart you can read day by day, and where the visitors went and came from."
      preview={{
        lede: 'Change the range, pick a measure, turn on Compare, and read the chart with the pointer or the arrow keys. Export saves the charted series as CSV.',
        caption: 'live block · sample data',
        node: <MetricsDashboard />,
      }}
      use={[
        { id: 'U1', title: 'A handful of headline measures', body: 'Four measures over 7, 30 or 90 days, one charted at a time, with where the traffic went and came from.' },
        { id: 'U2', title: 'A home for a product or a site', body: 'The first screen of an admin, a project overview, a weekly check-in.' },
      ]}
      avoid={[
        { id: 'N1', title: 'Drilling into many series', body: 'Several lines at once, segments or a custom date range need an explorer, not four tiles.' },
        { id: 'N2', title: 'One number', body: 'A single figure is a stat on a card; a trend inside a row is a Sparkline.' },
      ]}
      install={{
        file: 'src/blocks/metrics-dashboard.tsx',
        usage: `import { MetricsDashboard } from '@/blocks/metrics-dashboard';

export function Overview() {
  return <MetricsDashboard site="acme.com" />;
}

// Replace DAILY (the sample series) with your analytics source: one row per day with
// visitors, signups and bounces. Totals, deltas, the chart and the lists derive from it.`,
      }}
      builtFrom={[
        { label: 'Switcher', to: '/components/switcher' },
        { label: 'Button', to: '/components/button' },
        { label: 'Tabs (Base UI)', to: '/components/tabs' },
        { label: 'Toggle', to: '/components/toggle' },
        { label: 'LED', to: '/components/led' },
        { label: 'Surfaces and wells', to: '/foundations/materials' },
        { label: 'The drum', to: '/foundations/transitions' },
        { label: 'Icons (morph)', to: '/icons' },
      ]}
      behaviour={[
        {
          title: 'Keyboard',
          rules: [
            { id: 'K1', title: 'Tab', body: 'Moves through the range, Export, the measure tiles, Compare and the chart.' },
            { id: 'K2', title: '← → on the tiles', body: 'Choose the next measure; the chart follows at once.' },
            { id: 'K3', title: '← → Home End on the chart', body: 'Read the previous or next day (week at 90 days), the first or the last.' },
          ],
        },
        {
          title: 'Accessibility',
          rules: [
            { id: 'A1', title: 'Direction is said, not only coloured', body: 'Each delta says "up" or "down" and by how much; the lamp beside it is extra.' },
            { id: 'A2', title: 'The chart has a name and a voice', body: 'It is an image named by its measure and range; the day you read is announced in a polite status.' },
            { id: 'A3', title: 'The tiles are tabs', body: 'The chosen measure is aria-selected; the range is a radio group.' },
          ],
        },
        {
          title: 'Motion',
          rules: [
            { id: 'M1', title: 'New range, new data', body: 'Figures turn on the drum left to right, the line draws in from the left, bars settle and rows travel to their new rank.' },
            { id: 'M2', title: 'Same data, new measure', body: 'The lifted plate glides to the tile and the line morphs in place to the new shape.' },
            { id: 'M3', title: 'The pointer is never sprung', body: 'The hairline and dot sit on the day at once; only the readout plate follows on the part spring.' },
            { id: 'M4', title: 'Reduce Motion', body: 'Values and views change at once; nothing draws in or travels.' },
          ],
        },
        {
          title: 'Responsive',
          rules: [
            { id: 'R1', title: 'It measures itself', body: 'The block is a container: under 32rem the tiles are two by two and the lists stack, wherever it sits (a page, a panel, a sheet).' },
          ],
        },
      ]}
      tune={{ lede: 'The Dashboard panel swaps the spring the plate glides and the line morphs on, and stretches time.', node: <Tuned /> }}
      source={source}
    />
  );
}
