// ============================================================
// "What do I improvise over this chord?"
//
// Pure functions, no React or audio. Given a chord (root +
// intervals) this picks the scale or mode a jazz player would
// reach for first, a second one to try, an easy five-note
// starting point, and the chord's guide tones (its 3rd and
// 7th, the two notes that say what kind of chord it is).
//
// The scale is chosen from the chord's notes, not its name,
// so chords made in the chord builder get a hint too. Every
// pick is checked to contain every note of the chord; if no
// scale fits, the hint falls back to "play the chord tones".
// ============================================================

import {
  calculateChordNotes,
  getPitchClass,
  type AccidentalPreference,
} from "./musicTheory";

export type ScaleId =
  | "ionian"
  | "lydian"
  | "harmonicMajor"
  | "lydianAugmented"
  | "dorian"
  | "phrygian"
  | "aeolian"
  | "melodicMinor"
  | "harmonicMinor"
  | "dorianSharp4"
  | "mixolydian"
  | "lydianDominant"
  | "mixolydianFlat6"
  | "phrygianDominant"
  | "halfWhole"
  | "wholeHalf"
  | "wholeTone"
  | "altered"
  | "locrian"
  | "locrianNatural2"
  | "majorPentatonic"
  | "minorPentatonic";

interface ScaleStep {
  semitones: number;
  // Degree as a player says it: "1", "♭3", "♯4"...
  label: string;
  // Interval name for the speller in musicTheory.ts. Its
  // number decides the letter, so C altered comes out
  // C D♭ D♯ E G♭ A♭ B♭ rather than a jumble of sharps.
  intervalName: string;
}

interface ScaleDef {
  name: string;
  // Another name the scale goes by, shown in brackets.
  aka?: string;
  // One plain sentence on how it sounds.
  sound: string;
  // Diatonic scales get an "avoid note" check. Symmetric
  // and altered scales are full of tensions on purpose.
  checkAvoid: boolean;
  steps: ScaleStep[];
}

function step(
  semitones: number,
  label: string,
  intervalName: string
): ScaleStep {
  return { semitones, label, intervalName };
}

const ROOT = step(0, "1", "Root");
const M2 = step(2, "2", "Major 2nd");
const m2 = step(1, "♭2", "Minor 2nd");
const s2 = step(3, "♯2", "Augmented 2nd");
const m3 = step(3, "♭3", "Minor 3rd");
const M3 = step(4, "3", "Major 3rd");
const P4 = step(5, "4", "Perfect 4th");
const s4 = step(6, "♯4", "Augmented 4th");
const d5 = step(6, "♭5", "Diminished 5th");
const P5 = step(7, "5", "Perfect 5th");
const s5 = step(8, "♯5", "Augmented 5th");
const m6 = step(8, "♭6", "Minor 6th");
const M6 = step(9, "6", "Major 6th");
const m7 = step(10, "♭7", "Minor 7th");
const M7 = step(11, "7", "Major 7th");

