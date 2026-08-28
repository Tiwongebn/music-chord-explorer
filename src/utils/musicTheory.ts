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

export function calculateChordNotes(
  rootNote: string,
  intervals: number[]
): string[] {
  const rootIndex = chromaticScale.indexOf(rootNote);

  if (rootIndex === -1) {
    return [];
  }

  return intervals.map((interval) => {
    const noteIndex = (rootIndex + interval) % chromaticScale.length;
    return chromaticScale[noteIndex];
  });
}

export const notes = chromaticScale;