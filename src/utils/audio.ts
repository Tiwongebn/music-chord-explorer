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
import { voiceChordForGuitar } from "./guitarVoicings";

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

// ---- Guitar ----------------------------------------------
//
// Real acoustic-guitar samples (see public/samples/guitar/
// CREDITS.md), fetched only once the guitar panel asks for
// them. Until they arrive, or if they fail to load, a
// Karplus-Strong pluck (Tone.PluckSynth, no download) stands
// in. Either way each guitar string is its own voice, so
// re-plucking a string cuts its old note off like a real one.

const GUITAR_STRINGS = 6;

// Roughly every minor third from E2 to D5; Tone repitches the
// gaps. Guitar range here is E2 up to G5 (fret 15, high e).
const GUITAR_SAMPLE_NOTES = [
  "E2", "G2", "A#2", "C#3", "E3", "G3",
  "A#3", "C#4", "E4", "G4", "B4", "D5",
];

let guitarSampler: Tone.Sampler | null = null;
let guitarFailed = false;
let pluckers: Tone.PluckSynth[] = [];
// Last note sounding on each string, so a re-pluck can cut it.
const ringing: (string | null)[] = Array(GUITAR_STRINGS).fill(null);

function ensureGuitarSampler(): Tone.Sampler {
  if (!guitarSampler) {
    const urls: Record<string, string> = {};

    for (const note of GUITAR_SAMPLE_NOTES) {
      urls[note] = `${note.replace("#", "s")}.mp3`;
    }

    guitarSampler = new Tone.Sampler({
      urls,
      release: 0.4,
      baseUrl: `${import.meta.env.BASE_URL}samples/guitar/`,
      onerror: () => {
        guitarFailed = true;
      },
    }).toDestination();

    // The samples are recorded hot; a six-string strum peaks near
    // 0.7 at this level, so it should not clip.
    guitarSampler.volume.value = -9;
  }

  return guitarSampler;
}

// Start fetching the guitar samples (about 2 MB). Safe to call
// repeatedly; the panel calls it when it first appears.
export function preloadGuitar(): void {
  ensureGuitarSampler();
}

function getPluckers(): Tone.PluckSynth[] {
  if (pluckers.length === 0) {
    pluckers = Array.from({ length: GUITAR_STRINGS }, () => {
      const voice = new Tone.PluckSynth({
        attackNoise: 1.5,
        dampening: 3600,
        resonance: 0.97,
      }).toDestination();

      // Six voices can stack up, so leave plenty of headroom.
      voice.volume.value = -9;

      return voice;
    });
  }

  return pluckers;
}

export interface GuitarString {
  // 0 = lowest string. Each string sounds one note at a time.
  string: number;
  note: string; // e.g. "G3"
}

// Pluck one string now (or `when` seconds from now).
export async function playGuitarString(
  { string, note }: GuitarString,
  when = 0
): Promise<void> {
  if (!enabled) {
    return;
  }

  const midi = noteToMidi(note);

  if (Number.isNaN(midi) || string < 0 || string >= GUITAR_STRINGS) {
    return;
  }

  await Tone.start();

  const name = Tone.Frequency(midi, "midi").toNote();
  const time = Tone.now() + when;
  const sampler = ensureGuitarSampler();

  if (guitarFailed || !sampler.loaded) {
    getPluckers()[string].triggerAttack(name, time);
    return;
  }

  const previous = ringing[string];

  if (previous) {
    sampler.triggerRelease(previous, time);
  }

  ringing[string] = name;
  sampler.triggerAttack(name, time);
}

