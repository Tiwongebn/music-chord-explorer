// ============================================================
// Voice leading for the ii–V–I trainer.
//
// Each chord is a list of chord tones (3rd, 7th, 9th, ...). For
// every chord we list the voicings that fit the chosen register
// (piano) or a string set (guitar), then pick the path through
// the whole sequence that moves the voices the least, Viterbi
// style. That is what a player does by ear: keep common tones,
// move the rest by step. Rootless piano voicings fall out as the
// familiar A/B forms on their own; nothing is hard-coded per key.
//
// Pure functions only, no audio or React, so the same code
// serves a single key or a run through all twelve.
// ============================================================

import { STANDARD_TUNING } from "./guitarVoicings";

export type KeyMode = "major" | "minor";
export type VoicingStyle = "shell" | "rootless" | "sevenths";
export type VoicingInstrument = "piano" | "guitar";

export interface ChordTone {
  semitones: number; // above the root, may exceed 12 (9 = 14)
  degree: number; // scale degree for spelling: 3, 5, 7, 9, 13...
  label: string; // "3", "b7", "9", "b13"...
}

export interface ProgressionChordSpec {
  roman: string; // "ii7", "V7", "Imaj7"...
  rootPc: number;
  rootName: string; // spelled, e.g. "Eb"
  symbol: string; // e.g. "Ebm7"
  tones: ChordTone[];
}

export interface VoicedNote {
  midi: number;
  name: string; // spelled pitch class, e.g. "Gb"
  label: string; // chord-tone label, e.g. "b7"
  string?: number; // guitar string (0 = low E)
}

export interface VoicedChord extends ProgressionChordSpec {
  notes: VoicedNote[]; // ascending; the voices that are led
  bass: VoicedNote | null; // piano left-hand root
  frets: number[] | null; // guitar: one per string, -1 muted
  form: "A" | "B" | null; // rootless piano A/B form
}

// ---- Keys and spelling --------------------------------------

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const LETTER_PCS = [0, 2, 4, 5, 7, 9, 11];

// How each key is usually written. Index = pitch class.
export const MAJOR_KEY_NAMES = [
  "C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B",
];
export const MINOR_KEY_NAMES = [
  "C", "C#", "D", "Eb", "E", "F", "F#", "G", "G#", "A", "Bb", "B",
];

export function keyName(keyPc: number, mode: KeyMode): string {
  return (mode === "major" ? MAJOR_KEY_NAMES : MINOR_KEY_NAMES)[
    ((keyPc % 12) + 12) % 12
  ];
}

function letterIndex(name: string): number {
  return LETTERS.indexOf(name.charAt(0).toUpperCase());
}

function accidentalOf(name: string): number {
  let offset = 0;

  for (const character of name.slice(1)) {
    offset += character === "#" ? 1 : character === "b" ? -1 : 0;
  }

  return offset;
}

function accidentalText(offset: number): string {
  if (offset > 0) {
    return "#".repeat(offset);
  }

  return "b".repeat(-offset);
}

// Spell the note `semitones` above `root` as the given degree,
// so the 3rd of Eb is G and the 7th of Ab7 is Gb (not F#).
export function spellAbove(
  root: string,
  semitones: number,
  degree: number
): string {
  const rootLetter = letterIndex(root);
  const rootPc =
    (LETTER_PCS[rootLetter] + accidentalOf(root) + 120) % 12;
  const letter = (rootLetter + degree - 1) % 7;
  const targetPc = (rootPc + semitones) % 12;
  let offset = (targetPc - LETTER_PCS[letter] + 12) % 12;

  if (offset > 6) {
    offset -= 12;
  }

  return `${LETTERS[letter]}${accidentalText(offset)}`;
}

// ---- Chord tones per style ----------------------------------

const T = (semitones: number, degree: number, label: string) => ({
  semitones,
  degree,
  label,
});

const ROOT = T(0, 1, "1");

