import { Composition } from 'remotion';
import { Animatic } from './Animatic';
import { DURATION, FPS, HEIGHT, WIDTH } from './time';

export function Root() {
  return <Composition id="Animatic" component={Animatic} durationInFrames={DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />;
}
