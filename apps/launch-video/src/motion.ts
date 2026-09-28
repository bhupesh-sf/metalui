import { spring } from 'remotion';
import tokens from '../../../tokens/tokens.json';
import { FPS } from './time';

/**
 * Motion in the video is the library's motion: the same mass-class springs (tokens.json springs,
 * mass 1) the components use, stepped by frame. Nothing moves by the clock.
 *
 * Music is heard at the moment of contact, so a thing that lands on a beat must launch early by
 * its spring's time to first contact. `land` does that; `react` is for things that answer a hit
 * after it happens (a release, a flash, a recoil).
 */
export type Mass = 'part' | 'object' | 'hinge' | 'surface' | 'settle' | 'release' | 'chrome';

const config = (mass: Mass) => ({ stiffness: tokens.springs[mass].stiffness, damping: tokens.springs[mass].damping, mass: 1, overshootClamping: false });

const value = (mass: Mass, frames: number) => (frames <= 0 ? 0 : spring({ frame: frames, fps: FPS, config: config(mass) }));

/**
 * Touching down: 99.5% of the travel, under half a pixel on any move in the film. A critically
 * damped spring (chrome) only approaches its target, so "reaches 1" would never come.
 */
export const CONTACT = 0.995;
const contact = new Map<Mass, number>();

/** Frames from launch until the spring first touches down. */
export function contactFrames(mass: Mass): number {
  let f = contact.get(mass);
  if (f === undefined) {
    f = 1;
    while (value(mass, f) < CONTACT && f < FPS * 2) f++;
    contact.set(mass, f);
  }
  return f;
}

/** 0..1 (with the spring's overshoot) for a move that touches down exactly on frame `at`. */
export function land(frame: number, at: number, mass: Mass): number {
  return value(mass, frame - (at - contactFrames(mass)));
}

/** 0..1 for a move that starts on frame `at`. */
export function react(frame: number, at: number, mass: Mass): number {
  return value(mass, frame - at);
}

/** Linear 0..1 between two frames, clamped. For things the music sweeps, like a riser or a fade. */
export function sweep(frame: number, from: number, to: number): number {
  return Math.max(0, Math.min(1, (frame - from) / (to - from)));
}

export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
