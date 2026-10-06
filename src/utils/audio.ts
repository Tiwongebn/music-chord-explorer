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

  const { when = 0, duration = 1.6 } = options;

  // Required by browser autoplay rules; must run inside the
  // user gesture, so it lives here and not in preloadAudio.
  await Tone.start();

  const time = Tone.now() + when;
  const active = ensureSampler();

  if (samplerFailed || !active.loaded) {
    // Samples still decoding (first clicks) or unavailable
    // (CDN blocked) — play the fallback so keys never go
    // silent. Once loaded, later notes use the real piano.
    getFallback().triggerAttackRelease(
      cleanName,
      duration,
      time
    );
    return;
  }

  active.triggerAttackRelease(cleanName, duration, time);
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

// Play a sequence of chords back-to-back, one every
// `chordSeconds`. `chords` is a list of pitch-class groups
// (no octave, e.g. [["C","E","G"], ["F","A","C"]]) — an
// octave number is appended automatically.
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

export interface ProgressionLoopHandle {
  stop: () => void;
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