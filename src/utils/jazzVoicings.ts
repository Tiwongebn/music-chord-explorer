// Jazz voicings: what a jazz player actually puts under a chord
// symbol, as opposed to every note stacked from the root.
//
//   shell     root, 3rd and 7th. The 3rd and 7th say major vs
//             minor and maj7 vs ♭7; the root anchors it.
//   rootless  piano, "full": 3rd, 5th (or 13th), 7th, 9th with
//             no root, since the bass player covers it.
//   drop2     guitar, "full": a close four-note chord with the
//             second note from the top dropped an octave, which
//             puts it on four adjacent strings.
//
// Everything here is pure: chord intervals in, MIDI notes or
// guitar frets out.

import {
  MAX_FRET,
  STANDARD_TUNING,
  type GuitarVoicing,
} from "./guitarVoicings";

export type VoicingKind = "shell" | "rootless" | "drop2";

export interface JazzTone {
  // Semitones above the root (may pass 12 for 9ths, 13ths).
  semitones: number;
  // Short label for diagrams: "R", "♭3", "♭7", "13".
  degree: string;
  // Long name understood by calculateChordNotes for spelling.
  intervalName: string;
}

const TONES: Record<number, Omit<JazzTone, "semitones">> = {
  0: { degree: "R", intervalName: "Root" },
  2: { degree: "2", intervalName: "Major 2nd" },
  3: { degree: "♭3", intervalName: "Minor 3rd" },
  4: { degree: "3", intervalName: "Major 3rd" },
  5: { degree: "4", intervalName: "Perfect 4th" },
  6: { degree: "♭5", intervalName: "Diminished 5th" },
  7: { degree: "5", intervalName: "Perfect 5th" },
  8: { degree: "♯5", intervalName: "Augmented 5th" },
  9: { degree: "6", intervalName: "Major 6th" },
  10: { degree: "♭7", intervalName: "Minor 7th" },
  11: { degree: "7", intervalName: "Major 7th" },
  13: { degree: "♭9", intervalName: "Minor 9th" },
  14: { degree: "9", intervalName: "Major 9th" },
  15: { degree: "♯9", intervalName: "Augmented 9th" },
  17: { degree: "11", intervalName: "Perfect 11th" },
  18: { degree: "♯11", intervalName: "Augmented 11th" },
  20: { degree: "♭13", intervalName: "Minor 13th" },
  21: { degree: "13", intervalName: "Major 13th" },
};

function tone(semitones: number): JazzTone {
  return { semitones, ...TONES[semitones] };
}

const DIM_SEVENTH: JazzTone = {
  semitones: 9,
  degree: "𝄫7",
  intervalName: "Diminished 7th",
};

// A chord broken into the jobs its notes do.
export interface JazzChord {
  root: JazzTone;
  third: JazzTone; // 3rd, or the 4th/2nd of a sus chord
  fifth: JazzTone | null;
  seventh: JazzTone; // 7th, or the 6th of a 6 chord
  ninth: JazzTone | null; // ♭9, 9 or ♯9 when the chord has one
  upper: JazzTone | null; // 13th, ♯11 or 11 when it has one
  // Set when the chord had no 7th and one was borrowed so the
  // voicings sound like jazz (C becomes Cmaj7, Cm becomes Cm7).
  borrowed: JazzTone | null;
}

export function analyzeJazzChord(intervals: number[]): JazzChord {
  const has = (semitones: number) => intervals.includes(semitones);
  const first = (...options: number[]) => {
    const found = options.find(has);

    return found === undefined ? null : tone(found);
  };

  const third =
    first(4, 3) ?? first(5, 2) ?? tone(4);
  const fifth = first(7, 6, 8);

  let seventh = first(11, 10);
  let borrowed: JazzTone | null = null;
  let thirteenIsSixth = false;

  if (!seventh) {
    if (has(9)) {
      // [0,3,6,9] is a diminished 7th, otherwise a 6 chord.
      seventh =
        has(3) && has(6) ? DIM_SEVENTH : tone(9);
    } else if (has(21)) {
      // add13 has no 7th; the 13 works as the 6th.
      seventh = tone(9);
      thirteenIsSixth = true;
    } else {
      // A plain triad: borrow the 7th a jazz player would add.
      const semitones =
        third.semitones === 3 && fifth?.semitones === 6
          ? 9 // dim → dim7
          : third.semitones === 4 && fifth?.semitones === 8
            ? 10 // aug → 7♯5
            : third.semitones === 4
              ? 11 // major → maj7
              : 10; // minor, sus → m7, 7sus

      borrowed = semitones === 9 && third.semitones === 3
        ? DIM_SEVENTH
        : tone(semitones);
      seventh = borrowed;
    }
  }

  let ninth = first(13, 14, 15);

  // sus2(add9) already uses that pitch as its "3rd".
  if (ninth && ninth.semitones % 12 === third.semitones % 12) {
    ninth = null;
  }

  const minorOrSus = third.semitones !== 4;
  const upper =
    (thirteenIsSixth ? null : first(21, 20)) ??
    first(18) ??
    (minorOrSus ? first(17) : null);

  return {
    root: tone(0),
    third,
    fifth,
    seventh,
    ninth,
    upper,
    borrowed,
  };
}