// Rake across the strings. "down" goes low to high (the way a
// downstroke hits), "up" goes high to low. `spreadMs` is the gap
// between neighbouring strings; a few ms of jitter keeps it
// from sounding mechanical.
export function strumGuitar(
  strings: GuitarString[],
  direction: "down" | "up" = "down",
  spreadMs = 40
): void {
  const ordered = [...strings].sort((a, b) =>
    direction === "down" ? a.string - b.string : b.string - a.string
  );

  ordered.forEach((item, index) => {
    const jitter = (Math.random() - 0.5) * Math.min(spreadMs, 12);

    playGuitarString(
      item,
      Math.max(0, (index * spreadMs + jitter) / 1000)
    );
  });
}

// ---- Instruments for chord playback -----------------------
//
// Progressions can play on the piano or on one of three guitars.
// "acoustic" uses the real samples above (Karplus-Strong until
// they load); "nylon" and "electric" are pure Karplus-Strong
// voices (Tone.PluckSynth) with different tone, so they cost no
// download. Guitars play real shapes from guitarVoicings, one
// note per string, so strums and arpeggios rake across strings.

export type InstrumentId = "piano" | "acoustic" | "nylon" | "electric";

export const INSTRUMENTS: { id: InstrumentId; label: string }[] = [
  { id: "piano", label: "Piano" },
  { id: "acoustic", label: "Acoustic guitar" },
  { id: "nylon", label: "Nylon guitar" },
  { id: "electric", label: "Electric guitar (clean)" },
];

export function isInstrumentId(value: unknown): value is InstrumentId {
  return INSTRUMENTS.some((instrument) => instrument.id === value);
}

interface SynthGuitar {
  voices: Tone.PluckSynth[];
  gains: Tone.Gain[]; // per string, so accents can change level
}

const synthGuitars: Partial<Record<InstrumentId, SynthGuitar>> = {};
let guitarRoom: Tone.Reverb | null = null;

// A short, quiet room shared by the synth guitars. Without it a
// bare Karplus-Strong pluck sounds boxy.
function getGuitarRoom(): Tone.Reverb {
  if (!guitarRoom) {
    guitarRoom = new Tone.Reverb({ decay: 1.4, wet: 0.2 }).toDestination();
  }

  return guitarRoom;
}

const SYNTH_TONES = {
  // Soft, round: less pick noise, darker filter.
  nylon: { attackNoise: 0.7, dampening: 2100, resonance: 0.975, volume: -4 },
  // Bright and sustaining, through a light chorus.
  electric: { attackNoise: 1.1, dampening: 5200, resonance: 0.985, volume: -9 },
  // Stand-in for the acoustic samples while they load.
  acoustic: { attackNoise: 1.5, dampening: 3600, resonance: 0.97, volume: -9 },
} as const;

function getSynthGuitar(
  kind: "acoustic" | "nylon" | "electric"
): SynthGuitar {
  const existing = synthGuitars[kind];

  if (existing) {
    return existing;
  }

  const tone = SYNTH_TONES[kind];
  let output: Tone.ToneAudioNode = getGuitarRoom();

  if (kind === "electric") {
    output = new Tone.Chorus({
      frequency: 1.2,
      delayTime: 3.5,
      depth: 0.35,
      wet: 0.35,
    })
      .connect(getGuitarRoom())
      .start();
  }

  const gains = Array.from({ length: GUITAR_STRINGS }, () =>
    new Tone.Gain(0.8).connect(output)
  );
  const voices = gains.map((gain) => {
    const voice = new Tone.PluckSynth({
      attackNoise: tone.attackNoise,
      dampening: tone.dampening,
      resonance: tone.resonance,
      release: 0.25,
    }).connect(gain);

    voice.volume.value = tone.volume;

    return voice;
  });

  const guitar = { voices, gains };
  synthGuitars[kind] = guitar;

  return guitar;
}

// Warm up whatever the chosen instrument needs, ahead of the
// first press (samples for acoustic, the reverb impulse for the
// synth guitars).
export function preloadInstrument(instrument: InstrumentId): void {
  if (instrument === "piano") {
    ensureSampler();
    return;
  }

  if (instrument === "acoustic") {
    ensureGuitarSampler();
  }

  getGuitarRoom();
}

