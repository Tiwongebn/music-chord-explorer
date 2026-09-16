export interface ChordBuilderOption {
  id: string;
  label: string;
  interval: number;
  symbol: string;
  intervalName: string;
}

export const chordQualities: ChordBuilderOption[] = [
  {
    id: "major",
    label: "Major",
    interval: 4,
    symbol: "",
    intervalName: "Major 3rd",
  },
  {
    id: "minor",
    label: "Minor",
    interval: 3,
    symbol: "m",
    intervalName: "Minor 3rd",
  },
  {
    id: "diminished",
    label: "Diminished",
    interval: 3,
    symbol: "dim",
    intervalName: "Minor 3rd",
  },
  {
    id: "augmented",
    label: "Augmented",
    interval: 4,
    symbol: "aug",
    intervalName: "Major 3rd",
  },
];

export const chordExtensions: ChordBuilderOption[] = [
  {
    id: "6",
    label: "6th",
    interval: 9,
    symbol: "6",
    intervalName: "Major 6th",
  },
  {
    id: "b7",
    label: "Dominant 7th",
    interval: 10,
    symbol: "7",
    intervalName: "Minor 7th",
  },
  {
    id: "maj7",
    label: "Major 7th",
    interval: 11,
    symbol: "maj7",
    intervalName: "Major 7th",
  },
  {
    id: "9",
    label: "9th",
    interval: 2,
    symbol: "9",
    intervalName: "Major 9th",
  },
  {
    id: "11",
    label: "11th",
    interval: 5,
    symbol: "11",
    intervalName: "Perfect 11th",
  },
  {
    id: "13",
    label: "13th",
    interval: 9,
    symbol: "13",
    intervalName: "Major 13th",
  },
];

export const chordAlterations: ChordBuilderOption[] = [
  {
    id: "b5",
    label: "♭5",
    interval: 6,
    symbol: "b5",
    intervalName: "Diminished 5th",
  },
  {
    id: "#5",
    label: "♯5",
    interval: 8,
    symbol: "#5",
    intervalName: "Augmented 5th",
  },
  {
    id: "b9",
    label: "♭9",
    interval: 1,
    symbol: "b9",
    intervalName: "Minor 9th",
  },
  {
    id: "#9",
    label: "♯9",
    interval: 3,
    symbol: "#9",
    intervalName: "Augmented 9th",
  },
  {
    id: "#11",
    label: "♯11",
    interval: 6,
    symbol: "#11",
    intervalName: "Augmented 11th",
  },
  {
    id: "b13",
    label: "♭13",
    interval: 8,
    symbol: "b13",
    intervalName: "Minor 13th",
  },
];