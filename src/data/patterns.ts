// ============================================================
// Rhythmic/strum patterns for chord progressions.
//
// Each pattern defines when notes fire within a chord's
// duration and which notes play. Used to transform a static
// "play all notes at once" into more musical articulation:
// arpeggios, strums, syncopation, etc.
//
// Public API:
//   getPatterns()                    catalog of all patterns
//   getPattern(id)                   fetch one by id
//   applyPattern(notes, duration, pattern) -> list of events
// ============================================================

export interface PatternEvent {
  // Offset in seconds from the start of the chord's duration
  // where this note group fires (e.g. 0 for beat 1, 0.25 for
  // the "and" of beat 1 if the chord is 1 second long).
  offsetSeconds: number;

  // Which notes from the chord play at this offset. Indices
  // into the chord's note array, e.g. [0] = lowest note,
  // [0,1,2] = all notes, [2] = highest note.
  noteIndices: number[];

  // Optional: if present, these notes are staggered by this
  // many milliseconds apart (e.g. 30ms for a tight strum).
  // If absent, all notes at this offset fire simultaneously.
  staggerMs?: number;
}

export interface RhythmPattern {
  id: string;
  label: string;
  description: string;

  // Function that takes chord notes and duration, returns
  // the schedule of when each note/group fires.
  events: (notes: string[], durationSeconds: number) => PatternEvent[];
}

// ---- Built-in pattern library ----

// BLOCK: all notes at once (current behavior, baseline)
const blockPattern: RhythmPattern = {
  id: "block",
  label: "Block",
  description: "All notes at once (traditional/percussive)",
  events: (notes) => [
    {
      offsetSeconds: 0,
      noteIndices: notes.map((_, i) => i), // all notes
    },
  ],
};

// ARPEGGIO UP: notes cascade upward, one per beat subdivision
const arpeggioUpPattern: RhythmPattern = {
  id: "arpeggio-up",
  label: "Arpeggio ↑",
  description: "Notes cascade upward",
  events: (notes, duration) => {
    if (notes.length === 0) return [];

    const noteCount = notes.length;
    const timeBetweenNotes = duration / noteCount;

    return notes.map((_, index) => ({
      offsetSeconds: index * timeBetweenNotes,
      noteIndices: [index],
    }));
  },
};

// ARPEGGIO DOWN: notes cascade downward
const arpeggioDownPattern: RhythmPattern = {
  id: "arpeggio-down",
  label: "Arpeggio ↓",
  description: "Notes cascade downward",
  events: (notes, duration) => {
    if (notes.length === 0) return [];

    const noteCount = notes.length;
    const timeBetweenNotes = duration / noteCount;

    return notes.map((_, index) => ({
      offsetSeconds: index * timeBetweenNotes,
      noteIndices: [noteCount - 1 - index], // highest to lowest
    }));
  },
};

// ARPEGGIO UP-DOWN: up to highest, back down
const arpeggioUpDownPattern: RhythmPattern = {
  id: "arpeggio-up-down",
  label: "Arpeggio ↑↓",
  description: "Up to the top, back down",
  events: (notes, duration) => {
    if (notes.length === 0) return [];

    const noteCount = notes.length;

    // A one-note chord has no meaningful direction change.
    // For larger chords, visit every note upward, then descend
    // through the interior notes without repeating the endpoints.
    const noteOrder =
      noteCount === 1
        ? [0]
        : [
            ...notes.map((_, index) => index),
            ...Array.from(
              { length: noteCount - 2 },
              (_, index) => noteCount - 2 - index
            ),
          ];
    const timeBetweenNotes = duration / noteOrder.length;

    return noteOrder.map((noteIndex, eventIndex) => ({
      offsetSeconds: eventIndex * timeBetweenNotes,
      noteIndices: [noteIndex],
    }));
  },
};

