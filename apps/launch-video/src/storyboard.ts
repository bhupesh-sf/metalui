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
    id: 'count-in', act: 'build', bars: [1, 2], title: 'Opener: eight hits',
    music: 'Four-on-the-floor kick under a held drone',
    picture: 'Sunrise on a lone key; then two components rain onto the table per kick, small parts on the off-beats, and the light blooms to full sun',
    sync: 'Heavy things land on the kick and make neighbours hop, light things tumble and bounce, keys flip; each acts on the off-beat; all jump on kick 8',
  },
  {
    id: 'foundations', act: 'build', bars: [3, 4], title: 'Foundations', layer: 'Foundations',
    music: 'Arcade blips scatter over the kick',
    picture: 'The dot display sparkles; colour, spacing and radius tokens tick in',
    sync: 'A pixel per blip; a token per sixteenth',
  },
  {
    id: 'parts', act: 'build', bars: [5, 6], title: 'Parts become a component', layer: 'Parts',
    music: 'Sidechained synths pump on every kick',
    picture: 'A well, a keycap, a glyph, an LED and a label land a beat apart, named; then hop into one place and snap together as a real tool button',
    sync: 'A part per beat, the table breathing on every kick; the snap on bar 6 beat 3; the pen glyph acts on beat 4',
  },
  {
    id: 'dropout', act: 'build', bars: [7, 8], title: 'Dropout',
    music: 'The bass filters out; bar 8 is near silent',
    picture: 'The canvas fogs out around the new button as the camera closes in; the select pointer glides in',
    sync: "The pointer's act clicks on the last sixteenth of bar 8: the button latches, its LED lights, and holds for the verse",
  },
  {
    id: 'components', act: 'play', bars: [9, 11], title: 'Components', layer: 'Components',
    music: 'The full groove slams in',
    picture: 'The latched button springs up and eleven real components rain down around it, named, each doing its job',
    sync: 'Two a kick; each acts on its off-beat (switch, checkbox, slider on sixteenths, tabs and switcher on beats, a field typing, tools latching); all jump on bar 11 beat 4',
  },
  {
    id: 'fill', act: 'play', bars: [12, 12], title: 'Fill',
    music: 'Stop-start, then a hole on beat 3 and a swoosh on beat 4',
    picture: 'Everything freezes on the stop; the set lifts off the table through the hole; the swoosh whips the camera to drop 1',
    sync: 'Freeze a sixteenth on the stop; lift across beat 3; the whip lands on bar 13',
  },
  {
    id: 'objects', act: 'drop', bars: [13, 16], title: 'Drop 1: Objects', layer: 'Objects',
    music: 'The biggest single hit in the track',
    picture: 'The whole table of objects lands at once: folder, weather, link card; camera pushes in',
    sync: 'Everything lands on beat 1 of bar 13 with the object spring',
  },
  {
    id: 'gadgets', act: 'gap', bars: [17, 22], title: 'The gadgets measure the build',
    music: 'An eight-bar build: a muffle that opens, a snare roll doubling every two bars, the bass draining, a riser',
    picture: 'A counter drum, a needle gauge, a cell grid and a glass badge land and read the build as it climbs',
    sync: 'The counter counts every roll hit, the needle reads the loudness, the cells fill with the build, the badge glows with the riser; the roll shakes the camera',
  },
  {
    id: 'gap', act: 'gap', bars: [23, 24], title: 'The gap', layer: 'Instruments',
    music: 'The roll at thirty-seconds, then one beat of true silence',
    picture: 'A lasso draws a box round the set, counting it; on the silent beat everything holds still',
    sync: 'The box covers the set by the silent beat and snaps into a selection on the downbeat of bar 25',
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
