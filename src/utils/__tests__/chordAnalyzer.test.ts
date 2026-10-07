import { describe, it, expect } from "vitest";
import { analyzeChord } from "../chordAnalyzer";

describe("chordAnalyzer", () => {
  describe("analyzeChord", () => {
    it("returns null for empty input", () => {
      expect(analyzeChord([])).toBeNull();
    });

    it("returns null for single note", () => {
      expect(analyzeChord(["C"])).toBeNull();
    });

    it("detects major triad (C E G)", () => {
      const result = analyzeChord(["C", "E", "G"]);
      expect(result).not.toBeNull();
      expect(result!.root).toBe("C");
      expect(result!.symbol).toBe("");
      expect(result!.name).toBe("C Major");
      expect(result!.pattern).toEqual([0, 4, 7]);
    });

    it("detects minor triad (A C E)", () => {
      const result = analyzeChord(["A", "C", "E"]);
      expect(result).not.toBeNull();
      expect(result!.root).toBe("A");
      expect(result!.symbol).toBe("m");
      expect(result!.name).toBe("A Minor");
      expect(result!.pattern).toEqual([0, 3, 7]);
    });

    it("detects diminished triad (B D F)", () => {
      const result = analyzeChord(["B", "D", "F"]);
      expect(result).not.toBeNull();
      expect(result!.root).toBe("B");
      expect(result!.symbol).toBe("dim");
      expect(result!.name).toBe("B Diminished");
      expect(result!.pattern).toEqual([0, 3, 6]);
    });

    it("detects augmented triad (G B D#)", () => {
      const result = analyzeChord(["G", "B", "D#"]);
      expect(result).not.toBeNull();
      expect(result!.root).toBe("G");
      expect(result!.symbol).toBe("aug");
      expect(result!.name).toBe("G Augmented");
      expect(result!.pattern).toEqual([0, 4, 8]);
    });

    it("detects dominant 7th (G B D F)", () => {
      const result = analyzeChord(["G", "B", "D", "F"]);
      expect(result).not.toBeNull();
      expect(result!.root).toBe("G");
      expect(result!.symbol).toBe("7");
      expect(result!.name).toBe("G Dominant 7th");
      expect(result!.pattern).toEqual([0, 4, 7, 10]);
    });

    it("detects major 7th (C E G B)", () => {
      const result = analyzeChord(["C", "E", "G", "B"]);
      expect(result).not.toBeNull();
      expect(result!.root).toBe("C");
      expect(result!.symbol).toBe("maj7");
      expect(result!.name).toBe("C Major 7th");
      expect(result!.pattern).toEqual([0, 4, 7, 11]);
    });

    it("detects minor 7th (D F A C)", () => {
      const result = analyzeChord(["D", "F", "A", "C"]);
      expect(result).not.toBeNull();
      expect(result!.root).toBe("D");
      expect(result!.symbol).toBe("m7");
      expect(result!.name).toBe("D Minor 7th");
      expect(result!.pattern).toEqual([0, 3, 7, 10]);
    });

    it("detects chord in different voicing (inverted)", () => {
      // First inversion: E G C (instead of C E G)
      const result = analyzeChord(["E", "G", "C"]);
      expect(result).not.toBeNull();
      expect(result!.root).toBe("C");
      expect(result!.symbol).toBe("");
      expect(result!.name).toBe("C Major");
    });

    it("detects chord with duplicate pitch class", () => {
      // C C E G should still recognize as C Major (duplicate C)
      const result = analyzeChord(["C", "C", "E", "G"]);
      expect(result).not.toBeNull();
      expect(result!.root).toBe("C");
      expect(result!.symbol).toBe("");
      expect(result!.name).toBe("C Major");
    });

    it("handles flat notation (Db Gb Ab)", () => {
      const result = analyzeChord(["Db", "Gb", "Ab"]);
      expect(result).not.toBeNull();
      // Db = C#, Gb = F#, Ab = G#, so C# F# G# = C# major
      expect(result!.root).toBe("C#");
      expect(result!.symbol).toBe("");
    });

    it("detects half-diminished 7th (B D F A)", () => {
      const result = analyzeChord(["B", "D", "F", "A"]);
      expect(result).not.toBeNull();
      expect(result!.root).toBe("B");
      expect(result!.symbol).toBe("m7♭5");
      expect(result!.name).toBe("B Half-Diminished 7th");
      expect(result!.pattern).toEqual([0, 3, 6, 10]);
    });

    it("detects suspended 2nd (G A D)", () => {
      const result = analyzeChord(["G", "A", "D"]);
      expect(result).not.toBeNull();
      expect(result!.root).toBe("G");
      expect(result!.symbol).toBe("sus2");
      expect(result!.name).toBe("G Suspended 2nd");
      expect(result!.pattern).toEqual([0, 2, 7]);
    });

    it("detects suspended 4th (F Bb C)", () => {
      const result = analyzeChord(["F", "Bb", "C"]);
      expect(result).not.toBeNull();
      expect(result!.root).toBe("F");
      expect(result!.symbol).toBe("sus4");
      expect(result!.name).toBe("F Suspended 4th");
      expect(result!.pattern).toEqual([0, 5, 7]);
    });

    it("detects major 6th (C E G A)", () => {
      const result = analyzeChord(["C", "E", "G", "A"]);
      expect(result).not.toBeNull();
      expect(result!.root).toBe("C");
      expect(result!.symbol).toBe("6");
      expect(result!.name).toBe("C Major 6th");
      expect(result!.pattern).toEqual([0, 4, 7, 9]);
    });

    it("detects add9 chord (C E G D)", () => {
      const result = analyzeChord(["C", "E", "G", "D"]);
      expect(result).not.toBeNull();
      expect(result!.root).toBe("C");
      expect(result!.symbol).toBe("add9");
      expect(result!.name).toBe("C Add 9");
      expect(result!.pattern).toEqual([0, 4, 7, 14]);
    });

    it("detects dominant 9th (G B D F A)", () => {
      const result = analyzeChord(["G", "B", "D", "F", "A"]);
      expect(result).not.toBeNull();
      expect(result!.root).toBe("G");
      expect(result!.symbol).toBe("9");
      expect(result!.name).toBe("G Dominant 9th");
      expect(result!.pattern).toEqual([0, 4, 7, 10, 14]);
    });

    it("does not detect chord when notes don't form a valid pattern", () => {
      // B C# D# = B major
      const result1 = analyzeChord(["B", "C#", "D#"]);
      expect(result1).not.toBeNull();
      expect(result1!.root).toBe("B");

      // B C D = no standard pattern
      const result2 = analyzeChord(["B", "C", "D"]);
      expect(result2).toBeNull();
    });

    it("returns notes array in the detected chord", () => {
      const result = analyzeChord(["C", "E", "G"]);
      expect(result!.notes).toEqual(["C", "E", "G"]);
    });

    it("normalizes accidentals consistently", () => {
      // Db = C# in normalized form
      const result1 = analyzeChord(["Db", "F", "Ab"]);
      const result2 = analyzeChord(["C#", "F", "G#"]);
      expect(result1).not.toBeNull();
      expect(result2).not.toBeNull();
      expect(result1!.root).toBe(result2!.root);
      expect(result1!.symbol).toBe(result2!.symbol);
    });
  });
});
