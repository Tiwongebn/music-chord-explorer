export type ChordCategory =
  | "Triads"
  | "Suspended"
  | "Sixth Chords"
  | "Seventh Chords"
  | "Extended Chords"
  | "Altered Chords"
  | "Added Tone Chords";

export interface ChordType {
  name: string;
  symbol: string;
  category: ChordCategory;
  intervals: number[];
  intervalNames: string[];
}