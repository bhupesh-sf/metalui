import * as React from 'react';
import { useDialKit } from 'dialkit';
import { type SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import { useColorway } from '../../app/colorway';
import { Settings } from '../../blocks/settings/settings';
import source from '../../blocks/settings/settings.tsx?raw';
import { BlockPage } from '../../ui/BlockPage';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';

/* ─────────────────────────────────────────────────────────
 * SETTINGS TUNER: the page's DialKit panel
 *
 *   rise     the spring the save bar rises on
 *   leave    the spring it leaves on, after Saved or Discard
 *   panel    the spring a section's panel comes in on
 *   slow     stretches time, to watch the bar arrive and go
 * ───────────────────────────────────────────────────────── */

function Tuned() {
  const { colorway } = useColorway();
  const d = useDialKit('Settings', {
    rise: { type: 'select', options: SPRING_NAMES, default: 'object' },
    leave: { type: 'select', options: SPRING_NAMES, default: 'release' },
    panel: { type: 'select', options: SPRING_NAMES, default: 'settle' },
    slow: [1, 1, 10],
  });
  const vars = {
    ...springVars('object', d.rise as SpringName, d.slow),
    ...springVars('release', d.leave as SpringName, d.slow),
    ...springVars('settle', d.panel as SpringName, d.slow),
  } as React.CSSProperties;
  return (
    <div data-testid="settings-tuner" className="flex w-full justify-center" style={vars}>
      <Settings colorway={colorway} />
    </div>
  );
}

function Preview() {
  const { colorway } = useColorway();
  return <div className="flex w-full justify-center"><Settings colorway={colorway} /></div>;
}

export default function SettingsPage() {
  return (
    <BlockPage
      title="Settings"
      lede="A workspace’s preferences: your profile, what reaches your inbox, and how it looks. Edits collect in a save bar that counts them, and Save or Discard settles them all at once."
      preview={{
        lede: 'Change your name or bio, turn off email digests, switch the colorway to Graphite: the save bar rises and counts. Try a bad email and press ⌘S, then fix it and save, or discard.',
        caption: 'live block · sample data · simulated save',
        node: <Preview />,
      }}
      use={[
        { id: 'U1', title: 'An account’s or workspace’s preferences', body: 'A few sections of settings that belong together and are saved together, with a way back.' },
        { id: 'U2', title: 'Edits that should be reviewed before they count', body: 'A profile, an email address, a public bio: the bar makes the change visible until it’s saved or discarded.' },
      ]}
      avoid={[
        { id: 'N1', title: 'A single toggle that should act at once', body: 'A setting that takes effect the moment it changes (a mute, a dark mode) is a Switch on its own, with no save.' },
        { id: 'N2', title: 'Dozens of sections', body: 'Past a handful, people search for a setting: add a search field and group the nav, or split settings into pages.' },
      ]}
      install={{
        file: 'src/blocks/settings.tsx',
        usage: `import { Settings, type SettingsValues } from '@/blocks/settings';

export function AccountSettings({ values }: { values: SettingsValues }) {
  return (
    <Settings
      initial={values}
      onSave={(next) => fetch('/api/settings', { method: 'PUT', body: JSON.stringify(next) }).then(() => {})}
    />
  );
}

// Replace SAVED (the sample data) with the account's values, and the photo's object URL with an upload.`,
      }}
      builtFrom={[
        { label: 'Sidebar', to: '/components/sidebar' },
        { label: 'Select', to: '/components/select' },
        { label: 'Avatar', to: '/components/avatar' },
        { label: 'Form field', to: '/components/form-field' },
        { label: 'Field', to: '/components/field' },
        { label: 'Textarea', to: '/components/textarea' },
        { label: 'Switch', to: '/components/switch' },
        { label: 'Radio group', to: '/components/radio' },
        { label: 'Switcher', to: '/components/switcher' },
        { label: 'Button', to: '/components/button' },
        { label: 'The drum', to: '/foundations/transitions' },
        { label: 'Icons (morph)', to: '/icons' },
      ]}
      behaviour={[
        {
          title: 'Keyboard',
          rules: [
            { id: 'K1', title: 'Tab', body: 'Moves through the sections, then the section’s controls, then Discard and Save when the bar is up.' },
            { id: 'K2', title: '⌘S or Ctrl+S', body: 'Saves from anywhere in the block; with a field not accepted, focus goes to it instead.' },
            { id: 'K3', title: 'Space and arrows', body: 'Space turns a switch; arrows choose within a radio group or the colorway.' },
          ],
        },
        {
          title: 'Accessibility',
          rules: [
            { id: 'A1', title: 'Every control is named', body: 'Fields by their labels, switches by their row’s words (and described by the line under them), groups by their titles.' },
            { id: 'A2', title: 'The bar is a region, and results are said', body: 'The save bar is a region named “Unsaved changes”; a polite status says what was saved, discarded or refused, and why.' },
            { id: 'A3', title: 'Errors are tied to fields', body: 'A field not accepted is marked invalid and its message is read with it; a refused save moves focus to it.' },
            { id: 'A4', title: 'Focus never falls to the page', body: 'When the bar leaves with focus in it, focus goes to the section’s title.' },
          ],
        },
        {
          title: 'Motion',
          rules: [
            { id: 'M1', title: 'The bar is put there', body: 'It rises from the block’s bottom edge on the object spring, and sinks away on the release spring after Saved or Discard.' },
            { id: 'M2', title: 'The wait lives in the key', body: 'Save stays down while it saves; its glyph morphs document → clock → check and the label turns Save → Saving… → Saved.' },
            { id: 'M3', title: 'Sections come from their side', body: 'A new section’s panel drifts in one nest from the direction the highlight went, on the settle spring.' },
            { id: 'M4', title: 'Reduce Motion', body: 'The system’s, the site’s or the block’s own switch: everything changes at once, and the drum crossfades.' },
          ],
        },
        {
          title: 'Responsive',
          rules: [
            { id: 'R1', title: 'It measures itself', body: 'The block is a container: from 36rem the sections are a list on the left; under that they are a Select at the top, and the bar keeps only its count.' },
          ],
        },
      ]}
      tune={{ lede: 'The Settings panel swaps the springs the save bar rises and leaves on and a section comes in on, and stretches time.', node: <Tuned /> }}
      source={source}
    />
  );
}
