// ============================================================
// Builds the seven diatonic triads for a given key + scale,
// so the Progressions section can show real chord names
// (e.g. "Dm" for ii in C major) rather than just roman
// numerals.
// ============================================================

import {
  convertRootNote,
  formatNoteForDisplay,
  getNotesByPreference,
  type AccidentalPreference,
} from "./musicTheory";
import {
  scaleDegreesByType,
  scaleIntervals,
  type ScaleDegree,
  type ScaleType,
  type TriadQuality,
} from "../data/scales";

const triadIntervals: Record<TriadQuality, number[]> = {
  Major: [0, 4, 7],
  Minor: [0, 3, 7],
  Diminished: [0, 3, 6],
};

const triadSymbol: Record<TriadQuality, string> = {
  Major: "",
  Minor: "m",
  Diminished: "dim",
};

export interface ScaleChord extends ScaleDegree {
  rootNote: string; // display-formatted, e.g. "D", "F♯"
  symbol: string;
  chordLabel: string; // e.g. "Dm", "G", "B°"
  notes: string[]; // display-formatted triad notes
  rawNotes: string[]; // ASCII (#/b) triad notes, for audio playback
}

export function buildScaleChords(
  keyRoot: string,
  scaleType: ScaleType,
  preference: AccidentalPreference
): ScaleChord[] {
  const notes = getNotesByPreference(preference);
  const preferredKeyRoot = convertRootNote(
    keyRoot,
    preference
  );
  const keyIndex = notes.indexOf(preferredKeyRoot);

  if (keyIndex === -1) {
    return [];
  }

  const degrees = scaleDegreesByType[scaleType];
  const intervals = scaleIntervals[scaleType];

  return degrees.map((degree, index) => {
    const degreeOffset = intervals[index];
    const degreeRootIndex =
      (keyIndex + degreeOffset) % 12;
    const degreeRoot = notes[degreeRootIndex];

    const chordIntervals = triadIntervals[degree.quality];
    const symbol = triadSymbol[degree.quality];

    const chordNotes = chordIntervals.map(
      (interval) =>
        notes[(degreeRootIndex + interval) % 12]
    );

    const displayRoot = formatNoteForDisplay(degreeRoot);

    return {
      ...degree,
      rootNote: displayRoot,
      symbol,
      chordLabel:
        degree.quality === "Diminished"
          ? `${displayRoot}°`
          : `${displayRoot}${symbol}`,
      notes: chordNotes.map((note) =>
        formatNoteForDisplay(note)
      ),
      rawNotes: chordNotes,
    };
  });
}
