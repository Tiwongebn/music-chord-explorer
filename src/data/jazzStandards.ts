// ============================================================
// Beginner jazz standards: a short list of tunes people learn
// first, as simplified chord charts that load into the
// Progressions builder in the usual key or any other.
//
// Like data/songs.ts this stores only the harmony, never the
// melody or lyrics. Each chart is written bar by bar in roman
// numerals the same way as data/jazzProgressions.ts ("|"
// between bars, two chords in a bar split it evenly), so the
// two share parseBars() and jazzChords().
//
// "Simplified" means: extensions and alterations are dropped
// (C7♯11 is C7, Gm6 is Gm7 unless the 6 is the sound of the
// tune), tritone substitutions and chromatic passing chords
// are swapped for the plain ii–V they stand in for, and
// first/second endings are folded into one section. What's
// left is what you'd comp from a beginner's lead sheet.
// ============================================================

import type { ScaleType } from "./scales";
import { parseBars, type JazzSection } from "./jazzProgressions";

export type StandardLevel = "First tunes" | "Next steps" | "Stretch";

export const standardLevels: StandardLevel[] = [
  "First tunes",
  "Next steps",
  "Stretch",
];

export interface JazzStandard {
  id: string;
  title: string;
  composer: string;
  year: number;
  // The key it's usually played in at jam sessions and in
  // the common fake books, e.g. "G", "Ab".
  key: string;
  scaleType: ScaleType;
  level: StandardLevel;
  // Why it's a good one to learn, in a sentence.
  why: string;
  sections: JazzSection[];
  // Section order for one chorus, when sections repeat.
  form?: number[];
  // ids from data/jazzProgressions.ts the tune is built on.
  uses: string[];
  // A famous recording's artist, so searching "Sinatra" finds
  // Fly Me to the Moon.
  famousVersion?: string;
  // What was simplified, when it's worth knowing.
  simplified?: string;
  aliases?: string[];
}

type SectionSpec = [name: string, bars: string];

function standard(
  fields: Omit<JazzStandard, "id" | "sections"> & { sections: SectionSpec[] }
): JazzStandard {
  const id = fields.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return {
    ...fields,
    id,
    sections: fields.sections.map(([name, bars]) => ({
      name,
      bars: parseBars(bars),
    })),
  };
}

