// ============================================================
// Metronome: a Web Audio click track.
//
// Uses the classic "lookahead" pattern: a short JS timer wakes
// every ~25 ms and schedules any clicks due in the next ~120 ms
// directly on the audio clock. The audio clock is sample
// accurate, so the beat stays steady even when the main thread
// is busy re-rendering.
//
// Clicks are tiny oscillator blips (no samples to download)
// built on Tone's shared AudioContext and routed through Tone's
// destination, so the header's Sound on / Muted toggle applies
// to the metronome too.
// ============================================================

import * as Tone from "tone";

export const MIN_BPM = 30;
export const MAX_BPM = 250;
export const DEFAULT_BPM = 100;

export type BeatLevel = "strong" | "medium" | "weak";

export function clampBpm(bpm: number): number {
  if (!Number.isFinite(bpm)) {
    return DEFAULT_BPM;
  }

  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(bpm)));
}

// How loud/bright each beat of the bar is. Beat 1 is always the
// strong downbeat. 6/8 is felt in two, so beat 4 gets a lighter
// secondary accent. With accents off every beat is equal.
export function beatLevels(
  beatsPerBar: number,
  accentOn: boolean
): BeatLevel[] {
  return Array.from({ length: beatsPerBar }, (_, index) => {
    if (!accentOn) {
      return "weak";
    }

    if (index === 0) {
      return "strong";
    }

    if (beatsPerBar === 6 && index === 3) {
      return "medium";
    }

    return "weak";
  });
}

// Tap tempo: average the gaps between recent taps. A pause
// longer than TAP_RESET_MS starts a fresh count, so a new
// tempo doesn't get blended with the old one.
export const TAP_RESET_MS = 2000;
const TAP_WINDOW = 6;

export function bpmFromTaps(taps: number[]): number | null {
  const recent = taps.slice(-TAP_WINDOW);

  if (recent.length < 2) {
    return null;
  }

  let total = 0;
  for (let index = 1; index < recent.length; index += 1) {
    total += recent[index] - recent[index - 1];
  }

  const average = total / (recent.length - 1);

  if (average <= 0) {
    return null;
  }

  return clampBpm(60000 / average);
}

// ---- Swing -------------------------------------------------
//
// Swing stretches the first eighth of each beat and shortens
// the second. The ratio is long:short, so 2 is the classic
// triplet swing (the "and" lands on the last triplet) and 1 is
// straight eighths. "off" means no eighth-note clicks at all.

export type SwingFeel = "off" | "straight" | "light" | "medium" | "hard";

export const SWING_FEELS: {
  id: SwingFeel;
  label: string;
  ratio: number;
  hint: string;
}[] = [
  { id: "off", label: "Off", ratio: 1, hint: "Quarter notes only" },
  { id: "straight", label: "Straight 8ths", ratio: 1, hint: "Even eighths, rock and Latin" },
  { id: "light", label: "Light swing", ratio: 1.5, hint: "3:2, relaxed and fast tempos" },
  { id: "medium", label: "Swing (triplet)", ratio: 2, hint: "2:1, the classic jazz feel" },
  { id: "hard", label: "Hard swing", ratio: 3, hint: "3:1, dotted-eighth shuffle" },
];

export function swingRatio(feel: SwingFeel): number {
  return SWING_FEELS.find((item) => item.id === feel)?.ratio ?? 1;
}

// Where the "and" of a beat falls, as a fraction of the beat:
// 0.5 straight, 2/3 for triplet swing, 0.75 for hard swing.
export function offbeatFraction(ratio: number): number {
  const safe = Number.isFinite(ratio) && ratio > 0 ? ratio : 1;

  return safe / (safe + 1);
}

// Moves a position given in straight beats (1.5 = the "and"
// of beat 2) to where it falls under swing. Only eighth-note
// off-beats move; downbeats and other subdivisions stay put.
export function swingBeat(position: number, ratio: number): number {
  const whole = Math.floor(position);
  const fraction = position - whole;

  if (Math.abs(fraction - 0.5) > 1e-6) {
    return position;
  }

  return whole + offbeatFraction(ratio);
}

// ---- Engine ------------------------------------------------

const LOOKAHEAD_SECONDS = 0.12;
const TICK_MS = 25;

const CLICK: Record<
  BeatLevel,
  { frequency: number; gain: number }
> = {
  strong: { frequency: 1760, gain: 0.9 },
  medium: { frequency: 1320, gain: 0.6 },
  weak: { frequency: 990, gain: 0.45 },
};

// The swung "and" between beats: lower and softer than a beat.
const OFFBEAT_CLICK = { frequency: 760, gain: 0.28 };

