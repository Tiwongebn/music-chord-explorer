import type { ChordType } from "../types/music";

export const chordTypes: ChordType[] = [
  {
    name: "Major",
    symbol: "",
    intervals: [0, 4, 7],
    intervalNames: ["Root", "Major 3rd", "Perfect 5th"],
  },
  {
    name: "Minor",
    symbol: "m",
    intervals: [0, 3, 7],
    intervalNames: ["Root", "Minor 3rd", "Perfect 5th"],
  },
  {
    name: "Diminished",
    symbol: "dim",
    intervals: [0, 3, 6],
    intervalNames: ["Root", "Minor 3rd", "Diminished 5th"],
  },
  {
    name: "Augmented",
    symbol: "aug",
    intervals: [0, 4, 8],
    intervalNames: ["Root", "Major 3rd", "Augmented 5th"],
  },
  {
    name: "Major 7th",
    symbol: "maj7",
    intervals: [0, 4, 7, 11],
    intervalNames: ["Root", "Major 3rd", "Perfect 5th", "Major 7th"],
  },
  {
    name: "Minor 7th",
    symbol: "m7",
    intervals: [0, 3, 7, 10],
    intervalNames: ["Root", "Minor 3rd", "Perfect 5th", "Minor 7th"],
  },
  {
    name: "Dominant 7th",
    symbol: "7",
    intervals: [0, 4, 7, 10],
    intervalNames: ["Root", "Major 3rd", "Perfect 5th", "Minor 7th"],
  },
];