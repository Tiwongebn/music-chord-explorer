// ============================================================
// Chord substitution ideas for the Progression Builder.
//
// For one chord in a progression this suggests a few classic
// ways to make it more interesting, each with a short,
// plain-language reason it works:
//
//  - Tritone sub: swap a dominant chord for the dominant
//    chord a tritone (6 half steps) away. Both share the same
//    two "tension" notes, so the new chord resolves the same
//    way, but the bass slides by a half step.
//  - Relative minor/major: swap a major chord for the minor
//    chord 3 half steps below it (C -> Am), or a minor chord
//    for the major chord 3 half steps above it (Am -> C). They
//    share most of their notes, so the swap keeps the harmony
//    but changes the mood.
//  - Passing diminished: slip a diminished 7th chord in just
//    before the next chord, a half step away from its root, so
//    the bass moves step by step into it.
//
// Everything here is pure: it only reads the progression and
// returns the chords each suggestion would put in place of
// the chosen slot. The component decides how to play/apply.
// ============================================================

import { chordTypes } from "../data/chords";
import { beatOptions } from "../data/rhythm";
import { buildChord, catalogIndexFor, type ChordSpec } from "./chordBuild";
import { getPitchClass, sharpNotes } from "./musicTheory";
import type { ProgressionChord } from "./savedProgressions";

export type SubstitutionKind = "tritone" | "relative" | "passing";

export interface Substitution {
  id: string;
  kind: SubstitutionKind;
  // Short name of the technique, e.g. "Tritone sub".
  kindLabel: string;
  // What goes in place of the chosen slot: one chord for a
  // swap, or the original chord plus a passing chord.
  replacement: ProgressionChord[];
  // The chord this suggestion introduces (for its headline).
  featured: ProgressionChord;
  // One or two sentences on why it works, in everyday words.
  explanation: string;
}

export interface SubstitutionContext {
  // Display label for a chord under the current sharps/flats
  // setting, e.g. "D♭7".
  label: (chord: ProgressionChord) => string;
  // Display name for a pitch class 0-11, e.g. "D♭".
  noteName: (pitchClass: number) => string;
}

type ChordFamily = "major" | "minor" | "dominant" | "other";

interface ChordShapeInfo {
  root: number;
  pitchClasses: Set<number>;
  family: ChordFamily;
  hasSeventh: boolean;
}

const mod12 = (value: number) => ((value % 12) + 12) % 12;

function intervalsOf(chord: ProgressionChord): number[] {
  if (chord.build) {
    return buildChord(chord.build).intervals;
  }

  return chordTypes[chord.chordTypeIndex ?? 0]?.intervals ?? [0, 4, 7];
}

function describe(chord: ProgressionChord): ChordShapeInfo | null {
  if (chord.type !== "chord" || !chord.rootNote) {
    return null;
  }

  const root = getPitchClass(chord.rootNote);
  const intervals = new Set(intervalsOf(chord).map(mod12));
  const has = (interval: number) => intervals.has(interval);

  let family: ChordFamily = "other";

  if (has(4) && has(10)) {
    family = "dominant";
  } else if (has(4) && has(7)) {
    family = "major";
  } else if (has(3) && has(7) && !has(4)) {
    family = "minor";
  }

  return {
    root,
    pitchClasses: new Set([...intervals].map((i) => mod12(root + i))),
    family,
    hasSeventh: has(10) || has(11),
  };
}

// A frozen chord snapshot built from a root pitch class and
// builder settings, the same shape the chord builder makes.
function makeChord(
  rootPitchClass: number,
  spec: ChordSpec,
  beats: number
): ProgressionChord {
  return {
    type: "chord",
    rootNote: sharpNotes[mod12(rootPitchClass)],
    chordTypeIndex: catalogIndexFor(buildChord(spec).intervals),
    build: spec,
    beats,
  };
}

const DOMINANT_7: ChordSpec = {
  quality: "major",
  extensions: ["b7"],
  alterations: [],
};

const DIMINISHED_7: ChordSpec = {
  quality: "diminished",
  extensions: ["6"],
  alterations: [],
};