export const jazzStandards: JazzStandard[] = [
  // ---- First tunes ----
  standard({
    title: "C Jam Blues",
    composer: "Duke Ellington",
    year: 1942,
    key: "C",
    scaleType: "major",
    level: "First tunes",
    why: "A 12-bar blues with only three chords, and the melody is just two notes. The classic first jam-session tune.",
    sections: [
      ["Chorus", "I7 | IV7 | I7 | I7 | IV7 | IV7 | I7 | I7 | V7 | IV7 | I7 | V7"],
    ],
    uses: ["jazz-blues"],
    simplified: "Plain blues changes. Once it feels easy, try the Jazz blues progression over it.",
    aliases: ["Duke's Place"],
  }),
  standard({
    title: "Summertime",
    composer: "George Gershwin",
    year: 1935,
    key: "A",
    scaleType: "minor",
    level: "First tunes",
    why: "Sixteen slow bars that mostly sit on one minor chord, with the V7 pulling back home.",
    sections: [
      [
        "Chorus",
        "i6 | V7 | i6 | i6 | iv7 | iv7 | iiø7 | V7 | i6 | V7 | i6 | I7 | iv7 | V7 | i6 V7 | i6",
      ],
    ],
    uses: ["minor-two-five-one"],
  }),
  standard({
    title: "Autumn Leaves",
    composer: "Joseph Kosma",
    year: 1945,
    key: "G",
    scaleType: "minor",
    level: "First tunes",
    why: "Almost nothing but ii–V–Is, first to the relative major and then to the minor tonic. The best tune for learning them.",
    sections: [
      ["A", "iv7 | VII7 | IIImaj7 | VImaj7 | iiø7 | V7 | i7 | i7"],
      ["B", "iiø7 | V7 | i7 | i7 | iv7 | VII7 | IIImaj7 | IIImaj7"],
      ["C", "iiø7 | V7 | i7 | i7 | VImaj7 | iiø7 V7 | i7 | i7"],
    ],
    form: [0, 0, 1, 2],
    uses: ["two-five-one", "minor-two-five-one"],
    simplified: "The chromatic run down in the last eight bars (Gm7 G♭7 Fm7 E7) is left as i7.",
    aliases: ["Les Feuilles Mortes"],
  }),
  standard({
    title: "Blue Bossa",
    composer: "Kenny Dorham",
    year: 1963,
    key: "C",
    scaleType: "minor",
    level: "First tunes",
    why: "A 16-bar bossa nova in C minor with one short, clear trip to D♭ major. Great for hearing a key change.",
    sections: [
      ["First half", "i7 | i7 | iv7 | iv7 | iiø7 | V7 | i7 | i7"],
      ["Second half", "iii7 | VI7 | ♭IImaj7 | ♭IImaj7 | iiø7 | V7 | i7 | iiø7 V7"],
    ],
    uses: ["minor-two-five-one", "two-five-one"],
  }),

  // ---- Next steps ----
  standard({
    title: "Fly Me to the Moon",
    composer: "Bart Howard",
    year: 1954,
    key: "C",
    scaleType: "major",
    level: "Next steps",
    why: "The chords walk around the circle of fifths, one bar each, so you can hear every move coming.",
    sections: [
      ["A", "vi7 | ii7 | V7 | Imaj7 I7 | IVmaj7 | viiø7 | III7 | vi7 VI7"],
      ["B", "ii7 | V7 | Imaj7 | vi7 | ii7 | V7 | Imaj7 | viiø7 III7"],
      ["Ending", "ii7 | V7 | iii7 VI7 | ii7 | V7 | I6 | viiø7 | III7"],
    ],
    form: [0, 1, 0, 2],
    uses: ["two-five-one", "minor-two-five-one", "turnaround"],
    famousVersion: "Frank Sinatra",
    aliases: ["In Other Words"],
  }),
  standard({
    title: "Satin Doll",
    composer: "Duke Ellington",
    year: 1953,
    key: "C",
    scaleType: "major",
    level: "Next steps",
    why: "Back-to-back ii–Vs that each move up a step, plus a bridge that does the same in F.",
    sections: [
      ["A", "ii7 V7 | ii7 V7 | iii7 VI7 | iii7 VI7 | vi7 II7 | ii7 V7 | Imaj7 | Imaj7"],
      ["Bridge", "v7 I7 | v7 I7 | IVmaj7 | IVmaj7 | vi7 II7 | vi7 II7 | ii7 V7 | ii7 V7"],
    ],
    form: [0, 0, 1, 0],
    uses: ["two-five-one"],
    simplified: "Bar 6 (A♭m7 D♭7) is a tritone sub for Dm7 G7, so it's written as ii7 V7.",
  }),
  standard({
    title: "Take the A Train",
    composer: "Billy Strayhorn",
    year: 1939,
    key: "C",
    scaleType: "major",
    level: "Next steps",
    why: "An AABA tune with long, held chords. The II7 in bar 3 is the sound to learn.",
    sections: [
      ["A", "I6 | I6 | II7 | II7 | ii7 | V7 | I6 | ii7 V7"],
      ["Bridge", "IVmaj7 | IVmaj7 | IVmaj7 | IVmaj7 | II7 | II7 | ii7 | V7"],
    ],
    form: [0, 0, 1, 0],
    uses: ["two-five-one", "turnaround"],
    simplified: "The D7♯11 in bar 3 is written as plain II7.",
    aliases: ["A Train"],
  }),

  // ---- Stretch ----
  standard({
    title: "All the Things You Are",
    composer: "Jerome Kern",
    year: 1939,
    key: "Ab",
    scaleType: "major",
    level: "Stretch",
    why: "Every few bars it lands in a new key with a ii–V–I. Hard at first, but the ones you've learned keep showing up.",
    sections: [
      ["A1", "vi7 | ii7 | V7 | Imaj7 | IVmaj7 | VII7 | IIImaj7 | IIImaj7"],
      ["A2", "iii7 | vi7 | II7 | Vmaj7 | Imaj7 | ♯IV7 | VIImaj7 | VIImaj7"],
      ["Bridge", "♯i7 | ♯IV7 | VIImaj7 | VIImaj7 | ♭vii7 | ♭III7 | ♭VImaj7 | III7"],
      ["A3", "vi7 | ii7 | V7 | Imaj7 | IVmaj7 | iv7 | iii7 | ♭iii°7 | ii7 | V7 | Imaj7 | Imaj7"],
    ],
    uses: ["two-five-one"],
    simplified: "The G♭7 in A3 and the closing turnaround are left out.",
    aliases: ["All The Things"],
  }),
];

// The section order for one full chorus.
export const standardForm = (s: JazzStandard): number[] =>
  s.form ?? s.sections.map((_, i) => i);

export const standardBarCount = (s: JazzStandard): number =>
  standardForm(s).reduce((total, i) => total + s.sections[i].bars.length, 0);
