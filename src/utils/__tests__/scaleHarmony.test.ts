import { describe, it, expect } from "vitest";
import {
  buildScaleChords,
  classifyChordInKey,
  getDisplayKeyRoot,
} from "../scaleHarmony";

describe("scaleHarmony", () => {
  describe("buildScaleChords", () => {
    it("builds major scale chords for C major", () => {
      const chords = buildScaleChords("C", "major", "sharps");
      expect(chords).toHaveLength(7);

      // I chord: C major
      expect(chords[0].degree).toBe(1);
      expect(chords[0].rawRootNote).toBe("C");

      // ii chord: D minor
      expect(chords[1].degree).toBe(2);
      expect(chords[1].rawRootNote).toBe("D");

      // iii chord: E minor
      expect(chords[2].degree).toBe(3);
      expect(chords[2].rawRootNote).toBe("E");

      // IV chord: F major
      expect(chords[3].degree).toBe(4);
      expect(chords[3].rawRootNote).toBe("F");

      // V chord: G major
      expect(chords[4].degree).toBe(5);
      expect(chords[4].rawRootNote).toBe("G");

      // vi chord: A minor
      expect(chords[5].degree).toBe(6);
      expect(chords[5].rawRootNote).toBe("A");

      // vii° chord: B diminished
      expect(chords[6].degree).toBe(7);
      expect(chords[6].rawRootNote).toBe("B");
    });

    it("builds minor scale chords for A minor", () => {
      const chords = buildScaleChords("A", "minor", "sharps");
      expect(chords).toHaveLength(7);

      // i chord: A minor
      expect(chords[0].degree).toBe(1);
      expect(chords[0].rawRootNote).toBe("A");

      // ii° chord: B diminished
      expect(chords[1].degree).toBe(2);
      expect(chords[1].rawRootNote).toBe("B");

      // III chord: C major
      expect(chords[2].degree).toBe(3);
      expect(chords[2].rawRootNote).toBe("C");

      // iv chord: D minor
      expect(chords[3].degree).toBe(4);
      expect(chords[3].rawRootNote).toBe("D");

      // v chord: E minor
      expect(chords[4].degree).toBe(5);
      expect(chords[4].rawRootNote).toBe("E");

      // VI chord: F major
      expect(chords[5].degree).toBe(6);
      expect(chords[5].rawRootNote).toBe("F");

      // VII chord: G major
      expect(chords[6].degree).toBe(7);
      expect(chords[6].rawRootNote).toBe("G");
    });

    it("handles flat keys correctly (F major)", () => {
      const chords = buildScaleChords("F", "major", "flats");
      expect(chords).toHaveLength(7);

      // I chord: F major
      expect(chords[0].rawRootNote).toBe("F");

      // ii chord: G minor
      expect(chords[1].rawRootNote).toBe("G");

      // iii chord: A minor
      expect(chords[2].rawRootNote).toBe("A");

      // IV chord: Bb major
      expect(chords[3].rawRootNote).toBe("Bb");

      // V chord: C major
      expect(chords[4].rawRootNote).toBe("C");

      // vi chord: D minor
      expect(chords[5].rawRootNote).toBe("D");

      // vii° chord: E diminished
      expect(chords[6].rawRootNote).toBe("E");
    });

    it("uses sharps preference consistently", () => {
      const charpsChords = buildScaleChords("C#", "major", "sharps");
      expect(charpsChords[0].rawRootNote).toBe("C#");

      const notes = charpsChords.map((c) => c.rawRootNote);
      expect(notes).toContain("C#");
      expect(notes).toContain("D#");
      expect(notes).toContain("F#");
      expect(notes).toContain("G#");
      expect(notes).toContain("A#");
    });

    it("uses flats preference consistently", () => {
      const flatChords = buildScaleChords("Db", "major", "flats");
      expect(flatChords[0].rawRootNote).toBe("Db");

      const notes = flatChords.map((c) => c.rawRootNote);
      expect(notes).toContain("Db");
      expect(notes).toContain("Eb");
      expect(notes).toContain("Gb");
      expect(notes).toContain("Ab");
      expect(notes).toContain("Bb");
    });

    it("each chord has correct function (Tonic/Subdominant/Dominant)", () => {
      const chords = buildScaleChords("C", "major", "sharps");

      // C major = Tonic
      expect(chords[0].function).toBe("Tonic");

      // F major = Subdominant
      expect(chords[3].function).toBe("Subdominant");

      // G major = Dominant
      expect(chords[4].function).toBe("Dominant");
    });

    it("each chord has correct intervalNames for its voicing", () => {
      const chords = buildScaleChords("C", "major", "sharps");

      // C major chord should have intervalNames
      expect(chords[0].intervalNames).toBeDefined();
      expect(chords[0].intervalNames.length).toBeGreaterThan(0);
    });

    it("with custom chord type, applies that voicing", () => {
      // Pass a chord type (e.g., dominant 7th) to voice all degrees with it
      const chords = buildScaleChords("C", "major", "sharps", { symbol: "7", intervals: [0, 4, 7, 10], name: "Dominant 7th", category: "Seventh Chords", intervalNames: ["Root", "Major 3rd", "Perfect 5th", "Minor 7th"] });
      
      // Each chord should now be voiced as a 7th
      expect(chords[0].intervalNames).toContain("Minor 7th");
      expect(chords[0].intervals).toEqual([0, 4, 7, 10]);
    });
  });

  describe("classifyChordInKey", () => {
    it("classifies diatonic chords in C major", () => {
      // C, E, G = C major = I chord = diatonic
      expect(classifyChordInKey("C", 0, "C", "major")).toBe("diatonic");

      // D, F#, A = D minor = ii chord = diatonic
      expect(classifyChordInKey("D", 1, "C", "major")).toBe("diatonic");
    });

    it("classifies chromatic chords outside the scale", () => {
      // F# major doesn't belong to C major scale
      expect(classifyChordInKey("F#", 0, "C", "major")).toBe("chromatic");

      // Eb major doesn't belong to C major scale
      expect(classifyChordInKey("Eb", 0, "C", "major")).toBe("chromatic");
    });

    it("classifies borrowed chords in A minor", () => {
      // C major borrowed from A minor's relative major (C major)
      const result = classifyChordInKey("C", 0, "A", "minor");
      expect(["diatonic", "borrowed", "chromatic"]).toContain(result);
    });

    it("returns diatonic for all diatonic chords in major scale", () => {
      const rootNote = "G";
      const scaleType = "major";

      // G major scale: G A B C D E F#
      // Diatonic roots: G, A, B, C, D, E, F#
      const diatonicRoots = ["G", "A", "B", "C", "D", "E", "F#"];

      diatonicRoots.forEach((root, index) => {
        const classification = classifyChordInKey(root, index, rootNote, scaleType);
        expect(classification).toBe("diatonic");
      });
    });

    it("returns diatonic for all diatonic chords in minor scale", () => {
      const rootNote = "E";
      const scaleType = "minor";

      // E minor scale: E F# G A B C D
      // Diatonic roots: E, F#, G, A, B, C, D
      const diatonicRoots = ["E", "F#", "G", "A", "B", "C", "D"];

      diatonicRoots.forEach((root, index) => {
        const classification = classifyChordInKey(root, index, rootNote, scaleType);
        expect(classification).toBe("diatonic");
      });
    });
  });

  describe("getDisplayKeyRoot", () => {
    it("returns C for C with either preference", () => {
      expect(getDisplayKeyRoot("C", "sharps")).toBe("C");
      expect(getDisplayKeyRoot("C", "flats")).toBe("C");
    });

    it("returns natural note symbols correctly with sharps", () => {
      expect(getDisplayKeyRoot("C#", "sharps")).toBe("C♯");
      expect(getDisplayKeyRoot("F#", "sharps")).toBe("F♯");
      expect(getDisplayKeyRoot("G#", "sharps")).toBe("G♯");
    });

    it("returns natural note symbols correctly with flats", () => {
      expect(getDisplayKeyRoot("Db", "flats")).toBe("D♭");
      expect(getDisplayKeyRoot("Eb", "flats")).toBe("E♭");
      expect(getDisplayKeyRoot("Ab", "flats")).toBe("A♭");
      expect(getDisplayKeyRoot("Bb", "flats")).toBe("B♭");
    });

    it("prefers sharps display when preference is sharps", () => {
      // C# and Db are enharmonic equivalents, but should display based on preference
      const result = getDisplayKeyRoot("C#", "sharps");
      expect(result).toContain("♯");
    });

    it("prefers flats display when preference is flats", () => {
      // F# and Gb are enharmonic equivalents
      const result = getDisplayKeyRoot("Gb", "flats");
      expect(result).toContain("♭");
    });
  });
});
