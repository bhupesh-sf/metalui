import cues from './cues.generated.json';
import meters from './meters.generated.json';

/**
 * The one clock. Every event in the video is placed in musical time (bar, beat, sixteenth) and
 * turned into a frame here, each on its own: a beat is 25.35 frames at 60 fps, so adding frame
 * counts drifts a frame every few bars.
 */
export const FPS = 60;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const DURATION = Math.ceil(cues.seconds * FPS);
export const BARS = cues.bars.length;

export type Bar = (typeof cues.bars)[number];
export const bars: Bar[] = cues.bars;
export const splices = cues.splices;

/** Seconds at a point in the edit. Bars and beats count from 1, sixteenth steps from 0. */
export function at(bar: number, beat = 1, step = 0): number {
  return cues.firstDownbeat + (bar - 1) * cues.barSeconds + (beat - 1) * cues.beatSeconds + (step * cues.beatSeconds) / 4;
}

/** The frame a musical event lands on. */
export function frameAt(bar: number, beat = 1, step = 0): number {
  return Math.round(at(bar, beat, step) * FPS);
}

/**
 * Where a frame sits in the music. `phase` runs 0..1 through the current beat. Read from the
 * middle of the frame: frameAt() rounds, so an event can land up to half a frame before its
 * exact time, and its own frame must still read as that event.
 */
export function position(frame: number) {
  const beats = ((frame + 0.5) / FPS - cues.firstDownbeat) / cues.beatSeconds;
  const whole = Math.floor(beats);
  return {
    bar: Math.floor(whole / 4) + 1,
    beat: (((whole % 4) + 4) % 4) + 1,
    step: Math.floor((beats - whole) * 4),
    phase: beats - whole,
    beats,
  };
}

export type MeterName = 'loud' | 'sub' | 'low' | 'mid' | 'high' | 'kick' | 'snare' | 'hat';

/** A reading of the finished edit at a frame, 0..1: loudness, a band, or a drum hit. */
export function meter(name: MeterName, frame: number): number {
  const series = meters[name] as number[];
  const i = Math.round((frame * meters.fps) / FPS);
  return series[Math.max(0, Math.min(series.length - 1, i))] ?? 0;
}

export const audioFile = cues.audio;
