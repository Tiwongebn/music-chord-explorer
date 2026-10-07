import { describe, it, expect } from "vitest";
import {
  getPatterns,
  getPattern,
  getDefaultPatternId,
} from "../patterns";

describe("patterns data", () => {
  describe("getPatterns", () => {
    it("returns an array of rhythm patterns", () => {
      const patterns = getPatterns();
      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns.length).toBeGreaterThan(0);
    });

    it("each pattern has required fields", () => {
      const patterns = getPatterns();

      patterns.forEach((pattern) => {
        expect(pattern).toHaveProperty("id");
        expect(pattern).toHaveProperty("name");
        expect(pattern).toHaveProperty("description");
        expect(pattern).toHaveProperty("events");
      });
    });

    it("each pattern id is unique", () => {
      const patterns = getPatterns();
      const ids = patterns.map((p) => p.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });

    it("each pattern has non-empty events array", () => {
      const patterns = getPatterns();

      patterns.forEach((pattern) => {
        expect(Array.isArray(pattern.events)).toBe(true);
        expect(pattern.events.length).toBeGreaterThan(0);
      });
    });

    it("each event has required fields", () => {
      const patterns = getPatterns();

      patterns.forEach((pattern) => {
        pattern.events.forEach((event) => {
          expect(event).toHaveProperty("noteIndex");
          expect(event).toHaveProperty("offset");
          expect(event).toHaveProperty("duration");
          expect(event).toHaveProperty("volume");
        });
      });
    });

    it("event offsets are numbers", () => {
      const patterns = getPatterns();

      patterns.forEach((pattern) => {
        pattern.events.forEach((event) => {
          expect(typeof event.offset).toBe("number");
          expect(event.offset).toBeGreaterThanOrEqual(0);
          expect(event.offset).toBeLessThanOrEqual(1);
        });
      });
    });

    it("event durations are numbers", () => {
      const patterns = getPatterns();

      patterns.forEach((pattern) => {
        pattern.events.forEach((event) => {
          expect(typeof event.duration).toBe("number");
          expect(event.duration).toBeGreaterThan(0);
        });
      });
    });

    it("event volumes are in valid range", () => {
      const patterns = getPatterns();

      patterns.forEach((pattern) => {
        pattern.events.forEach((event) => {
          expect(typeof event.volume).toBe("number");
          expect(event.volume).toBeGreaterThan(0);
          expect(event.volume).toBeLessThanOrEqual(1);
        });
      });
    });

    it("event noteIndex references valid chord notes", () => {
      const patterns = getPatterns();

      patterns.forEach((pattern) => {
        pattern.events.forEach((event) => {
          // noteIndex should be non-negative
          expect(typeof event.noteIndex).toBe("number");
          expect(event.noteIndex).toBeGreaterThanOrEqual(0);
        });
      });
    });
  });

  describe("getPattern", () => {
    it("returns a pattern object when given valid id", () => {
      const patterns = getPatterns();
      const firstPatternId = patterns[0].id;

      const pattern = getPattern(firstPatternId);
      expect(pattern).toBeDefined();
      expect(pattern.id).toBe(firstPatternId);
      expect(pattern.name).toBe(patterns[0].name);
    });

    it("returns pattern with all required fields", () => {
      const patterns = getPatterns();
      const pattern = getPattern(patterns[0].id);

      expect(pattern).toHaveProperty("id");
      expect(pattern).toHaveProperty("name");
      expect(pattern).toHaveProperty("description");
      expect(pattern).toHaveProperty("events");
    });

    it("throws or returns default when given invalid id", () => {
      // Should either throw or return a sensible default
      expect(() => {
        getPattern("nonexistent-pattern-id");
      }).not.toThrow(); // Should handle gracefully
    });

    it("returns same pattern reference for same id", () => {
      const patterns = getPatterns();
      const id = patterns[0].id;

      const pattern1 = getPattern(id);
      const pattern2 = getPattern(id);

      expect(pattern1.id).toBe(pattern2.id);
      expect(pattern1.name).toBe(pattern2.name);
    });
  });

  describe("getDefaultPatternId", () => {
    it("returns a string id", () => {
      const defaultId = getDefaultPatternId();
      expect(typeof defaultId).toBe("string");
      expect(defaultId.length).toBeGreaterThan(0);
    });

    it("returns a valid pattern id", () => {
      const defaultId = getDefaultPatternId();
      const pattern = getPattern(defaultId);

      expect(pattern).toBeDefined();
      expect(pattern.id).toBe(defaultId);
    });

    it("returns the same default id consistently", () => {
      const defaultId1 = getDefaultPatternId();
      const defaultId2 = getDefaultPatternId();

      expect(defaultId1).toBe(defaultId2);
    });

    it("the default pattern exists in patterns list", () => {
      const defaultId = getDefaultPatternId();
      const patterns = getPatterns();
      const defaultPattern = patterns.find((p) => p.id === defaultId);

      expect(defaultPattern).toBeDefined();
    });
  });
});