type Fn = "ii" | "V" | "I";

// Tones the voicing is built from (the piano adds the root in
// the left hand for every style).
const TONES: Record<KeyMode, Record<Fn, Record<VoicingStyle, ChordTone[]>>> = {
  major: {
    ii: {
      shell: [ROOT, T(3, 3, "b3"), T(10, 7, "b7")],
      rootless: [T(3, 3, "b3"), T(7, 5, "5"), T(10, 7, "b7"), T(14, 9, "9")],
      sevenths: [ROOT, T(3, 3, "b3"), T(7, 5, "5"), T(10, 7, "b7")],
    },
    V: {
      shell: [ROOT, T(4, 3, "3"), T(10, 7, "b7")],
      rootless: [T(4, 3, "3"), T(10, 7, "b7"), T(14, 9, "9"), T(21, 13, "13")],
      sevenths: [ROOT, T(4, 3, "3"), T(7, 5, "5"), T(10, 7, "b7")],
    },
    I: {
      shell: [ROOT, T(4, 3, "3"), T(11, 7, "7")],
      rootless: [T(4, 3, "3"), T(7, 5, "5"), T(11, 7, "7"), T(14, 9, "9")],
      sevenths: [ROOT, T(4, 3, "3"), T(7, 5, "5"), T(11, 7, "7")],
    },
  },
  minor: {
    ii: {
      shell: [ROOT, T(3, 3, "b3"), T(10, 7, "b7")],
      rootless: [T(3, 3, "b3"), T(6, 5, "b5"), T(10, 7, "b7"), T(17, 11, "11")],
      sevenths: [ROOT, T(3, 3, "b3"), T(6, 5, "b5"), T(10, 7, "b7")],
    },
    V: {
      shell: [ROOT, T(4, 3, "3"), T(10, 7, "b7")],
      rootless: [T(4, 3, "3"), T(10, 7, "b7"), T(13, 9, "b9"), T(20, 13, "b13")],
      sevenths: [ROOT, T(4, 3, "3"), T(7, 5, "5"), T(10, 7, "b7")],
    },
    I: {
      shell: [ROOT, T(3, 3, "b3"), T(10, 7, "b7")],
      rootless: [T(3, 3, "b3"), T(7, 5, "5"), T(10, 7, "b7"), T(14, 9, "9")],
      sevenths: [ROOT, T(3, 3, "b3"), T(7, 5, "5"), T(10, 7, "b7")],
    },
  },
};

const SYMBOLS: Record<KeyMode, Record<Fn, Record<VoicingStyle, string>>> = {
  major: {
    ii: { shell: "m7", rootless: "m9", sevenths: "m7" },
    V: { shell: "7", rootless: "13", sevenths: "7" },
    I: { shell: "maj7", rootless: "maj9", sevenths: "maj7" },
  },
  minor: {
    ii: { shell: "m7♭5", rootless: "m11♭5", sevenths: "m7♭5" },
    V: { shell: "7", rootless: "7♭9♭13", sevenths: "7" },
    I: { shell: "m7", rootless: "m9", sevenths: "m7" },
  },
};

const ROMANS: Record<KeyMode, Record<Fn, string>> = {
  major: { ii: "ii", V: "V", I: "I" },
  minor: { ii: "iiø", V: "V", I: "i" },
};

// The ii, V and I (or i) of a key, spelled for that key.
export function twoFiveOne(
  keyPc: number,
  mode: KeyMode,
  style: VoicingStyle
): ProgressionChordSpec[] {
  const tonic = keyName(keyPc, mode);
  const parts: { fn: Fn; semitones: number; degree: number }[] = [
    { fn: "ii", semitones: 2, degree: 2 },
    { fn: "V", semitones: 7, degree: 5 },
    { fn: "I", semitones: 0, degree: 1 },
  ];

  return parts.map(({ fn, semitones, degree }) => {
    const rootName = spellAbove(tonic, semitones, degree);

    return {
      roman: ROMANS[mode][fn],
      rootPc: (keyPc + semitones) % 12,
      rootName,
      symbol: `${rootName}${SYMBOLS[mode][fn][style]}`,
      tones: TONES[mode][fn][style],
    };
  });
}

