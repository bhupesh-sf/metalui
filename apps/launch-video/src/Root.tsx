import { Composition } from 'remotion';
import { Animatic } from './Animatic';
import { Film } from './Film';
import { DURATION, FPS, HEIGHT, WIDTH } from './time';

export function Root() {
  return (
    <>
      <Composition id="Film" component={Film} durationInFrames={DURATION} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={{ look: 'canvas' as const }} />
      <Composition id="Animatic" component={Animatic} durationInFrames={DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
    </>
  );
}
