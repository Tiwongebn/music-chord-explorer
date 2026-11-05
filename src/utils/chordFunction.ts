// ============================================================
// "Why this chord?" — what job a chord does in a key, and
// where it usually goes next, in everyday words.
//
// Every chord in a key does one of a few jobs:
//
//  - Home: where the music feels settled (I, and its two
//    soft stand-ins iii and vi).
//  - Moving away: steps out from home and gets the tension
//    ready (ii and IV).
//  - Tension: wants to resolve, usually back home (V, vii°).
//  - Detour: a chord from outside the key that points at a
//    chord inside it (secondary dominants, tritone subs,
//    passing diminished chords, the ii of a borrowed ii–V).
//  - Borrowed: taken from the key's minor (or major) twin
//    for a change of mood (iv, ♭VI, ♭VII in a major key...).
//
// The roman numeral and the textbook name are kept for the
// curious, but the explanation itself avoids theory words.
// Everything here is pure: callers pass pitch classes and a
// function that names a pitch class under the current
// sharps/flats setting.
// ============================================================

import { scaleDegreesByType, scaleIntervals, type ScaleType } from "../data/scales";

export type ChordRole = "home" | "away" | "tension" | "detour" | "borrowed" | "colour";

export const roleLabel: Record<ChordRole, string> = {
  home: "Home",
  away: "Moving away",
  tension: "Tension",
  detour: "Detour",
  borrowed: "Borrowed",
  colour: "Colour",
};

export interface FunctionChord {
  // Root pitch class, C = 0.
  root: number;
  // Semitones above the root, as in data/chords.ts.
  intervals: number[];
  // How the progression shows it, e.g. "Dm7". Only needed
  // for the next chord, to name it in the explanation.
  label?: string;
}

export interface FunctionKey {
  root: number;
  scale: ScaleType;
}

export interface ChordExplanation {
  role: ChordRole;
  // Roman numeral in the key, e.g. "V7", "V7/ii", "♭VII".
  roman: string;
  // The textbook name, shown small: "Dominant", "Tritone sub".
  theoryName: string;
  // What the chord does, in one or two plain sentences.
  summary: string;
  // Where it usually goes, e.g. "Usually goes to C."
  goesTo: string;
  // Pitch classes of the chords it usually goes to, first
  // one most likely.
  targets: number[];
  // Only with a next chord: how this progression uses it.
  inContext?: string;
}

export interface ExplainOptions {
  // Names a pitch class, e.g. 10 -> "B♭".
  name: (pitchClass: number) => string;
  // The chord that follows in the progression.
  next?: FunctionChord;
  // True when `next` is really the first chord, reached by
  // looping back from the end.
  nextWraps?: boolean;
  // True when this chord is the last one and nothing loops.
  isLast?: boolean;
}

type Family = "major" | "minor" | "dominant" | "diminished" | "halfDiminished" | "other";

const mod12 = (value: number) => ((value % 12) + 12) % 12;

export function familyOf(intervals: number[]): Family {
  const set = new Set(intervals.map(mod12));
  const has = (value: number) => set.has(value);

  if (has(3) && has(6) && has(9) && !has(10)) return "diminished";
  if (has(3) && has(6) && has(10)) return "halfDiminished";
  if (has(3) && has(6) && !has(7)) return "diminished";
  if (has(4) && has(10)) return "dominant";
  // 7sus4 / 9sus4: a dominant chord with the 3rd held back.
  if (!has(3) && !has(4) && has(5) && has(10)) return "dominant";
  if (has(4) && (has(7) || !has(8))) return "major";
  if (has(3) && !has(4)) return "minor";
  return "other";
}

// The seven chords of the key: which offset (semitones above
// the key root) each sits on, its numeral and its triad.
interface Degree {
  offset: number;
  roman: string;
  quality: "Major" | "Minor" | "Diminished";
}

function degreesOf(scale: ScaleType): Degree[] {
  return scaleDegreesByType[scale].map((degree, index) => ({
    offset: scaleIntervals[scale][index],
    roman: degree.roman,
    quality: degree.quality,
  }));
}

const flatRoman: Record<number, string> = {
  1: "♭II",
  3: "♭III",
  6: "♭V",
  8: "♭VI",
  10: "♭VII",
};

