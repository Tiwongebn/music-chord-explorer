// ============================================================
// "Search & find" for chord progressions.
//
// Turns a free-text query like "sad C minor", "jazzy ii-V-I
// in F", "pop 4 chords" or "Am to F" into a ranked list of
// progressions the builder can load. Everything here is
// deterministic and offline — no API, no model:
//
//  1. parseQuery() pulls out a key, a scale (major/minor),
//     mood/genre tags, a chord count, and any chord names or
//     roman numerals the user typed.
//  2. The curated progressionLibrary is scored against those
//     terms (tag overlap, scale, and whether its chords
//     contain the typed sequence).
//  3. generateProgressions() walks progressionMap (the same
//     harmony graph "Surprise me" uses), weighted by the
//     query's mood, to invent fresh progressions — sprinkling
//     in borrowed chords (♭VI, ♭VII, iv in major, V in minor)
//     and 7ths where the mood calls for them.
//
// Every progression, curated or generated, is written as
// roman numerals and goes through one parser (parseRoman), so
// it can be transposed into whatever key the search lands on.
// ============================================================

import { chordTypes } from "../data/chords";
import {
  progressionMap,
  scaleIntervals,
  type ScaleType,
} from "../data/scales";
import { sharpNotes } from "./musicTheory";
import { DEFAULT_CHORD_BEATS, type ProgressionChord } from "./savedProgressions";

// ------------------------------------------------------------
// Roman numerals -> concrete chords
// ------------------------------------------------------------

export interface RomanStep {
  // Semitones above the key root.
  offset: number;
  // Index into chordTypes (data/chords.ts).
  chordTypeIndex: number;
  // Basic triad family, used to compare progressions while
  // ignoring 7ths/9ths ("ii7" and "ii" count as the same move).
  family: "major" | "minor" | "diminished" | "other";
}

const chordTypeIndexByName = (name: string): number => {
  const index = chordTypes.findIndex((c) => c.name === name);
  if (index === -1) {
    throw new Error(`Unknown chord type "${name}"`);
  }
  return index;
};

const romanValues: Record<string, number> = {
  i: 1,
  ii: 2,
  iii: 3,
  iv: 4,
  v: 5,
  vi: 6,
  vii: 7,
};

// Suffix -> chord type name, split by whether the numeral was
// uppercase (major-based) or lowercase (minor-based).
const upperSuffixes: Record<string, string> = {
  "": "Major",
  "7": "Dominant 7th",
  maj7: "Major 7th",
  M7: "Major 7th",
  "6": "Major 6th",
  "9": "Dominant 9th",
  maj9: "Major 9th",
  add9: "Add 9",
  sus2: "Suspended 2nd",
  sus4: "Suspended 4th",
  sus: "Suspended 4th",
  "+": "Augmented",
  aug: "Augmented",
};

const lowerSuffixes: Record<string, string> = {
  "": "Minor",
  "7": "Minor 7th",
  m7: "Minor 7th",
  maj7: "Minor Major 7th",
  "6": "Minor 6th",
  "9": "Minor 9th",
  "°": "Diminished",
  o: "Diminished",
  dim: "Diminished",
  "°7": "Diminished 7th",
  o7: "Diminished 7th",
  dim7: "Diminished 7th",
  ø: "Half-Diminished 7th",
  ø7: "Half-Diminished 7th",
  m7b5: "Half-Diminished 7th",
};

