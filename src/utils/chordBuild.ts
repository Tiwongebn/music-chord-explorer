// ============================================================
// Pure chord-building helpers shared by the inline chord
// builder in the Progressions tab.
//
// A chord is described by a small "spec": a quality (the 3rd,
// or a sus 2nd/4th, plus its natural 5th), any number of
// extensions (6, 7, 9, 11, 13) and alterations (♭5, ♯9, …).
// buildChord() turns a spec into intervals + a symbol, and
// specForIntervals() goes the other way so any chord already
// in a progression (from a song, a search or the diatonic
// row) can be opened in the builder and edited.
// ============================================================

import {
  chordAlterations,
  chordExtensions,
  chordQualities,
} from "../data/chordBuilder";
import { chordTypes } from "../data/chords";

export interface ChordSpec {
  quality: string;
  extensions: string[];
  alterations: string[];
}

export interface BuiltChord {
  intervals: number[];
  intervalNames: string[];
  symbol: string;
  name: string;
}

export const DEFAULT_CHORD_SPEC: ChordSpec = {
  quality: "major",
  extensions: [],
  alterations: [],
};

// Diminished and augmented triads change the 5th, not just
// the 3rd.
const fifthByQuality: Record<
  string,
  { interval: number; name: string }
> = {
  diminished: { interval: 6, name: "Diminished 5th" },
  augmented: { interval: 8, name: "Augmented 5th" },
};

const perfectFifth = { interval: 7, name: "Perfect 5th" };

const susQualities = new Set(["sus2", "sus4"]);

// 9ths, 11ths and 13ths sit an octave above the root.
function isCompound(intervalName: string): boolean {
  return /\b(9|11|13)th\b/.test(intervalName);
}

function pitchClassKey(intervals: number[]): string {
  return [...new Set(intervals.map((i) => ((i % 12) + 12) % 12))]
    .sort((a, b) => a - b)
    .join(",");
}

// pitch-class set -> first catalog index with that set.
let catalogIndex: Map<string, number> | null = null;

// Index into chordTypes of the catalog chord with the same
// pitch-class set (order and octave ignored), or -1.
export function catalogIndexFor(intervals: number[]): number {
  if (!catalogIndex) {
    catalogIndex = new Map();

    chordTypes.forEach((chord, index) => {
      const key = pitchClassKey(chord.intervals);

      if (!catalogIndex!.has(key)) {
        catalogIndex!.set(key, index);
      }
    });
  }

  return catalogIndex.get(pitchClassKey(intervals)) ?? -1;
}

// Symbol made from the spec itself, used only when the
// result isn't a chord the catalog already names.
function fallbackSymbol(spec: ChordSpec): string {
  const quality = chordQualities.find(
    (item) => item.id === spec.quality
  );
  const has = (id: string) => spec.extensions.includes(id);

  let extension = "";

  if (has("13")) extension = "13";
  else if (has("11")) extension = "11";
  else if (has("9")) extension = has("b7") || has("maj7") ? "9" : "add9";
  else if (has("maj7")) extension = "maj7";
  else if (has("b7")) extension = "7";
  else if (has("6")) extension = "6";

  // A major 7th under a 9/11/13 is spelled "maj9" etc.
  if (has("maj7") && /^(9|11|13)$/.test(extension)) {
    extension = `maj${extension}`;
  }

  const alterations = chordAlterations
    .filter((item) => spec.alterations.includes(item.id))
    .map((item) => item.symbol)
    .join("");

  const qualitySymbol = quality?.symbol ?? "";

  // Sus goes after the extension: "7sus4", not "sus47".
  if (susQualities.has(spec.quality)) {
    return `${extension}${qualitySymbol}${alterations}`;
  }

  // Half-diminished reads better as m7♭5 than dim7.
  if (spec.quality === "diminished" && extension === "7") {
    return `m7b5${alterations}`;
  }

  return `${qualitySymbol}${extension}${alterations}`;
}

