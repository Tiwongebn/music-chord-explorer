// ============================================================
// Builds the seven diatonic triads for a given key + scale,
// so the Progressions section can show real chord names
// (e.g. "Dm" for ii in C major) rather than just roman
// numerals.
// ============================================================

import {
  convertRootNote,
  formatNoteForDisplay,
  getKeyAccidentalPreference,
  getNotesByPreference,
  type AccidentalPreference,
} from "./musicTheory";
import {
  scaleDegreesByType,
  scaleIntervals,
  type ScaleDegree,
  type ScaleType,
  type SeventhQuality,
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

const seventhIntervals: Record<SeventhQuality, number[]> = {
  "Major 7th": [0, 4, 7, 11],
  "Minor 7th": [0, 3, 7, 10],
  "Dominant 7th": [0, 4, 7, 10],
  "Half-Diminished 7th": [0, 3, 6, 10],
  "Diminished 7th": [0, 3, 6, 9],
  "Minor Major 7th": [0, 3, 7, 11],
};

const seventhSymbol: Record<SeventhQuality, string> = {
  "Major 7th": "maj7",
  "Minor 7th": "m7",
  "Dominant 7th": "7",
  "Half-Diminished 7th": "m7\u266d5",
  "Diminished 7th": "dim7",
  "Minor Major 7th": "mMaj7",
};

export interface ScaleChord extends ScaleDegree {
  rootNote: string; // display-formatted, e.g. "D", "F♯"
  symbol: string;
  chordLabel: string; // e.g. "Dm", "G", "B°"
  notes: string[]; // display-formatted triad notes
  rawNotes: string[]; // ASCII (#/b) triad notes, for audio playback
  seventhSymbol: string;
  seventhChordLabel: string; // e.g. "Dm7", "Gmaj7"
  seventhNotes: string[]; // display-formatted 4-note chord
  seventhRawNotes: string[]; // ASCII, for audio playback
}

// Builds the seven diatonic chords for a key, automatically
// spelling notes with the sharps or flats that key's
// signature actually uses (e.g. F major -> Bb, not A#) —
// regardless of the app's global sharps/flats display toggle,
// which only governs the root-note picker UI.
export function buildScaleChords(
  keyRoot: string,
  scaleType: ScaleType,
  preference: AccidentalPreference
): ScaleChord[] {
  // Resolve the key's pitch class from whatever spelling was
  // passed in, then re-derive the *correct* accidental style
  // for that key so diatonic chords read naturally.
  const lookupNotes = getNotesByPreference(preference);
  const preferredKeyRoot = convertRootNote(
    keyRoot,
    preference
  );
  const keyIndex = lookupNotes.indexOf(preferredKeyRoot);

  if (keyIndex === -1) {
    return [];
  }

  const keyPreference = getKeyAccidentalPreference(
    keyRoot,
    scaleType
  );
  const notes = getNotesByPreference(keyPreference);

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

    const seventhIntervalsForDegree =
      seventhIntervals[degree.seventhQuality];
    const seventhSymbolForDegree =
      seventhSymbol[degree.seventhQuality];

    const seventhChordNotes =
      seventhIntervalsForDegree.map(
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
      seventhSymbol: seventhSymbolForDegree,
      seventhChordLabel: `${displayRoot}${seventhSymbolForDegree}`,
      seventhNotes: seventhChordNotes.map((note) =>
        formatNoteForDisplay(note)
      ),
      seventhRawNotes: seventhChordNotes,
    };
  });
}

// The correctly-spelled display name for a key root, per its
// actual key signature (e.g. passing "A#" for a flat key
// returns "B♭"). Used to label the Progressions section with
// the conventional key name rather than an arbitrary spelling.
export function getDisplayKeyRoot(
  keyRoot: string,
  scaleType: ScaleType = "major"
): string {
  const keyPreference = getKeyAccidentalPreference(
    keyRoot,
    scaleType
  );
  return formatNoteForDisplay(
    convertRootNote(keyRoot, keyPreference)
  );
}
