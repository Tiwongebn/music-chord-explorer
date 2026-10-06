// ============================================================
// Diatonic scale + chord-progression data.
//
// A "scale degree" below describes one of the seven chords
// that naturally occur inside a key — its roman numeral, its
// triad quality, and the harmonic "function" it tends to
// serve (Tonic / Subdominant / Dominant). `progressionMap`
// then says which *other* degrees that chord commonly leads
// into, and `commonProgressions` packages well-known chord
// sequences built from those relationships.
// ============================================================

export type ScaleType = "major" | "minor";

export type ChordFunction =
  | "Tonic"
  | "Subdominant"
  | "Dominant";

export type TriadQuality =
  | "Major"
  | "Minor"
  | "Diminished";

export interface ScaleDegree {
  degree: number;
  roman: string;
  // The diatonic triad quality this degree naturally has.
  // This drives the roman-numeral casing/symbol and the
  // Tonic/Subdominant/Dominant function below — it stays
  // fixed even when the user picks a fancier chord type
  // (9ths, sus chords, etc.) to actually voice the chord.
  quality: TriadQuality;
  function: ChordFunction;
}

// Semitone pattern from the root for each scale.
export const scaleIntervals: Record<ScaleType, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
};

// Named the same way musicTheory.ts's calculateChordNotes()
// expects (it recognizes "Major 2nd", "Perfect 5th", etc. to
// decide both the correct scale-step letter AND its
// accidental). Reusing that engine on the scale itself — as
// if the scale were just a very wide "chord" — gives every
// scale degree its proper, key-signature-correct letter and
// accidental for free (e.g. F major's 4th degree comes out
// "Bb", not "A#"), with no separate heuristic required.
export const scaleIntervalNames: Record<ScaleType, string[]> = {
  major: [
    "Root",
    "Major 2nd",
    "Major 3rd",
    "Perfect 4th",
    "Perfect 5th",
    "Major 6th",
    "Major 7th",
  ],
  minor: [
    "Root",
    "Major 2nd",
    "Minor 3rd",
    "Perfect 4th",
    "Perfect 5th",
    "Minor 6th",
    "Minor 7th",
  ],
};

export const majorScaleDegrees: ScaleDegree[] = [
  { degree: 1, roman: "I", quality: "Major", function: "Tonic" },
  { degree: 2, roman: "ii", quality: "Minor", function: "Subdominant" },
  { degree: 3, roman: "iii", quality: "Minor", function: "Tonic" },
  { degree: 4, roman: "IV", quality: "Major", function: "Subdominant" },
  { degree: 5, roman: "V", quality: "Major", function: "Dominant" },
  { degree: 6, roman: "vi", quality: "Minor", function: "Tonic" },
  { degree: 7, roman: "vii°", quality: "Diminished", function: "Dominant" },
];

export const minorScaleDegrees: ScaleDegree[] = [
  { degree: 1, roman: "i", quality: "Minor", function: "Tonic" },
  { degree: 2, roman: "ii°", quality: "Diminished", function: "Subdominant" },
  { degree: 3, roman: "III", quality: "Major", function: "Tonic" },
  { degree: 4, roman: "iv", quality: "Minor", function: "Subdominant" },
  { degree: 5, roman: "v", quality: "Minor", function: "Dominant" },
  { degree: 6, roman: "VI", quality: "Major", function: "Subdominant" },
  { degree: 7, roman: "VII", quality: "Major", function: "Dominant" },
];

export const scaleDegreesByType: Record<
  ScaleType,
  ScaleDegree[]
> = {
  major: majorScaleDegrees,
  minor: minorScaleDegrees,
};

// Which degrees typically flow well *out of* each degree.
// These follow standard functional-harmony tendencies:
// Tonic chords can go almost anywhere, Subdominant chords
// tend to push toward Dominant (or back to Tonic), and
// Dominant chords pull strongly back to Tonic.
export const progressionMap: Record<
  ScaleType,
  Record<number, number[]>
> = {
  major: {
    1: [1, 2, 3, 4, 5, 6, 7],
    2: [5, 7],
    3: [4, 6],
    4: [1, 2, 5],
    5: [1, 6],
    6: [2, 4, 5],
    7: [1],
  },
  minor: {
    1: [1, 2, 3, 4, 5, 6, 7],
    2: [5, 7],
    3: [4, 6],
    4: [1, 5, 7],
    5: [1, 6],
    6: [2, 4, 7],
    7: [1, 3],
  },
};

export type ProgressionDifficulty =
  | "Beginner"
  | "Intermediate"
  | "Advanced";

export interface ProgressionTemplate {
  name: string;
  degrees: number[];
  vibe: string;
  // Rough guide for newcomers deciding what to try first —
  // not a strict rule, just an ordering hint on the cards.
  difficulty: ProgressionDifficulty;
}

export const commonProgressions: Record<
  ScaleType,
  ProgressionTemplate[]