// STRUM DOWN: quick downward strum (tight clustering)
const strumDownPattern: RhythmPattern = {
  id: "strum-down",
  label: "Strum ↓",
  description: "Guitar strum down (tight cluster)",
  events: (notes, duration) => {
    if (notes.length === 0) return [];

    return [
      {
        offsetSeconds: duration * 0.1, // slight delay into the chord
        noteIndices: notes.map((_, i) => i), // all notes
        staggerMs: 15, // tight stagger: 15ms apart
      },
    ];
  },
};

// STRUM UP: quick upward strum
const strumUpPattern: RhythmPattern = {
  id: "strum-up",
  label: "Strum ↑",
  description: "Guitar strum up (tight cluster)",
  events: (notes, duration) => {
    if (notes.length === 0) return [];

    return [
      {
        offsetSeconds: duration * 0.1,
        noteIndices: notes
          .map((_, i) => i)
          .reverse(), // reverse order for upstrum
        staggerMs: 15,
      },
    ];
  },
};

// STRUM DOWN-UP: down then up
const strumDownUpPattern: RhythmPattern = {
  id: "strum-down-up",
  label: "Strum ↓↑",
  description: "Guitar strum down-up pattern",
  events: (notes, duration) => {
    if (notes.length === 0) return [];

    const quarter = duration / 4;

    return [
      {
        offsetSeconds: quarter * 1,
        noteIndices: notes.map((_, i) => i),
        staggerMs: 15,
      },
      {
        offsetSeconds: quarter * 2.5,
        noteIndices: notes
          .map((_, i) => i)
          .reverse(),
        staggerMs: 15,
      },
    ];
  },
};

// SYNCOPATED / CHARLESTON: hits on beats 1 and the "and" of 2
// (common in pop, funk, reggae)
const syncopatedPattern: RhythmPattern = {
  id: "syncopated",
  label: "Syncopated",
  description: "Beat 1 + off-beat rhythm (pop/reggae feel)",
  events: (notes, duration) => {
    if (notes.length === 0) return [];

    const half = duration / 2;

    return [
      {
        offsetSeconds: 0, // beat 1: all notes
        noteIndices: notes.map((_, i) => i),
      },
      {
        offsetSeconds: half * 1.5, // off-beat pulse within the chord
        noteIndices: [0], // lowest note
      },
    ];
  },
};

// CHARLESTON: energetic 1-2-and pattern (roaring 20s / swing)
const charlestonPattern: RhythmPattern = {
  id: "charleston",
  label: "Charleston",
  description: "Energetic 1-2-and rhythm (swing/jazz feel)",
  events: (notes, duration) => {
    if (notes.length === 0) return [];

    const quarter = duration / 4;

    return [
      {
        offsetSeconds: quarter * 0, // beat 1
        noteIndices: notes.map((_, i) => i),
      },
      {
        offsetSeconds: quarter * 1, // beat 2
        noteIndices: Array.from(
          {
            length: Math.ceil(notes.length / 2),
          },
          (_, index) => Math.ceil(notes.length / 2) - 1 - index
        ),
      },
      {
        offsetSeconds: quarter * 2.5, // off-beat pulse
        noteIndices: [0], // lowest note
      },
    ];
  },
};

const allPatterns: RhythmPattern[] = [
  blockPattern,
  arpeggioUpPattern,
  arpeggioDownPattern,
  arpeggioUpDownPattern,
  strumDownPattern,
  strumUpPattern,
  strumDownUpPattern,
  syncopatedPattern,
  charlestonPattern,
];

export function getPatterns(): RhythmPattern[] {
  return allPatterns;
}

export function getPattern(id: string): RhythmPattern | undefined {
  return allPatterns.find((p) => p.id === id);
}

export function getDefaultPatternId(): string {
  return "block"; // block is the traditional behavior
}

// Convenience function: given chord notes and a pattern,
// produce the list of playback events.
export function applyPattern(
  notes: string[],
  durationSeconds: number,
  pattern: RhythmPattern
): PatternEvent[] {
  return pattern.events(notes, durationSeconds);
}
