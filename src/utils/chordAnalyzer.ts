import {
  sharpNotes,
  flatNotes,
} from "./musicTheory";

export interface DetectedChord {
  root: string;
  name: string;
  symbol: string;
  notes: string[];
  pattern: number[];
}

interface ChordPattern {
  intervals: number[];
  symbol: string;
  name: string;
}

// Chord patterns are represented using semitone distances
// from the root.
//
// Example:
// C Major = C(0) E(4) G(7)
// therefore [0, 4, 7]

const chordPatterns: ChordPattern[] = [
  // =========================
  // TRIADS
  // =========================

  {
    intervals: [0, 4, 7],
    symbol: "",
    name: "Major",
  },

  {
    intervals: [0, 3, 7],
    symbol: "m",
    name: "Minor",
  },

  {
    intervals: [0, 3, 6],
    symbol: "dim",
    name: "Diminished",
  },

  {
    intervals: [0, 4, 8],
    symbol: "aug",
    name: "Augmented",
  },

  {
    intervals: [0, 2, 7],
    symbol: "sus2",
    name: "Suspended 2nd",
  },

  {
    intervals: [0, 5, 7],
    symbol: "sus4",
    name: "Suspended 4th",
  },


  // =========================
  // SIXTH CHORDS
  // =========================

  {
    intervals: [0, 4, 7, 9],
    symbol: "6",
    name: "Major 6th",
  },

  {
    intervals: [0, 3, 7, 9],
    symbol: "m6",
    name: "Minor 6th",
  },

  {
  intervals: [0, 2, 4, 7, 9],
  symbol: "6/9",
  name: "Sixth Add 9",
},


  // =========================
  // SEVENTH CHORDS
  // =========================

  {
    intervals: [0, 4, 7, 10],
    symbol: "7",
    name: "Dominant 7th",
  },

  {
    intervals: [0, 4, 7, 11],
    symbol: "maj7",
    name: "Major 7th",
  },

  {
    intervals: [0, 3, 7, 10],
    symbol: "m7",
    name: "Minor 7th",
  },

  {
    intervals: [0, 3, 7, 11],
    symbol: "mMaj7",
    name: "Minor Major 7th",
  },

  {
    intervals: [0, 3, 6, 10],
    symbol: "ø7",
    name: "Half-Diminished 7th",
  },

  {
    intervals: [0, 3, 6, 9],
    symbol: "dim7",
    name: "Diminished 7th",
  },


  // =========================
  // NINTH CHORDS
  // =========================

  {
  intervals: [0, 2, 4, 7, 10],
  symbol: "9",
  name: "Dominant 9th",
},

{
  intervals: [0, 2, 4, 7, 11],
  symbol: "maj9",
  name: "Major 9th",
},

{
  intervals: [0, 2, 3, 7, 10],
  symbol: "m9",
  name: "Minor 9th",
},

{
  intervals: [0, 2, 4, 7],
  symbol: "add9",
  name: "Add 9",
},


  // =========================
  // ELEVENTH CHORDS
  // =========================

  {
  intervals: [0, 2, 4, 5, 7, 10],
  symbol: "11",
  name: "Dominant 11th",
},

{
  intervals: [0, 2, 4, 5, 7, 11],
  symbol: "maj11",
  name: "Major 11th",
},

{
  intervals: [0, 2, 3, 5, 7, 10],
  symbol: "m11",
  name: "Minor 11th",
},


  // =========================
  // THIRTEENTH CHORDS
  // =========================

  {
    intervals: [0, 4, 7, 10, 2, 5, 9],
    symbol: "13",
    name: "Dominant 13th",
  },

  {
    intervals: [0, 4, 7, 11, 2, 5, 9],
    symbol: "maj13",
    name: "Major 13th",
  },

  {
    intervals: [0, 3, 7, 10, 2, 5, 9],
    symbol: "m13",
    name: "Minor 13th",
  },


  // =========================
  // ALTERED DOMINANT CHORDS
  // =========================

  {
  intervals: [0, 1, 4, 7, 10],
  symbol: "7b9",
  name: "Dominant 7th Flat 9",
},

{
  intervals: [0, 3, 4, 7, 10],
  symbol: "7#9",
  name: "Dominant 7th Sharp 9",
},

{
  intervals: [0, 4, 6, 7, 10],
  symbol: "7#11",
  name: "Dominant 7th Sharp 11",
},

{
  intervals: [0, 4, 7, 8, 10],
  symbol: "7b13",
  name: "Dominant 7th Flat 13",
},


  // =========================
  // MAJOR ALTERATIONS
  // =========================

  {
  intervals: [0, 4, 6, 7, 11],
  symbol: "maj7#11",
  name: "Major 7th Sharp 11",
},
];


const sortedPatterns = [...chordPatterns].sort(
  (a, b) =>
    b.intervals.length - a.intervals.length
);

function normalizeNote(note: string): string {
  const noteMap: Record<string, string> = {
    Db: "C#",
    Eb: "D#",
    Gb: "F#",
    Ab: "G#",
    Bb: "A#",

    Cb: "B",
    Fb: "E",

    "C##": "D",
    "D##": "E",
    "E##": "F#",
    "F##": "G",
    "G##": "A",
    "A##": "B",
    "B##": "C#",

    "Cbb": "A#",
    "Dbb": "C",
    "Ebb": "D",
    "Fbb": "D#",
    "Gbb": "F",
    "Abb": "G",
    "Bbb": "A",
  };

  return noteMap[note] ?? note;
}

function getNoteIndex(note: string): number {
  const normalized = normalizeNote(note);

  const index = sharpNotes.indexOf(normalized);

  if (index !== -1) {
    return index;
  }

  return flatNotes.indexOf(normalized);
}

function getInterval(
  rootIndex: number,
  noteIndex: number
): number {
  return (noteIndex - rootIndex + 12) % 12;
}

function arraysEqual(
  first: number[],
  second: number[]
): boolean {
  if (first.length !== second.length) {
    return false;
  }

  return first.every(
    (value, index) => value === second[index]
  );
}

export function analyzeChord(
  selectedNotes: string[]
): DetectedChord | null {
  if (selectedNotes.length < 2) {
    return null;
  }

  const normalizedNotes = selectedNotes.map(normalizeNote);

  const noteIndexes = normalizedNotes
    .map(getNoteIndex)
    .filter((index) => index !== -1);

  // Remove duplicate pitch classes.
  const uniqueIndexes = [...new Set(noteIndexes)];

  if (uniqueIndexes.length < 2) {
    return null;
  }

  // Try every selected note as a possible root.
  for (const rootIndex of uniqueIndexes) {
    const intervals = uniqueIndexes
      .map((noteIndex) =>
        getInterval(rootIndex, noteIndex)
      )
      .sort((a, b) => a - b);

    for (const pattern of sortedPatterns) {
  const patternIntervals = [...pattern.intervals].sort(
    (a, b) => a - b
  );

  if (arraysEqual(intervals, patternIntervals)) {
        const root =
          sharpNotes[rootIndex];

        return {
        root,
        name: `${root} ${pattern.name}`,
        symbol: pattern.symbol,
        notes: normalizedNotes,
        pattern: patternIntervals,
        };
      }
    }
  }

  return null;
}