const sharpRoman: Record<number, string> = {
  0: "I",
  2: "II",
  4: "III",
  5: "IV",
  7: "V",
  9: "VI",
  11: "VII",
};

// Numeral for any root, whatever the key: "♭VII", "II", ...
function romanFor(offset: number, family: Family): string {
  const upper = flatRoman[offset] ?? sharpRoman[offset] ?? "?";
  const minorish = family === "minor" || family === "diminished" || family === "halfDiminished";
  const base = minorish ? upper.toLowerCase() : upper;
  const suffix =
    family === "diminished" ? "°" : family === "halfDiminished" ? "ø" : family === "dominant" ? "7" : "";
  return `${base}${suffix}`;
}

function matchesQuality(family: Family, quality: Degree["quality"]): boolean {
  switch (quality) {
    case "Major":
      return family === "major" || family === "dominant";
    case "Minor":
      return family === "minor";
    case "Diminished":
      return family === "diminished" || family === "halfDiminished";
  }
}

// Short label for a chord of the key: "C", "Dm", "B°", and
// "G7" for the V chord, since that's how it's usually played.
function degreeLabel(key: FunctionKey, offset: number, name: ExplainOptions["name"]): string {
  const pc = mod12(key.root + offset);
  if (offset === 7) return `${name(pc)}7`;
  const degree = degreesOf(key.scale).find((item) => item.offset === offset);
  const suffix = degree?.quality === "Minor" ? "m" : degree?.quality === "Diminished" ? "°" : "";
  return `${name(pc)}${suffix}`;
}