export const SCALES: Record<ScaleId, ScaleDef> = {
  ionian: {
    name: "Ionian",
    aka: "the major scale",
    sound:
      "Bright and settled, the sound of home.",
    checkAvoid: true,
    steps: [ROOT, M2, M3, P4, P5, M6, M7],
  },
  lydian: {
    name: "Lydian",
    sound:
      "The major scale with a raised 4th. Dreamy and floating, and nothing in it clashes, so you can hold any note.",
    checkAvoid: true,
    steps: [ROOT, M2, M3, s4, P5, M6, M7],
  },
  harmonicMajor: {
    name: "Harmonic major",
    sound:
      "The major scale with a ♭6, which gives it a bittersweet, slightly exotic colour.",
    checkAvoid: true,
    steps: [ROOT, M2, M3, P4, P5, m6, M7],
  },
  lydianAugmented: {
    name: "Lydian augmented",
    sound:
      "Lydian with a raised 5th. Shimmery and unresolved, made for a major 7th chord with a ♯5.",
    checkAvoid: false,
    steps: [ROOT, M2, M3, s4, s5, M6, M7],
  },
  dorian: {
    name: "Dorian",
    sound:
      "A minor scale with a bright natural 6th. It is the everyday minor sound in jazz (think “So What”).",
    checkAvoid: true,
    steps: [ROOT, M2, m3, P4, P5, M6, m7],
  },
  phrygian: {
    name: "Phrygian",
    sound:
      "A minor scale with a ♭2. Dark, with a Spanish edge.",
    checkAvoid: true,
    steps: [ROOT, m2, m3, P4, P5, m6, m7],
  },
  aeolian: {
    name: "Aeolian",
    aka: "natural minor",
    sound:
      "The plain minor scale. Darker and sadder than Dorian because of its ♭6.",
    checkAvoid: true,
    steps: [ROOT, M2, m3, P4, P5, m6, m7],
  },
  melodicMinor: {
    name: "Melodic minor",
    aka: "jazz minor",
    sound:
      "The major scale with a ♭3. Minor, but with a bright, modern top.",
    checkAvoid: false,
    steps: [ROOT, M2, m3, P4, P5, M6, M7],
  },
  harmonicMinor: {
    name: "Harmonic minor",
    sound:
      "Natural minor with a raised 7th. Dark and dramatic, with an exotic leap between the ♭6 and 7.",
    checkAvoid: false,
    steps: [ROOT, M2, m3, P4, P5, m6, M7],
  },
  dorianSharp4: {
    name: "Dorian ♯4",
    sound:
      "Dorian with a raised 4th. Moody and a little eastern, and it holds the chord's ♯11.",
    checkAvoid: false,
    steps: [ROOT, M2, m3, s4, P5, M6, m7],
  },
  mixolydian: {
    name: "Mixolydian",
    sound:
      "The major scale with a ♭7. Bluesy and relaxed, the basic sound of a dominant 7th chord.",
    checkAvoid: true,
    steps: [ROOT, M2, M3, P4, P5, M6, m7],
  },
  lydianDominant: {
    name: "Lydian dominant",
    sound:
      "Mixolydian with a raised 4th. Bright and a bit sly, and it holds the ♯11.",
    checkAvoid: false,
    steps: [ROOT, M2, M3, s4, P5, M6, m7],
  },
  mixolydianFlat6: {
    name: "Mixolydian ♭6",
    sound:
      "Mixolydian with a ♭6. It leans toward a minor chord, which is usually where this one goes next.",
    checkAvoid: true,
    steps: [ROOT, M2, M3, P4, P5, m6, m7],
  },
  phrygianDominant: {
    name: "Phrygian dominant",
    aka: "the 5th mode of harmonic minor",
    sound:
      "Spanish-sounding, with a ♭9 and a ♭13. Great on a V7 that resolves to a minor chord.",
    checkAvoid: false,
    steps: [ROOT, m2, M3, P4, P5, m6, m7],
  },
  halfWhole: {
    name: "Half-whole diminished",
    sound:
      "Eight notes, alternating half and whole steps. It holds the ♭9, ♯9, ♯11 and 13 all at once.",
    checkAvoid: false,
    steps: [
      ROOT,
      m2,
      s2,
      M3,
      s4,
      P5,
      M6,
      m7,
    ],
  },
  wholeHalf: {
    name: "Whole-half diminished",
    sound:
      "Eight notes, alternating whole and half steps: every note of the diminished chord, plus one a whole step above each.",
    checkAvoid: false,
    steps: [
      ROOT,
      M2,
      m3,
      P4,
      d5,
      m6,
      step(9, "𝄫7", "Diminished 7th"),
      M7,
    ],
  },
  wholeTone: {
    name: "Whole tone",
    sound:
      "Six notes, all a whole step apart. Floaty and dreamlike, with no clear home.",
    checkAvoid: false,
    steps: [ROOT, M2, M3, s4, s5, m7],
  },
  altered: {
    name: "Altered",
    aka: "super Locrian",
    sound:
      "Every tension a dominant chord can take: ♭9, ♯9, ♭5 and ♯5. Tense on purpose, so resolve it into the next chord.",
    checkAvoid: false,
    steps: [
      ROOT,
      step(1, "♭9", "Minor 2nd"),
      step(3, "♯9", "Augmented 2nd"),
      M3,
      d5,
      step(8, "♭13", "Minor 6th"),
      m7,
    ],
  },
  locrian: {
    name: "Locrian",
    sound:
      "The darkest mode. Its ♭2 is rough against the root, so pass over it.",
    checkAvoid: true,
    steps: [ROOT, m2, m3, P4, d5, m6, m7],
  },
  locrianNatural2: {
    name: "Locrian ♮2",
    sound:
      "Locrian with a natural 2nd, which takes out its roughest note. A jazz favourite over m7♭5.",
    checkAvoid: false,
    steps: [ROOT, M2, m3, P4, d5, m6, m7],
  },
  majorPentatonic: {
    name: "Major pentatonic",
    sound: "Five notes and no clashes, so it is hard to hit a wrong one.",
    checkAvoid: false,
    steps: [ROOT, M2, M3, P5, M6],
  },
  minorPentatonic: {
    name: "Minor pentatonic",
    sound: "Five notes and no clashes, the bluesy rock and soul favourite.",
    checkAvoid: false,
    steps: [ROOT, m3, P4, P5, m7],
  },
};

