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
  quality: TriadQuality;
  function: ChordFunction;
}

// Semitone pattern from the root for each scale.
export const scaleIntervals: Record<ScaleType, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
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

export interface ProgressionTemplate {
  name: string;
  degrees: number[];
  vibe: string;
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
    },
    {
      name: "Pop Progression",
      degrees: [1, 5, 6, 4],
      vibe: "The sound of hundreds of pop hits (I–V–vi–IV).",
    },
    {
      name: "50s Progression",
      degrees: [1, 6, 4, 5],
      vibe: "Doo-wop and ballad staple (I–vi–IV–V).",
    },
    {
      name: "Jazz Turnaround",
      degrees: [2, 5, 1],
      vibe: "The backbone of jazz harmony (ii–V–I).",
    },
    {
      name: "Plagal \"Amen\"",
      degrees: [4, 1],
      vibe: "Gentle, hymn-like resolution (IV–I).",
    },
  ],
  minor: [
    {
      name: "Minor Cadence",
      degrees: [1, 4, 5, 1],
      vibe: "Natural minor's answer to I–IV–V (i–iv–v–i).",
    },
    {
      name: "Andalusian Cadence",
      degrees: [1, 7, 6, 5],
      vibe: "Dramatic descending flamenco/rock move (i–VII–VI–v).",
    },
    {
      name: "Epic Lift",
      degrees: [6, 7, 1],
      vibe: "Soaring, cinematic rise into the tonic (VI–VII–i).",
    },
    {
      name: "Minor Turnaround",
      degrees: [2, 5, 1],
      vibe: "Jazz minor ii–V–i.",
    },
  ],
};

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