export interface MetronomeSettings {
  bpm: number;
  beatsPerBar: number;
  accentOn: boolean;
  // Eighth-note clicks between the beats, straight or swung.
  swing?: SwingFeel;
  // Jazz practice: only beats 2 and 4 click (every other beat
  // in other meters); the others still flash on screen.
  backbeat?: boolean;
}

// Beats that sound when "click on 2 & 4" is on. In 4/4 that
// is 2 and 4; in other meters every other beat after the 1.
export function clicksOnBeat(
  beatIndex: number,
  backbeat: boolean
): boolean {
  return !backbeat || beatIndex % 2 === 1;
}

export interface MetronomeEngine {
  // `startAt` (AudioContext seconds) puts the first click at an
  // exact time, so another part of the app can play in time with
  // it; by default the first click is right away.
  start: (startAt?: number) => Promise<void>;
  stop: () => void;
  update: (settings: Partial<MetronomeSettings>) => void;
  isRunning: () => boolean;
}

// onBeat fires (on the main thread) roughly when each click is
// heard, with the beat's index within the bar.
export function createMetronome(
  initial: MetronomeSettings,
  onBeat: (beatIndex: number) => void
): MetronomeEngine {
  const settings: MetronomeSettings = { ...initial };

  let timer: number | null = null;
  // Bumped by every start()/stop() so a start that is still
  // waiting on Tone.start() can tell it has been superseded.
  let generation = 0;
  let nextBeatTime = 0;
  let beatIndex = 0;
  const pendingVisuals = new Set<number>();

  function scheduleClick(
    time: number,
    { frequency, gain }: { frequency: number; gain: number }
  ) {
    const context = Tone.getContext();

    const oscillator = context.createOscillator();
    const envelope = context.createGain();

    oscillator.type = "square";
    oscillator.frequency.value = frequency;

    // Fast attack, ~60 ms exponential decay: a short "tick".
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(
      gain * 0.25,
      time + 0.002
    );
    envelope.gain.exponentialRampToValueAtTime(
      0.0001,
      time + 0.06
    );

    oscillator.connect(envelope);
    Tone.connect(envelope, Tone.getDestination());

    oscillator.start(time);
    oscillator.stop(time + 0.07);
    oscillator.onended = () => {
      envelope.disconnect();
    };
  }

  function scheduleVisual(time: number, index: number) {
    const delayMs = Math.max(
      0,
      (time - Tone.getContext().currentTime) * 1000
    );

    const id = window.setTimeout(() => {
      pendingVisuals.delete(id);
      onBeat(index);
    }, delayMs);

    pendingVisuals.add(id);
  }

  function tick() {
    const context = Tone.getContext();

    while (
      nextBeatTime <
      context.currentTime + LOOKAHEAD_SECONDS
    ) {
      // Settings can change mid-run; a shorter bar wraps
      // straight back to the downbeat.
      if (beatIndex >= settings.beatsPerBar) {
        beatIndex = 0;
      }

      const level = beatLevels(
        settings.beatsPerBar,
        settings.accentOn
      )[beatIndex];

      const secondsPerBeat = 60 / settings.bpm;
      const swing = settings.swing ?? "off";

      if (clicksOnBeat(beatIndex, settings.backbeat ?? false)) {
        // With clicks on 2 & 4 the backbeat carries the accent.
        scheduleClick(
          nextBeatTime,
          CLICK[settings.backbeat ? "medium" : level]
        );
      }

      if (swing !== "off") {
        scheduleClick(
          nextBeatTime +
            secondsPerBeat * offbeatFraction(swingRatio(swing)),
          OFFBEAT_CLICK
        );
      }

      scheduleVisual(nextBeatTime, beatIndex);

      nextBeatTime += secondsPerBeat;
      beatIndex += 1;
    }
  }

  return {
    async start(startAt?: number) {
      if (timer !== null) {
        return;
      }

      // A newer start() or a stop() bumps the generation, so
      // only the latest request survives the audio-unlock wait
      // (Start, Stop, Start quickly still ends up running).
      const myGeneration = ++generation;

      // Browsers keep audio suspended until a user gesture;
      // start() is always called from a click.
      await Tone.start();

      // stop() (or a newer start) ran while we were waiting.
      if (myGeneration !== generation) {
        return;
      }

      beatIndex = 0;
      nextBeatTime = Math.max(
        startAt ?? 0,
        Tone.getContext().currentTime + 0.05
      );
      tick();
      timer = window.setInterval(tick, TICK_MS);
    },

    stop() {
      generation += 1;

      if (timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }

      for (const id of pendingVisuals) {
        window.clearTimeout(id);
      }
      pendingVisuals.clear();
    },

    update(next) {
      Object.assign(settings, next);
    },

    isRunning() {
      return timer !== null;
    },
  };
}
