import { describe, it, expect } from "vitest";
import {
  getNotesByPreference,
  formatNoteForDisplay,
  sharpNotes,
  flatNotes,
} from "../musicTheory";

describe("musicTheory", () => {
  describe("getNotesByPreference", () => {
    it("returns sharp notes when preference is 'sharps'", () => {
      const notes = getNotesByPreference("sharps");
      expect(notes).toEqual([
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
      ]);
    });

    it("returns flat notes when preference is 'flats'", () => {
      const notes = getNotesByPreference("flats");
      expect(notes).toEqual([
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
      ]);
    });

    it("contains exactly 12 notes in either preference", () => {
      expect(getNotesByPreference("sharps").length).toBe(12);
      expect(getNotesByPreference("flats").length).toBe(12);
    });

    it("sharps array matches sharpNotes constant", () => {
      expect(getNotesByPreference("sharps")).toEqual(sharpNotes);
    });

    it("flats array matches flatNotes constant", () => {
      expect(getNotesByPreference("flats")).toEqual(flatNotes);
    });
  });

  describe("formatNoteForDisplay", () => {
    it("displays natural notes unchanged", () => {
      expect(formatNoteForDisplay("C")).toBe("C");
      expect(formatNoteForDisplay("D")).toBe("D");
      expect(formatNoteForDisplay("E")).toBe("E");
      expect(formatNoteForDisplay("F")).toBe("F");
      expect(formatNoteForDisplay("G")).toBe("G");
      expect(formatNoteForDisplay("A")).toBe("A");
      expect(formatNoteForDisplay("B")).toBe("B");
    });

    it("displays sharps with sharp symbol", () => {
      expect(formatNoteForDisplay("C#")).toBe("C♯");
      expect(formatNoteForDisplay("D#")).toBe("D♯");
      expect(formatNoteForDisplay("F#")).toBe("F♯");
      expect(formatNoteForDisplay("G#")).toBe("G♯");
      expect(formatNoteForDisplay("A#")).toBe("A♯");
    });

    it("displays flats with flat symbol", () => {
      expect(formatNoteForDisplay("Db")).toBe("D♭");
      expect(formatNoteForDisplay("Eb")).toBe("E♭");
      expect(formatNoteForDisplay("Gb")).toBe("G♭");
      expect(formatNoteForDisplay("Ab")).toBe("A♭");
      expect(formatNoteForDisplay("Bb")).toBe("B♭");
    });

    it("handles double accidentals", () => {
      expect(formatNoteForDisplay("C##")).toBe("C♯♯");
      expect(formatNoteForDisplay("Dbb")).toBe("D♭♭");
    });

    it("handles mixed accidentals (rare but valid)", () => {
      // Though not common, a note could theoretically have both # and b
      expect(formatNoteForDisplay("C#b")).toBe("C♯♭");
    });
  });

  describe("sharpNotes constant", () => {
    it("contains chromatic scale starting from C using sharps", () => {
      expect(sharpNotes).toEqual([
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
      ]);
    });

    it("has 12 notes", () => {
      expect(sharpNotes.length).toBe(12);
    });
  });

  describe("flatNotes constant", () => {
    it("contains chromatic scale starting from C using flats", () => {
      expect(flatNotes).toEqual([
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
      ]);
    });

    it("has 12 notes", () => {
      expect(flatNotes.length).toBe(12);
    });
  });
});
