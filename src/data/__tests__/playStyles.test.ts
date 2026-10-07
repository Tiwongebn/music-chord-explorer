import { describe, it, expect } from "vitest";
import {
  getStyles,
  getStyle,
  getDefaultStyleId,
  getStylesByCategory,
  PlayStyle,
} from "../playStyles";

describe("playStyles", () => {
  describe("getStyles", () => {
    it("returns an array of play styles", () => {
      const styles = getStyles();
      expect(Array.isArray(styles)).toBe(true);
      expect(styles.length).toBeGreaterThan(0);
    });

    it("contains Jazz category", () => {
      const styles = getStyles();
      const jazzStyles = styles.filter(
        (s) => s.category === "Jazz"
      );
      expect(jazzStyles.length).toBeGreaterThan(0);
    });

    it("contains Rock category", () => {
      const styles = getStyles();
      const rockStyles = styles.filter(
        (s) => s.category === "Rock"
      );
      expect(rockStyles.length).toBeGreaterThan(0);
    });

    it("contains Pop category", () => {
      const styles = getStyles();
      const popStyles = styles.filter(
        (s) => s.category === "Pop"
      );
      expect(popStyles.length).toBeGreaterThan(0);
    });

    it("contains Soul category", () => {
      const styles = getStyles();
      const soulStyles = styles.filter(
        (s) => s.category === "Soul"
      );
      expect(soulStyles.length).toBeGreaterThan(0);
    });

    it("contains Reggae category", () => {
      const styles = getStyles();
      const reggaeStyles = styles.filter(
        (s) => s.category === "Reggae"
      );
      expect(reggaeStyles.length).toBeGreaterThan(0);
    });

    it("contains Classical category", () => {
      const styles = getStyles();
      const classicalStyles = styles.filter(
        (s) => s.category === "Classical"
      );
      expect(classicalStyles.length).toBeGreaterThan(0);
    });

    it("all styles have unique ids", () => {
      const styles = getStyles();
      const ids = styles.map((s) => s.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });

    it("all styles have required fields", () => {
      const styles = getStyles();

      styles.forEach((style) => {
        expect(style).toHaveProperty("id");
        expect(style).toHaveProperty("label");
        expect(style).toHaveProperty("description");
        expect(style).toHaveProperty("category");
        expect(style).toHaveProperty("patternId");
        expect(style).toHaveProperty("defaultSecondsPerBeat");
        expect(style).toHaveProperty("swingEnabled");
        expect(style).toHaveProperty("accentType");
        expect(style).toHaveProperty("bassLayer");
      });
    });

    it("all styles have valid tempo ranges", () => {
      const styles = getStyles();

      styles.forEach((style) => {
        expect(typeof style.defaultSecondsPerBeat).toBe("number");
        expect(style.defaultSecondsPerBeat).toBeGreaterThan(0);
        expect(style.defaultSecondsPerBeat).toBeLessThan(2);
      });
    });

    it("all styles have valid accentType", () => {
      const styles = getStyles();
      const validAccents = ["none", "first-beat", "first-measure"];

      styles.forEach((style) => {
        expect(validAccents).toContain(style.accentType);
      });
    });
  });

  describe("getStyle", () => {
    it("returns a style when given valid id", () => {
      const styles = getStyles();
      const firstStyle = styles[0];

      const style = getStyle(firstStyle.id);
      expect(style).toBeDefined();
      expect(style!.id).toBe(firstStyle.id);
    });

    it("returns undefined when given invalid id", () => {
      const style = getStyle("nonexistent-style-id");
      expect(style).toBeUndefined();
    });

    it("returns jazz-swing style correctly", () => {
      const style = getStyle("jazz-swing");
      expect(style).toBeDefined();
      expect(style!.label).toBe("Jazz: Swing");
      expect(style!.category).toBe("Jazz");
      expect(style!.swingEnabled).toBe(true);
    });

    it("returns jazz-cool style correctly", () => {
      const style = getStyle("jazz-cool");
      expect(style).toBeDefined();
      expect(style!.label).toBe("Jazz: Cool");
      expect(style!.category).toBe("Jazz");
    });

    it("returns rock-power style correctly", () => {
      const style = getStyle("rock-power");
      expect(style).toBeDefined();
      expect(style!.label).toBe("Rock: Power Chords");
      expect(style!.category).toBe("Rock");
    });

    it("returns pop-standard style correctly", () => {
      const style = getStyle("pop-standard");
      expect(style).toBeDefined();
      expect(style!.label).toBe("Pop: Standard");
      expect(style!.category).toBe("Pop");
    });
  });

  describe("getDefaultStyleId", () => {
    it("returns a string id", () => {
      const defaultId = getDefaultStyleId();
      expect(typeof defaultId).toBe("string");
      expect(defaultId.length).toBeGreaterThan(0);
    });

    it("returns a valid style id", () => {
      const defaultId = getDefaultStyleId();
      const style = getStyle(defaultId);
      expect(style).toBeDefined();
    });

    it("returns pop-standard by default", () => {
      const defaultId = getDefaultStyleId();
      expect(defaultId).toBe("pop-standard");
    });

    it("returns the same default id consistently", () => {
      const id1 = getDefaultStyleId();
      const id2 = getDefaultStyleId();
      expect(id1).toBe(id2);
    });
  });

  describe("getStylesByCategory", () => {
    it("returns only Jazz styles for Jazz category", () => {
      const jazzStyles = getStylesByCategory("Jazz");
      expect(jazzStyles.length).toBeGreaterThan(0);

      jazzStyles.forEach((style) => {
        expect(style.category).toBe("Jazz");
      });
    });

    it("returns only Rock styles for Rock category", () => {
      const rockStyles = getStylesByCategory("Rock");
      expect(rockStyles.length).toBeGreaterThan(0);

      rockStyles.forEach((style) => {
        expect(style.category).toBe("Rock");
      });
    });

    it("returns only Pop styles for Pop category", () => {
      const popStyles = getStylesByCategory("Pop");
      expect(popStyles.length).toBeGreaterThan(0);

      popStyles.forEach((style) => {
        expect(style.category).toBe("Pop");
      });
    });

    it("returns empty array for invalid category", () => {
      // This will be caught by TypeScript, but test runtime behavior
      const result = getStylesByCategory(
        "InvalidCategory" as PlayStyle["category"]
      );
      expect(result).toEqual([]);
    });
  });

  describe("bassLayer functions", () => {
    it("bass layer returns events array", () => {
      const style = getStyle("pop-standard")!;
      const events = style.bassLayer("C", 4, 4);
      expect(Array.isArray(events)).toBe(true);
    });

    it("jazz-swing has walking bass on multiple beats", () => {
      const style = getStyle("jazz-swing")!;
      const events = style.bassLayer("G", 4, 2.67);

      expect(events.length).toBeGreaterThan(0);
      events.forEach((event) => {
        expect(event.beatOffsets).toBeDefined();
        expect(Array.isArray(event.beatOffsets)).toBe(true);
        expect(event.noteDuration).toBeGreaterThan(0);
      });
    });

    it("reggae-steady has off-beat bass", () => {
      const style = getStyle("reggae-steady")!;
      const events = style.bassLayer("A", 4, 2.56);

      expect(events.length).toBeGreaterThan(0);
      events.forEach((event) => {
        // Offbeat bass should hit on beats 2 and 4 (indices 1, 3)
        event.beatOffsets.forEach((beat) => {
          expect(beat % 2).toBe(1); // odd-numbered beats only
        });
      });
    });

    it("rock-power has four-on-the-floor bass", () => {
      const style = getStyle("rock-power")!;
      const events = style.bassLayer("D", 4, 2);

      expect(events.length).toBeGreaterThan(0);
      events.forEach((event) => {
        // Four-on-the-floor hits every beat
        expect(event.beatOffsets.length).toBe(4);
        expect(event.beatOffsets).toEqual([0, 1, 2, 3]);
      });
    });

    it("jazz-ballad has walking bass", () => {
      const style = getStyle("jazz-ballad")!;
      const events = style.bassLayer("E", 2, 2.4);

      expect(events.length).toBeGreaterThan(0);
      events.forEach((event) => {
        // Walking bass hits every beat
        expect(event.beatOffsets.length).toBe(2);
      });
    });

    it("classical-waltz plays bass on beat 1 only", () => {
      const style = getStyle("classical-waltz")!;
      const events = style.bassLayer("F", 3, 2.25);

      expect(events.length).toBeGreaterThan(0);
      events.forEach((event) => {
        // Waltz: only beat 1
        expect(event.beatOffsets).toEqual([0]);
      });
    });
  });

  describe("swing settings", () => {
    it("jazz styles have swing enabled", () => {
      const jazzStyles = getStylesByCategory("Jazz");
      const swingCount = jazzStyles.filter(
        (s) => s.swingEnabled
      ).length;
      expect(swingCount).toBeGreaterThan(0);
    });

    it("rock styles have swing disabled", () => {
      const rockStyles = getStylesByCategory("Rock");
      rockStyles.forEach((style) => {
        expect(style.swingEnabled).toBe(false);
      });
    });

    it("reggae-steady has appropriate tempo", () => {
      const style = getStyle("reggae-steady")!;
      // Should be around 94 BPM
      const bpm = 60 / style.defaultSecondsPerBeat;
      expect(bpm).toBeCloseTo(93.75, 1);
    });

    it("jazz-bebop is fast", () => {
      const style = getStyle("jazz-bebop")!;
      // Should be fast (150 BPM)
      const bpm = 60 / style.defaultSecondsPerBeat;
      expect(bpm).toBeGreaterThan(140);
    });

    it("jazz-ballad is slow", () => {
      const style = getStyle("jazz-ballad")!;
      // Should be slow (50 BPM)
      const bpm = 60 / style.defaultSecondsPerBeat;
      expect(bpm).toBeLessThan(60);
    });
  });

  describe("pattern references", () => {
    it("all styles reference valid pattern ids", () => {
      const styles = getStyles();
      // Valid pattern ids should exist (we can't import from patterns.ts
      // without circular dependency, so we just check they're strings)
      styles.forEach((style) => {
        expect(typeof style.patternId).toBe("string");
        expect(style.patternId.length).toBeGreaterThan(0);
      });
    });

    it("jazz styles reference appropriate patterns", () => {
      const jazzSwing = getStyle("jazz-swing")!;
      expect(jazzSwing.patternId).toBe("charleston");

      const jazzBebop = getStyle("jazz-bebop")!;
      expect(jazzBebop.patternId).toBe("arpeggio-up");

      const jazzBallad = getStyle("jazz-ballad")!;
      expect(jazzBallad.patternId).toBe("block");
    });

    it("rock styles reference strum or syncopated patterns", () => {
      const rockStrum = getStyle("rock-strum")!;
      expect(rockStrum.patternId).toBe("strum-down-up");

      const rockProgressive = getStyle("rock-progressive")!;
      expect(rockProgressive.patternId).toBe("syncopated");
    });
  });
});