const isDominant = (chord: JazzChord) =>
  chord.third.semitones === 4 && chord.seventh.semitones === 10;

const isHalfDiminished = (chord: JazzChord) =>
  chord.third.semitones === 3 &&
  chord.fifth?.semitones === 6 &&
  chord.seventh.semitones === 10;

// The note that fills the "5th" slot of a four-note voicing.
// An altered 5th defines the chord, so it wins; then a 13th or
// ♯11; then the plain 5th.
function fifthSlot(chord: JazzChord, colourDominant: boolean): JazzTone {
  const altered =
    chord.fifth && chord.fifth.semitones !== 7 ? chord.fifth : null;

  if (altered) {
    return altered;
  }

  if (chord.upper) {
    return chord.upper;
  }

  // Pianists swap the 5th of a plain dominant for the 13th.
  if (colourDominant && isDominant(chord)) {
    return tone(21);
  }

  return chord.fifth ?? tone(7);
}

// The 9th slot of a rootless voicing. Pianists add a 9th even
// when the symbol doesn't ask for one. Over a half-diminished
// chord the natural 9th sounds off to most ears, so the root
// stays in that slot instead.
function ninthSlot(chord: JazzChord): JazzTone {
  if (chord.ninth) {
    return chord.ninth;
  }

  return isHalfDiminished(chord) ? chord.root : tone(14);
}

// Stack tones upward: each one lands on the nearest pitch above
// the previous. Repeated pitch classes are dropped.
function stack(tones: JazzTone[]): { tone: JazzTone; offset: number }[] {
  const out: { tone: JazzTone; offset: number }[] = [];
  const seen = new Set<number>();
  let previous = -Infinity;

  for (const item of tones) {
    const pc = item.semitones % 12;

    if (seen.has(pc)) {
      continue;
    }

    seen.add(pc);

    let offset = pc;

    while (offset <= previous) {
      offset += 12;
    }

    out.push({ tone: item, offset });
    previous = offset;
  }

  return out;
}

// ---- Piano ---------------------------------------------------

export interface PianoVoicing {
  label: string;
  hint: string;
  notes: { midi: number; tone: JazzTone }[];
}

export function pianoJazzVoicings(
  rootPc: number,
  intervals: number[],
  kind: "shell" | "rootless"
): PianoVoicing[] {
  const chord = analyzeJazzChord(intervals);
  const { root, third, seventh } = chord;

  // Root between C3 and B3: left hand territory.
  const placeShell = (tones: JazzTone[]) =>
    stack(tones).map(({ tone: item, offset }) => ({
      midi: 48 + rootPc + offset,
      tone: item,
    }));

  if (kind === "shell") {
    return [
      {
        label: `R · ${third.degree} · ${seventh.degree}`,
        hint: `Root on the bottom, ${third.degree === "♭3" ? "minor " : ""}3rd and 7th close above it.`,
        notes: placeShell([root, third, seventh]),
      },
      {
        label: `R · ${seventh.degree} · ${third.degree}`,
        hint: "Same three notes with the 7th under the 3rd. Alternate the two shapes and your hand barely moves through a ii–V–I.",
        notes: placeShell([root, seventh, third]),
      },
    ];
  }

  const five = fifthSlot(chord, true);
  const nine = ninthSlot(chord);

  // Bottom note between D3 and C♯4, the usual comping range.
  const placeRootless = (tones: JazzTone[]) => {
    const stacked = stack(tones);
    let base = 48 + rootPc + stacked[0].offset;

    while (base < 50) {
      base += 12;
    }

    while (base > 61) {
      base -= 12;
    }

    return stacked.map(({ tone: item, offset }) => ({
      midi: base + offset - stacked[0].offset,
      tone: item,
    }));
  };

  return [
    {
      label: `A · ${[third, five, seventh, nine].map((t) => t.degree).join(" ")}`,
      hint:
        nine === chord.root
          ? "3rd on the bottom. Over a half-diminished chord the 9th tends to clash, so the root stays on top instead."
          : "3rd on the bottom. No root: the bass player has it, so your hand is free for colour.",
      notes: placeRootless([third, five, seventh, nine]),
    },
    {
      label: `B · ${[seventh, nine, third, five].map((t) => t.degree).join(" ")}`,
      hint: "7th on the bottom. Swap between A and B from chord to chord and the notes move by step.",
      notes: placeRootless([seventh, nine, third, five]),
    },
  ];
}

// ---- Guitar --------------------------------------------------

export interface GuitarJazzVoicing extends GuitarVoicing {
  label: string;
  // The tone on each string, low to high; null when muted.
  tones: (JazzTone | null)[];
}

const STRING_NAMES = ["6th", "5th", "4th", "3rd", "2nd", "1st"];

