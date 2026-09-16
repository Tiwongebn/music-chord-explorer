import {
  sharpNotes,
  flatNotes,
} from "./musicTheory";

export type Inversion =
  | "Root Position"
  | "1st Inversion"
  | "2nd Inversion"
  | "3rd Inversion"
  | "Unknown";

function normalizeNote(note: string): string {
  const noteMap: Record<string, string> = {
    Db: "C#",
    Eb: "D#",
    Gb: "F#",
    Ab: "G#",
    Bb: "A#",

    Cb: "B",
    Fb: "E",

    "C##": "D",
    "D##": "E",
    "E##": "F#",
    "F##": "G",
    "G##": "A",
    "A##": "B",
    "B##": "C#",

    "Cbb": "A#",
    "Dbb": "C",
    "Ebb": "D",
    "Fbb": "D#",
    "Gbb": "F",
    "Abb": "G",
    "Bbb": "A",
  };

  return noteMap[note] ?? note;
}

function getNoteIndex(note: string): number {
  const normalized = normalizeNote(note);

  const sharpIndex =
    sharpNotes.indexOf(normalized);

  if (sharpIndex !== -1) {
    return sharpIndex;
  }

  return flatNotes.indexOf(normalized);
}

export function detectInversion(
  selectedNotes: string[],
  root: string
): Inversion {

  if (selectedNotes.length === 0) {
    return "Unknown";
  }

  const sortedNotes = [...selectedNotes].sort(
    (a, b) => {
      const octaveA =
        parseInt(a.match(/\d+$/)?.[0] ?? "0");

      const octaveB =
        parseInt(b.match(/\d+$/)?.[0] ?? "0");

      if (octaveA !== octaveB) {
        return octaveA - octaveB;
      }

      const noteA =
        a.replace(/\d+$/, "");

      const noteB =
        b.replace(/\d+$/, "");

      return (
        getNoteIndex(noteA) -
        getNoteIndex(noteB)
      );
    }
  );

  const lowestNote =
    sortedNotes[0].replace(/\d+$/, "");

  const normalizedRoot =
    normalizeNote(root);

  if (lowestNote === normalizedRoot) {
    return "Root Position";
  }

  const rootIndex =
    getNoteIndex(normalizedRoot);

  const lowestIndex =
    getNoteIndex(lowestNote);

  const interval =
    (lowestIndex - rootIndex + 12) % 12;

  switch (interval) {
    case 3:
    case 4:
      return "1st Inversion";

    case 6:
    case 7:
    case 8:
      return "2nd Inversion";

    case 10:
    case 11:
      return "3rd Inversion";

    default:
      return "Unknown";
  }
}