interface Pluck {
  string: number;
  note: string; // clean name, e.g. "G3"
  time: number; // absolute AudioContext seconds
  velocity: number; // 0..1
}

// Schedule the plucks of one chord. Each string rings until it is
// plucked again or the chord ends (`endTime`), like a guitarist
// letting a shape ring and then changing to the next one.
function schedulePlucks(
  instrument: Exclude<InstrumentId, "piano">,
  plucks: Pluck[],
  endTime: number
): void {
  const sorted = [...plucks].sort((a, b) => a.time - b.time);
  const sampler =
    instrument === "acoustic" ? ensureGuitarSampler() : null;
  const useSamples = sampler !== null && !guitarFailed && sampler.loaded;
  const synth = useSamples ? null : getSynthGuitar(instrument);

  sorted.forEach((pluck, index) => {
    const next = sorted
      .slice(index + 1)
      .find((other) => other.string === pluck.string);
    const stopAt = Math.max(
      pluck.time + 0.06,
      next ? next.time : endTime
    );

    if (useSamples && sampler) {
      sampler.triggerAttackRelease(
        pluck.note,
        stopAt - pluck.time,
        pluck.time,
        pluck.velocity
      );
      return;
    }

    if (synth) {
      synth.gains[pluck.string].gain.setValueAtTime(
        pluck.velocity,
        pluck.time
      );
      synth.voices[pluck.string].triggerAttack(pluck.note, pluck.time);
      synth.voices[pluck.string].triggerRelease(stopAt);
    }
  });
}

// Pitch classes (0 = C) of chord notes like ["C", "Eb", "G"].
function pitchClassesOf(notes: string[]): number[] {
  return notes
    .map((note) => noteToMidi(`${note}4`))
    .filter((midi) => !Number.isNaN(midi))
    .map((midi) => midi % 12);
}

// Guitar shape for a chord as a list of clean note names, low
// string first. Falls back to stacking the notes from the A
// string's register if no shape can be found.
function guitarStringsFor(
  notes: string[],
  previousCenter: number | null
): { strings: { string: number; note: string }[]; center: number | null } {
  const pcs = pitchClassesOf(notes);
  const voicing = voiceChordForGuitar(pcs, previousCenter);

  if (voicing) {
    return {
      strings: voicing.strings.map((item) => ({
        string: item.string,
        note: Tone.Frequency(noteToMidi(item.note), "midi").toNote(),
      })),
      center: voicing.center,
    };
  }

  // Each note goes on the next string up, starting above G#2.
  const count = Math.min(pcs.length, GUITAR_STRINGS);
  let midi = 44;
  const strings = pcs.slice(0, count).map((pc, index) => {
    midi += ((pc - midi) % 12 + 12) % 12 || 12;

    return {
      string: GUITAR_STRINGS - count + index,
      note: Tone.Frequency(midi, "midi").toNote(),
    };
  });

  return { strings, center: previousCenter };
}

// Strum one chord on a guitar right now, e.g. for chord previews.
export function strumChord(
  notes: string[],
  instrument: Exclude<InstrumentId, "piano">,
  ringSeconds = 2.2
): void {
  if (!enabled) {
    return;
  }

  void Tone.start();

  const { strings } = guitarStringsFor(notes, null);
  const start = Tone.now();

  schedulePlucks(
    instrument,
    strings.map((item, index) => ({
      ...item,
      time: start + index * 0.028,
      velocity: 0.8,
    })),
    start + ringSeconds
  );
}

