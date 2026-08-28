import type { ChordType } from "../types/music";

export const chordTypes: ChordType[] = [

  // =========================
  // TRIADS
  // =========================

  {
    name: "Major",
    symbol: "",
    category: "Triads",
    intervals: [0, 4, 7],
    intervalNames: [
      "Root",
      "Major 3rd",
      "Perfect 5th",
    ],
  },

  {
    name: "Minor",
    symbol: "m",
    category: "Triads",
    intervals: [0, 3, 7],
    intervalNames: [
      "Root",
      "Minor 3rd",
      "Perfect 5th",
    ],
  },

  {
    name: "Diminished",
    symbol: "dim",
    category: "Triads",
    intervals: [0, 3, 6],
    intervalNames: [
      "Root",
      "Minor 3rd",
      "Diminished 5th",
    ],
  },

  {
    name: "Augmented",
    symbol: "aug",
    category: "Triads",
    intervals: [0, 4, 8],
    intervalNames: [
      "Root",
      "Major 3rd",
      "Augmented 5th",
    ],
  },


  // =========================
  // SUSPENDED
  // =========================

  {
    name: "Suspended 2nd",
    symbol: "sus2",
    category: "Suspended",
    intervals: [0, 2, 7],
    intervalNames: [
      "Root",
      "Major 2nd",
      "Perfect 5th",
    ],
  },

  {
    name: "Suspended 4th",
    symbol: "sus4",
    category: "Suspended",
    intervals: [0, 5, 7],
    intervalNames: [
      "Root",
      "Perfect 4th",
      "Perfect 5th",
    ],
  },


  // =========================
  // SIXTH CHORDS
  // =========================

  {
    name: "Major 6th",
    symbol: "6",
    category: "Sixth Chords",
    intervals: [0, 4, 7, 9],
    intervalNames: [
      "Root",
      "Major 3rd",
      "Perfect 5th",
      "Major 6th",
    ],
  },

  {
    name: "Minor 6th",
    symbol: "m6",
    category: "Sixth Chords",
    intervals: [0, 3, 7, 9],
    intervalNames: [
      "Root",
      "Minor 3rd",
      "Perfect 5th",
      "Major 6th",
    ],
  },

  {
    name: "6/9",
    symbol: "6/9",
    category: "Sixth Chords",
    intervals: [0, 4, 7, 9, 14],
    intervalNames: [
      "Root",
      "Major 3rd",
      "Perfect 5th",
      "Major 6th",
      "Major 9th",
    ],
  },


  // =========================
  // SEVENTH CHORDS
  // =========================

  {
    name: "Major 7th",
    symbol: "maj7",
    category: "Seventh Chords",
    intervals: [0, 4, 7, 11],
    intervalNames: [
      "Root",
      "Major 3rd",
      "Perfect 5th",
      "Major 7th",
    ],
  },

  {
    name: "Minor 7th",
    symbol: "m7",
    category: "Seventh Chords",
    intervals: [0, 3, 7, 10],
    intervalNames: [
      "Root",
      "Minor 3rd",
      "Perfect 5th",
      "Minor 7th",
    ],
  },

  {
    name: "Dominant 7th",
    symbol: "7",
    category: "Seventh Chords",
    intervals: [0, 4, 7, 10],
    intervalNames: [
      "Root",
      "Major 3rd",
      "Perfect 5th",
      "Minor 7th",
    ],
  },

  {
    name: "Minor Major 7th",
    symbol: "mMaj7",
    category: "Seventh Chords",
    intervals: [0, 3, 7, 11],
    intervalNames: [
      "Root",
      "Minor 3rd",
      "Perfect 5th",
      "Major 7th",
    ],
  },

  {
    name: "Half-Diminished 7th",
    symbol: "m7♭5",
    category: "Seventh Chords",
    intervals: [0, 3, 6, 10],
    intervalNames: [
      "Root",
      "Minor 3rd",
      "Diminished 5th",
      "Minor 7th",
    ],
  },

  {
    name: "Diminished 7th",
    symbol: "dim7",
    category: "Seventh Chords",
    intervals: [0, 3, 6, 9],
    intervalNames: [
      "Root",
      "Minor 3rd",
      "Diminished 5th",
      "Diminished 7th",
    ],
  },


  // =========================
  // EXTENDED CHORDS - 9TH
  // =========================

  {
    name: "Dominant 9th",
    symbol: "9",
    category: "Extended Chords",
    intervals: [0, 4, 7, 10, 14],
    intervalNames: [
      "Root",
      "Major 3rd",
      "Perfect 5th",
      "Minor 7th",
      "Major 9th",
    ],
  },

  {
    name: "Major 9th",
    symbol: "maj9",
    category: "Extended Chords",
    intervals: [0, 4, 7, 11, 14],
    intervalNames: [
      "Root",
      "Major 3rd",
      "Perfect 5th",
      "Major 7th",
      "Major 9th",
    ],
  },

  {
    name: "Minor 9th",
    symbol: "m9",
    category: "Extended Chords",
    intervals: [0, 3, 7, 10, 14],
    intervalNames: [
      "Root",
      "Minor 3rd",
      "Perfect 5th",
      "Minor 7th",
      "Major 9th",
    ],
  },

  {
    name: "Minor Major 9th",
    symbol: "mMaj9",
    category: "Extended Chords",
    intervals: [0, 3, 7, 11, 14],
    intervalNames: [
      "Root",
      "Minor 3rd",
      "Perfect 5th",
      "Major 7th",
      "Major 9th",
    ],
  },


  // =========================
  // EXTENDED CHORDS - 11TH
  // =========================

  {
    name: "Dominant 11th",
    symbol: "11",
    category: "Extended Chords",
    intervals: [0, 4, 7, 10, 14, 17],
    intervalNames: [
      "Root",
      "Major 3rd",
      "Perfect 5th",
      "Minor 7th",
      "Major 9th",
      "Perfect 11th",
    ],
  },

  {
    name: "Major 11th",
    symbol: "maj11",
    category: "Extended Chords",
    intervals: [0, 4, 7, 11, 14, 17],
    intervalNames: [
      "Root",
      "Major 3rd",
      "Perfect 5th",
      "Major 7th",
      "Major 9th",
      "Perfect 11th",
    ],
  },

  {
    name: "Minor 11th",
    symbol: "m11",
    category: "Extended Chords",
    intervals: [0, 3, 7, 10, 14, 17],
    intervalNames: [
      "Root",
      "Minor 3rd",
      "Perfect 5th",
      "Minor 7th",
      "Major 9th",
      "Perfect 11th",
    ],
  },


  // =========================
  // EXTENDED CHORDS - 13TH
  // =========================

  {
    name: "Dominant 13th",
    symbol: "13",
    category: "Extended Chords",
    intervals: [0, 4, 7, 10, 14, 17, 21],
    intervalNames: [
      "Root",
      "Major 3rd",
      "Perfect 5th",
      "Minor 7th",
      "Major 9th",
      "Perfect 11th",
      "Major 13th",
    ],
  },

  {
    name: "Major 13th",
    symbol: "maj13",
    category: "Extended Chords",
    intervals: [0, 4, 7, 11, 14, 17, 21],
    intervalNames: [
      "Root",
      "Major 3rd",
      "Perfect 5th",
      "Major 7th",
      "Major 9th",
      "Perfect 11th",
      "Major 13th",
    ],
  },

  {
    name: "Minor 13th",
    symbol: "m13",
    category: "Extended Chords",
    intervals: [0, 3, 7, 10, 14, 17, 21],
    intervalNames: [
      "Root",
      "Minor 3rd",
      "Perfect 5th",
      "Minor 7th",
      "Major 9th",
      "Perfect 11th",
      "Major 13th",
    ],
  },


  // =========================
  // ALTERED DOMINANTS
  // =========================

  {
    name: "Dominant 7th Flat 5",
    symbol: "7♭5",
    category: "Altered Chords",
    intervals: [0, 4, 6, 10],
    intervalNames: [
      "Root",
      "Major 3rd",
      "Diminished 5th",
      "Minor 7th",
    ],
  },

  {
    name: "Dominant 7th Sharp 5",
    symbol: "7♯5",
    category: "Altered Chords",
    intervals: [0, 4, 8, 10],
    intervalNames: [
      "Root",
      "Major 3rd",
      "Augmented 5th",
      "Minor 7th",
    ],
  },

  {
    name: "Dominant 7th Flat 9",
    symbol: "7♭9",
    category: "Altered Chords",
    intervals: [0, 4, 7, 10, 13],
    intervalNames: [
      "Root",
      "Major 3rd",
      "Perfect 5th",
      "Minor 7th",
      "Minor 9th",
    ],
  },

  {
    name: "Dominant 7th Sharp 9",
    symbol: "7♯9",
    category: "Altered Chords",
    intervals: [0, 4, 7, 10, 15],
    intervalNames: [
      "Root",
      "Major 3rd",
      "Perfect 5th",
      "Minor 7th",
      "Augmented 9th",
    ],
  },

  {
    name: "Dominant 7th Sharp 11",
    symbol: "7♯11",
    category: "Altered Chords",
    intervals: [0, 4, 7, 10, 18],
    intervalNames: [
      "Root",
      "Major 3rd",
      "Perfect 5th",
      "Minor 7th",
      "Augmented 11th",
    ],
  },

  {
    name: "Dominant 7th Flat 13",
    symbol: "7♭13",
    category: "Altered Chords",
    intervals: [0, 4, 7, 10, 20],
    intervalNames: [
      "Root",
      "Major 3rd",
      "Perfect 5th",
      "Minor 7th",
      "Minor 13th",
    ],
  },

  {
    name: "7 Sharp 5 Sharp 9",
    symbol: "7♯5♯9",
    category: "Altered Chords",
    intervals: [0, 4, 8, 10, 15],
    intervalNames: [
      "Root",
      "Major 3rd",
      "Augmented 5th",
      "Minor 7th",
      "Augmented 9th",
    ],
  },


  // =========================
  // ADDED TONE CHORDS
  // =========================

  {
    name: "Add 9",
    symbol: "add9",
    category: "Added Tone Chords",
    intervals: [0, 4, 7, 14],
    intervalNames: [
      "Root",
      "Major 3rd",
      "Perfect 5th",
      "Major 9th",
    ],
  },

  {
    name: "Minor Add 9",
    symbol: "m(add9)",
    category: "Added Tone Chords",
    intervals: [0, 3, 7, 14],
    intervalNames: [
      "Root",
      "Minor 3rd",
      "Perfect 5th",
      "Major 9th",
    ],
  },

  {
    name: "Add 11",
    symbol: "add11",
    category: "Added Tone Chords",
    intervals: [0, 4, 7, 17],
    intervalNames: [
      "Root",
      "Major 3rd",
      "Perfect 5th",
      "Perfect 11th",
    ],
  },

  {
    name: "Add 13",
    symbol: "add13",
    category: "Added Tone Chords",
    intervals: [0, 4, 7, 21],
    intervalNames: [
      "Root",
      "Major 3rd",
      "Perfect 5th",
      "Major 13th",
    ],
  },
];