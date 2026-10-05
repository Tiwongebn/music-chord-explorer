// ============================================================
// Builds the seven diatonic chords for a given key + scale,
// voiced with whatever chord type the user picks (same full
// catalog as the Explore tab — triads, 7ths, 9ths, sus
// chords, etc.) so the Progressions section can show real
// chord names (e.g. "Dm9" for ii in C major) instead of just
// roman numerals.
//
// Spelling reuses calculateChordNotes() — the exact engine
// Explore already uses — for both the scale's own degree
// roots and the chord voiced on each one. That keeps this
// section's sharps/flats behavior identical to Explore's: a
// manual toggle, not an automatic key-signature guess.
// ============================================================

import {
  calculateChordNotes,
  convertRootNote,
  formatNoteForDisplay,
  type AccidentalPreference,
} from "./musicTheory";
import { chordTypes } from "../data/chords";
import type { ChordType } from "../types/music";
import {
  scaleDegreesByType,
  scaleIntervalNames,
  scaleIntervals,
  type ScaleDegree,
  type ScaleType,
} from "../data/scales";

export interface ScaleChord extends ScaleDegree {
  rootNote: string; // display-formatted, e.g. "D", "F♯"
  chordLabel: string; // e.g. "Dm9", "Gmaj7", "B°"
  notes: string[]; // display-formatted chord notes
  rawNotes: string[]; // ASCII (#/b) chord notes, for audio playback
}

// Picks the catalog chord type that matches a diatonic
// degree's natural triad quality — used as the baseline
// "Triads" voicing before the user picks something fancier.
const defaultChordTypeByQuality: Record<string, ChordType> = {
  Major: chordTypes.find((c) => c.name === "Major")!,
  Minor: chordTypes.find((c) => c.name === "Minor")!,
  Diminished: chordTypes.find(
    (c) => c.name === "Diminished"
  )!,
};

// Builds the seven diatonic roots for a key/scale, spelled
// with the chosen sharps/flats preference — reusing
// calculateChordNotes() by treating the scale itself as one
// big "chord" stacked on the root.
function buildScaleDegreeRoots(
  keyRoot: string,
  scaleType: ScaleType,
  preference: AccidentalPreference
): string[] {
  const preferredKeyRoot = convertRootNote(
    keyRoot,
    preference
  );

  return calculateChordNotes(
    preferredKeyRoot,
    scaleIntervals[scaleType],
    scaleIntervalNames[scaleType]
  );
}

// Builds the seven diatonic chords for a key, each voiced
// using `chordType` (defaults to each degree's natural triad
// when omitted) and spelled per `preference` — exactly like
// Explore's root + chord-type + sharps/flats controls.
export function buildScaleChords(
  keyRoot: string,
  scaleType: ScaleType,
  preference: AccidentalPreference,
  chordType?: ChordType
): ScaleChord[] {
  const degreeRoots = buildScaleDegreeRoots(
    keyRoot,
    scaleType,
    preference
  );

  const degrees = scaleDegreesByType[scaleType];

  return degrees.map((degree, index) => {
    const degreeRoot = degreeRoots[index];

    const voicing =
      chordType ??
      defaultChordTypeByQuality[degree.quality];

    const chordNotes = calculateChordNotes(
      degreeRoot,
      voicing.intervals,
      voicing.intervalNames
    );

    const displayRoot = formatNoteForDisplay(degreeRoot);

    const label =
      !chordType && degree.quality === "Diminished"
        ? `${displayRoot}°`
        : `${displayRoot}${voicing.symbol}`;

    return {
      ...degree,
      rootNote: displayRoot,
      chordLabel: label,
      notes: chordNotes.map((note) =>
        formatNoteForDisplay(note)
      ),
      rawNotes: chordNotes,
    };
  });
}

// The display name for a key root under the chosen
// sharps/flats preference (e.g. "A#" + flats -> "B♭"),
// matching how Explore labels its own root note.
export function getDisplayKeyRoot(
  keyRoot: string,
  preference: AccidentalPreference
): string {
  return formatNoteForDisplay(
    convertRootNote(keyRoot, preference)
  );
}