const list = (items: string[]) =>
  items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} or ${items[items.length - 1]}`;

// Built from the offsets the chord likes to go to.
function goesToLine(key: FunctionKey, offsets: number[], name: ExplainOptions["name"], extra = ""): string {
  const labels = offsets.map((offset) => degreeLabel(key, offset, name));
  return `Usually goes to ${list(labels)}${extra}.`;
}

interface Explained {
  role: ChordRole;
  roman: string;
  theoryName: string;
  summary: string;
  goesTo: string;
  targets: number[];
  // A move to this pitch class is a well-known surprise.
  surprise?: { root: number; text: string };
}

// The seven home-key chords, one entry per (scale, offset).
function diatonic(
  key: FunctionKey,
  offset: number,
  family: Family,
  name: ExplainOptions["name"],
  roman: string
): Explained | null {
  const home = name(key.root);
  const homeLabel = degreeLabel(key, 0, name);
  const at = (o: number) => mod12(key.root + o);
  const go = (offsets: number[], extra = "") => ({
    goesTo: goesToLine(key, offsets, name, extra),
    targets: offsets.map(at),
  });

  if (key.scale === "major") {
    switch (offset) {
      case 0:
        return family === "dominant"
          ? {
              role: "home",
              roman,
              theoryName: "Tonic (bluesy)",
              summary: `Home, with a bluesy edge. In a blues this is where you live. Elsewhere that extra note makes it lean toward ${degreeLabel(key, 5, name)}.`,
              ...go([5]),
            }
          : {
              role: "home",
              roman,
              theoryName: "Tonic",
              summary: `Home base. The key of ${home} is built on this chord, so the music feels settled and finished here.`,
              goesTo: "It doesn't need to go anywhere. Songs often start and end here, and any chord can follow.",
              targets: [],
            };
      case 2:
        return {
          role: "away",
          roman,
          theoryName: "Subdominant (ii)",
          summary: `Steps away from home and gets the tension chord ready. It is the "ii" of the famous ii–V–I.`,
          ...go([7]),
        };
      case 4:
        return {
          role: "home",
          roman,
          theoryName: "Tonic stand-in (iii)",
          summary: `A soft stand-in for home. It shares two notes with ${homeLabel}, so it feels calm, just less final.`,
          ...go([9, 5]),
        };
      case 5:
        return {
          role: "away",
          roman,
          theoryName: "Subdominant (IV)",
          summary: "Moves away from home. It sounds open and bright, like stepping out the front door.",
          ...go([7, 0], " (back home)"),
        };
      case 7:
        return {
          role: "tension",
          roman,
          theoryName: "Dominant (V)",
          summary: `The tension chord: it really wants to resolve home to ${home}. Its 3rd, ${name(at(11))}, sits just below ${home} and pulls up to it.`,
          ...go([0]),
          surprise: {
            root: at(9),
            text: `a fake-out: your ear expects home (${homeLabel}) and gets its sad cousin instead`,
          },
        };
      case 9:
        return {
          role: "home",
          roman,
          theoryName: "Tonic stand-in (vi)",
          summary: `Home's sad cousin. It shares two notes with ${homeLabel}, so it can stand in for home with a more wistful mood.`,
          ...go([2, 5]),
        };
      case 11:
        return {
          role: "tension",
          roman,
          theoryName: "Leading-tone chord",
          summary: `A tense, restless chord that works like a lighter version of ${degreeLabel(key, 7, name)}: it shares three of its notes.`,
          ...go([0]),
        };
    }
    return null;
  }

  switch (offset) {
    case 0:
      return {
        role: "home",
        roman,
        theoryName: "Tonic",
        summary: `Home base for ${home} minor: settled, but darker and moodier than a major home.`,
        goesTo: "It doesn't need to go anywhere. Minor-key songs often start and end here.",
        targets: [],
      };
    case 2:
      return {
        role: "away",
        roman,
        theoryName: "Subdominant (ii°)",
        summary: `Steps away from home and sets up the tension chord. In jazz it is the "ii" of a minor ii–V–i, usually played as a half-diminished chord.`,
        ...go([7]),
      };
    case 3:
      return {
        role: "home",
        roman,
        theoryName: "Relative major",
        summary: `Home's brighter twin: it uses the same notes as ${home} minor but sounds major, so things lift for a moment.`,
        ...go([8, 5]),
      };
    case 5:
      return {
        role: "away",
        roman,
        theoryName: "Subdominant (iv)",
        summary: "Moves away from home with a heavy, sad feel.",
        ...go([7, 0], " (back home)"),
      };
    case 7:
      return family === "minor"
        ? {
            role: "tension",
            roman,
            theoryName: "Minor dominant (v)",
            summary: "A gentle tension chord. Without a strong pull it drifts rather than drives back home.",
            ...go([0, 8]),
          }
        : {
            role: "tension",
            roman,
            theoryName: "Dominant (V)",
            summary: `The tension chord: it pulls hard back home to ${home} minor. Its 3rd, ${name(at(11))}, is borrowed from outside the key just to sit below ${home} and lean into it.`,
            ...go([0]),
            surprise: {
              root: at(8),
              text: `a fake-out: your ear expects home and gets ${degreeLabel(key, 8, name)} instead`,
            },
          };
    case 8:
      return {
        role: "away",
        roman,
        theoryName: "Submediant (♭VI)",
        summary: "Moves away from home with a warm, dramatic sound, a favourite in film music.",
        ...go([7, 10]),
      };
    case 10:
      return {
        role: "away",
        roman,
        theoryName: "Subtonic (♭VII)",
        summary: "A strong, open step back toward home: the rock and folk way to finish, without the usual tension chord.",
        ...go([0, 3]),
      };
    case 11:
      return {
        role: "tension",
        roman,
        theoryName: "Leading-tone chord",
        summary: `A tense, restless chord sitting just below ${home}. It works like a lighter V chord.`,
        ...go([0]),
      };
  }
  return null;
}

