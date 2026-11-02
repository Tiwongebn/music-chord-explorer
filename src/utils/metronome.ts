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

export interface MetronomeSettings {
  bpm: number;
  beatsPerBar: number;
  accentOn: boolean;
}

export interface MetronomeEngine {
  start: () => Promise<void>;
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
  let nextBeatTime = 0;
  let beatIndex = 0;
  const pendingVisuals = new Set<number>();

  function scheduleClick(time: number, level: BeatLevel) {
    const context = Tone.getContext();
    const { frequency, gain } = CLICK[level];

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

      scheduleClick(nextBeatTime, level);
      scheduleVisual(nextBeatTime, beatIndex);

      nextBeatTime += 60 / settings.bpm;
      beatIndex += 1;
    }
  }

  return {
    async start() {
      if (timer !== null) {
        return;
      }

      // Browsers keep audio suspended until a user gesture;
      // start() is always called from a click.
      await Tone.start();

      beatIndex = 0;
      nextBeatTime = Tone.getContext().currentTime + 0.05;
      tick();
      timer = window.setInterval(tick, TICK_MS);
    },

    stop() {
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