// Splits a chord's beats so a passing chord can borrow the
// end of it without moving any bar lines. A 1-beat chord
// can't give anything up, so the passing chord adds a beat.
function splitBeats(beats: number): { keep: number; passing: number } {
  const shorter = [...beatOptions].reverse().find((option) => option < beats);

  if (shorter === undefined) {
    return { keep: beats, passing: beatOptions[0] };
  }

  return { keep: shorter, passing: beats - shorter };
}

function listNotes(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

// The chord right after `index`, wrapping round to the first
// one for the last slot (progressions loop). null when that
// slot is a rest or there is no other slot, since a passing
// chord inserted before a rest wouldn't lead anywhere.
function nextChordAfter(
  chords: ProgressionChord[],
  index: number
): { chord: ProgressionChord; wraps: boolean } | null {
  if (chords.length < 2) {
    return null;
  }

  const wraps = index + 1 >= chords.length;
  const chord = chords[wraps ? 0 : index + 1];

  return chord.type === "chord" ? { chord, wraps } : null;
}

function tritoneSub(
  chord: ProgressionChord,
  info: ChordShapeInfo,
  next: ProgressionChord | null,
  context: SubstitutionContext
): Substitution | null {
  if (info.family !== "dominant" && info.family !== "major") {
    return null;
  }

  const nextInfo = next ? describe(next) : null;
  const resolvesDownAFifth =
    nextInfo !== null && nextInfo.root === mod12(info.root + 5);

  // A plain major chord only acts like a dominant when it
  // leads down a 5th (G -> C). A tonic C going nowhere in
  // particular would just sound wrong as F♯7.
  if (info.family === "major" && !resolvesDownAFifth) {
    return null;
  }

  const subRoot = mod12(info.root + 6);
  const featured = makeChord(subRoot, DOMINANT_7, chord.beats);
  // A plain major chord is heard as its dominant 7th here,
  // since the 7th is one of the two notes the subs share.
  const original =
    info.family === "major"
      ? context.label(makeChord(info.root, DOMINANT_7, chord.beats))
      : context.label(chord);
  const sub = context.label(featured);
  const guideTones = listNotes([
    context.noteName(info.root + 4),
    context.noteName(info.root + 10),
  ]);

  const why =
    resolvesDownAFifth && next
      ? `${sub} pulls into ${context.label(next)} just as strongly, but the bass now slides down a half step (${context.noteName(subRoot)} → ${context.noteName(nextInfo!.root)}) instead of jumping.`
      : `${sub} can stand in for it, and it sounds best right before a chord a half step below it, like ${context.noteName(subRoot - 1)}.`;

  const asSeventh =
    info.family === "major"
      ? `Think of ${context.label(chord)} as ${original}. `
      : "";

  return {
    id: "tritone",
    kind: "tritone",
    kindLabel: "Tritone sub",
    replacement: [featured],
    featured,
    explanation: `${asSeventh}${original} and ${sub} share the same two tense notes, ${guideTones}. Those two notes are what make the chord want to resolve, so ${why}`,
  };
}

function relativeSwap(
  chord: ProgressionChord,
  info: ChordShapeInfo,
  context: SubstitutionContext
): Substitution | null {
  let featured: ProgressionChord;
  let mood: string;

  if (info.family === "major") {
    // Keep a maj7 as a 7th chord: Cmaj7 -> Am7 shares 3 notes.
    featured = makeChord(
      info.root + 9,
      {
        quality: "minor",
        extensions: info.hasSeventh ? ["b7"] : [],
        alterations: [],
      },
      chord.beats
    );
    mood = "softer, more wistful";
  } else if (info.family === "minor") {
    featured = makeChord(
      info.root + 3,
      {
        quality: "major",
        extensions: info.hasSeventh ? ["maj7"] : [],
        alterations: [],
      },
      chord.beats
    );
    mood = "brighter, more hopeful";
  } else {
    return null;
  }

  const featuredInfo = describe(featured)!;
  const shared = [...info.pitchClasses]
    .filter((pitchClass) => featuredInfo.pitchClasses.has(pitchClass))
    .map((pitchClass) => context.noteName(pitchClass));

  const original = context.label(chord);
  const swap = context.label(featured);
  const relation =
    info.family === "major" ? "relative minor" : "relative major";

  return {
    id: "relative",
    kind: "relative",
    kindLabel: info.family === "major" ? "Relative minor" : "Relative major",
    replacement: [featured],
    featured,
    explanation: `${swap} is ${original}'s ${relation}. They share ${shared.length} notes (${listNotes(shared)}), so ${swap} does the same job in the progression with a ${mood} colour.`,
  };
}

function passingDiminished(
  chord: ProgressionChord,
  info: ChordShapeInfo,
  next: { chord: ProgressionChord; wraps: boolean } | null,
  context: SubstitutionContext
): Substitution[] {
  const nextInfo = next ? describe(next.chord) : null;

  if (!next || !nextInfo || nextInfo.root === info.root) {
    return [];
  }

  const { keep, passing } = splitBeats(chord.beats);
  const target = context.label(next.chord);
  const loopNote = next.wraps
    ? ` It leads back to ${target} when the progression loops.`
    : "";
  const timing =
    keep === chord.beats
      ? ` It adds one beat to the progression.`
      : ` It takes the last ${passing === 1 ? "beat" : `${passing} beats`} of ${context.label(chord)}, so the bar lines stay put.`;

  const suggestions: Substitution[] = [];

  const options = [
    { root: nextInfo.root - 1, direction: "up" as const },
    // Stepping down into the next chord only sounds natural
    // when the bass is already coming from above it.
    ...(mod12(info.root - nextInfo.root) <= 2
      ? [{ root: nextInfo.root + 1, direction: "down" as const }]
      : []),
  ];

  for (const option of options) {
    const root = mod12(option.root);

    if (root === info.root) {
      continue;
    }

    const featured = makeChord(root, DIMINISHED_7, passing);
    const dim = context.label(featured);
    const fromNote = context.noteName(info.root);
    const passNote = context.noteName(root);
    const toNote = context.noteName(nextInfo.root);
    const isWalk =
      Math.min(mod12(root - info.root), mod12(info.root - root)) <= 2;
    const bassMove = isWalk
      ? `the bass walks ${fromNote} → ${passNote} → ${toNote} step by step instead of jumping straight there`
      : `the bass leans into ${toNote} from right next door (${passNote} → ${toNote}), which makes the arrival feel stronger`;

    suggestions.push({
      id: `passing-${option.direction}`,
      kind: "passing",
      kindLabel:
        option.direction === "up"
          ? "Passing diminished"
          : "Passing diminished (falling)",
      replacement: [{ ...chord, beats: keep }, featured],
      featured,
      explanation: `${dim} sits a half step ${option.direction === "up" ? "below" : "above"} ${target}, so ${bassMove}. A diminished chord sounds restless on its own, so your ear hears it as a quick bridge that wants to land on ${target}.${timing}${loopNote}`,
    });
  }

  return suggestions;
}

// Substitution ideas for the chord at `index`, best first.
// Empty for rests and for chords none of these apply to.
export function suggestSubstitutions(
  chords: ProgressionChord[],
  index: number,
  context: SubstitutionContext
): Substitution[] {
  const chord = chords[index];
  const info = chord ? describe(chord) : null;

  if (!chord || !info) {
    return [];
  }

  const next = nextChordAfter(chords, index);

  return [
    tritoneSub(chord, info, next?.chord ?? null, context),
    relativeSwap(chord, info, context),
    ...passingDiminished(chord, info, next, context),
  ].filter((item): item is Substitution => item !== null);
}

// The progression with the chosen slot replaced.
export function applySubstitution(
  chords: ProgressionChord[],
  index: number,
  substitution: Substitution
): ProgressionChord[] {
  return [
    ...chords.slice(0, index),
    ...substitution.replacement,
    ...chords.slice(index + 1),
  ];
}