// Keys for a run through all twelve, starting from `startPc`.
export type CycleOrder = "fourths" | "half-steps";

export function cycleKeys(startPc: number, order: CycleOrder): number[] {
  const step = order === "fourths" ? 5 : 11; // up a 4th / down a half step

  return Array.from({ length: 12 }, (_, index) =>
    (startPc + index * step) % 12
  );
}

// ---- Candidate voicings -------------------------------------

interface Candidate {
  notes: { midi: number; tone: ChordTone; string?: number }[];
  frets: number[] | null;
}

// Piano right hand: every way to place each tone once inside
// the register with the whole voicing inside an octave (close
// position, what the hand can grab).
const PIANO_RANGE: Record<VoicingStyle, [number, number]> = {
  shell: [52, 70], // E3..Bb4, 3rd and 7th above the bass
  rootless: [50, 74], // D3..D5, the classic rootless register
  sevenths: [53, 77], // F3..F5
};

function pianoCandidates(
  rootPc: number,
  tones: ChordTone[],
  style: VoicingStyle
): Candidate[] {
  // The shell's root is the left hand, not a right-hand voice.
  const upper = style === "shell" ? tones.filter((t) => t.semitones !== 0) : tones;
  const [low, high] = PIANO_RANGE[style];
  const options = upper.map((tone) => {
    const pc = (rootPc + tone.semitones) % 12;
    const midis: number[] = [];

    for (let midi = low; midi <= high; midi++) {
      if (midi % 12 === pc) {
        midis.push(midi);
      }
    }

    return midis;
  });

  const found: Candidate[] = [];
  const pick: number[] = [];

  const walk = (index: number) => {
    if (index === upper.length) {
      const sorted = [...pick].sort((a, b) => a - b);

      if (new Set(sorted).size !== sorted.length) {
        return;
      }

      if (sorted[sorted.length - 1] - sorted[0] > 12) {
        return;
      }

      const notes = upper
        .map((tone, i) => ({ midi: pick[i], tone }))
        .sort((a, b) => a.midi - b.midi);

      // Rootless voicings stick to the two standard forms: the
      // 3rd or the 7th on the bottom (A and B forms).
      if (style === "rootless" && notes[0].tone.degree !== 3 && notes[0].tone.degree !== 7) {
        return;
      }

      found.push({
        notes,
        frets: null,
      });
      return;
    }

    for (const midi of options[index]) {
      pick[index] = midi;
      walk(index + 1);
    }
  };

  walk(0);

  return found;
}

// Guitar: tones go on fixed string sets, one tone per string.
// Shells keep the root on the bottom string of the set; the
// four-note styles use drop-2 / drop-3 sets.
const STRING_SETS: Record<VoicingStyle, number[][]> = {
  shell: [
    [0, 2, 3], // root on the low E, A string muted
    [1, 2, 3], // root on the A string
  ],
  rootless: [
    [1, 2, 3, 4],
    [2, 3, 4, 5],
  ],
  sevenths: [
    [1, 2, 3, 4], // drop 2, middle strings
    [2, 3, 4, 5], // drop 2, top strings
    [0, 2, 3, 4], // drop 3, root area on the low E
  ],
};

const GUITAR_TOP_FRET = 14;
const GUITAR_MAX_SPAN = 4;

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) {
    return [items];
  }

  return items.flatMap((item, index) =>
    permutations([...items.slice(0, index), ...items.slice(index + 1)]).map(
      (rest) => [item, ...rest]
    )
  );
}

