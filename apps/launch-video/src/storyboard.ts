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
    id: 'gadgets', act: 'drop', bars: [17, 20], title: 'The gadgets play the song',
    music: 'Full chorus',
    picture: 'Fader bank, patch bay, needle gauge, scope and counter drum',
    sync: 'Driven by the real meters; a cable plugs on each bar; the drum counts bars',
  },
  {
    id: 'breakdown', act: 'gap', bars: [21, 22], title: 'Breakdown',
    music: 'The chorus again, closing down to a muffled breath: the kick keeps pulsing under a falling low-pass',
    picture: 'The gadgets wind down: meters fall with the filter, lamps drop to standby, the camera eases back',
    sync: 'Meters follow the filter down; the light dims with it',
  },
  {
    id: 'riser', act: 'gap', bars: [23, 23], title: 'Riser',
    music: 'The kick and bass drain away while the highs open under a noise riser; a snare roll speeds up from eighths to sixteenths',
    picture: 'A colorway sweep, bone to graphite',
    sync: 'The sweep follows the riser; a tick per roll hit',
  },
  {
    id: 'gap', act: 'gap', bars: [24, 24], title: 'The gap', layer: 'Instruments',
    music: 'The roll hits thirty-seconds and peaks for three beats, then one beat of silence swells in reverse into the drop',
    picture: 'A lasso draws a selection frame around nothing as the roll peaks; on the silent beat everything stops',
    sync: 'The frame snaps shut on the downbeat of bar 25',
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
