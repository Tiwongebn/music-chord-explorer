// ============================================================
// Play styles: genre-based presets that bundle pattern,
// tempo, swing, accents, and an optional bass layer.
//
// Each style combines:
// - A rhythmic pattern (how chord notes articulate)
// - Default tempo (seconds per beat)
// - Swing feel (shuffled offbeat timing)
// - Accent type (dynamic emphasis on beats)
// - Bass layer (root note played underneath at specific times)
//
// Public API:
//   getStyles()                  catalog of all styles
//   getStyle(id)                 fetch one by id
//   getDefaultStyleId()          fallback style
// ============================================================

import { TimedChord } from "../utils/audio";

export interface BassEvent {
  // Offset in seconds from the start of the chord's duration
  offsetSeconds: number;

  // Which beats to play bass note on (e.g., [0] for beat 1,
  // [0, 2] for beats 1 and 3)
  beatOffsets: number[];

  // Duration in seconds for each bass note
  noteDuration: number;

  // Volume boost in dB for bass notes (e.g., -3 for quieter)
  volume?: number;
}

export interface PlayStyle {
  id: string;
  label: string;
  description: string;
  category: "Jazz" | "Rock" | "Pop" | "Soul" | "Reggae" | "Classical";

  // Reference to existing rhythm pattern
  patternId: string;

  // Tempo: seconds per beat (e.g., 0.5 = 120 BPM, 1.0 = 60 BPM)
  defaultSecondsPerBeat: number;

  swingEnabled: boolean;
  swingRatio?: number; // default 2 for 2:1 shuffle

  accentType: "none" | "first-beat" | "first-measure";

  // Bass layer: function that defines when root notes play
  bassLayer: (
    rootNote: string,
    beats: number,
    durationSeconds: number
  ) => BassEvent[];
}

// ---- Bass layer definitions ----

// FOUR-ON-THE-FLOOR: bass hits every beat (steady, energetic)
function fourOnTheFloorBass(
  _rootNote: string,
  beats: number,
  durationSeconds: number
): BassEvent[] {
  if (beats === 0 || durationSeconds === 0) return [];

  const beatDuration = durationSeconds / beats;
  const beatOffsets = Array.from({ length: beats }, (_, i) => i);

  return [
    {
      offsetSeconds: 0,
      beatOffsets,
      noteDuration: beatDuration * 0.8,
      volume: -2,
    },
  ];
}

// HALF-TIME: bass hits on beats 1 and 3 (swing, jazz feel)
function halfTimeBass(
  _rootNote: string,
  beats: number,
  durationSeconds: number
): BassEvent[] {
  if (beats < 2) {
    // For 1-beat chords, just play at the start
    return [
      {
        offsetSeconds: 0,
        beatOffsets: [0],
        noteDuration: durationSeconds * 0.8,
        volume: -2,
      },
    ];
  }

  const beatDuration = durationSeconds / beats;
  const beatOffsets = Array.from(
    { length: Math.ceil(beats / 2) },
    (_, i) => i * 2
  ).filter((i) => i < beats);

  return [
    {
      offsetSeconds: 0,
      beatOffsets,
      noteDuration: beatDuration * 0.8,
      volume: -2,
    },
  ];
}

// OFFBEAT: bass hits on beats 2 and 4 (reggae, pop feel)
function offbeatBass(
  _rootNote: string,
  beats: number,
  durationSeconds: number
): BassEvent[] {
  if (beats < 2) return [];

  const beatDuration = durationSeconds / beats;
  const beatOffsets = Array.from(
    { length: Math.floor(beats / 2) },
    (_, i) => i * 2 + 1
  ).filter((i) => i < beats);

  if (beatOffsets.length === 0) return [];

  return [
    {
      offsetSeconds: 0,
      beatOffsets,
      noteDuration: beatDuration * 0.8,
      volume: -2,
    },
  ];
}

// WALKING: bass hits every beat, slightly lower volume (subtle)
function walkingBass(
  _rootNote: string,
  beats: number,
  durationSeconds: number
): BassEvent[] {
  if (beats === 0) return [];

  const beatDuration = durationSeconds / beats;
  const beatOffsets = Array.from({ length: beats }, (_, i) => i);

  return [
    {
      offsetSeconds: 0,
      beatOffsets,
      noteDuration: beatDuration * 0.7,
      volume: -4,
    },
  ];
}

// NO BASS: silent bass layer (for styles that don't want bass)
function noBass(): BassEvent[] {
  return [];
}

// ---- Style catalog ----