// A chord from the key's twin (C minor's chords in C major,
// and the other way round).
function borrowed(
  key: FunctionKey,
  offset: number,
  family: Family,
  name: ExplainOptions["name"]
): Explained | null {
  const twin = key.scale === "major" ? "minor" : "major";
  const homeName = `${name(key.root)} ${twin}`;
  const at = (o: number) => mod12(key.root + o);
  const go = (offsets: number[], extra = "") => ({
    goesTo: goesToLine(key, offsets, name, extra),
    targets: offsets.map(at),
  });
  const roman = romanFor(offset, family);

  if (key.scale === "major") {
    if (offset === 5 && family === "minor") {
      return {
        role: "borrowed",
        roman,
        theoryName: "Borrowed iv",
        summary: `Borrowed from ${homeName}. It is the IV chord with a sad twist, a classic bittersweet moment.`,
        ...go([0, 7], " (back home)"),
      };
    }
    if (offset === 10 && (family === "major" || family === "dominant")) {
      return {
        role: "borrowed",
        roman,
        theoryName: "Borrowed ♭VII",
        summary: `Borrowed from ${homeName}. It gives a bold, rock-flavoured way back home.`,
        ...go([0]),
      };
    }
    if (offset === 8 && family === "major") {
      return {
        role: "borrowed",
        roman,
        theoryName: "Borrowed ♭VI",
        summary: `Borrowed from ${homeName}. It adds a big, dramatic shadow before heading home.`,
        ...go([10, 7, 0]),
      };
    }
    if (offset === 3 && family === "major") {
      return {
        role: "borrowed",
        roman,
        theoryName: "Borrowed ♭III",
        summary: `Borrowed from ${homeName}. It sounds bold and a little unexpected.`,
        ...go([5, 8]),
      };
    }
    if (offset === 2 && family === "halfDiminished") {
      return {
        role: "borrowed",
        roman,
        theoryName: "Borrowed iiø",
        summary: `Borrowed from ${homeName}: a darker way to set up the tension chord.`,
        ...go([7]),
      };
    }
    return null;
  }

  if (offset === 0 && family === "major") {
    return {
      role: "borrowed",
      roman,
      theoryName: "Picardy third",
      summary: `Borrowed from ${homeName}: a sudden bright ending to a minor-key tune.`,
      goesTo: "Usually the very last chord.",
      targets: [],
    };
  }
  if (offset === 5 && (family === "major" || family === "dominant")) {
    return {
      role: "borrowed",
      roman,
      theoryName: "Dorian IV",
      summary: `Borrowed from ${homeName}. It brightens the minor key for a moment, a soulful sound.`,
      ...go([0]),
    };
  }
  return null;
}

// A chord from outside the key that points at a chord in it.
function detour(
  key: FunctionKey,
  chord: FunctionChord,
  family: Family,
  name: ExplainOptions["name"],
  next?: FunctionChord
): Explained | null {
  const degrees = degreesOf(key.scale);
  const inKey = (pc: number) => degrees.find((degree) => mod12(key.root + degree.offset) === pc);
  const labelOf = (pc: number) => {
    const degree = inKey(pc);
    return degree ? degreeLabel(key, degree.offset, name) : name(pc);
  };
  const romanOf = (pc: number) => inKey(pc)?.roman ?? "?";
  const nextRoot = next?.root;

  // Something a dominant 7th can point at: a key chord that
  // isn't diminished (you don't "arrive" on a diminished chord).
  const target = (pc: number) => {
    const degree = inKey(pc);
    return degree && degree.quality !== "Diminished" ? degree : undefined;
  };

  const fifthBelow = mod12(chord.root + 5);
  const halfBelow = mod12(chord.root - 1);
  const halfAbove = mod12(chord.root + 1);

  if (family === "dominant" || family === "major") {
    const secondary = target(fifthBelow) && fifthBelow !== key.root ? fifthBelow : undefined;
    const tritone = family === "dominant" && target(halfBelow) ? halfBelow : undefined;

    // Let the next chord pick when both readings fit.
    const pick =
      tritone !== undefined && (secondary === undefined || nextRoot === halfBelow) ? "tritone" : secondary !== undefined ? "secondary" : undefined;

    if (pick === "secondary") {
      const to = secondary!;
      return {
        role: "detour",
        roman: `V${family === "dominant" ? "7" : ""}/${romanOf(to)}`,
        theoryName: "Secondary dominant",
        summary: `Not quite in the key. It is the tension chord of ${labelOf(to)}, so for a moment ${labelOf(to)} feels like home and this chord pulls toward it.`,
        goesTo: `Usually goes to ${labelOf(to)}.`,
        targets: [to],
      };
    }

    if (pick === "tritone") {
      const to = tritone!;
      const isHome = to === key.root;
      return {
        role: "detour",
        roman: isHome ? "♭II7" : `subV7/${romanOf(to)}`,
        theoryName: "Tritone sub",
        summary: `A stand-in for ${name(mod12(to + 7))}7, the usual tension chord before ${labelOf(to)}. The two share their two tensest notes, but this one lets the bass slide down a half step.`,
        goesTo: `Usually slides down to ${labelOf(to)}.`,
        targets: [to],
      };
    }
  }

  if (family === "diminished" && target(halfAbove)) {
    return {
      role: "detour",
      roman: `vii°7/${romanOf(halfAbove)}`,
      theoryName: "Passing diminished",
      summary: "A passing chord. It is full of tension and only lasts a moment, joining two chords so the bass moves step by step.",
      goesTo: `Usually slides up a half step to ${labelOf(halfAbove)}.`,
      targets: [halfAbove],
    };
  }

  // The "ii" of a ii–V that heads somewhere new.
  if ((family === "minor" || family === "halfDiminished") && next && familyOf(next.intervals) === "dominant" && nextRoot === fifthBelow) {
    const arrival = mod12(chord.root + 10);
    return {
      role: "detour",
      roman: `ii/${inKey(arrival)?.roman ?? name(arrival)}`,
      theoryName: "Borrowed ii–V",
      summary: `The first half of a ii–V that points at ${labelOf(arrival)}. Jazz tunes do this all the time to visit a new key for a bar or two.`,
      goesTo: `Goes to ${next.label ?? `${name(fifthBelow)}7`}, then ${labelOf(arrival)}.`,
      targets: [fifthBelow],
    };
  }

  return null;
}

