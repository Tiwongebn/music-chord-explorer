// ============================================================
// Backing track player: synthesis of drums + accompaniment.
//
// Uses Tone.js to generate:
// - Synthetic drums (kick, snare, hi-hat) via synths
// - Accompaniment notes (chordal comping) via sampled piano
//
// Public API:
//   playDrumHits(hits, when)           play drum pattern
//   playAccompanimentNotes(notes, ...) play comping pattern
// ============================================================

import * as Tone from "tone";
import type { DrumHit, AccompanimentNote } from "../data/backingTrack";
import { noteToMidi, playNote } from "./audio";

// ---- Drum synths ----

let kickSynth: Tone.Synth | null = null;
let snareSynth: Tone.PolySynth | null = null;
let hatSynth: Tone.MetalSynth | null = null;

function ensureKickSynth(): Tone.Synth {
  if (!kickSynth) {
    kickSynth = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: {
        attack: 0.001,
        decay: 0.5,
        sustain: 0,
        release: 0.1,
      },
    }).toDestination();

    kickSynth.volume.value = -8;
  }

  return kickSynth;
}

function ensureSnareSynth(): Tone.PolySynth {
  if (!snareSynth) {
    snareSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "square" },
      envelope: {
        attack: 0.004,
        decay: 0.2,
        sustain: 0,
        release: 0,
      },
    }).toDestination();

    snareSynth.volume.value = -6;
  }

  return snareSynth;
}

function ensureHatSynth(): Tone.MetalSynth {
  if (!hatSynth) {
    hatSynth = new Tone.MetalSynth({
      frequency: 200,
      envelope: {
        attack: 0.001,
        decay: 0.08,
        release: 0,
      },
      harmonics: [12, 10, 8, 6, 4],
    }).toDestination();

    hatSynth.volume.value = -12;
  }

  return hatSynth;
}

// ---- Drum hit playback ----

async function playKick(
  when: number,
  duration: number,
  frequency: number = 60,
  volume: number = -1
): Promise<void> {
  await Tone.start();

  const synth = ensureKickSynth();
  const oldVolume = synth.volume.value;

  synth.volume.value = oldVolume + volume;
  synth.triggerAttackRelease(
    frequency,
    duration,
    Tone.now() + when
  );
  synth.volume.value = oldVolume;
}

async function playSnare(
  when: number,
  duration: number,
  volume: number = 0
): Promise<void> {
  await Tone.start();

  const synth = ensureSnareSynth();
  const oldVolume = synth.volume.value;

  synth.volume.value = oldVolume + volume;

  // Snare is a harsh noise texture — play a high square wave
  synth.triggerAttackRelease(
    Tone.Frequency("C4"),
    duration,
    Tone.now() + when
  );

  synth.volume.value = oldVolume;
}

async function playHihat(
  when: number,
  duration: number,
  volume: number = -4
): Promise<void> {
  await Tone.start();

  const synth = ensureHatSynth();
  const oldVolume = synth.volume.value;

  synth.volume.value = oldVolume + volume;
  synth.triggerAttackRelease(
    duration,
    Tone.now() + when
  );
  synth.volume.value = oldVolume;
}

async function playTom(
  when: number,
  duration: number,
  frequency: number = 150,
  volume: number = -2
): Promise<void> {
  await Tone.start();

  const synth = ensureKickSynth();
  const oldVolume = synth.volume.value;

  synth.volume.value = oldVolume + volume;
  synth.triggerAttackRelease(
    frequency,
    duration,
    Tone.now() + when
  );
  synth.volume.value = oldVolume;
}

async function playCrash(
  when: number,
  duration: number,
  volume: number = -8
): Promise<void> {
  await Tone.start();

  const synth = ensureHatSynth();
  const oldVolume = synth.volume.value;

  synth.volume.value = oldVolume + volume;
  synth.triggerAttackRelease(
    duration,
    Tone.now() + when
  );
  synth.volume.value = oldVolume;
}

// ---- Public API ----

// Play a collection of drum hits at the specified base time
export async function playDrumHits(
  hits: DrumHit[],
  baseWhen: number = 0
): Promise<void> {
  for (const hit of hits) {
    const when = baseWhen + hit.offsetSeconds;
    const duration = hit.duration;
    const volume = hit.volume ?? -2;

    switch (hit.drum) {
      case "kick":
        await playKick(
          when,
          duration,
          hit.frequency ?? 60,
          volume
        );
        break;

      case "snare":
        await playSnare(when, duration, volume);
        break;

      case "hihat":
        await playHihat(when, duration, volume);
        break;

      case "tom":
        await playTom(
          when,
          duration,
          hit.frequency ?? 150,
          volume
        );
        break;

      case "crash":
        await playCrash(when, duration, volume);
        break;
    }
  }
}

// Play accompaniment notes (comping pattern)
// Converts degree offsets to actual notes relative to the chord root
export async function playAccompanimentNotes(
  notes: AccompanimentNote[],
  chordRootNote: string,
  baseWhen: number = 0
): Promise<void> {
  if (!chordRootNote || notes.length === 0) {
    return;
  }

  const rootMidi = noteToMidi(`${chordRootNote}4`);
  if (Number.isNaN(rootMidi)) {
    return;
  }

  // Map degree offsets to actual semitone offsets
  // (based on major scale intervals for now — could be parameterized)
  const degreeToSemitones: Record<number, number> = {
    0: 0,    // Root
    1: 4,    // Third
    2: 7,    // Fifth
    3: 11,   // Seventh
    4: 12,   // Octave
    5: 16,   // Ninth
    6: 19,   // Eleventh
    7: 23,   // Thirteenth
  };

  for (const note of notes) {
    const when = baseWhen + note.offsetSeconds;
    const duration = note.duration;
    const volume = note.volume ?? -2;

    // Calculate target MIDI note
    const semitones =
      degreeToSemitones[note.degreeOffset] ?? 0;
    const octaveOffset = note.octaveOffset ?? 0;
    const targetMidi =
      rootMidi +
      semitones +
      octaveOffset * 12;

    const targetNote = Tone.Frequency(
      targetMidi,
      "midi"
    ).toNote();

    // Play via the piano sampler (same as melody chords)
    await playNote(targetNote, {
      when,
      duration,
      volume,
    });
  }
}

// Convenience: dispose of all drum synths (for cleanup if needed)
export function disposeDrumSynths(): void {
  kickSynth?.dispose();
  snareSynth?.dispose();
  hatSynth?.dispose();

  kickSynth = null;
  snareSynth = null;
  hatSynth = null;
}