const playStyles: PlayStyle[] = [
  // JAZZ
  {
    id: "jazz-cool",
    label: "Jazz: Cool",
    description: "Smooth, walking bass with soft accents",
    category: "Jazz",
    patternId: "block",
    defaultSecondsPerBeat: 0.67, // ~90 BPM
    swingEnabled: true,
    swingRatio: 2,
    accentType: "none",
    bassLayer: walkingBass,
  },

  {
    id: "jazz-swing",
    label: "Jazz: Swing",
    description: "Classic swing with emphasis on beats 1 & 3",
    category: "Jazz",
    patternId: "charleston",
    defaultSecondsPerBeat: 0.75, // ~80 BPM
    swingEnabled: true,
    swingRatio: 2,
    accentType: "first-beat",
    bassLayer: halfTimeBass,
  },

  {
    id: "jazz-bebop",
    label: "Jazz: Bebop",
    description: "Fast, articulated bebop with arpeggio feel",
    category: "Jazz",
    patternId: "arpeggio-up",
    defaultSecondsPerBeat: 0.4, // ~150 BPM
    swingEnabled: true,
    swingRatio: 2,
    accentType: "first-beat",
    bassLayer: walkingBass,
  },

  {
    id: "jazz-ballad",
    label: "Jazz: Ballad",
    description: "Slow, legato ballad with gentle bass pulse",
    category: "Jazz",
    patternId: "block",
    defaultSecondsPerBeat: 1.2, // ~50 BPM
    swingEnabled: false,
    accentType: "none",
    bassLayer: walkingBass,
  },

  // ROCK
  {
    id: "rock-power",
    label: "Rock: Power Chords",
    description: "Heavy, driving rock with 4-on-the-floor bass",
    category: "Rock",
    patternId: "block",
    defaultSecondsPerBeat: 0.5, // ~120 BPM
    swingEnabled: false,
    accentType: "first-beat",
    bassLayer: fourOnTheFloorBass,
  },

  {
    id: "rock-strum",
    label: "Rock: Acoustic Strum",
    description: "Guitar-driven with strum pattern and half-time bass",
    category: "Rock",
    patternId: "strum-down-up",
    defaultSecondsPerBeat: 0.57, // ~105 BPM
    swingEnabled: false,
    accentType: "first-measure",
    bassLayer: halfTimeBass,
  },

  {
    id: "rock-progressive",
    label: "Rock: Progressive",
    description: "Complex rhythms with syncopation and bass hits",
    category: "Rock",
    patternId: "syncopated",
    defaultSecondsPerBeat: 0.6, // ~100 BPM
    swingEnabled: false,
    accentType: "first-measure",
    bassLayer: offbeatBass,
  },

  // POP
  {
    id: "pop-standard",
    label: "Pop: Standard",
    description: "Classic pop feel with steady 4-on-the-floor",
    category: "Pop",
    patternId: "block",
    defaultSecondsPerBeat: 0.55, // ~109 BPM
    swingEnabled: false,
    accentType: "first-beat",
    bassLayer: fourOnTheFloorBass,
  },

  {
    id: "pop-ballad",
    label: "Pop: Ballad",
    description: "Slow, emotional pop ballad",
    category: "Pop",
    patternId: "block",
    defaultSecondsPerBeat: 1.0, // ~60 BPM
    swingEnabled: false,
    accentType: "none",
    bassLayer: halfTimeBass,
  },

  {
    id: "pop-upbeat",
    label: "Pop: Upbeat",
    description: "Bright, energetic pop with syncopation",
    category: "Pop",
    patternId: "syncopated",
    defaultSecondsPerBeat: 0.48, // ~125 BPM
    swingEnabled: false,
    accentType: "first-beat",
    bassLayer: fourOnTheFloorBass,
  },

  // SOUL
  {
    id: "soul-classic",
    label: "Soul: Classic",
    description: "Soulful groove with off-beat emphasis",
    category: "Soul",
    patternId: "syncopated",
    defaultSecondsPerBeat: 0.6, // ~100 BPM
    swingEnabled: true,
    swingRatio: 2,
    accentType: "first-beat",
    bassLayer: offbeatBass,
  },

  {
    id: "soul-ballad",
    label: "Soul: Ballad",
    description: "Deep, slow soul ballad",
    category: "Soul",
    patternId: "block",
    defaultSecondsPerBeat: 1.1, // ~55 BPM
    swingEnabled: false,
    accentType: "none",
    bassLayer: walkingBass,
  },

  // REGGAE
  {
    id: "reggae-steady",
    label: "Reggae: Steady",
    description: "Classic reggae with off-beat bass (skank rhythm)",
    category: "Reggae",
    patternId: "syncopated",
    defaultSecondsPerBeat: 0.64, // ~94 BPM
    swingEnabled: false,
    accentType: "first-beat",
    bassLayer: offbeatBass,
  },

  {
    id: "reggae-dub",
    label: "Reggae: Dub",
    description: "Spacious dub reggae with sparse bass hits",
    category: "Reggae",
    patternId: "block",
    defaultSecondsPerBeat: 0.8, // ~75 BPM
    swingEnabled: false,
    accentType: "none",
    bassLayer: halfTimeBass,
  },

  // CLASSICAL
  {
    id: "classical-waltz",
    label: "Classical: Waltz",
    description: "3/4 waltz with gentle bass on beat 1",
    category: "Classical",
    patternId: "block",
    defaultSecondsPerBeat: 0.75, // ~80 BPM
    swingEnabled: false,
    accentType: "none",
    bassLayer: (_, beats, duration) => [
      {
        offsetSeconds: 0,
        beatOffsets: [0],
        noteDuration: duration * 0.5,
        volume: -3,
      },
    ],
  },

  {
    id: "classical-sonata",
    label: "Classical: Sonata",
    description: "Formal classical with arpeggiation",
    category: "Classical",
    patternId: "arpeggio-up-down",
    defaultSecondsPerBeat: 0.67, // ~90 BPM
    swingEnabled: false,
    accentType: "none",
    bassLayer: walkingBass,
  },
];

export function getStyles(): PlayStyle[] {
  return playStyles;
}

export function getStyle(id: string): PlayStyle | undefined {
  return playStyles.find((s) => s.id === id);
}

export function getDefaultStyleId(): string {
  return "pop-standard";
}

export function getStylesByCategory(
  category: PlayStyle["category"]
): PlayStyle[] {
  return playStyles.filter((s) => s.category === category);
}