function describe(chord: FunctionChord, key: FunctionKey, name: ExplainOptions["name"], next?: FunctionChord): Explained {
  const family = familyOf(chord.intervals);
  const offset = mod12(chord.root - key.root);
  const degree: Degree | undefined =
    degreesOf(key.scale).find((item) => item.offset === offset) ??
    (key.scale === "minor" && offset === 11 ? { offset, roman: "vii°", quality: "Diminished" } : undefined);
  const roman = romanFor(offset, family);

  // Fits the key when its core notes (root, 3rd, 5th, 7th,
  // not the 9ths and 13ths on top) are all in the scale.
  // Minor keys also allow the raised 7th (B in C minor) so V7
  // and vii°7 count, and I7 counts as a bluesy home chord.
  const scaleSet = new Set(scaleIntervals[key.scale]);
  if (key.scale === "minor" && (offset === 7 || offset === 11 || offset === 0)) scaleSet.add(11);
  const core = chord.intervals.filter(
    (interval) => interval < 12 && !(family === "dominant" && (interval === 6 || interval === 8))
  );
  const fits =
    core.every((interval) => scaleSet.has(mod12(offset + interval))) ||
    (key.scale === "major" && offset === 0 && family === "dominant");

  if (degree && fits && (matchesQuality(family, degree.quality) || (key.scale === "minor" && offset === 7 && family !== "other"))) {
    const found = diatonic(key, offset, family, name, roman);
    if (found) return found;
  }

  const fromTwin = borrowed(key, offset, family, name);
  if (fromTwin) return fromTwin;

  const pointing = detour(key, chord, family, name, next);
  if (pointing) return pointing;

  // A sus or other colour chord on a key note: explain the
  // job of that spot, with a note about the colour.
  const isSus = !chord.intervals.some((interval) => mod12(interval) === 3 || mod12(interval) === 4);
  if (degree && fits && family === "other" && isSus) {
    const base = diatonic(key, offset, degree.quality === "Minor" ? "minor" : "major", name, roman);
    if (base) {
      return {
        ...base,
        roman: degree.roman,
        summary: `${base.summary.split(/(?<=[.:]) /)[0].replace(/:$/, ".")} Holding back its 3rd makes it sound more open, but the job is the same.`,
      };
    }
  }

  return {
    role: "colour",
    roman,
    theoryName: "Chromatic chord",
    summary: "This one comes from outside the key, used for colour or surprise rather than a set job.",
    goesTo: "It can go many places. Often it slides by a half or whole step into a chord of the key.",
    targets: [mod12(chord.root + 1), mod12(chord.root - 1)],
  };
}