const ROMAN_PATTERN =
  /^([b♭#♯]?)(vii|vi|iv|v|iii|ii|i|VII|VI|IV|V|III|II|I)(.*)$/;

// Parses one roman numeral ("ii7", "♭VII", "iiø7", "V") in
// the context of a scale. Numerals count up the scale they
// belong to, the way the rest of the app labels them — so in
// minor, "VI" is the minor scale's own 6th (A minor -> F),
// and an explicit ♭/♯ shifts from there.
export function parseRoman(
  token: string,
  scaleType: ScaleType
): RomanStep | null {
  const match = ROMAN_PATTERN.exec(token.trim());
  if (!match) return null;

  const [, accidental, numeral, suffix] = match;
  const isUpper = numeral === numeral.toUpperCase();
  const degree = romanValues[numeral.toLowerCase()];

  const typeName = (isUpper ? upperSuffixes : lowerSuffixes)[suffix];
  if (!typeName) return null;

  let offset = scaleIntervals[scaleType][degree - 1];
  if (accidental === "b" || accidental === "♭") offset -= 1;
  if (accidental === "#" || accidental === "♯") offset += 1;

  const chordTypeIndex = chordTypeIndexByName(typeName);
  return {
    offset: (offset + 12) % 12,
    chordTypeIndex,
    family: familyOf(chordTypeIndex),
  };
}

function familyOf(chordTypeIndex: number): RomanStep["family"] {
  const { intervals } = chordTypes[chordTypeIndex];
  if (intervals.includes(3)) {
    return intervals.includes(6) && !intervals.includes(7)
      ? "diminished"
      : "minor";
  }
  if (intervals.includes(4)) return "major";
  return "other";
}

// ------------------------------------------------------------
// Chord names ("Am", "F#m7", "Bb") -> steps
// ------------------------------------------------------------

const chordSuffixes: Record<string, string> = {
  "": "Major",
  maj: "Major",
  M: "Major",
  m: "Minor",
  min: "Minor",
  "-": "Minor",
  dim: "Diminished",
  "°": "Diminished",
  aug: "Augmented",
  "+": "Augmented",
  "7": "Dominant 7th",
  maj7: "Major 7th",
  M7: "Major 7th",
  m7: "Minor 7th",
  min7: "Minor 7th",
  dim7: "Diminished 7th",
  "°7": "Diminished 7th",
  m7b5: "Half-Diminished 7th",
  ø: "Half-Diminished 7th",
  ø7: "Half-Diminished 7th",
  sus: "Suspended 4th",
  sus2: "Suspended 2nd",
  sus4: "Suspended 4th",
  "6": "Major 6th",
  m6: "Minor 6th",
  "9": "Dominant 9th",
  maj9: "Major 9th",
  m9: "Minor 9th",
  add9: "Add 9",
};

const naturalPitch: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

export interface NamedChord {
  pitchClass: number;
  chordTypeIndex: number;
}

// Chord names must start with a capital letter so ordinary
// words ("a", "be") are never mistaken for chords.
const CHORD_PATTERN = /^([A-G])([#♯b♭]?)(.*)$/;

export function parseChordName(token: string): NamedChord | null {
  const match = CHORD_PATTERN.exec(token);
  if (!match) return null;

  const [, letter, accidental, suffix] = match;
  const typeName = chordSuffixes[suffix];
  if (!typeName) return null;

  let pitchClass = naturalPitch[letter];
  if (accidental === "#" || accidental === "♯") pitchClass += 1;
  if (accidental === "b" || accidental === "♭") pitchClass -= 1;

  return {
    pitchClass: (pitchClass + 12) % 12,
    chordTypeIndex: chordTypeIndexByName(typeName),
  };
}

// ------------------------------------------------------------
// Curated library
// ------------------------------------------------------------

export interface LibraryProgression {
  id: string;
  name: string;
  scaleType: ScaleType;
  romans: string[];
  tags: string[];
  description: string;
}

export const progressionLibrary: LibraryProgression[] = [
  // ---- Major ----
  {
    id: "axis",
    name: "Pop Axis",
    scaleType: "major",
    romans: ["I", "V", "vi", "IV"],
    tags: ["pop", "happy", "uplifting", "anthem", "rock", "four-chord"],
    description: "The four chords behind hundreds of pop hits.",
  },
  {
    id: "sensitive",
    name: "Sensitive Pop",
    scaleType: "major",
    romans: ["vi", "IV", "I", "V"],
    tags: ["pop", "emotional", "ballad", "sad", "four-chord"],
    description: "The Pop Axis started on vi — wistful and emotional.",
  },
  {
    id: "fifties",
    name: "50s Doo-Wop",
    scaleType: "major",
    romans: ["I", "vi", "IV", "V"],
    tags: ["doowop", "retro", "romantic", "ballad", "pop", "four-chord"],
    description: "Sweet, nostalgic ballad loop from the 1950s.",
  },
  {
    id: "classic-cadence",
    name: "Classic Cadence",
    scaleType: "major",
    romans: ["I", "IV", "V", "I"],
    tags: ["rock", "folk", "country", "happy", "simple"],
    description: "Strong and resolved — the backbone of rock and folk.",
  },
  {
    id: "country",
    name: "Country Shuffle",
    scaleType: "major",
    romans: ["I", "IV", "I", "V"],
    tags: ["country", "folk", "happy", "simple"],
    description: "Back-porch I–IV–I–V with a clear home base.",
  },
  {
    id: "uplift",
    name: "Bright Lift",
    scaleType: "major",
    romans: ["I", "IV", "vi", "V"],
    tags: ["happy", "uplifting", "pop", "four-chord"],
    description: "Rises through vi into V for an optimistic lift.",
  },
  {
    id: "canon",
    name: "Pachelbel's Canon",
    scaleType: "major",
    romans: ["I", "V", "vi", "iii", "IV", "I", "IV", "V"],
    tags: ["classical", "romantic", "wedding", "baroque"],
    description: "The descending-bass sequence from the famous Canon in D.",
  },
  {
    id: "two-five-one",
    name: "Jazz ii–V–I",
    scaleType: "major",
    romans: ["ii7", "V7", "Imaj7"],
    tags: ["jazz", "smooth", "cadence"],
    description: "The cornerstone of jazz harmony.",
  },
  {
    id: "jazz-turnaround",
    name: "Jazz Turnaround",
    scaleType: "major",
    romans: ["Imaj7", "vi7", "ii7", "V7"],
    tags: ["jazz", "lounge", "smooth", "four-chord"],
    description: "I–vi–ii–V with 7ths — loops forever.",
  },
  {
    id: "neo-soul",
    name: "Neo-Soul Glide",
    scaleType: "major",
    romans: ["IVmaj7", "iii7", "vi7", "Imaj7"],
    tags: ["lofi", "chill", "neosoul", "rnb", "dreamy", "jazz"],
    description: "Lush 7ths sliding down — lo-fi and neo-soul territory.",
  },
  {
    id: "royal-road",
    name: "Royal Road",
    scaleType: "major",
    romans: ["IVmaj7", "V7", "iii7", "vi"],
    tags: ["anime", "jpop", "emotional", "pop"],
    description: "The J-pop and anime favourite — bittersweet and driving.",
  },
  {
    id: "dreamy-vamp",
    name: "Dreamy Vamp",
    scaleType: "major",
    romans: ["Imaj7", "IVmaj7"],
    tags: ["dreamy", "chill", "ambient", "lofi"],
    description: "Two floating major 7ths — perfect for ambient loops.",
  },
  {
    id: "blues",
    name: "12-Bar Blues",
    scaleType: "major",
    romans: ["I7", "I7", "I7", "I7", "IV7", "IV7", "I7", "I7", "V7", "IV7", "I7", "V7"],
    tags: ["blues", "rock", "rocknroll", "jazz"],
    description: "The classic 12-bar form, one chord per bar.",
  },
  {
    id: "mixolydian",
    name: "Mixolydian Rock",
    scaleType: "major",
    romans: ["I", "bVII", "IV", "I"],
    tags: ["rock", "classicrock", "anthem", "borrowed"],
    description: "Borrowed ♭VII gives a big classic-rock swagger.",
  },
  {
    id: "minor-iv",
    name: "Minor iv Heartbreak",
    scaleType: "major",
    romans: ["I", "IV", "iv", "I"],
    tags: ["bittersweet", "nostalgic", "emotional", "sad", "ballad", "borrowed"],
    description: "IV turning minor is the sound of a sigh.",
  },
  {
    id: "epic-major",
    name: "Heroic Cadence",
    scaleType: "major",
    romans: ["I", "bVI", "bVII", "I"],
    tags: ["epic", "triumphant", "cinematic", "videogame", "borrowed"],
    description: "♭VI–♭VII–I: the victorious video-game finish.",
  },
  {
    id: "gospel",
    name: "Gospel Walk",
    scaleType: "major",
    romans: ["I", "iii", "IV", "iv"],
    tags: ["gospel", "soul", "soulful", "emotional", "borrowed"],
    description: "Walks up to IV, then melts into iv.",
  },
  {
    id: "creep",
    name: "Alt-Rock Lament",
    scaleType: "major",
    romans: ["I", "III", "IV", "iv"],
    tags: ["rock", "alternative", "grunge", "melancholy", "sad", "borrowed"],
    description: "Chromatic III and borrowed iv — moody 90s alt-rock.",
  },
  {
    id: "reggae",
    name: "Island Skank",
    scaleType: "major",
    romans: ["I", "IV", "V", "IV"],
    tags: ["reggae", "ska", "happy", "summer"],
    description: "Off-beat friendly loop for reggae and ska.",
  },
  // ---- Minor ----
  {
    id: "andalusian",
    name: "Andalusian Cadence",
    scaleType: "minor",
    romans: ["i", "VII", "VI", "V"],
    tags: ["flamenco", "spanish", "dramatic", "dark", "rock"],
    description: "The descending flamenco bass line, ending on a major V.",
  },
  {
    id: "epic-minor",
    name: "Epic Minor",
    scaleType: "minor",
    romans: ["i", "VI", "III", "VII"],
    tags: ["epic", "cinematic", "emotional", "pop", "sad", "four-chord"],
    description: "Am–F–C–G: the minor-key pop anthem.",
  },
  {
    id: "sad-minor",
    name: "Melancholy Drift",
    scaleType: "minor",
    romans: ["i", "iv", "VII", "III"],
    tags: ["sad", "melancholy", "ballad", "emotional", "four-chord"],
    description: "Falls by fourths — gentle and heartbroken.",
  },
  {
    id: "minor-cadence",
    name: "Minor Cadence",
    scaleType: "minor",
    romans: ["i", "iv", "v", "i"],
    tags: ["sad", "folk", "simple", "dark"],
    description: "Natural-minor i–iv–v–i — soft and resolved.",
  },
  {
    id: "harmonic-minor",
    name: "Harmonic Minor Drama",
    scaleType: "minor",
    romans: ["i", "iv", "i", "V"],
    tags: ["classical", "dramatic", "dark", "tense", "borrowed"],
    description: "The major V pulls hard back home — very classical.",
  },
  {
    id: "heroic-minor",
    name: "Minor Rock Riff",
    scaleType: "minor",
    romans: ["i", "VII", "VI", "VII"],
    tags: ["rock", "metal", "dark", "heroic", "epic"],
    description: "Rocks between VI and VII around a minor home.",
  },
  {
    id: "epic-lift",
    name: "Epic Lift",
    scaleType: "minor",
    romans: ["VI", "VII", "i"],
    tags: ["epic", "cinematic", "triumphant", "videogame"],
    description: "Soaring VI–VII–i rise into the tonic.",
  },
  {
    id: "minor-two-five",
    name: "Minor ii–V–i",
    scaleType: "minor",
    romans: ["iiø7", "V7", "i7"],
    tags: ["jazz", "noir", "moody", "smooth", "cadence"],
    description: "Half-diminished ii into V7 — smoky and noir.",
  },
  {
    id: "minor-lofi",
    name: "Lo-fi Minor Loop",
    scaleType: "minor",
    romans: ["i7", "iv7", "VImaj7", "V7"],
    tags: ["lofi", "chill", "sad", "jazz", "hiphop", "four-chord"],
    description: "Late-night study-beats loop with jazzy 7ths.",
  },
  {
    id: "dark-trap",
    name: "Dark Trap",
    scaleType: "minor",
    romans: ["i", "VI", "iv", "V"],
    tags: ["trap", "hiphop", "dark", "tense", "four-chord"],
    description: "Brooding minor loop with a sharp major V.",
  },
  {
    id: "dorian",
    name: "Dorian Groove",
    scaleType: "minor",
    romans: ["i7", "IV7"],
    tags: ["funk", "groovy", "soul", "latin", "borrowed"],
    description: "A two-chord vamp with a bright major IV.",
  },
  {
    id: "phrygian",
    name: "Phrygian Shadow",
    scaleType: "minor",
    romans: ["i", "bII", "i", "VII"],
    tags: ["spooky", "dark", "horror", "metal", "spanish", "borrowed"],
    description: "The ♭II half-step gives an ominous, exotic edge.",
  },
  {
    id: "minor-blues",
    name: "Minor Blues",
    scaleType: "minor",
    romans: ["i7", "i7", "i7", "i7", "iv7", "iv7", "i7", "i7", "VI7", "V7", "i7", "V7"],
    tags: ["blues", "jazz", "moody"],
    description: "12-bar blues in a minor key.",
  },
];

// ------------------------------------------------------------
// Query parsing
// ------------------------------------------------------------

// Words people actually type -> canonical library tags.
const tagSynonyms: Record<string, string> = {
  sad: "sad",
  sadness: "sad",
  depressing: "sad",
  heartbreak: "sad",
  heartbroken: "sad",
  crying: "sad",
  melancholy: "melancholy",
  melancholic: "melancholy",
  gloomy: "melancholy",
  happy: "happy",
  joyful: "happy",
  cheerful: "happy",
  upbeat: "happy",
  bright: "happy",
  fun: "happy",
  uplifting: "uplifting",
  hopeful: "uplifting",
  inspiring: "uplifting",
  dark: "dark",
  evil: "dark",
  sinister: "dark",
  spooky: "spooky",
  scary: "spooky",
  creepy: "spooky",
  horror: "horror",
  halloween: "spooky",
  epic: "epic",
  heroic: "heroic",
  triumphant: "triumphant",
  victory: "triumphant",
  cinematic: "cinematic",
  film: "cinematic",
  movie: "cinematic",
  soundtrack: "cinematic",
  dramatic: "dramatic",
  drama: "dramatic",
  tense: "tense",
  tension: "tense",
  chill: "chill",
  chilled: "chill",
  relaxed: "chill",
  relaxing: "chill",
  calm: "chill",
  mellow: "chill",
  lofi: "lofi",
  dreamy: "dreamy",
  ambient: "ambient",
  romantic: "romantic",
  love: "romantic",
  wedding: "wedding",
  nostalgic: "nostalgic",
  nostalgia: "nostalgic",
  bittersweet: "bittersweet",
  emotional: "emotional",
  moody: "moody",
  noir: "noir",
  smooth: "smooth",
  groovy: "groovy",
  groove: "groovy",
  funky: "funk",
  funk: "funk",
  soul: "soul",
  soulful: "soulful",
  neosoul: "neosoul",
  rnb: "rnb",
  "r&b": "rnb",
  gospel: "gospel",
  pop: "pop",
  rock: "rock",
  classicrock: "classicrock",
  metal: "metal",
  grunge: "grunge",
  alternative: "alternative",
  alt: "alternative",
  indie: "alternative",
  punk: "rock",
  folk: "folk",
  acoustic: "folk",
  country: "country",
  blues: "blues",
  bluesy: "blues",
  jazz: "jazz",
  jazzy: "jazz",
  lounge: "lounge",
  bossa: "latin",
  latin: "latin",
  flamenco: "flamenco",
  spanish: "spanish",
  classical: "classical",
  baroque: "baroque",
  hiphop: "hiphop",
  rap: "hiphop",
  trap: "trap",
  reggae: "reggae",
  ska: "ska",
  summer: "summer",
  anime: "anime",
  jpop: "jpop",
  kpop: "pop",
  videogame: "videogame",
  game: "videogame",
  gaming: "videogame",
  doowop: "doowop",
  retro: "retro",
  oldies: "retro",
  ballad: "ballad",
  anthem: "anthem",
  simple: "simple",
  easy: "simple",
  beginner: "simple",
  basic: "simple",
  cadence: "cadence",
  borrowed: "borrowed",
};

// Moods that strongly suggest one scale when the user didn't
// say "major" or "minor" themselves.
const minorLeaning = new Set([
  "sad", "melancholy", "dark", "spooky", "horror", "dramatic",
  "tense", "moody", "noir", "metal", "flamenco", "spanish", "trap",
]);
const majorLeaning = new Set([
  "happy", "uplifting", "triumphant", "romantic", "wedding",
  "country", "reggae", "summer", "doowop", "gospel",
]);

// Moods that colour generated chords with 7ths.
const seventhTags = new Set([
  "jazz", "lofi", "neosoul", "rnb", "smooth", "lounge", "soul", "noir", "dreamy",
]);

const numberWords: Record<string, number> = {
  two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
};

export interface ParsedQuery {
  keyPitchClass: number | null;
  scaleType: ScaleType | null;
  tags: string[];
  length: number | null;
  // A typed roman-numeral sequence, already in scaleType (or
  // inferred) context.
  romans: string[];
  // Typed chord names, in order.
  chords: NamedChord[];
  wantsSevenths: boolean;
}

function parseKeyLetter(word: string): number | null {
  const match = /^([a-g])([#♯b♭]?)$/i.exec(word);
  if (!match) return null;
  let pitch = naturalPitch[match[1].toUpperCase()];
  if (match[2] === "#" || match[2] === "♯") pitch += 1;
  if (match[2] === "b" || match[2] === "♭") pitch -= 1;
  return (pitch + 12) % 12;
}

const modeWords: Record<string, ScaleType> = {
  major: "major",
  maj: "major",
  minor: "minor",
  min: "minor",
};

export function parseQuery(raw: string): ParsedQuery {
  const result: ParsedQuery = {
    keyPitchClass: null,
    scaleType: null,
    tags: [],
    length: null,
    romans: [],
    chords: [],
    wantsSevenths: false,
  };

  // Glue common multi-part words before splitting on dashes,
  // so "lo-fi" stays one word while "ii-V-I" splits apart.
  const normalized = raw
    .replace(/lo[\s-]?fi/gi, "lofi")
    .replace(/hip[\s-]?hop/gi, "hiphop")
    .replace(/doo[\s-]?wop/gi, "doowop")
    .replace(/neo[\s-]?soul/gi, "neosoul")
    .replace(/r\s*&\s*b/gi, "rnb")
    .replace(/([jk])[\s-]pop/gi, "$1pop")
    .replace(/classic\s+rock/gi, "classicrock")
    .replace(/rock\s*(?:n|and|&|')\s*roll/gi, "rocknroll")
    .replace(/video\s*games?/gi, "videogame")
    .replace(/\b([a-gA-G])\s+sharp\b/g, "$1#")
    .replace(/\b([a-gA-G])\s+flat\b/g, "$1b");

  const tokens = normalized
    .split(/[\s,;|→>–—-]+/)
    .map((t) => t.replace(/^[("'.!?]+|[)"'.!?:]+$/g, ""))
    .filter(Boolean);

  const consumed = new Set<number>();

  // Key + mode: "C minor", "F# major", "in F", "key of Bb",
  // "Am key". Lowercase letters only count as a key when a
  // mode word follows or "in"/"of" comes before, so the word
  // "a" in "a sad song" is never read as A.
  tokens.forEach((token, i) => {
    const lower = token.toLowerCase();
    const mode = modeWords[lower];

    if (mode) {
      const previous = i > 0 ? parseKeyLetter(tokens[i - 1]) : null;
      if (previous !== null && result.keyPitchClass === null) {
        result.keyPitchClass = previous;
        consumed.add(i - 1);
      }
      result.scaleType = mode;
      consumed.add(i);
      return;
    }

    if ((lower === "in" || lower === "of") && i + 1 < tokens.length) {
      const next = tokens[i + 1];
      const pitch = parseKeyLetter(next);
      const followedByMode = modeWords[tokens[i + 2]?.toLowerCase() ?? ""];
      const looksLikeKey =
        pitch !== null &&
        (followedByMode || /^[A-G]/.test(next) || i + 2 >= tokens.length);
      if (looksLikeKey && result.keyPitchClass === null) {
        result.keyPitchClass = pitch;
        consumed.add(i + 1);
        return;
      }
      // "in Am" / "in F#m" -> key + minor.
      const keyChord = /^([A-G][#♯b♭]?)m$/.exec(next);
      if (keyChord && result.keyPitchClass === null) {
        result.keyPitchClass = parseKeyLetter(keyChord[1]);
        result.scaleType = "minor";
        consumed.add(i + 1);
      }
    }
  });

  // Chord count: "4 chords", "four chord", "8-chord".
  tokens.forEach((token, i) => {
    const lower = token.toLowerCase();
    if (!/^chords?$/.test(lower) || i === 0) return;
    const previous = tokens[i - 1].toLowerCase();
    const count = numberWords[previous] ?? Number(previous);
    if (Number.isInteger(count) && count >= 2 && count <= 12) {
      result.length = count;
      consumed.add(i - 1);
      consumed.add(i);
    }
  });

  // Tags.
  tokens.forEach((token, i) => {
    if (consumed.has(i)) return;
    const lower = token.toLowerCase();
    const tag = tagSynonyms[lower] ?? tagSynonyms[lower.replace(/s$/, "")];
    if (tag && !result.tags.includes(tag)) {
      result.tags.push(tag);
      consumed.add(i);
    }
    if (/^(7ths?|sevenths?|extended)$/.test(lower)) {
      result.wantsSevenths = true;
      consumed.add(i);
    }
  });

  // Roman numerals and chord names. Each needs at least two
  // in the query (or one with an unmistakable suffix) so a
  // lone "I" or a sentence-initial "A" isn't misread.
  const romanTokens: string[] = [];
  const chordTokens: NamedChord[] = [];
  let suffixedChord = false;

  tokens.forEach((token, i) => {
    if (consumed.has(i)) return;
    if (ROMAN_PATTERN.test(token) && parseRoman(token, "major")) {
      romanTokens.push(token);
      return;
    }
    const chord = parseChordName(token);
    if (chord) {
      chordTokens.push(chord);
      if (token.length > 1) suffixedChord = true;
    }
  });

  if (romanTokens.length >= 2) {
    result.romans = romanTokens;
  }
  if (chordTokens.length >= 2 || (chordTokens.length === 1 && suffixedChord)) {
    result.chords = chordTokens;
  }

  if (result.tags.some((t) => seventhTags.has(t))) {
    result.wantsSevenths = true;
  }

  return result;
}

// ------------------------------------------------------------
// Results
// ------------------------------------------------------------

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  source: "typed" | "library" | "generated";
  keyPitchClass: number;
  scaleType: ScaleType;
  romans: string[];
  chords: ProgressionChord[];
  // Library tags (or the mood a generated result was built
  // for) — shown as small chips on the card.
  tags: string[];
  score: number;
}

export interface SearchContext {
  // The key/scale the Progressions tab is currently showing —
  // used whenever the query doesn't name one.
  keyRoot: string;
  scaleType: ScaleType;
  // Re-roll counter for generated ideas.
  seed: number;
}

export const keyRootName = (pitchClass: number): string =>
  sharpNotes[((pitchClass % 12) + 12) % 12];

function stepsToChords(
  steps: RomanStep[],
  keyPitchClass: number
): ProgressionChord[] {
  return steps.map((step) => ({
    type: "chord" as const,
    rootNote: keyRootName(keyPitchClass + step.offset),
    chordTypeIndex: step.chordTypeIndex,
    beats: DEFAULT_CHORD_BEATS,
  }));
}

function romansToSteps(romans: string[], scaleType: ScaleType): RomanStep[] {
  return romans
    .map((r) => parseRoman(r, scaleType))
    .filter((s): s is RomanStep => s !== null);
}

const stepKey = (step: Pick<RomanStep, "offset" | "family">) =>
  `${step.offset}:${step.family}`;

// True when `needle` appears in `haystack` as a contiguous run,
// wrapping around the end (progressions loop, so "V–I" is
// inside "I–IV–V").
function containsCyclic(
  haystack: Pick<RomanStep, "offset" | "family">[],
  needle: Pick<RomanStep, "offset" | "family">[]
): boolean {
  if (needle.length === 0 || needle.length > haystack.length) return false;
  const hay = haystack.map(stepKey);
  const need = needle.map(stepKey);
  return hay.some((_, start) =>
    need.every((key, j) => hay[(start + j) % hay.length] === key)
  );
}

// Names a typed chord sequence relative to a key, e.g. Am F in
// A minor -> i, VI.
const degreeNumerals = ["I", "II", "III", "IV", "V", "VI", "VII"];

function nameAsRoman(
  offset: number,
  family: RomanStep["family"],
  scaleType: ScaleType
): string {
  const intervals = scaleIntervals[scaleType];
  let index = intervals.indexOf(offset);
  let prefix = "";
  if (index === -1) {
    index = intervals.indexOf((offset + 1) % 12);
    prefix = "♭";
  }
  if (index === -1) {
    index = intervals.indexOf((offset + 11) % 12);
    prefix = "♯";
  }
  const numeral = degreeNumerals[index];
  if (family === "minor") return `${prefix}${numeral.toLowerCase()}`;
  if (family === "diminished") return `${prefix}${numeral.toLowerCase()}°`;
  return `${prefix}${numeral}`;
}

function stepFromChord(chord: NamedChord, keyPitchClass: number): RomanStep {
  return {
    offset: (chord.pitchClass - keyPitchClass + 12) % 12,
    chordTypeIndex: chord.chordTypeIndex,
    family: familyOf(chord.chordTypeIndex),
  };
}

// Small deterministic PRNG so the same query + seed always
// produces the same "generated" ideas (and re-rolling the
// seed gives new ones).
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(text: string): number {
  let hash = 2166136261;
  for (const char of text) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

const pick = <T,>(items: T[], random: () => number): T =>
  items[Math.floor(random() * items.length)];

// Degrees each mood likes to visit — biases the progressionMap
// walk without ever leaving its edges.
const moodDegreeBias: Record<string, number[]> = {
  sad: [6, 4, 3],
  melancholy: [6, 4, 3],
  emotional: [6, 4],
  happy: [4, 5, 1],
  uplifting: [4, 5, 6],
  pop: [5, 6, 4],
  epic: [6, 7],
  cinematic: [6, 7, 3],
  dark: [6, 4, 2],
  jazz: [2, 5, 6],
  lofi: [4, 3, 2],
  chill: [4, 3, 6],
  dreamy: [4, 3],
  rock: [4, 5, 7],
  folk: [4, 5],
  country: [4, 5],
  blues: [4, 5],
};

// Names a generated idea after the strongest mood it was
// built for, so cards read "Generated: sad" rather than
// "Idea #2".
function generatedTitle(tags: string[], index: number): string {
  const label = tags[0]
    ? tags[0].charAt(0).toUpperCase() + tags[0].slice(1)
    : "Fresh";
  return `${label} idea ${index + 1}`;
}

// Builds one roman-numeral progression for the given mood by
// walking progressionMap, then applying mood-specific colour
// (borrowed chords, 7ths, jazz ii–V cadence). `prefix` lets a
// generated idea continue from chords the user typed.
function generateRomans(
  scaleType: ScaleType,
  tags: string[],
  length: number,
  wantsSevenths: boolean,
  random: () => number,
  prefix: number[] = []
): string[] {
  const graph = progressionMap[scaleType];
  const bias = tags.flatMap((t) => moodDegreeBias[t] ?? []);

  const degrees = prefix.length > 0 ? [...prefix] : [1];

  while (degrees.length < length) {
    const current = degrees[degrees.length - 1];
    let options = (graph[current] ?? [1]).filter((d) => d !== current);
    if (options.length === 0) options = [1];

    const remaining = length - degrees.length;

    // Short loops already start on the tonic, so bouncing
    // back to it mid-phrase ("I–V–I–V") wastes a slot.
    if (length <= 4 && options.some((d) => d !== 1)) {
      options = options.filter((d) => d !== 1);
    }

    // Major's vii° can only go home, which dead-ends a loop;
    // keep it for jazz/classical moods only.
    if (
      scaleType === "major" &&
      !tags.includes("jazz") &&
      !tags.includes("classical") &&
      options.some((d) => d !== 7)
    ) {
      options = options.filter((d) => d !== 7);
    }

    // Last slot: choose a chord that leads back to the tonic
    // so the progression loops cleanly into its first chord.
    if (remaining === 1) {
      const toHome = options.filter((d) => (graph[d] ?? []).includes(1) && d !== 1);
      if (toHome.length > 0) options = toHome;
    }

    // Weighted pick: every option once, plus extra copies of
    // the ones this mood likes.
    const weighted = [
      ...options,
      ...options.filter((d) => bias.includes(d)),
      ...options.filter((d) => bias.includes(d)),
    ];
    degrees.push(pick(weighted, random));
  }

  // Jazz wants a ii–V at the end of the loop.
  if (tags.includes("jazz") && length >= 3) {
    degrees[length - 2] = 2;
    degrees[length - 1] = 5;
    if (length >= 4 && degrees[length - 3] === 2) {
      degrees[length - 3] = 6;
    }
  }

  const romans = degrees.map((degree) =>
    nameAsRoman(
      scaleIntervals[scaleType][degree - 1],
      diatonicFamily(scaleType, degree),
      scaleType
    )
  );

  // Mood colour: borrowed chords.
  const has = (tag: string) => tags.includes(tag);
  romans.forEach((roman, i) => {
    if (prefix.length > i) return;
    if (scaleType === "major") {
      if ((has("epic") || has("cinematic") || has("triumphant") || has("rock")) && roman === "vi" && random() < 0.6) {
        romans[i] = "bVI";
      } else if ((has("rock") || has("epic") || has("anthem")) && roman === "V" && i < romans.length - 1 && random() < 0.5) {
        romans[i] = "bVII";
      } else if ((has("sad") || has("bittersweet") || has("nostalgic") || has("emotional")) && roman === "IV" && random() < 0.5) {
        romans[i] = "iv";
      }
    } else {
      if (roman === "v" && (i === romans.length - 1 || has("dramatic") || has("classical") || has("dark") || has("tense") || has("jazz"))) {
        romans[i] = "V";
      }
    }
    // Generated diminished vii° is rarely what anyone wants
    // in a loop; swap it for V outside jazz/classical.
    if (romans[i] === "vii°" && !has("jazz") && !has("classical")) {
      romans[i] = scaleType === "major" ? "V" : "VII";
    }
  });

  // Blues: every major chord becomes a dominant 7th.
  if (has("blues")) {
    return romans.map((roman) =>
      /^[b♭#♯]?[IV]+$/.test(roman) ? `${roman}7` : addSeventh(roman, scaleType, 0)
    );
  }

  if (wantsSevenths) {
    return romans.map((roman, i) => addSeventh(roman, scaleType, degrees[i]));
  }

  return romans;
}

function diatonicFamily(scaleType: ScaleType, degree: number): RomanStep["family"] {
  const quality = {
    major: ["major", "minor", "minor", "major", "major", "minor", "diminished"],
    minor: ["minor", "diminished", "major", "minor", "minor", "major", "major"],
  }[scaleType][degree - 1];
  return quality as RomanStep["family"];
}

// Upgrades a generated triad numeral to its natural 7th chord.
function addSeventh(roman: string, scaleType: ScaleType, degree: number): string {
  if (roman.endsWith("°")) return roman.replace("°", "ø7");
  const isUpper = /[IV]/.test(roman.replace(/^[b♭#♯]/, "").charAt(0));
  if (!isUpper) return `${roman}7`;
  // V (and VII in minor, which acts like a V of III) gets a
  // dominant 7th; other major chords get a major 7th.
  const dominant =
    roman === "V" || roman === "bVII" || (scaleType === "minor" && degree === 7);
  return `${roman}${dominant ? "7" : "maj7"}`;
}

export function searchProgressions(
  query: string,
  context: SearchContext
): SearchResult[] {
  const parsed = parseQuery(query);
  const results: SearchResult[] = [];

  const contextKey = parseKeyLetter(context.keyRoot) ?? 0;

  // Typed chord names define their own key unless one was
  // named: the first chord is home, minor if it's minor.
  let keyPitchClass = parsed.keyPitchClass ?? contextKey;
  let scaleType: ScaleType | null = parsed.scaleType;

  if (parsed.chords.length > 0) {
    const first = parsed.chords[0];
    if (parsed.keyPitchClass === null) keyPitchClass = first.pitchClass;
    if (!scaleType) {
      scaleType =
        familyOf(first.chordTypeIndex) === "minor" ? "minor" : "major";
    }
  }

  // Numerals: a lowercase tonic ("i", "i7") means minor.
  if (!scaleType && parsed.romans.length > 0) {
    scaleType = parsed.romans.some((r) => /^i(?![iv])/.test(r))
      ? "minor"
      : "major";
  }

  // Mood implies a scale only when nothing more explicit did.
  const moodScale: ScaleType | null = parsed.tags.some((t) => minorLeaning.has(t))
    ? "minor"
    : parsed.tags.some((t) => majorLeaning.has(t))
      ? "major"
      : null;

  const effectiveScale = scaleType ?? moodScale ?? context.scaleType;

  // ---- What the user typed, verbatim ----
  let typedSteps: RomanStep[] = [];

  if (parsed.chords.length > 0) {
    typedSteps = parsed.chords.map((c) => stepFromChord(c, keyPitchClass));
    const romans = typedSteps.map((s) => nameAsRoman(s.offset, s.family, effectiveScale));
    results.push({
      id: "typed",
      title: "Your chords",
      description: "Exactly the chords you typed, ready to extend in the builder.",
      source: "typed",
      keyPitchClass,
      scaleType: effectiveScale,
      romans,
      chords: stepsToChords(typedSteps, keyPitchClass),
      tags: [],
      score: 100,
    });
  } else if (parsed.romans.length > 0) {
    typedSteps = romansToSteps(parsed.romans, effectiveScale);
    results.push({
      id: "typed",
      title: "Your numerals",
      description: "The roman numerals you typed, voiced in this key.",
      source: "typed",
      keyPitchClass,
      scaleType: effectiveScale,
      romans: parsed.romans,
      chords: stepsToChords(typedSteps, keyPitchClass),
      tags: [],
      score: 100,
    });
  }

  // ---- Curated library ----
  const hasTerms =
    parsed.tags.length > 0 || typedSteps.length > 0 || parsed.length !== null;

  progressionLibrary.forEach((entry) => {
    let score = 0;
    const reasons: string[] = [];

    const matchedTags = parsed.tags.filter((t) => entry.tags.includes(t));
    score += matchedTags.length * 3;
    reasons.push(...matchedTags);

    const steps = romansToSteps(entry.romans, entry.scaleType);

    if (typedSteps.length > 0) {
      if (entry.scaleType === effectiveScale && containsCyclic(steps, typedSteps)) {
        score += typedSteps.length >= 3 ? 8 : 5;
      } else if (parsed.tags.length === 0) {
        // Only typed chords and this one doesn't contain them.
        score -= 100;
      }
    }

    if (parsed.length !== null) {
      if (entry.romans.length === parsed.length) score += 2;
      else score -= 1;
    }

    if (entry.scaleType === effectiveScale) {
      score += scaleType ? 2 : moodScale ? 1 : 0.5;
    } else if (scaleType) {
      // The user said major/minor explicitly — honour it.
      score -= 4;
    }

    if (hasTerms && score <= 1) return;

    results.push({
      id: entry.id,
      title: entry.name,
      description: entry.description,
      source: "library",
      keyPitchClass,
      scaleType: entry.scaleType,
      romans: entry.romans,
      chords: stepsToChords(steps, keyPitchClass),
      tags: entry.tags,
      score,
    });
  });

  // ---- Generated ideas ----
  const length = Math.min(Math.max(parsed.length ?? 4, 2), 8);
  const random = mulberry32(hashString(query.toLowerCase()) + context.seed * 7919);
  const seen = new Set(results.map((r) => r.chords.map((c) => `${c.rootNote}${c.chordTypeIndex}`).join()));

  // Continue from typed chords when their roots are diatonic.
  const prefix = typedSteps
    .map((s) => scaleIntervals[effectiveScale].indexOf(s.offset) + 1)
    .filter((d) => d > 0);
  const canContinue =
    typedSteps.length > 0 &&
    prefix.length === typedSteps.length &&
    typedSteps.length < length;

  let generatedCount = 0;
  for (let attempt = 0; attempt < 12 && generatedCount < 3; attempt++) {
    const romans = generateRomans(
      effectiveScale,
      parsed.tags,
      length,
      parsed.wantsSevenths,
      random,
      canContinue ? prefix : []
    );

    // Keep the user's exact chord flavours for the typed part.
    const steps = romansToSteps(romans, effectiveScale);
    if (canContinue) {
      typedSteps.forEach((step, i) => {
        steps[i] = step;
        romans[i] = nameAsRoman(step.offset, step.family, effectiveScale);
      });
    }

    const chords = stepsToChords(steps, keyPitchClass);
    const signature = chords.map((c) => `${c.rootNote}${c.chordTypeIndex}`).join();
    if (seen.has(signature)) continue;
    seen.add(signature);

    results.push({
      id: `generated-${generatedCount}`,
      title: canContinue
        ? `Continue your chords ${generatedCount + 1}`
        : generatedTitle(parsed.tags, generatedCount),
      description: canContinue
        ? "Starts with your chords and finishes the loop."
        : "Generated from the harmony map for this mood.",
      source: "generated",
      keyPitchClass,
      scaleType: effectiveScale,
      romans,
      chords,
      tags: parsed.tags.slice(0, 3),
      // Sit just under a strong library match.
      score: 4.5 - generatedCount * 0.1,
    });
    generatedCount++;
  }

  const typed = results.filter((r) => r.source === "typed");
  const library = results
    .filter((r) => r.source === "library")
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
  const generated = results.filter((r) => r.source === "generated");

  return [...typed, ...library, ...generated];
}