// Find a fingering that plays `order` low to high on exactly
// `strings` (ascending string numbers), with each note above
// the last by less than an octave. Lowest position wins.
function placeOnStrings(
  rootPc: number,
  order: JazzTone[],
  strings: number[],
  maxSpan: number
): number[] | null {
  const options = strings.map((string, index) => {
    const pc = (rootPc + order[index].semitones) % 12;
    const frets: number[] = [];

    for (let fret = 0; fret <= MAX_FRET; fret++) {
      if ((STANDARD_TUNING[string] + fret) % 12 === pc) {
        frets.push(fret);
      }
    }

    return frets;
  });

  let best: number[] | null = null;
  let bestPosition = Infinity;

  const walk = (index: number, chosen: number[]) => {
    if (index === strings.length) {
      const fretted = chosen.filter((fret) => fret > 0);
      const low = fretted.length ? Math.min(...fretted) : 0;
      const high = fretted.length ? Math.max(...fretted) : 0;

      if (high - low > maxSpan) {
        return;
      }

      // Open strings only next to first-position shapes.
      if (chosen.includes(0) && high > 4) {
        return;
      }

      if (low < bestPosition) {
        bestPosition = low;
        best = [...chosen];
      }

      return;
    }

    for (const fret of options[index]) {
      if (index > 0) {
        const below =
          STANDARD_TUNING[strings[index - 1]] + chosen[index - 1];
        const step = STANDARD_TUNING[strings[index]] + fret - below;

        if (step <= 0 || step >= 12) {
          continue;
        }
      }

      chosen.push(fret);
      walk(index + 1, chosen);
      chosen.pop();
    }
  };

  walk(0, []);

  return best;
}

function toVoicing(
  rootPc: number,
  order: JazzTone[],
  strings: number[],
  label: string,
  maxSpan = 3
): GuitarJazzVoicing | null {
  const placed = placeOnStrings(rootPc, order, strings, maxSpan);

  if (!placed) {
    return null;
  }

  const frets = STANDARD_TUNING.map(() => -1);
  const tones: (JazzTone | null)[] = STANDARD_TUNING.map(() => null);

  strings.forEach((string, index) => {
    frets[string] = placed[index];
    tones[string] = order[index];
  });

  const fretted = placed.filter((fret) => fret > 0);

  return {
    frets,
    tones,
    baseFret: fretted.length ? Math.min(...fretted) : 1,
    label,
  };
}

export function guitarJazzVoicings(
  rootPc: number,
  intervals: number[],
  kind: "shell" | "drop2"
): GuitarJazzVoicing[] {
  const chord = analyzeJazzChord(intervals);
  const { root, third, seventh } = chord;
  const shapes: (GuitarJazzVoicing | null)[] = [];

  if (kind === "shell") {
    // The four shells every jazz guitarist learns first.
    const plans: [JazzTone[], number[]][] = [
      [[root, third, seventh], [0, 1, 2]],
      [[root, seventh, third], [0, 2, 3]],
      [[root, third, seventh], [1, 2, 3]],
      [[root, seventh, third], [1, 3, 4]],
    ];

    for (const [order, strings] of plans) {
      shapes.push(
        toVoicing(
          rootPc,
          order,
          strings,
          `Root on ${STRING_NAMES[strings[0]]} string · ${order
            .map((t) => t.degree)
            .join(" ")}`
        )
      );
    }

    return shapes.filter((shape) => shape !== null);
  }

  // Drop 2: the four core notes, with the 9th standing in for
  // the root when the chord has one.
  const core = [
    chord.ninth ?? root,
    third,
    fifthSlot(chord, false),
    seventh,
  ];

  const pcs = new Set(core.map((t) => t.semitones % 12));

  if (pcs.size < 4) {
    return [];
  }

  // Close position, lowest pitch class first.
  const close = [...core].sort(
    (a, b) => (a.semitones % 12) - (b.semitones % 12)
  );

  const sets: [number[], string][] = [
    [[1, 2, 3, 4], "Middle 4 strings"],
    [[2, 3, 4, 5], "Top 4 strings"],
  ];

  for (const [strings, setName] of sets) {
    for (let inversion = 0; inversion < 4; inversion++) {
      const rotated = [
        ...close.slice(inversion),
        ...close.slice(0, inversion),
      ];
      // Drop the second-highest note an octave.
      const order = [rotated[2], rotated[0], rotated[1], rotated[3]];

      shapes.push(
        toVoicing(
          rootPc,
          order,
          strings,
          `${setName} · ${order[0].degree} in the bass`,
          // Some drop-2 inversions need a five-fret stretch.
          4
        )
      );
    }
  }

  // Middle strings first (they sit where shells do), and the
  // root-in-bass shape first within each set, since it's the
  // easiest to hear as the chord.
  const rank = (shape: GuitarJazzVoicing) =>
    (shape.frets[5] >= 0 ? 100 : 0) +
    (shape.tones.find((t) => t !== null)?.degree === "R" ? 0 : 50) +
    shape.baseFret;

  return shapes
    .filter((shape) => shape !== null)
    .sort((a, b) => rank(a) - rank(b));
}

// "C#4"-style name for a MIDI number, for playback.
const SHARP_NAMES = [
  "C", "C#", "D", "D#", "E", "F",
  "F#", "G", "G#", "A", "A#", "B",
];

export function midiToNote(midi: number): string {
  return `${SHARP_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}