// Play a chord preview on the chosen instrument.
export function playChordOn(
  notes: string[],
  instrument: InstrumentId
): void {
  if (instrument === "piano") {
    playNotes(notes.map((note) => `${note}4`));
    return;
  }

  strumChord(notes, instrument);
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
    instrument?: InstrumentId; // defaults to piano
    bassLayer?: (
      rootNote: string,
      beats: number,
      durationSeconds: number
    ) => any[]; // bass layer function
  } = {}
): void {
  const {
    swingEnabled = false,
    swingRatio = 2,
    accentBoost = 6,
    pattern = undefined,
    instrument = "piano",
    bassLayer = undefined,
  } = options;

  if (instrument !== "piano") {
    playGuitarProgression(chords, secondsPerBeat, instrument, {
      swingEnabled,
      swingRatio,
      accentBoost,
      pattern,
    });
    return;
  }

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

// Guitar flavour of playTimedProgression(): same timing, swing,
// accents and patterns, but each chord becomes a real guitar
// shape and pattern note indices refer to its strings (low to
// high), so "Strum ↓" rakes from the bass string up and
// "Syncopated" thumbs the bass string on the off-beat.
function playGuitarProgression(
  chords: TimedChord[],
  secondsPerBeat: number,
  instrument: Exclude<InstrumentId, "piano">,
  options: {
    swingEnabled: boolean;
    swingRatio: number;
    accentBoost: number;
    pattern?: RhythmPattern;
  }
): void {
  if (!enabled) {
    return;
  }

  // Must be called inside the click; scheduling below works off
  // the context clock, which picks up once the context resumes.
  void Tone.start();

  const { swingEnabled, swingRatio, accentBoost, pattern } = options;
  const start = Tone.now();
  let elapsed = 0;
  let center: number | null = null;

  for (const chord of chords) {
    const duration = chord.beats * secondsPerBeat;
    let swingOffset = 0;

    if (swingEnabled && chord.beats === 1) {
      const beatFraction = (elapsed / secondsPerBeat) % 1;

      if (Math.abs(beatFraction - 0.5) < 0.01) {
        swingOffset =
          (secondsPerBeat / swingRatio) * ((swingRatio - 1) / swingRatio);
      }
    }

    const chordStart = start + elapsed + swingOffset;
    const chordEnd = start + elapsed + duration;

    if (!chord.isRest && chord.notes.length > 0) {
      const voiced = guitarStringsFor(chord.notes, center);
      center = voiced.center;

      const strings = voiced.strings;
      const names = strings.map((item) => item.note);
      // Accents push the strings harder; the boost is in dB.
      const level = Math.min(
        1,
        0.72 *
          (chord.isAccented && accentBoost
            ? Tone.dbToGain(accentBoost)
            : 1)
      );
      const events = pattern
        ? applyPattern(names, duration, pattern)
        : [{ offsetSeconds: 0, noteIndices: names.map((_, i) => i) }];
      const plucks: Pluck[] = [];

      for (const event of events) {
        // Guitar strums need a wider rake than a piano roll to
        // read as a strum; block chords get a few ms of human
        // spread so all six strings don't land on one sample.
        const stagger = event.staggerMs
          ? Math.max(event.staggerMs, 24)
          : event.noteIndices.length > 1
            ? 5
            : 0;
        const isUpstroke =
          event.noteIndices.length > 1 &&
          event.noteIndices[0] > event.noteIndices[event.noteIndices.length - 1];

        event.noteIndices.forEach((noteIndex, order) => {
          const item = strings[noteIndex];

          if (!item) {
            return;
          }

          const jitter = stagger ? (Math.random() - 0.5) * 4 : 0;

          plucks.push({
            string: item.string,
            note: item.note,
            time:
              chordStart +
              event.offsetSeconds +
              Math.max(0, order * stagger + jitter) / 1000,
            // Upstrokes catch the treble strings lightly.
            velocity: Math.min(
              1,
              level * (isUpstroke ? 0.8 : 1) * (0.95 + Math.random() * 0.1)
            ),
          });
        });
      }

      schedulePlucks(instrument, plucks, chordEnd);
    }

    elapsed += duration;
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
    instrument?: InstrumentId;
    bassLayer?: (
      rootNote: string,
      beats: number,
      durationSeconds: number
    ) => any[];
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