export function buildChord(spec: ChordSpec): BuiltChord {
  const quality =
    chordQualities.find((item) => item.id === spec.quality) ??
    chordQualities[0];

  const extensions = chordExtensions.filter((item) =>
    spec.extensions.includes(item.id)
  );

  const alterations = chordAlterations.filter((item) =>
    spec.alterations.includes(item.id)
  );

  const fifth = fifthByQuality[quality.id] ?? perfectFifth;

  // ♭5 / ♯5 replace the 5th instead of sitting next to it.
  const hasAlteredFifth = alterations.some(
    (item) => item.id === "b5" || item.id === "#5"
  );

  const parts = [
    { interval: 0, name: "Root" },
    { interval: quality.interval, name: quality.intervalName },
    ...(hasAlteredFifth ? [] : [fifth]),
    ...[...extensions, ...alterations].map((item) => ({
      interval: isCompound(item.intervalName)
        ? item.interval + 12
        : item.interval,
      name: item.intervalName,
    })),
  ];

  // Drop duplicates that land on the same pitch class (e.g.
  // 6th and 13th), keeping the first one.
  const seen = new Set<number>();

  const uniqueParts = parts
    .filter((part) => {
      const pitchClass = part.interval % 12;

      if (seen.has(pitchClass)) {
        return false;
      }

      seen.add(pitchClass);
      return true;
    })
    .sort((a, b) => a.interval - b.interval);

  const intervals = uniqueParts.map((part) => part.interval);
  const catalogChord = chordTypes[catalogIndexFor(intervals)];

  return {
    intervals,
    intervalNames: uniqueParts.map((part) => part.name),
    // Prefer the catalog's name for a chord it knows (so the
    // builder says "maj9", not "9", for maj7 + 9th).
    symbol: catalogChord?.symbol ?? fallbackSymbol(spec),
    name: catalogChord?.name ?? `${quality.label} chord`,
  };
}

function subsets<T>(items: T[]): T[][] {
  return items.reduce<T[][]>(
    (all, item) => [...all, ...all.map((set) => [...set, item])],
    [[]]
  );
}

// Every pitch-class set the builder can make, mapped to the
// simplest spec that makes it. Built once, on first use.
let specIndex: Map<string, ChordSpec> | null = null;

function getSpecIndex(): Map<string, ChordSpec> {
  if (specIndex) {
    return specIndex;
  }

  const index = new Map<string, ChordSpec>();
  const extensionSets = subsets(chordExtensions.map((item) => item.id));
  const alterationSets = subsets(chordAlterations.map((item) => item.id));
  const candidates: ChordSpec[] = [];

  for (const quality of chordQualities) {
    for (const extensions of extensionSets) {
      for (const alterations of alterationSets) {
        candidates.push({ quality: quality.id, extensions, alterations });
      }
    }
  }

  // Fewest options first, so the first spec stored for a set
  // is the one a person would most likely have clicked.
  candidates.sort(
    (a, b) =>
      a.extensions.length +
      a.alterations.length -
      (b.extensions.length + b.alterations.length)
  );

  for (const spec of candidates) {
    const key = pitchClassKey(buildChord(spec).intervals);

    if (!index.has(key)) {
      index.set(key, spec);
    }
  }

  specIndex = index;
  return index;
}

// The builder settings that recreate a chord with these
// intervals. Falls back to the plain triad its 3rd implies
// when no combination of options matches exactly.
export function specForIntervals(intervals: number[]): ChordSpec {
  const match = getSpecIndex().get(pitchClassKey(intervals));

  if (match) {
    return match;
  }

  const pitchClasses = intervals.map((i) => i % 12);
  const quality = pitchClasses.includes(4)
    ? "major"
    : pitchClasses.includes(3)
      ? pitchClasses.includes(6) && !pitchClasses.includes(7)
        ? "diminished"
        : "minor"
      : pitchClasses.includes(5)
        ? "sus4"
        : pitchClasses.includes(2)
          ? "sus2"
          : "major";

  return { ...DEFAULT_CHORD_SPEC, quality };
}