function guitarCandidates(
  rootPc: number,
  tones: ChordTone[],
  style: VoicingStyle
): Candidate[] {
  const found: Candidate[] = [];

  for (const strings of STRING_SETS[style]) {
    const orders =
      style === "shell"
        ? permutations(tones.slice(1)).map((rest) => [tones[0], ...rest])
        : permutations(tones);

    for (const order of orders) {
      const fretOptions = order.map((tone, i) => {
        const open = STANDARD_TUNING[strings[i]];
        const base = (rootPc + tone.semitones - open + 120) % 12;
        // Movable shapes only (no open strings), so every shape
        // works in all twelve keys.
        return [base, base + 12].filter(
          (fret) => fret >= 1 && fret <= GUITAR_TOP_FRET
        );
      });

      const pick: number[] = [];

      const walk = (index: number) => {
        if (index === order.length) {
          const span = Math.max(...pick) - Math.min(...pick);

          if (span > GUITAR_MAX_SPAN - 1) {
            return;
          }

          const frets = Array(6).fill(-1);
          const notes = order.map((tone, i) => {
            frets[strings[i]] = pick[i];

            return {
              midi: STANDARD_TUNING[strings[i]] + pick[i],
              tone,
              string: strings[i],
            };
          });

          // Higher strings must sound higher (true on a guitar
          // here, but keep the voices in order regardless).
          notes.sort((a, b) => a.midi - b.midi);

          found.push({ notes, frets });
          return;
        }

        for (const fret of fretOptions[index]) {
          pick[index] = fret;
          walk(index + 1);
        }
      };

      walk(0);
    }
  }

  return found;
}

// ---- Choosing the smoothest path ----------------------------

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function fretCenter(frets: number[] | null): number {
  const fretted = (frets ?? []).filter((fret) => fret > 0);

  return fretted.length ? average(fretted) : 0;
}

// Total semitones the voices move, top voice to top voice and
// so on. Different voice counts never happen within one style.
export function movement(a: number[], b: number[]): number {
  const count = Math.min(a.length, b.length);
  let total = 0;

  for (let i = 0; i < count; i++) {
    total += Math.abs(a[a.length - 1 - i] - b[b.length - 1 - i]);
  }

  return total;
}

const REGISTER_CENTER: Record<VoicingStyle, number> = {
  shell: 60,
  rootless: 62,
  sevenths: 65,
};

function placementCost(
  candidate: Candidate,
  style: VoicingStyle,
  instrument: VoicingInstrument
): number {
  if (instrument === "guitar") {
    // Gentle pull toward the lower half of the neck.
    return fretCenter(candidate.frets) * 0.25;
  }

  const mean = average(candidate.notes.map((note) => note.midi));

  return Math.abs(mean - REGISTER_CENTER[style]) * 0.35;
}

function transitionCost(
  from: Candidate,
  to: Candidate,
  instrument: VoicingInstrument
): number {
  const cost = movement(
    from.notes.map((note) => note.midi),
    to.notes.map((note) => note.midi)
  );

  if (instrument === "guitar") {
    // Moving the hand up the neck costs more than moving a
    // finger, and changing string sets breaks the line.
    const sameSet =
      from.notes.map((n) => n.string).join() ===
      to.notes.map((n) => n.string).join();

    return (
      cost +
      Math.abs(fretCenter(from.frets) - fretCenter(to.frets)) * 0.6 +
      (sameSet ? 0 : 1.5)
    );
  }

  return cost;
}

const candidateCache = new Map<string, Candidate[]>();

function candidatesFor(
  chord: ProgressionChordSpec,
  style: VoicingStyle,
  instrument: VoicingInstrument
): Candidate[] {
  const key = `${instrument}|${style}|${chord.rootPc}|${chord.tones
    .map((tone) => tone.semitones)
    .join(",")}`;
  const cached = candidateCache.get(key);

  if (cached) {
    return cached;
  }

  const found =
    instrument === "guitar"
      ? guitarCandidates(chord.rootPc, chord.tones, style)
      : pianoCandidates(chord.rootPc, chord.tones, style);

  candidateCache.set(key, found);

  return found;
}

