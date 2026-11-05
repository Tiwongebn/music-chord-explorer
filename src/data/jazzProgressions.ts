// ============================================================
// Common jazz progressions: the handful of chord sequences
// that turn up again and again in the standard repertoire,
// ready to load into the Progressions builder in any key.
//
// Each section is written bar by bar as roman numerals, with
// "|" between bars. A bar holding one chord gives it the whole
// bar; a bar holding two splits it evenly ("ii7 V7" = two beats
// each in 4/4). Numerals follow parseRoman() in
// utils/progressionSearch.ts, so secondary dominants are just
// uppercase numerals with a 7 ("VI7" in C is A7) and "#iv°7"
// is the passing diminished chord a half step above IV.
// ============================================================

import type { ScaleType } from "./scales";
import { romansToChords } from "../utils/progressionSearch";
import type { ProgressionChord } from "../utils/savedProgressions";

export interface JazzSection {
  name: string;
  // Each inner array is one bar's chords.
  bars: string[][];
}

export interface JazzProgression {
  id: string;
  name: string;
  scaleType: ScaleType;
  description: string;
  sections: JazzSection[];
  // Section order for "Load the whole form", when it repeats
  // sections (rhythm changes is A A B A).
  form?: number[];
  // Tunes built on it, so the cards point at real music.
  heardIn: string;
}

type SectionSpec = [name: string, bars: string];

export function parseBars(spec: string): string[][] {
  return spec
    .split("|")
    .map((bar) => bar.trim().split(/\s+/).filter(Boolean))
    .filter((bar) => bar.length > 0);
}

function jazz(
  id: string,
  name: string,
  scaleType: ScaleType,
  description: string,
  heardIn: string,
  sections: SectionSpec[],
  form?: number[]
): JazzProgression {
  return {
    id,
    name,
    scaleType,
    description,
    heardIn,
    sections: sections.map(([sectionName, bars]) => ({
      name: sectionName,
      bars: parseBars(bars),
    })),
    form,
  };
}

export const jazzProgressions: JazzProgression[] = [
  jazz(
    "two-five-one",
    "Major ii–V–I",
    "major",
    "The cadence at the heart of jazz harmony. The ii sets up the V, and the V resolves home.",
    "Autumn Leaves, Tune Up, Satin Doll",
    [["Cadence", "ii7 | V7 | Imaj7 | Imaj7"]]
  ),
  jazz(
    "turnaround",
    "I–vi–ii–V turnaround",
    "major",
    "Two bars that circle back to the top of a tune. Loop it and it never quite lands.",
    "I Got Rhythm, Blue Moon, the last bars of countless standards",
    [["Turnaround", "Imaj7 vi7 | ii7 V7"]]
  ),
  jazz(
    "minor-two-five-one",
    "Minor ii–V–i",
    "minor",
    "The minor-key cadence: a half-diminished ii and a dominant V pulling to a minor tonic.",
    "Autumn Leaves (B section), Blue Bossa, Alone Together",
    [["Cadence", "iiø7 | V7 | i7 | i7"]]
  ),
  jazz(
    "jazz-blues",
    "Jazz blues",
    "major",
    "A 12-bar blues with jazz moves: a passing diminished chord, a VI7 leading to ii–V, and a turnaround at the end.",
    "Billie's Bounce, Now's the Time, Tenor Madness",
    [
      [
        "Chorus",
        "I7 | IV7 | I7 | v7 I7 | IV7 | #iv°7 | I7 | VI7 | ii7 | V7 | I7 VI7 | ii7 V7",
      ],
    ]
  ),
  jazz(
    "rhythm-changes",
    "Rhythm changes",
    "major",
    "The 32-bar AABA form from I Got Rhythm. Turnarounds in the A sections, a ring of dominant chords in the bridge.",
    "Oleo, Anthropology, The Flintstones theme",
    [
      [
        "A section",
        "I6 VI7 | ii7 V7 | I6 VI7 | ii7 V7 | v7 I7 | IV7 #iv°7 | I6 VI7 | ii7 V7",
      ],
      ["Bridge", "III7 | III7 | VI7 | VI7 | II7 | II7 | V7 | V7"],
    ],
    [0, 0, 1, 0]
  ),
];

// Beats each chord in a bar gets. A two-chord bar splits
// evenly; in a meter that doesn't split (3/4) each chord falls
// back to a full bar so nothing is cut short.
function beatsForChord(chordsInBar: number, beatsPerBar: number): number {
  if (chordsInBar <= 1) return beatsPerBar;
  const share = beatsPerBar / chordsInBar;
  return Number.isInteger(share) ? share : beatsPerBar;
}

// The chords of one or more sections in order, voiced in
// `keyPitchClass`, each holding its share of the bar.
export function jazzChords(
  progression: Pick<JazzProgression, "scaleType" | "sections">,
  sectionIndexes: number[],
  keyPitchClass: number,
  beatsPerBar: number
): ProgressionChord[] {
  return sectionIndexes.flatMap((i) =>
    progression.sections[i].bars.flatMap((bar) => {
      const beats = beatsForChord(bar.length, beatsPerBar);
      return romansToChords(bar, progression.scaleType, keyPitchClass).map(
        (chord) => ({ ...chord, beats })
      );
    })
  );
}

// The full form's section order: the explicit form if the
// progression repeats sections, otherwise each section once.
export const jazzForm = (progression: JazzProgression): number[] =>
  progression.form ?? progression.sections.map((_, i) => i);

// Bars written out for display: "ii7 V7 | Imaj7".
export const jazzBarsLabel = (section: JazzSection): string =>
  section.bars.map((bar) => bar.join(" ")).join("  |  ");
