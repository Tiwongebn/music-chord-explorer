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
  getPitchClass,
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
  type TriadQuality,
} from "../data/scales";

export interface ScaleChord extends ScaleDegree {
  rootNote: string; // display-formatted, e.g. "D", "F♯"
  rawRootNote: string; // ASCII (#/b) root, e.g. "D", "F#"
  chordLabel: string; // e.g. "Dm9", "Gmaj7", "B°"
  notes: string[]; // display-formatted chord notes
  rawNotes: string[]; // ASCII (#/b) chord notes, for audio playback
  // Concrete index into chordTypes (data/chords.ts) this
  // chord was actually voiced with — never -1, even when the
  // caller used the "natural triad" default. Lets a chord be
  // frozen (e.g. into the progression builder) as a fully
  // independent snapshot that no longer depends on the
  // scale/key/chord-type controls that produced it.
  chordTypeIndex: number;
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
    scaleIntervalNames[scaleType],
    preference
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
      voicing.intervalNames,
      preference
    );

    const displayRoot = formatNoteForDisplay(degreeRoot);

    const label =
      !chordType && degree.quality === "Diminished"
        ? `${displayRoot}°`
        : `${displayRoot}${voicing.symbol}`;

    return {
      ...degree,
      rootNote: displayRoot,
      rawRootNote: degreeRoot,
      chordLabel: label,
      notes: chordNotes.map((note) =>
        formatNoteForDisplay(note)
      ),
      rawNotes: chordNotes,
      chordTypeIndex: chordTypes.indexOf(voicing),
    };
  });
}

// Resolves a frozen, standalone chord snapshot — a raw root
// note + an index into chordTypes — into its display label
// and notes under the given sharps/flats preference. This is
// the building block for the progression builder: once a
// chord is added there, it is stored as one of these
// snapshots and is from then on completely independent of
// whatever key/scale/chord-type the Progressions controls are
// currently set to (only the sharps/flats *spelling* still
// follows the shared preference, exactly like Explore).
export function resolveChordSnapshot(
  rawRootNote: string,
  chordTypeIndex: number,
  preference: AccidentalPreference
): {
  chordLabel: string;
  notes: string[];
  rawNotes: string[];
} {
  const voicing = chordTypes[chordTypeIndex];

  if (!voicing) {
    return { chordLabel: "?", notes: [], rawNotes: [] };
  }

  const preferredRoot = convertRootNote(
    rawRootNote,
    preference
  );

  const chordNotes = calculateChordNotes(
    preferredRoot,
    voicing.intervals,
    voicing.intervalNames,
    preference
  );

  const displayRoot = formatNoteForDisplay(preferredRoot);

  return {
    chordLabel: `${displayRoot}${voicing.symbol}`,
    notes: chordNotes.map((note) =>
      formatNoteForDisplay(note)
    ),
    rawNotes: chordNotes,
  };
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

export type ChordKeyRelation =
  | "diatonic"
  | "borrowed"
  | "chromatic";

// Classifies a chord (by raw root note + a chordTypes index)
// against a key, for an educational "does this chord belong
// here?" badge in the progression builder:
//
//  - "chromatic": the root itself isn't one of the key's 7
//    scale notes at all (e.g. an F# chord in C major).
//  - "borrowed":  the root IS one of the key's scale notes,
//    but the chosen chord's basic quality (major/minor/
//    diminished, inferred from its 3rd/5th) doesn't match
//    that scale degree's natural quality (e.g. a *major*
//    chord on D in C major, where ii is naturally minor).
//  - "diatonic":  root and quality both match the key.
//
// Chords with no 3rd at all (sus2/sus4) are inherently
// neither major nor minor, so a quality mismatch is never
// reported for them — only "chromatic" still applies.
export function classifyChordInKey(
  rootNote: string,
  chordTypeIndex: number,
  keyRoot: string,
  scaleType: ScaleType
): ChordKeyRelation {
  const rootPitchClass = getPitchClass(rootNote);
  const keyPitchClass = getPitchClass(keyRoot);

  if (rootPitchClass === -1 || keyPitchClass === -1) {
    return "diatonic";
  }

  const intervals = scaleIntervals[scaleType];
  const degrees = scaleDegreesByType[scaleType];

  const degreeIndex = intervals.findIndex(
    (interval) =>
      (keyPitchClass + interval) % 12 === rootPitchClass
  );

  if (degreeIndex === -1) {
    return "chromatic";
  }

  const voicing = chordTypes[chordTypeIndex];

  if (!voicing) {
    return "diatonic";
  }

  const hasMinorThird = voicing.intervals.includes(3);
  const hasMajorThird = voicing.intervals.includes(4);
  const hasDiminishedFifth = voicing.intervals.includes(6);

  let impliedQuality: TriadQuality | null = null;

  if (hasMinorThird) {
    impliedQuality = hasDiminishedFifth
      ? "Diminished"
      : "Minor";
  } else if (hasMajorThird) {
    impliedQuality = "Major";
  }

  const naturalQuality = degrees[degreeIndex].quality;

  if (
    impliedQuality !== null &&
    impliedQuality !== naturalQuality
  ) {
    return "borrowed";
  }

  return "diatonic";
}
