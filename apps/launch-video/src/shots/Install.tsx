import type { ReactNode } from 'react';
import { Field, Label, StatusBadge, TabList, Tabs } from '@unlocalhosted/metalui';
import { frameAt } from '../time';
import type { Fall } from '../film/stage';

/* ─────────────────────────────────────────────────────────
 * SHOTS 11-13 · INSTALL, COLLAPSE, THE FINAL HIT (video bars 29-35), under the title again
 *
 *   bar 29.1   the tour lands back at the opener's kit, under METAL UI. A tab list and a field land
 *              beneath the title
 *   bars 29-31 one platform a bar: the tab switches on the downbeat and the field types that
 *              platform's real install line, two characters a sixteenth: React, SwiftUI, agents
 *   bar 32     a status badge goes ready
 *   bar 33     the last lift: the kit hops in toward the title, a ring at a time
 *   bar 34.1   the final hit lands on the title: the biggest ripple of the film; metalui.dev is
 *              printed under it, and the picture holds while the hit decays
 * ───────────────────────────────────────────────────────── */

const B = (bar: number, beat: number, step = 0) => frameAt(bar, beat, step);
const SIXTEENTH = (B(29, 2) - B(29, 1)) / 4;

export const INSTALL = B(29, 1);
export const COLLAPSE = B(33, 1);
export const FINAL_HIT = B(34, 1);

const PLATFORMS = [
  { value: 'react', label: 'React', line: 'npm i @unlocalhosted/metalui' },
  { value: 'swift', label: 'SwiftUI', line: 'github.com/vijayksingh/metalui' },
  { value: 'agents', label: 'Agents', line: 'metalui.dev/AI.md' },
];

export interface InstallPiece {
  id: string;
  at: number;
  fall: Fall;
  x: number;
  y: number;
  zoom: number;
  size: [number, number];
  draw: (frame: number) => ReactNode;
}

/** Which platform a frame is on, and how much of its line is typed. */
function installAt(frame: number) {
  const k = Math.max(0, Math.min(2, Math.floor((frame - INSTALL) / (B(30, 1) - B(29, 1)))));
  const p = PLATFORMS[k];
  const from = B(29 + k, 1);
  const typed = frame < from ? 0 : Math.min(p.line.length, 2 * (1 + Math.floor((frame - from) / SIXTEENTH)));
  return { p, text: p.line.slice(0, typed) };
}

export const INSTALL_PIECES: InstallPiece[] = [
  { id: 'i-tabs', at: INSTALL, fall: 'heavy', x: 0, y: 480, zoom: 3, size: [420, 120], draw: (f) => <Tabs value={installAt(f).p.value}><TabList aria-label="Platform" items={PLATFORMS.map(({ value, label }) => ({ value, label }))} /></Tabs> },
  {
    id: 'i-field', at: INSTALL, fall: 'heavy', x: 0, y: 620, zoom: 2.2, size: [880, 110], draw: (f) => (
      // wide enough for the longest line (the Swift package's 30 characters) with room to spare
      <Field style={{ width: 400 }}>
        <Field.Input aria-label="Install" readOnly value={installAt(f).text} placeholder="Install" style={{ fontFamily: '"Martian Mono Variable", monospace' }} />
      </Field>
    ),
  },
  { id: 'i-ready', at: B(32, 1), fall: 'light', x: 0, y: 740, zoom: 3, size: [240, 100], draw: () => <StatusBadge led="live">Ready</StatusBadge> },
];

/** The address, printed under the title for the final hit. */
export function Address() {
  return <Label variant="engraved" style={{ fontSize: 15, letterSpacing: '0.3em' }}>metalui.dev</Label>;
}