// Full scales a fallback search may use, best first.
const SEARCH_ORDER: ScaleId[] = [
  "ionian",
  "dorian",
  "mixolydian",
  "aeolian",
  "lydian",
  "melodicMinor",
  "lydianDominant",
  "mixolydianFlat6",
  "harmonicMinor",
  "harmonicMajor",
  "locrianNatural2",
  "locrian",
  "phrygian",
  "phrygianDominant",
  "altered",
  "halfWhole",
  "wholeHalf",
  "wholeTone",
  "lydianAugmented",
  "dorianSharp4",
];

// ---- Guide tones -------------------------------------------

export type GuideRole = "third" | "seventh";

export interface GuideTone {
  role: GuideRole;
  // Semitones above the root, 0–11.
  semitones: number;
  // "3", "♭3", "♭7", "6", "4 (sus)"...
  label: string;
  // Not in the chord as written: a jazz player adds it.
  implied: boolean;
}

function pitchSet(intervals: number[]): Set<number> {
  return new Set(intervals.map((value) => ((value % 12) + 12) % 12));
}

// The 3rd and 7th, or what stands in for them: a sus chord's
// 4th (or 2nd), a 6 chord's 6th, a dim7's 𝄫7. A triad with no
// 7th gets the one a jazz player would add, marked implied.
//
// `keyHas` (semitones above the chord root that are in the
// song's key) lets the implied 7th follow the key, so a plain
// G in C major gets F (♭7), not F♯.
export function guideTonesFor(
  intervals: number[],
  keyHas?: Set<number>
): GuideTone[] {
  const has = pitchSet(intervals);
  const tones: GuideTone[] = [];

  if (has.has(4)) {
    tones.push({ role: "third", semitones: 4, label: "3", implied: false });
  } else if (has.has(3)) {
    tones.push({ role: "third", semitones: 3, label: "♭3", implied: false });
  } else if (has.has(5)) {
    tones.push({ role: "third", semitones: 5, label: "4 (sus)", implied: false });
  } else if (has.has(2)) {
    tones.push({ role: "third", semitones: 2, label: "2 (sus)", implied: false });
  }

  const isDim = has.has(3) && has.has(6) && !has.has(4) && !has.has(7);

  if (has.has(11)) {
    tones.push({ role: "seventh", semitones: 11, label: "7", implied: false });
  } else if (has.has(10)) {
    tones.push({ role: "seventh", semitones: 10, label: "♭7", implied: false });
  } else if (has.has(9)) {
    tones.push({
      role: "seventh",
      semitones: 9,
      label: isDim ? "𝄫7" : "6",
      implied: false,
    });
  } else {
    const third = tones[0]?.semitones;
    const augmented = has.has(4) && has.has(8) && !has.has(7);
    // Same choices as the jazz voicings: C → Cmaj7,
    // Cm → Cm7, dim → dim7, aug and sus → a ♭7.
    let added =
      isDim
        ? { semitones: 9, label: "𝄫7" }
        : third === 4 && !augmented
          ? { semitones: 11, label: "7" }
          : { semitones: 10, label: "♭7" };

    // In a key a diminished triad is usually the vii (Bdim in
    // C), so its ♭7 from the key makes it m7♭5.
    if (keyHas && !keyHas.has(added.semitones)) {
      if (keyHas.has(10)) {
        added = { semitones: 10, label: "♭7" };
      } else if (keyHas.has(11)) {
        added = { semitones: 11, label: "7" };
      }
    }

    tones.push({ role: "seventh", ...added, implied: true });
  }

  return tones;
}

// ---- Choosing the scale ------------------------------------