> = {
  major: [
    {
      name: "Classic Cadence",
      degrees: [1, 4, 5, 1],
      vibe: "Strong and resolved — the backbone of countless songs (I–IV–V–I).",
      difficulty: "Beginner",
    },
    {
      name: "Pop Progression",
      degrees: [1, 5, 6, 4],
      vibe: "The sound of hundreds of pop hits (I–V–vi–IV).",
      difficulty: "Beginner",
    },
    {
      name: "50s Progression",
      degrees: [1, 6, 4, 5],
      vibe: "Doo-wop and ballad staple (I–vi–IV–V).",
      difficulty: "Beginner",
    },
    {
      name: "Plagal \"Amen\"",
      degrees: [4, 1],
      vibe: "Gentle, hymn-like resolution (IV–I).",
      difficulty: "Beginner",
    },
    {
      name: "Jazz Turnaround",
      degrees: [2, 5, 1],
      vibe: "The backbone of jazz harmony (ii–V–I).",
      difficulty: "Intermediate",
    },
  ],
  minor: [
    {
      name: "Minor Cadence",
      degrees: [1, 4, 5, 1],
      vibe: "Natural minor's answer to I–IV–V (i–iv–v–i).",
      difficulty: "Beginner",
    },
    {
      name: "Andalusian Cadence",
      degrees: [1, 7, 6, 5],
      vibe: "Dramatic descending flamenco/rock move (i–VII–VI–v).",
      difficulty: "Intermediate",
    },
    {
      name: "Epic Lift",
      degrees: [6, 7, 1],
      vibe: "Soaring, cinematic rise into the tonic (VI–VII–i).",
      difficulty: "Intermediate",
    },
    {
      name: "Minor Turnaround",
      degrees: [2, 5, 1],
      vibe: "Jazz minor ii°–V–i.",
      difficulty: "Advanced",
    },
  ],
};

// Walks the progressionMap harmony graph to generate a
// plausible random progression of `length` scale degrees,
// always starting AND ending on the Tonic (degree 1) so the
// result actually resolves like a real progression instead
// of trailing off mid-phrase. Every step except the very last
// follows a real progressionMap edge from the current chord;
// the final chord is always forced to the Tonic regardless of
// whether the second-to-last chord's own suggested-next list
// happens to include it — virtually any chord can cadence
// home (e.g. vi -> I is a textbook resolution even though vi's
// *typical* next move favors ii/IV/V), so this is a reasonable
// simplification rather than a graph-adherence bug.
// `length` must be >= 2 or the start/end-on-Tonic guarantee
// can't hold; shorter requests are clamped up to 2.
export function generateRandomProgression(
  scaleType: ScaleType,
  length = 4
): number[] {
  const safeLength = Math.max(length, 2);
  const graph = progressionMap[scaleType];

  const degrees: number[] = [1];

  for (let step = 1; step < safeLength - 1; step++) {
    const current = degrees[degrees.length - 1];
    const options = graph[current] ?? [1];
    const next =
      options[Math.floor(Math.random() * options.length)];
    degrees.push(next);
  }

  degrees.push(1);

  return degrees;
}

export const functionDescriptions: Record<
  ChordFunction,
  string
> = {
  Tonic:
    "Home base. Feels stable and resolved — can move to almost any other chord.",
  Subdominant:
    "Builds gentle tension. Usually leads toward the Dominant or back to the Tonic.",
  Dominant:
    "Strong pull. Creates tension that wants to resolve back to the Tonic.",
};

// ============================================================
// Beginner glossary — short, plain-English explanations of
// the terms used throughout the Progressions tab (roman
// numerals, chord symbols, harmonic function). Shown behind
// a collapsible "What do these terms mean?" disclosure so it
// never gets in the way of users who already know the theory.
// ============================================================

export interface GlossaryEntry {
  term: string;
  explanation: string;
}

export const progressionsGlossary: GlossaryEntry[] = [
  {
    term: "Roman numerals (I, ii, V, vii°…)",
    explanation:
      "A shorthand for a chord's position in the scale, not a fixed note — \"I\" always means \"built on the 1st note of the key,\" whether that's C major or F♯ major.",
  },
  {
    term: "Capital vs. lowercase (IV vs. iv)",
    explanation:
      "Capital numerals (I, IV, V) are major chords. Lowercase numerals (ii, iii, vi) are minor chords. A ° (like vii°) marks a diminished chord.",
  },
  {
    term: "Scale degree",
    explanation:
      "Just the position of a note in the scale, counted from 1. In C major, C is degree 1, D is degree 2, E is degree 3, and so on.",
  },
  {
    term: "Diatonic",
    explanation:
      "\"Belongs to the current key.\" The 7 chords in the chord row are the diatonic chords of whatever key is selected — built only from that key's own notes.",
  },
  {
    term: "Chord symbols (m, dim, maj7, m7♭5…)",
    explanation:
      "Letters/symbols after a chord's root tell you its quality: \"m\" = minor, \"dim\" = diminished, \"maj7\" = major 7th, \"m7♭5\" = half-diminished 7th, and so on.",
  },
  {
    term: "Tonic",
    explanation:
      "The \"home\" chord of the key (degree I or i). It sounds resolved and stable — most progressions start and end here.",
  },
  {
    term: "Subdominant",
    explanation:
      "A chord (degree IV or ii, for example) that gently pulls away from home, usually heading toward the Dominant or back to the Tonic.",
  },
  {
    term: "Dominant",
    explanation:
      "A chord (degree V, for example) with a strong pull back to the Tonic — it creates the tension that makes a resolution feel satisfying.",
  },
  {
    term: "Cadence",
    explanation:
      "A short chord sequence that ends a musical phrase, usually by resolving to the Tonic — e.g. V–I is one of the most common cadences.",
  },
  {
    term: "Borrowed / chromatic chord",
    explanation:
      "A chord that doesn't quite belong to the current key — either its root note isn't in the scale (\"chromatic\"), or its quality doesn't match what that scale degree naturally is (\"borrowed\"). Neither is a mistake — they're common songwriting tools — but they're flagged in the builder so you know you've stepped outside the key.",
  },
];
