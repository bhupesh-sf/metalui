import type { ComponentType } from 'react';
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from 'remotion';
import { AnimaticCard } from './Animatic';
import { shotAt } from './storyboard';
import { BARS, audioFile, position } from './time';
import { Opener } from './shots/Opener';
import { LOOKS, LookProvider } from './film/stage';
import { Foundations } from './shots/Foundations';

/**
 * The film: every storyboard shot in order over the edit. A built shot plays; a shot not built yet
 * shows its animatic card, so the whole minute can be watched at every stage of the build.
 */
const SHOTS: Partial<Record<string, ComponentType>> = {
  'count-in': Opener,
  foundations: Foundations,
};

export function Film({ look = 'studio' }: { look?: keyof typeof LOOKS }) {
  const frame = useCurrentFrame();
  const shot = shotAt(Math.min(BARS, position(frame).bar));
  const Shot = SHOTS[shot.id];
  return (
    <LookProvider value={LOOKS[look]}>
    <AbsoluteFill>
      {Shot ? <Shot /> : <AnimaticCard />}
      <Audio src={staticFile(audioFile)} />
    </AbsoluteFill>
    </LookProvider>
  );
}