type Family =
  | "major"
  | "minor"
  | "dominant"
  | "sus"
  | "halfDiminished"
  | "diminished"
  | "augmented";

interface Choice {
  family: Family;
  primary: ScaleId;
  alternatives: ScaleId[];
  easy?: ScaleId;
  // A sentence about this kind of chord, if it needs one.
  note?: string;
}

function choose(has: Set<number>): Choice {
  const p5 = has.has(7);
  const b5 = has.has(6);
  const s5 = has.has(8);
  const b9 = has.has(1);
  const s9 = has.has(3) && has.has(4);

  // m7♭5 and diminished.
  if (has.has(3) && b5 && !has.has(4) && !p5) {
    if (has.has(10)) {
      return {
        family: "halfDiminished",
        primary: has.has(2) ? "locrianNatural2" : "locrian",
        alternatives: ["locrianNatural2", "locrian"],
        note: "A m7♭5 is usually the ii in a minor ii–V–i, so the next chord is often a 7♭9.",
      };
    }

    return {
      family: "diminished",
      primary: "wholeHalf",
      alternatives: [],
      note: "A diminished chord usually passes between two other chords. Aim for the next chord's root.",
    };
  }

  // Minor.
  if (has.has(3) && !has.has(4)) {
    if (has.has(11)) {
      return {
        family: "minor",
        primary: "melodicMinor",
        alternatives: ["harmonicMinor"],
        note: "The major 7th on a minor chord is the James Bond sound. Let the 7 ring.",
      };
    }

    if (has.has(9) && !has.has(10)) {
      return {
        family: "minor",
        primary: "melodicMinor",
        alternatives: ["dorian"],
        easy: "minorPentatonic",
        note: "A m6 usually acts as a home minor chord.",
      };
    }

    if (s5) {
      return {
        family: "minor",
        primary: "aeolian",
        alternatives: ["harmonicMinor"],
        easy: "minorPentatonic",
      };
    }

    if (b5) {
      return {
        family: "minor",
        primary: "dorianSharp4",
        alternatives: [],
        easy: "minorPentatonic",
      };
    }

    return {
      family: "minor",
      primary: "dorian",
      alternatives: ["aeolian"],
      easy: "minorPentatonic",
      note: "As the ii in a ii–V–I, Dorian is the safe pick. Use Aeolian if the song is in a minor key and this is the home chord.",
    };
  }

  // Sus: no 3rd at all.
  if (!has.has(3) && !has.has(4)) {
    if (has.has(11)) {
      return { family: "sus", primary: "ionian", alternatives: ["lydian"], easy: "majorPentatonic" };
    }

    return {
      family: "sus",
      primary: "mixolydian",
      alternatives: ["dorian"],
      easy: "majorPentatonic",
      note: "In jazz a sus chord usually works like a V7 with the 3rd held back, so the 4th is welcome here instead of being a clash.",
    };
  }

  // Dominant: major 3rd and ♭7.
  if (has.has(10)) {
    if ((b9 || s9) && (s5 || b5) && !p5) {
      return {
        family: "dominant",
        primary: "altered",
        alternatives: ["halfWhole"],
        note: "Altered chords are all about tension. Let the ♭9 or ♯9 fall by a half step into the next chord.",
      };
    }

    if (b9 && s5) {
      return { family: "dominant", primary: "phrygianDominant", alternatives: ["altered"] };
    }

    if (b9 || s9) {
      return {
        family: "dominant",
        primary: "halfWhole",
        alternatives: s9 ? ["altered", "minorPentatonic"] : ["phrygianDominant", "altered"],
        note: s9
          ? "The 7♯9 is the Hendrix chord: the minor pentatonic or blues scale from the root sounds great too."
          : "A 7♭9 usually leads to a minor chord. Phrygian dominant gives it a darker, Spanish flavour.",
      };
    }

    if (s5 && !p5) {
      return { family: "dominant", primary: "wholeTone", alternatives: ["altered"] };
    }

    if (b5 && !p5) {
      return { family: "dominant", primary: "wholeTone", alternatives: ["lydianDominant"] };
    }

    if (b5) {
      return {
        family: "dominant",
        primary: "lydianDominant",
        alternatives: ["wholeTone"],
        easy: "majorPentatonic",
      };
    }

    if (s5) {
      return {
        family: "dominant",
        primary: "mixolydianFlat6",
        alternatives: ["altered"],
      };
    }

    return {
      family: "dominant",
      primary: "mixolydian",
      alternatives: has.has(5) ? [] : ["lydianDominant"],
      easy: "majorPentatonic",
      note: "As the V in a ii–V–I, try the altered scale for more tension before it resolves.",
    };
  }

  // Augmented (major 3rd, ♯5, no 5th).
  if (s5 && !p5) {
    return has.has(11)
      ? { family: "augmented", primary: "lydianAugmented", alternatives: [] }
      : { family: "augmented", primary: "wholeTone", alternatives: ["lydianAugmented"] };
  }

  // Major.
  if (b5) {
    return { family: "major", primary: "lydian", alternatives: [], easy: "majorPentatonic" };
  }

  if (s5) {
    return { family: "major", primary: "harmonicMajor", alternatives: [] };
  }

  return {
    family: "major",
    primary: "ionian",
    alternatives: has.has(5) ? [] : ["lydian"],
    easy: "majorPentatonic",
  };
}

