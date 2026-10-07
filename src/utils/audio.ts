// ============================================================
// Piano audio: Tone.js + Salamander Grand Piano samples.
//
// The sampler only loads a sparse set of samples (A / C /
// D# / F# per octave) — Tone repitches from the nearest one,
// which sounds great and keeps the download small (~3 MB for
// the range this app uses: A2 .. C6).
//
// Public API (unchanged from the synth version):
//   playNote("C#4")                      one note
//   playNotes(["C4","E4","G4"], 0)       a chord
//   setAudioEnabled(false)               mute / unmute
//   preloadAudio()                       start fetching early
// ============================================================

import * as Tone from "tone";
import { applyPattern } from "../data/patterns";
import type { RhythmPattern } from "../data/patterns";
import { playDrumHits, playAccompanimentNotes } from "./backingTrackPlayer";
import type { BackingTrack } from "../data/backingTrack";

let enabled = true;

// ---- Salamander sample map -------------------------------

const SAMPLE_BASE_URL =
  "https://tonejs.github.io/audio/salamander/";

// File names use "s" instead of "#" (Ds4.mp3, Fs4.mp3).
const SAMPLE_URLS: Record<string, string> = {};
for (const octave of [3, 4, 5]) {
  for (const pitch of ["A", "C", "D#", "F#"]) {
    SAMPLE_URLS[`${pitch}${octave}`] =
      `${pitch.replace("#", "s")}${octave}.mp3`;
  }
}
// One sample below and above the keyboard's range (C3-B5).
SAMPLE_URLS["A2"] = "A2.mp3";
SAMPLE_URLS["C6"] = "C6.mp3";

// ---- Engine state ----------------------------------------

let sampler: Tone.Sampler | null = null;
let samplerFailed = false;
let fallback: Tone.PolySynth | null = null;

function ensureSampler(): Tone.Sampler {
  if (!sampler) {
    sampler = new Tone.Sampler({
      urls: SAMPLE_URLS,
      release: 1,
      baseUrl: SAMPLE_BASE_URL,
      onload: () => {
        console.info("Piano samples ready 🎹");
      },
    }).toDestination();

    // Leave headroom so big chords don't clip.
    sampler.volume.value = -6;

    // If the CDN is unreachable (blocked, offline), don't
    // leave every click waiting on buffers that will never
    // arrive — the fallback synth takes over.
    window.setTimeout(() => {
      if (sampler && !sampler.loaded) {
        samplerFailed = true;
      }
    }, 12000);
  }

  return sampler;
}

function getFallback(): Tone.PolySynth {
  if (!fallback) {
    fallback = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle8" },
    }).toDestination();
    fallback.volume.value = -10;
  }

  return fallback;
}

// ---- Public API ------------------------------------------

export function setAudioEnabled(value: boolean): void {
  enabled = value;
  // Muting the destination silences even notes that are
  // still ringing, not just future triggers.
  Tone.getDestination().volume.value = value
    ? 0
    : -Infinity;
}

export function isAudioEnabled(): boolean {
  return enabled;
}

// Fetch + decode the samples in the background so the first
// click already sounds like a piano. Safe to call on mount:
// the context stays suspended until the first user gesture,
// which Tone.start() handles inside playNote.
export function preloadAudio(): void {
  ensureSampler();
}

const LETTER_SEMITONES: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

