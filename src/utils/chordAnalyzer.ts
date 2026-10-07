import { chordTypes } from "../data/chords";
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

// Derive chord patterns from the single source of truth (chordTypes)
// sorted by length (longest patterns first for more specific matching)
const sortedPatterns = chordTypes
  .map((chord) => ({
    intervals: chord.intervals,
    symbol: chord.symbol,
    name: chord.name,
  }))
  .sort((a, b) => b.intervals.length - a.intervals.length);

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