function scaleSet(id: ScaleId): Set<number> {
  return new Set(SCALES[id].steps.map((item) => item.semitones));
}

function containsAll(id: ScaleId, notes: Set<number>): boolean {
  const scale = scaleSet(id);

  return [...notes].every((value) => scale.has(value));
}

// ---- The hint itself ---------------------------------------

export type NoteRole = "root" | "guide" | "chord" | "scale" | "avoid";

export interface HintNote {
  // Spelled note name, e.g. "Bb" (raw, not ♭-formatted).
  note: string;
  semitones: number;
  // Degree in the scale: "1", "♭3", "♯11"...
  label: string;
  role: NoteRole;
}

export interface SpelledScale {
  id: ScaleId;
  name: string;
  aka?: string;
  sound: string;
  notes: HintNote[];
}

export interface ScaleHint {
  family: Family;
  // null when no scale holds every note of the chord.
  scale: SpelledScale | null;
  alternatives: SpelledScale[];
  easy: SpelledScale | null;
  guideTones: (GuideTone & { note: string })[];
  // Scale notes a half step above a chord tone: pass through
  // them, don't hold them.
  avoid: HintNote[];
  note?: string;
  // Set when the hint is the song's key scale started on this
  // chord's root (D Dorian = C major from D).
  fromKey: boolean;
  // Set when a dominant from outside the key borrowed the
  // key's ♭9/♭13 (E7 in A minor → Phrygian dominant).
  leadsIntoKey: boolean;
}

// The seven modes of the major scale, for naming "the key's
// scale started on this chord's root".
const MODES: ScaleId[] = [
  "ionian",
  "dorian",
  "phrygian",
  "lydian",
  "mixolydian",
  "aeolian",
  "locrian",
];

function modeFor(notes: Set<number>): ScaleId | undefined {
  return MODES.find((id) => {
    const scale = scaleSet(id);

    return (
      scale.size === notes.size &&
      [...notes].every((value) => scale.has(value))
    );
  });
}

export interface KeyContext {
  // Pitch classes of the key's scale (C = 0).
  pitchClasses: number[];
}

function spell(
  root: string,
  id: ScaleId,
  chordSet: Set<number>,
  guideSet: Set<number>,
  preference: AccidentalPreference
): SpelledScale {
  const def = SCALES[id];
  const names = calculateChordNotes(
    root,
    def.steps.map((item) => item.semitones),
    def.steps.map((item) => item.intervalName),
    preference
  );

  // Avoid notes: a non-chord scale note sitting a half step
  // above a chord tone (the classic definition).
  const avoidSet = new Set<number>();

  if (def.checkAvoid) {
    for (const item of def.steps) {
      const below = (item.semitones + 11) % 12;

      if (!chordSet.has(item.semitones) && chordSet.has(below)) {
        avoidSet.add(item.semitones);
      }
    }
  }

  return {
    id,
    name: def.name,
    aka: def.aka,
    sound: def.sound,
    notes: def.steps.map((item, index) => ({
      note: names[index] ?? "",
      semitones: item.semitones,
      label: item.label,
      role:
        item.semitones === 0
          ? "root"
          : guideSet.has(item.semitones)
            ? "guide"
            : chordSet.has(item.semitones)
              ? "chord"
              : avoidSet.has(item.semitones)
                ? "avoid"
                : "scale",
    })),
  };
}