export function explainChord(chord: FunctionChord, key: FunctionKey, options: ExplainOptions): ChordExplanation {
  const { name, next, nextWraps, isLast } = options;
  const found = describe(chord, key, name, next);
  const result: ChordExplanation = {
    role: found.role,
    roman: found.roman,
    theoryName: found.theoryName,
    summary: found.summary,
    goesTo: found.goesTo,
    targets: found.targets,
  };

  if (next) {
    const nextLabel = next.label ?? name(next.root);
    const lead = nextWraps ? `When it loops back to the start it goes to ${nextLabel}` : `Here it goes to ${nextLabel}`;

    if (next.root === chord.root) {
      result.inContext = `${lead}, the same root with a new colour, so it feels like the chord is just changing its outfit.`;
    } else if (found.targets.includes(next.root)) {
      result.inContext = `${lead}, which is exactly what it likes to do.`;
    } else if (found.surprise && found.surprise.root === next.root) {
      result.inContext = `${lead}: ${found.surprise.text}.`;
    } else if (found.role === "home") {
      result.inContext = `${lead}, setting off from home again.`;
    } else if (found.targets.length > 0) {
      result.inContext = `${lead} instead, a less expected move that keeps the ear guessing.`;
    }
  } else if (isLast) {
    result.inContext =
      found.role === "home"
        ? "It ends your progression, so it sounds finished."
        : found.role === "tension"
          ? "It ends your progression, so it sounds like a question waiting for an answer."
          : "It ends your progression, so it leaves things slightly open.";
  }

  return result;
}

export interface KeyRole extends ChordExplanation {
  key: FunctionKey;
  keyName: string;
}


// For Explore, where a chord has no key yet: the keys it
// naturally lives in, and its job in each, best known first.
export function keysForChord(chord: FunctionChord, name: ExplainOptions["name"], limit = 3): KeyRole[] {
  const found: (KeyRole & { rank: number })[] = [];

  for (const scale of ["major", "minor"] as ScaleType[]) {
    for (let offset = 0; offset < 12; offset++) {
      const key = { root: mod12(chord.root - offset), scale };
      const explanation = explainChord(chord, key, { name });

      // Skip borrowed and outside chords, and the bluesy I7
      // (G7 is much more often V in C than home in G).
      if (
        explanation.role === "detour" ||
        explanation.role === "borrowed" ||
        explanation.role === "colour" ||
        (offset === 0 && familyOf(chord.intervals) === "dominant")
      ) {
        continue;
      }

      // Prefer the obvious readings: I before V before ii...
      // and major keys before minor ones.
      const offsetRank = [0, 7, 2, 5, 9, 4, 11, 3, 8, 10].indexOf(offset);
      found.push({
        ...explanation,
        key,
        keyName: `${name(key.root)} ${scale}`,
        rank: (offsetRank === -1 ? 20 : offsetRank) + (scale === "minor" ? 3.5 : 0),
      });
    }
  }

  return found
    .sort((a, b) => a.rank - b.rank)
    .slice(0, limit)
    .map((item) => {
      const { rank, ...rest } = item;
      void rank;
      return rest;
    });
}

// When no key fits naturally (diminished 7ths, augmented
// chords, altered dominants...), what the chord is for.
export function detourForChord(chord: FunctionChord, name: ExplainOptions["name"]): KeyRole | null {
  const family = familyOf(chord.intervals);

  if (family === "diminished") {
    const key: FunctionKey = { root: mod12(chord.root + 1), scale: "major" };
    return {
      ...explainChord(chord, key, { name }),
      key,
      keyName: `${name(key.root)} major`,
    };
  }

  return null;
}

// A plain version of a key chord to resolve to, for hearing
// the move: the triad on that spot, or a 7th chord on V.
export function keyChordAt(key: FunctionKey, pitchClass: number): FunctionChord {
  const offset = mod12(pitchClass - key.root);
  if (offset === 7) return { root: pitchClass, intervals: [0, 4, 7, 10] };
  const degree = degreesOf(key.scale).find((item) => item.offset === offset);
  const intervals =
    degree?.quality === "Minor" ? [0, 3, 7] : degree?.quality === "Diminished" ? [0, 3, 6] : [0, 4, 7];
  return { root: pitchClass, intervals };
}
