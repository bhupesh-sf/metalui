import * as React from 'react';
import { useDialKit } from 'dialkit';
import { ToastProvider } from '@unlocalhosted/metalui';
import { type SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import { TaskInbox } from '../../blocks/task-inbox/task-inbox';
import source from '../../blocks/task-inbox/task-inbox.tsx?raw';
import { BlockPage } from '../../ui/BlockPage';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';

/* ─────────────────────────────────────────────────────────
 * INBOX TUNER: the page's DialKit panel
 *
 *   leave    the spring a finished or deleted row leaves on
 *   travel   the spring the rows under it travel up on (and rows re-sort on)
 *   arrive   the spring the tool strip rises on, and undone rows land on
 *   slow     stretches time, to watch a row settle out and the rest close up
 * ───────────────────────────────────────────────────────── */

function Tuned() {
  const d = useDialKit('Inbox', {
    leave: { type: 'select', options: SPRING_NAMES, default: 'release' },
    travel: { type: 'select', options: SPRING_NAMES, default: 'settle' },
    arrive: { type: 'select', options: SPRING_NAMES, default: 'object' },
    slow: [1, 1, 10],
  });
  const vars = {
    ...springVars('release', d.leave as SpringName, d.slow),
    ...springVars('settle', d.travel as SpringName, d.slow),
    ...springVars('object', d.arrive as SpringName, d.slow),
  } as React.CSSProperties;
  return <div data-testid="inbox-tuner" className="flex w-full justify-center" style={vars}><TaskInbox /></div>;
}

export default function TaskInboxPage() {
  return (
    <ToastProvider>
      <BlockPage
        title="Task inbox"
        lede="A team’s tasks in one list: search them, switch between all, yours, due soon and done, tick one off, or select several and complete, assign, snooze or delete them together, with Undo."
        play={{
          lede: 'Tick a task and watch it settle into Done. Select a few (the gutter box, x, or ⌘-click) and use the strip; Undo puts everything back. The keys: ↑ ↓ move, x select, e complete, ↩ open, / search, ⎋ clear.',
          caption: 'live block · sample tasks · today is Wed 30 Sep',
          node: <div className="flex w-full justify-center"><TaskInbox /></div>,
        }}
            usage={{
          file: 'src/blocks/task-inbox.tsx',
          code: `import { ToastProvider } from '@unlocalhosted/metalui';
import { TaskInbox } from '@/blocks/task-inbox';

// The inbox says what it did in a toast (with Undo), so it lives under a ToastProvider:
// put one once near your app's root.
export function Tasks() {
  return (
    <ToastProvider>
      <TaskInbox />
    </ToastProvider>
  );
}

// Replace TASKS and PEOPLE (the sample data) with your own, TODAY with new Date(), and ME with the
// person who is signed in. Each change goes through commit(): send it to your server there.`,
        }}
        madeOf={[
          { label: 'Checkbox', to: '/components/checkbox' },
          { label: 'Field', to: '/components/field' },
          { label: 'Switcher', to: '/components/switcher' },
          { label: 'Avatar', to: '/components/avatar' },
          { label: 'Button', to: '/components/button' },
          { label: 'Menu', to: '/components/menu' },
          { label: 'Alert dialog', to: '/components/alert-dialog' },
          { label: 'Toast', to: '/components/toast' },
          { label: 'Empty state', to: '/components/empty-state' },
          { label: 'Tool strip', to: '/components/tool-strip' },
          { label: 'Materials (graphite strip)', to: '/foundations/materials' },
          { label: 'Kbd', to: '/components/kbd' },
          { label: 'The drum', to: '/foundations/transitions' },
          { label: 'Icons', to: '/icons' },
        ]}
          more={[{ id: 'tune', title: 'Tune it', lede: 'The Inbox panel swaps the springs rows leave, travel and land on (and the strip rises on), and stretches time.', node: <Tuned /> }]}
        source={source}
      rules={[
        { id: 'U1', title: 'A shared list of small jobs', body: 'Tasks, tickets or requests that people finish one by one and triage several at a time.', origin: 'Use it for' },
        { id: 'U2', title: 'Triage from the keyboard', body: 'Someone who clears a list every morning: move, select, complete and snooze without a pointer.', origin: 'Use it for' },
        { id: 'N1', title: 'Planning work over weeks', body: 'Status columns, estimates and dependencies need a board or a table with sorting, not an inbox.', origin: 'Not for' },
        { id: 'N2', title: 'A personal checklist', body: 'Nobody else, no due dates, no triage: a list of checkboxes is enough.', origin: 'Not for' },
        { id: 'K1', title: 'One stop in the list', body: 'Tab enters the list at the focused row and leaves it on the next Tab. ↑ ↓ (Home, End) move the focus row; ← → move between its selection box, its completion box and the task.', origin: 'Keyboard' },
        { id: 'K2', title: 'x, Space, ⇧ ↑ ↓, ⌘A', body: 'Select the focused row, extend the selection up or down, or select every row in the view.', origin: 'Keyboard' },
        { id: 'K3', title: 'e, ⌫, ↩', body: 'e completes the selection (or the focused row); ⌫ asks before deleting it; ↩ opens the focused row.', origin: 'Keyboard' },
        { id: 'K4', title: '⎋, /, ⌘Z', body: '⎋ clears the selection (in the search, it clears the search first); / goes to the search; ⌘Z undoes the last change.', origin: 'Keyboard' },
        { id: 'K5', title: '↓ from the search', body: 'Goes to the first result, so typing and triage are one motion.', origin: 'Keyboard' },
        { id: 'A1', title: 'A grid with multi-select', body: 'The list is role="grid" with aria-multiselectable: each row holds two real checkboxes and the task, so it can’t be a listbox (an option may not contain controls). Each row says whether it is selected.', origin: 'Accessibility' },
        { id: 'A2', title: 'Counts and results are said', body: 'A polite status says how many tasks match once typing pauses, and how many are selected; each change is said by its toast, and Undo is said too.', origin: 'Accessibility' },
        { id: 'A3', title: 'Late is said in words', body: '“2 days late” in the invalid ink, never the colour alone; the empty states say why a view is empty.', origin: 'Accessibility' },
        { id: 'A4', title: 'Focus never falls to the page', body: 'A row that leaves hands focus to the next one; the last one leaving hands it to the search.', origin: 'Accessibility' },
        { id: 'M1', title: 'The tick, then a beat', body: 'Completing draws the tick; the row waits 900 ms so you see it done, then steps down and fades on the release spring while the rows under it travel up.', origin: 'Motion' },
        { id: 'M2', title: 'The strip rises', body: 'The first selection raises the tool strip one nest on the object spring; the last one sinks it on release. Its count turns on the drum.', origin: 'Motion' },
        { id: 'M3', title: 'Undo lands', body: 'Rows that come back drop one nest into place on the object spring: they were put back.', origin: 'Motion' },
        { id: 'M4', title: 'Reduce Motion', body: 'Everything changes at once; the tick is whole; the drum crossfades. The beat before a finished row goes stays: it is a pause, not a motion.', origin: 'Motion' },
        { id: 'R1', title: 'It measures itself', body: 'The block is a container: under 32rem a task’s due date and tag go under its title and the strip’s verbs keep only their glyphs; on a touch screen the selection boxes always show and the key hints hide.', origin: 'Responsive' },
      ]}
      />
    </ToastProvider>
  );
}
