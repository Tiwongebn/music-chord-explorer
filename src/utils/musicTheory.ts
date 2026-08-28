const naturalNotes = [
  "C",
  "D",
  "E",
  "F",
  "G",
  "A",
  "B",
];

const naturalNoteValues: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

const chromaticScale = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

interface ParsedInterval {
  degree: number;
  semitones: number;
}

function normalizeSemitoneDifference(value: number): number {
  while (value > 6) {
    value -= 12;
  }

  while (value < -6) {
    value += 12;
  }

  return value;
}

function getRootLetter(rootNote: string): string {
  return rootNote.charAt(0);
}

function getAccidentalOffset(note: string): number {
  let offset = 0;

  for (const character of note.slice(1)) {
    if (character === "#") {
      offset++;
    }

    if (character === "b") {
      offset--;
    }
  }

  return offset;
}

function parseInterval(
  intervalName: string,
  fallbackSemitones: number
): ParsedInterval {
  if (intervalName === "Root") {
    return {
      degree: 1,
      semitones: 0,
    };
  }

  const degreeMatch = intervalName.match(/(\d+)/);

  if (!degreeMatch) {
    return {
      degree: 1,
      semitones: fallbackSemitones,
    };
  }

  const degree = Number(degreeMatch[1]);

  const intervalSemitones: Record<string, number> = {
    "Minor 2nd": 1,
    "Major 2nd": 2,

    "Minor 3rd": 3,
    "Major 3rd": 4,

    "Perfect 4th": 5,
    "Augmented 4th": 6,

    "Diminished 5th": 6,
    "Perfect 5th": 7,
    "Augmented 5th": 8,

    "Minor 6th": 8,
    "Major 6th": 9,

    "Diminished 7th": 9,
    "Minor 7th": 10,
    "Major 7th": 11,

    "Minor 9th": 13,
    "Major 9th": 14,
    "Augmented 9th": 15,

    "Perfect 11th": 17,
    "Augmented 11th": 18,

    "Minor 13th": 20,
    "Major 13th": 21,
  };

  return {
    degree,
    semitones:
      intervalSemitones[intervalName] ?? fallbackSemitones,
  };
}

function getLetterForDegree(
  rootLetter: string,
  degree: number
): string {
  const rootIndex = naturalNotes.indexOf(rootLetter);

  if (rootIndex === -1) {
    return rootLetter;
  }

  const degreeIndex = (rootIndex + degree - 1) % 7;

  return naturalNotes[degreeIndex];
}

function formatAccidental(offset: number): string {
  if (offset === 0) {
    return "";
  }

  if (offset === 1) {
    return "#";
  }

  if (offset === 2) {
    return "##";
  }

  if (offset === -1) {
    return "b";
  }

  if (offset === -2) {
    return "bb";
  }

  return "";
}


export function formatNoteForDisplay(note: string): string {
  return note
    .replaceAll("##", "𝄪")
    .replaceAll("bb", "𝄫")
    .replaceAll("#", "♯")
    .replaceAll("b", "♭");
}


export function calculateChordNotes(
  rootNote: string,
  intervals: number[],
  intervalNames: string[],
  preference: AccidentalPreference
): string[] {

   const preferredRootNote = convertRootNote(
    rootNote,
    preference
  );

  const rootLetter = getRootLetter(rootNote);

  const rootAccidental = getAccidentalOffset(rootNote);

  const rootNaturalValue = naturalNoteValues[rootLetter];

  if (rootNaturalValue === undefined) {
    return [];
  }

  return intervals.map((interval, index) => {
    const intervalName = intervalNames[index];

    const parsedInterval = parseInterval(
      intervalName,
      interval
    );

    if (parsedInterval.degree === 1) {
  return preferredRootNote;
}

    const targetPitch =
      (rootNaturalValue +
        rootAccidental +
        parsedInterval.semitones) %
      12;

    const targetLetter = getLetterForDegree(
      rootLetter,
      parsedInterval.degree
    );

    const targetNaturalPitch =
      naturalNoteValues[targetLetter];

    let accidentalDifference =
      targetPitch - targetNaturalPitch;

    accidentalDifference =
      normalizeSemitoneDifference(accidentalDifference);

    const accidental = formatAccidental(
      accidentalDifference
    );

    return `${targetLetter}${accidental}`;
  });
}

export interface NoteOption {
  name: string;
  value: string;
}

export const sharpNotes = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

export const flatNotes = [
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
];

export type AccidentalPreference = "sharps" | "flats";

export function getNotesByPreference(
  preference: AccidentalPreference
): string[] {
  return preference === "sharps"
    ? sharpNotes
    : flatNotes;
}

export function convertRootNote(
  note: string,
  preference: AccidentalPreference
): string {
  const sharpIndex = sharpNotes.indexOf(note);

  if (sharpIndex !== -1) {
    return preference === "sharps"
      ? sharpNotes[sharpIndex]
      : flatNotes[sharpIndex];
  }

  const flatIndex = flatNotes.indexOf(note);

  if (flatIndex !== -1) {
    return preference === "sharps"
      ? sharpNotes[flatIndex]
      : flatNotes[flatIndex];
  }

  return note;
}