// Bass root for the piano's left hand, E2..Eb3.
function bassFor(chord: ProgressionChordSpec): VoicedNote {
  const midi = 40 + ((chord.rootPc - 4 + 12) % 12);

  return { midi, name: chord.rootName, label: "1" };
}

// Which rootless form a voicing is, by its bottom tone: the
// A form has the 3rd on the bottom, the B form the 7th. A good
// ii–V–I alternates them (A–B–A or B–A–B).
function rootlessForm(notes: VoicedNote[]): "A" | "B" | null {
  const bottom = notes[0]?.label ?? "";

  if (bottom.endsWith("3")) {
    return "A";
  }

  if (bottom.endsWith("7")) {
    return "B";
  }

  return null;
}

// Voice a whole sequence of chords (one key, or all twelve
// back to back) so each change moves as little as possible.
export function voiceLead(
  chords: ProgressionChordSpec[],
  style: VoicingStyle,
  instrument: VoicingInstrument
): VoicedChord[] {
  if (chords.length === 0) {
    return [];
  }

  const layers = chords.map((chord) => candidatesFor(chord, style, instrument));

  // Viterbi: best cost to reach each candidate, and where from.
  let costs = layers[0].map((candidate) =>
    placementCost(candidate, style, instrument)
  );
  const back: number[][] = [layers[0].map(() => -1)];

  for (let layer = 1; layer < layers.length; layer++) {
    const previous = layers[layer - 1];
    const nextCosts: number[] = [];
    const nextBack: number[] = [];

    for (const candidate of layers[layer]) {
      let best = Infinity;
      let bestFrom = 0;

      previous.forEach((from, index) => {
        const cost =
          costs[index] + transitionCost(from, candidate, instrument);

        if (cost < best) {
          best = cost;
          bestFrom = index;
        }
      });

      nextCosts.push(best + placementCost(candidate, style, instrument));
      nextBack.push(bestFrom);
    }

    costs = nextCosts;
    back.push(nextBack);
  }

  let index = costs.indexOf(Math.min(...costs));
  const path: number[] = [];

  for (let layer = layers.length - 1; layer >= 0; layer--) {
    path[layer] = index;
    index = back[layer][index];
  }

  return chords.map((chord, layer) => {
    const candidate = layers[layer][path[layer]];

    if (!candidate) {
      return { ...chord, notes: [], bass: null, frets: null, form: null };
    }

    const notes: VoicedNote[] = candidate.notes.map((note) => ({
      midi: note.midi,
      name: spellAbove(chord.rootName, note.tone.semitones, note.tone.degree),
      label: note.tone.label,
      string: note.string,
    }));

    return {
      ...chord,
      notes,
      bass: instrument === "piano" ? bassFor(chord) : null,
      frets: candidate.frets,
      form:
        instrument === "piano" && style === "rootless"
          ? rootlessForm(notes)
          : null,
    };
  });
}

// ---- Describing the motion ----------------------------------

export interface VoiceMove {
  from: VoicedNote;
  to: VoicedNote;
  semitones: number; // signed
}

// Voice-by-voice motion between two voiced chords, top first.
export function voiceMoves(from: VoicedChord, to: VoicedChord): VoiceMove[] {
  const a = [...from.notes].reverse();
  const b = [...to.notes].reverse();

  return a.slice(0, b.length).map((note, index) => ({
    from: note,
    to: b[index],
    semitones: b[index].midi - note.midi,
  }));
}

// Octave number for a MIDI note, for labels like "Gb3". The
// letter comes from the spelled name, so Cb4 stays Cb4 (MIDI 59).
export function octaveName(note: VoicedNote): string {
  const letterPc = LETTER_PCS[letterIndex(note.name)];
  const offset = accidentalOf(note.name);
  const octave = Math.round((note.midi - letterPc - offset) / 12) - 1;

  return `${note.name}${octave}`;
}
