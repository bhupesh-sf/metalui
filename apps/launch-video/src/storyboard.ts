/**
 * The storyboard, authored in video bars (see time.ts). The music says what happens; the picture
 * answers it. Keep one mapping for the whole minute so the eye learns it within seconds:
 *
 *   kick -> press, land, LED       snare / backbeat -> cut, colorway flip
 *   sixteenths -> ticks, detents, typing       sidechain pump -> the frame breathes
 *   riser -> sweep       silence -> hold dead still
 */
export type Act = 'build' | 'play' | 'drop' | 'gap' | 'peak' | 'end';

export interface Shot {
  id: string;
  act: Act;
  /** First and last video bar, inclusive. */
  bars: [number, number];
  title: string;
  music: string;
  picture: string;
  /** What lands on which count. */
  sync: string;
  /** The library layer this shot introduces, engraved on screen. */
  layer?: string;
}

export const storyboard: Shot[] = [
  {
    id: 'count-in', act: 'build', bars: [1, 2], title: 'Count-in',
    music: 'Four-on-the-floor kick under a held drone',
    picture: 'Black. A row of eight LEDs on a bone plate; the backlight warms with the drone',
    sync: 'One LED lights per kick, eight kicks',
  },
  {
    id: 'foundations', act: 'build', bars: [3, 4], title: 'Foundations', layer: 'Foundations',
    music: 'Arcade blips scatter over the kick',
    picture: 'The dot display sparkles; colour, spacing and radius tokens tick in',
    sync: 'A pixel per blip; a token per sixteenth',
  },
  {
    id: 'parts', act: 'build', bars: [5, 6], title: 'Parts', layer: 'Parts',
    music: 'Sidechained synths pump on every kick',
    picture: 'Well, plate, keycap, LED, glyph land one by one; the whole frame breathes',
    sync: 'One part lands per beat; scale 0.985 on the kick, back over the beat',
  },
  {
    id: 'dropout', act: 'build', bars: [7, 8], title: 'Dropout',
    music: 'The bass filters out; bar 8 is near silent',
    picture: 'Light dims with the filter to one Button; a cursor arrives',
    sync: 'The button goes down on the last sixteenth of bar 8 and holds',
  },
  {
    id: 'components', act: 'play', bars: [9, 11], title: 'Components', layer: 'Components',
    music: 'The full groove slams in',
    picture: 'Switch, slider, tabs, select, toast: each operated in turn',
    sync: 'The button releases on the downbeat; one component every two beats',
  },
  {
    id: 'fill', act: 'play', bars: [12, 12], title: 'Fill',
    music: 'Stop-start, then a hole and a swoosh',
    picture: 'Freeze frames on the stops, black on the hole, a wipe on the swoosh',
    sync: 'Freeze on each stop; the wipe rides the swoosh',
  },
  {
    id: 'objects', act: 'drop', bars: [13, 16], title: 'Drop 1: Objects', layer: 'Objects',
    music: 'The biggest single hit in the track',
    picture: 'The whole table of objects lands at once: folder, weather, link card; camera pushes in',
    sync: 'Everything lands on beat 1 of bar 13 with the object spring',
  },
  {
    id: 'gadgets', act: 'gap', bars: [17, 22], title: 'The gadgets wind up the build',
    music: 'An eight-bar build: the chorus cuts to a muffle and opens steadily, a snare roll doubles every two bars, the kick doubles under it, noise and a pitched riser climb',
    picture: 'Fader bank, patch bay, needle gauge and scope wind up the build: faders ride the filter open, lamps tick with every roll hit, needles climb',
    sync: 'A tick per roll hit, so the picture speeds up with the roll; the light opens with the filter',
  },
  {
    id: 'gap', act: 'gap', bars: [23, 24], title: 'The gap', layer: 'Instruments',
    music: 'The roll hits thirty-seconds, the bass is gone, the riser peaks; then one beat of true silence',
    picture: 'A lasso draws a selection frame around nothing as the roll peaks; on the silent beat everything freezes',
    sync: 'The lasso closes its loop on the last roll hit; the frame snaps shut on the downbeat of bar 25',
  },
  {
    id: 'everywhere', act: 'peak', bars: [25, 28], title: 'Final chorus: everywhere',
    music: 'The climax: the weight crashes back on an impact (sub drop, noise wash, snare), the loudest bars of the film',
    picture: 'React and SwiftUI side by side, then the agent guides',
    sync: 'Everything slams in on the impact frame; both platforms land together on the same spring',
  },
  {
    id: 'install', act: 'peak', bars: [29, 32], title: 'Install',
    music: 'The peak continues',
    picture: 'npx shadcn add types out; the colorway flips',
    sync: 'A character per sixteenth; a colorway flip on each backbeat',
  },
  {
    id: 'collapse', act: 'end', bars: [33, 33], title: 'Collapse',
    music: 'The last lift',
    picture: 'Everything folds back into one keycap',
    sync: 'Folds on each beat, landing by the bar line',
  },
  {
    id: 'final-hit', act: 'end', bars: [34, 35], title: 'MetalUI',
    music: 'The final hit and its decay',
    picture: 'The keycap presses: MetalUI, metalui.dev',
    sync: 'Press on the hit; the LED fades with the decay',
  },
];

export function shotAt(bar: number): Shot {
  return storyboard.find((s) => bar >= s.bars[0] && bar <= s.bars[1]) ?? storyboard[bar < 1 ? 0 : storyboard.length - 1];
}