// The improvising hint for one chord. `root` is the spelled
// root ("C", "Bb", "F#"); `intervals` are the chord's
// semitones above it, as in data/chords.ts.
//
// With a `key`, a chord whose notes all belong to the key
// gets the key's own scale started on its root (Dm7 in C →
// D Dorian, G7 in C → G Mixolydian): one scale for the whole
// progression, which is the easiest way in for a beginner.
export function scaleHintFor(
  root: string,
  intervals: number[],
  preference: AccidentalPreference,
  key?: KeyContext
): ScaleHint {
  const chordSet = pitchSet(intervals);
  const rootPc = getPitchClass(root);
  const keyHas = key
    ? new Set(
        key.pitchClasses.map((pc) => (pc - rootPc + 12) % 12)
      )
    : undefined;
  const guides = guideTonesFor(intervals, keyHas);
  const guideSet = new Set(guides.map((item) => item.semitones));
  // Implied 7ths count as chord tones for picking a scale, so
  // a plain C triad gets a scale that holds a B.
  const target = new Set([...chordSet, ...guideSet]);
  const choice = choose(chordSet);

  const generic = containsAll(choice.primary, target)
    ? choice.primary
    : SEARCH_ORDER.find((id) => containsAll(id, target));

  const keyMode =
    keyHas && [...target].every((value) => keyHas.has(value))
      ? modeFor(keyHas)
      : undefined;

  // A plain dominant 7th from outside the key is usually a
  // V7 heading for a chord in it (E7 → Am in C). Borrow the
  // key's ♭9/♭13 when it has them: Phrygian dominant if both,
  // Mixolydian ♭6 if only the ♭13.
  const secondary =
    !keyMode && keyHas && generic === "mixolydian"
      ? keyHas.has(8)
        ? keyHas.has(1)
          ? "phrygianDominant"
          : "mixolydianFlat6"
        : undefined
      : undefined;

  const usable =
    secondary && containsAll(secondary, target) ? secondary : undefined;

  const primary = keyMode ?? usable ?? generic;

  const alternatives = [
    ...((keyMode || usable) && generic && generic !== primary
      ? [generic]
      : []),
    ...choice.alternatives,
  ].filter(
    (id, index, list) =>
      id !== primary &&
      list.indexOf(id) === index &&
      containsAll(id, target)
  );

  const easy =
    choice.easy &&
    primary &&
    [...scaleSet(choice.easy)].every((value) =>
      scaleSet(primary).has(value)
    )
      ? choice.easy
      : undefined;

  const make = (id: ScaleId) =>
    spell(root, id, chordSet, guideSet, preference);

  const scale = primary ? make(primary) : null;

  // Name each guide tone with the scale's spelling, or the
  // chord's own if there's no scale.
  const spelledGuides = guides.map((tone) => {
    const fromScale = scale?.notes.find(
      (item) => item.semitones === tone.semitones
    )?.note;
    const fallback = calculateChordNotes(
      root,
      [tone.semitones],
      [
        tone.role === "third"
          ? tone.semitones === 4
            ? "Major 3rd"
            : tone.semitones === 3
              ? "Minor 3rd"
              : tone.semitones === 5
                ? "Perfect 4th"
                : "Major 2nd"
          : tone.semitones === 11
            ? "Major 7th"
            : tone.semitones === 10
              ? "Minor 7th"
              : tone.label === "6"
                ? "Major 6th"
                : "Diminished 7th",
      ],
      preference
    )[0];

    return { ...tone, note: fromScale ?? fallback ?? "" };
  });

  return {
    family: choice.family,
    scale,
    alternatives: alternatives.map(make),
    easy: easy ? make(easy) : null,
    guideTones: spelledGuides,
    avoid: scale?.notes.filter((item) => item.role === "avoid") ?? [],
    note: choice.note,
    fromKey: keyMode !== undefined,
    leadsIntoKey: usable !== undefined,
  };
}

// Pitch classes (0–11, C = 0) of the guide tones that are
// actually in the chord, for highlighting on the piano and
// guitar.
export function guidePitchClasses(
  rootPitchClass: number,
  intervals: number[]
): number[] {
  return guideTonesFor(intervals)
    .filter((tone) => !tone.implied)
    .map((tone) => (rootPitchClass + tone.semitones) % 12);
}