// "C#4" -> 61, "Bb3" -> 58. Handles #, ##, b, bb.
export function noteToMidi(note: string): number {
  const match = note.match(
    /^([A-Ga-g])(#{1,2}|b{1,2})?(-?\d+)$/
  );

  if (!match) {
    return Number.NaN;
  }

  const [, letter, accidental = "", octaveText] =
    match;

  let midi =
    LETTER_SEMITONES[letter.toUpperCase()] +
    (Number(octaveText) + 1) * 12;

  for (const character of accidental) {
    midi += character === "#" ? 1 : -1;
  }

  return midi;
}

interface PlayOptions {
  when?: number; // seconds from now
  duration?: number; // seconds
  volume?: number; // dB (0 = normal, 6 = +6dB, -3 = -3dB, etc.)
}

// Play one note like "C#4" (also accepts "Cbb3", "F##5" —
// odd spellings from music theory get normalized via a MIDI
// round-trip). Silently ignores unparseable notes and does
// nothing while muted.
export async function playNote(
  note: string,
  options: PlayOptions = {}
): Promise<void> {
  if (!enabled) {
    return;
  }

  const midi = noteToMidi(note);

  if (Number.isNaN(midi)) {
    return;
  }

  // Re-spell via MIDI so Tone always gets a clean name
  // ("D4", "C#4") no matter the incoming accidental style.
  const cleanName = Tone.Frequency(midi, "midi").toNote();

  const { when = 0, duration = 1.6, volume = 0 } = options;

  // Required by browser autoplay rules; must run inside the
  // user gesture, so it lives here and not in preloadAudio.
  await Tone.start();

  const time = Tone.now() + when;
  const active = ensureSampler();

  if (samplerFailed || !active.loaded) {
    // Samples still decoding (first clicks) or unavailable
    // (CDN blocked) — play the fallback so keys never go
    // silent. Once loaded, later notes use the real piano.
    const synth = getFallback();
    const oldVolume = synth.volume.value;
    synth.volume.value = oldVolume + volume;
    synth.triggerAttackRelease(cleanName, duration, time);
    synth.volume.value = oldVolume;
    return;
  }

  const oldVolume = active.volume.value;
  active.volume.value = oldVolume + volume;
  active.triggerAttackRelease(cleanName, duration, time);
  active.volume.value = oldVolume;
}

// Play several notes together (or arpeggiated if you pass a
// stagger). `notes` use octave numbers, e.g. ["C4","E4","G4"].
export function playNotes(
  notes: string[],
  staggerMs = 0
): void {
  notes.forEach((note, index) => {
    playNote(note, {
      when: (index * staggerMs) / 1000,
    });
  });
}

// Play a sequence of equal-length chords back-to-back, one
// every `chordSeconds`. `chords` is a list of pitch-class
// groups (no octave, e.g. [["C","E","G"], ["F","A","C"]]) —
// an octave number is appended automatically.
//
// This is the simple, uniform-timing sibling of
// playTimedProgression() below — kept around because several
// call sites (single-chord previews that happen to reuse this
// path, tests, etc.) don't need per-chord beat lengths and
// shouldn't have to construct a beats array just to play a
// flat sequence.
export function playProgression(
  chords: string[][],
  chordSeconds = 0.85
): void {
  chords.forEach((chordNotes, chordIndex) => {
    const when = chordIndex * chordSeconds;

    chordNotes.forEach((note) => {
      playNote(`${note}4`, {
        when,
        duration: chordSeconds * 0.95,
      });
    });
  });
}

export interface TimedChord {
  notes: string[]; // pitch classes, no octave, e.g. ["C","E","G"]
  beats: number; // how many beats this chord holds for
  isRest?: boolean; // if true, this is silence (no notes)
  isAccented?: boolean; // if true, boost volume
  rootNote?: string; // optional root note for bass layer (e.g. "C")
}

// Play a sequence of chords back-to-back where each chord can
// hold for a different number of beats (see TimedChord) at a
// shared tempo. `secondsPerBeat` is typically 60 / bpm. This
// is what the progression builder uses once chords carry
// their own beat counts; playProgression() above remains for
// simpler, uniform-timing cases.
//
// Supports rests (isRest: true, notes ignored), swing (applies
// a time offset to off-beat notes for a jazzier feel), accents
// (boosts volume on marked beats for dynamics), patterns
// (applies rhythmic articulation like strums or arpeggios),
// and bass layer (plays root notes underneath at specific times).
export function playTimedProgression(
  chords: TimedChord[],
  secondsPerBeat: number,
  options: {
    swingEnabled?: boolean;
    swingRatio?: number; // e.g. 2 for 2:1 swing (typical jazz)
    accentBoost?: number; // dB to add to accented notes, e.g. 6
    pattern?: RhythmPattern; // rhythmic pattern to apply
    bassLayer?: (
      rootNote: string,
      beats: number,
      durationSeconds: number
    ) => any[]; // bass layer function
    backingTrack?: BackingTrack; // full rhythm section (drums + accompaniment)
  } = {}
): void {
  const {
    swingEnabled = false,
    swingRatio = 2,
    accentBoost = 6,
    pattern = undefined,
    bassLayer = undefined,
    backingTrack = undefined,
  } = options;

  let elapsed = 0;
  let beatInMeasure = 0; // for first-measure accents
  const beatsPerMeasure = 4; // standard assumption; could be parameterized

  for (const chord of chords) {
    const duration = chord.beats * secondsPerBeat;
    let beatOffset = 0;

    // Swing: delay off-beat notes. In 2:1 swing (most common
    // in jazz), the second eighth-note of each pair is pushed
    // back by 1/3 of the beat, making the first 2/3 long and
    // the second 1/3 short. We approximate this by delaying
    // notes that land on non-integer beats.
    if (swingEnabled && chord.beats === 1) {
      // Only swing single-beat chords for simplicity;
      // multi-beat chords are unaffected. A full implementation
      // would subdivide longer chords into 8th-note triplets.
      const beatFraction = (elapsed / secondsPerBeat) % 1;
      if (Math.abs(beatFraction - 0.5) < 0.01) {
        // This is approximately the 2nd beat of a pair —
        // swing it back by 1/3.
        beatOffset =
          (secondsPerBeat / swingRatio) *
          ((swingRatio - 1) / swingRatio);
      }
    }

    const when = elapsed + beatOffset;

    // Play bass layer if provided
    if (
      bassLayer &&
      chord.rootNote &&
      !chord.isRest
    ) {
      const bassEvents = bassLayer(
        chord.rootNote,
        chord.beats,
        duration
      );

      for (const bassEvent of bassEvents) {
        for (const beatOffset of bassEvent.beatOffsets) {
          const beatDuration = duration / chord.beats;
          const bassWhen =
            when +
            bassEvent.offsetSeconds +
            beatOffset * beatDuration;
          const bassVolume = bassEvent.volume ?? -2;

          playBassNote(
            chord.rootNote,
            bassWhen,
            bassEvent.noteDuration,
            bassVolume
          );
        }
      }
    }

    // Play backing track (drums + accompaniment) if provided
    if (backingTrack && !chord.isRest && chord.rootNote) {
      // Get drum pattern and play the hits
      const drumPattern = backingTrack.drumPattern(duration);
      playDrumHits(drumPattern.hits, when);

      // Get accompaniment pattern and play the notes
      const accompPattern = backingTrack.accompanimentPattern(
        chord.notes,
        duration
      );
      playAccompanimentNotes(
        accompPattern.notes,
        chord.rootNote,
        when
      );
    }

    if (!chord.isRest) {
      // Apply pattern if provided; otherwise play all notes at once
      if (pattern && chord.notes.length > 0) {
        const patternEvents = applyPattern(
          chord.notes,
          duration,
          pattern
        );

        for (const event of patternEvents) {
          const eventTime = when + event.offsetSeconds;
          const notesToPlay = event.noteIndices.map(
            (idx) => chord.notes[idx]
          );

          if (event.staggerMs && event.staggerMs > 0) {
            // Play with stagger (e.g. strum)
            notesToPlay.forEach((note, index) => {
              const volume =
                chord.isAccented && accentBoost
                  ? accentBoost
                  : 0;

              playNote(`${note}4`, {
                when:
                  eventTime + (index * event.staggerMs!) / 1000,
                duration: duration * 0.95,
                volume,
              });
            });
          } else {
            // Play simultaneously
            notesToPlay.forEach((note) => {
              const volume =
                chord.isAccented && accentBoost
                  ? accentBoost
                  : 0;

              playNote(`${note}4`, {
                when: eventTime,
                duration: duration * 0.95,
                volume,
              });
            });
          }
        }
      } else {
        // No pattern: play all notes at once (block pattern)
        chord.notes.forEach((note) => {
          const volume =
            chord.isAccented && accentBoost ? accentBoost : 0;

          playNote(`${note}4`, {
            when,
            duration: duration * 0.95,
            volume,
          });
        });
      }
    }
    // Rests: no notes, just advance time

    elapsed += duration;
    beatInMeasure = (beatInMeasure + chord.beats) % beatsPerMeasure;
  }
}

export interface ProgressionLoopHandle {
  stop: () => void;
}

// Helper: play a bass note (2 octaves below the chord)
function playBassNote(
  rootNote: string,
  when: number,
  duration: number,
  volume: number = -2
): void {
  if (!rootNote) return;

  const midiNote = noteToMidi(`${rootNote}4`);
  if (Number.isNaN(midiNote)) return;

  // Bass: 2 octaves down
  const bassNote = Tone.Frequency(
    midiNote - 24,
    "midi"
  ).toNote();

  playNote(bassNote, {
    when,
    duration,
    volume,
  });
}

// Repeats `chords` back-to-back forever, one playProgression()
// cycle after another, until stop() is called. Scheduling is
// a plain setTimeout chain (not Tone.Transport) to match the
// rest of this module's fire-and-forget style — good enough
// for a "vamp while I tweak the builder" loop, where sub-ms
// drift across cycles doesn't matter.
export function playProgressionLoop(
  chords: string[][],
  chordSeconds = 0.85
): ProgressionLoopHandle {
  let stopped = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const cycleMs = Math.max(
    chords.length * chordSeconds * 1000,
    1
  );

  function cycle(): void {
    if (stopped) {
      return;
    }

    playProgression(chords, chordSeconds);
    timeoutId = setTimeout(cycle, cycleMs);
  }

  if (chords.length > 0) {
    cycle();
  }

  return {
    stop(): void {
      stopped = true;

      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    },
  };
}

// Loop variant of playTimedProgression() — same per-chord
// beat-length support, repeated until stop() is called. See
// playProgressionLoop() above for the scheduling approach
// (plain setTimeout chain) and its tradeoffs.
export function playTimedProgressionLoop(
  chords: TimedChord[],
  secondsPerBeat: number,
  options?: {
    swingEnabled?: boolean;
    swingRatio?: number;
    accentBoost?: number;
    pattern?: RhythmPattern;
    bassLayer?: (
      rootNote: string,
      beats: number,
      durationSeconds: number
    ) => any[];
    backingTrack?: BackingTrack;
  }
): ProgressionLoopHandle {
  let stopped = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const totalBeats = chords.reduce(
    (sum, chord) => sum + chord.beats,
    0
  );
  const cycleMs = Math.max(
    totalBeats * secondsPerBeat * 1000,
    1
  );

  function cycle(): void {
    if (stopped) {
      return;
    }

    playTimedProgression(chords, secondsPerBeat, options);
    timeoutId = setTimeout(cycle, cycleMs);
  }

  if (chords.length > 0) {
    cycle();
  }

  return {
    stop(): void {
      stopped = true;

      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    },
  };
}