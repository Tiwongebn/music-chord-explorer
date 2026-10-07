// ============================================================
// Backing track: drums + accompaniment for full rhythm section.
//
// Each backing track style contains:
// - Drum pattern (kick, snare, hi-hat)
// - Accompaniment pattern (chordal comping, fills)
// - Per-beat dynamics and timing
//
// Public API:
//   getBackingTrack(styleId)  fetch backing track for a style
// ============================================================

export interface DrumHit {
  // Time offset in seconds from chord start
  offsetSeconds: number;
  
  // Which drum: 'kick', 'snare', 'hihat', 'tom', 'crash'
  drum: 'kick' | 'snare' | 'hihat' | 'tom' | 'crash';
  
  // Duration in seconds
  duration: number;
  
  // Volume in dB (e.g., -2 for normal, 0 for loud, -6 for quiet)
  volume?: number;
  
  // Frequency for synth drums (optional, for kick/tom)
  frequency?: number;
}

export interface AccompanimentNote {
  // Time offset in seconds from chord start
  offsetSeconds: number;
  
  // Scale degree relative to chord root (0=root, 1=third, 2=fifth, etc.)
  // Used to derive actual note from the current harmony
  degreeOffset: number;
  
  // Which octave relative to melody (e.g., -1 = one octave down)
  octaveOffset: number;
  
  // Duration in seconds
  duration: number;
  
  // Volume in dB
  volume?: number;
}

export interface DrumPattern {
  // Offset in seconds from chord start
  offsetSeconds: number;
  
  // All drum hits in this chord duration
  hits: DrumHit[];
}

export interface AccompanimentPattern {
  // Offset in seconds from chord start
  offsetSeconds: number;
  
  // All accompaniment notes in this chord duration
  notes: AccompanimentNote[];
}

export interface BackingTrack {
  id: string;
  label: string;
  
  // Returns drum hits for a chord of specified duration
  drumPattern: (durationSeconds: number) => DrumPattern;
  
  // Returns accompaniment notes for a chord of specified duration
  // Receives the chord notes so it can derive comping patterns
  accompanimentPattern: (
    chordNotes: string[],
    durationSeconds: number
  ) => AccompanimentPattern;
}

// ---- Drum synth frequencies (Hz) ----
// Using standard kick/tom tuning for familiarity

const KICK_FREQ = 60; // Low, punchy
const TOM_MID_FREQ = 150; // Mid tom
const TOM_HIGH_FREQ = 200; // High tom

// ---- Drum pattern builders ----

// FOUR-ON-THE-FLOOR: kick hits every beat, snare on 2 & 4, hi-hat steady
function fourOnTheFloorDrums(
  durationSeconds: number,
  beatsPerChord: number = 4
): DrumPattern {
  const beatDuration = durationSeconds / beatsPerChord;
  const hits: DrumHit[] = [];

  for (let beat = 0; beat < beatsPerChord; beat++) {
    const beatTime = beat * beatDuration;

    // Kick on every beat
    hits.push({
      offsetSeconds: beatTime,
      drum: 'kick',
      duration: beatDuration * 0.5,
      volume: -1,
      frequency: KICK_FREQ,
    });

    // Snare on 2 and 4
    if (beat === 1 || beat === 3) {
      hits.push({
        offsetSeconds: beatTime + beatDuration * 0.02,
        drum: 'snare',
        duration: beatDuration * 0.3,
        volume: 0,
      });
    }

    // Hi-hat on every eighth note
    for (let eighth = 0; eighth < 2; eighth++) {
      const hatTime = beatTime + (eighth * beatDuration) / 2;
      hits.push({
        offsetSeconds: hatTime,
        drum: 'hihat',
        duration: beatDuration * 0.1,
        volume: -4,
      });
    }
  }

  return { offsetSeconds: 0, hits };
}

// HALF-TIME ROCK: kick on 1 & 3, snare on 2 & 4, sparser hi-hat
function halfTimeRockDrums(
  durationSeconds: number,
  beatsPerChord: number = 4
): DrumPattern {
  const beatDuration = durationSeconds / beatsPerChord;
  const hits: DrumHit[] = [];

  for (let beat = 0; beat < beatsPerChord; beat++) {
    const beatTime = beat * beatDuration;

    // Kick on 1 and 3 (on-beat)
    if (beat === 0 || beat === 2) {
      hits.push({
        offsetSeconds: beatTime,
        drum: 'kick',
        duration: beatDuration * 0.6,
        volume: 0,
        frequency: KICK_FREQ,
      });
    }

    // Snare on 2 and 4 (backbeat)
    if (beat === 1 || beat === 3) {
      hits.push({
        offsetSeconds: beatTime,
        drum: 'snare',
        duration: beatDuration * 0.35,
        volume: 0,
      });
    }

    // Hi-hat on quarter notes only
    hits.push({
      offsetSeconds: beatTime,
      drum: 'hihat',
      duration: beatDuration * 0.15,
      volume: -3,
    });
  }

  return { offsetSeconds: 0, hits };
}

// JAZZ SWING: ride cymbal feel (simulated with hi-hat), lighter kick/snare
function jazzSwingDrums(
  durationSeconds: number,
  beatsPerChord: number = 4
): DrumPattern {
  const beatDuration = durationSeconds / beatsPerChord;
  const hits: DrumHit[] = [];

  for (let beat = 0; beat < beatsPerChord; beat++) {
    const beatTime = beat * beatDuration;

    // Light kick on 1 and 3
    if (beat === 0 || beat === 2) {
      hits.push({
        offsetSeconds: beatTime,
        drum: 'kick',
        duration: beatDuration * 0.4,
        volume: -3,
        frequency: KICK_FREQ,
      });
    }

    // Snare on 2 and 4
    if (beat === 1 || beat === 3) {
      hits.push({
        offsetSeconds: beatTime + beatDuration * 0.01,
        drum: 'snare',
        duration: beatDuration * 0.25,
        volume: -1,
      });
    }

    // Ride cymbal (hi-hat swing feel): triplet on each beat
    for (let triplet = 0; triplet < 3; triplet++) {
      const hatTime = beatTime + (triplet * beatDuration) / 3;
      const volume = triplet === 1 ? -5 : -3; // Center note quieter
      hits.push({
        offsetSeconds: hatTime,
        drum: 'hihat',
        duration: beatDuration * 0.1,
        volume,
      });
    }
  }

  return { offsetSeconds: 0, hits };
}

// REGGAE SKANK: syncopated offbeat kick/snare, steady hi-hat
function reggaeSankDrums(
  durationSeconds: number,
  beatsPerChord: number = 4
): DrumPattern {
  const beatDuration = durationSeconds / beatsPerChord;
  const hits: DrumHit[] = [];

  for (let beat = 0; beat < beatsPerChord; beat++) {
    const beatTime = beat * beatDuration;

    // Kick on 1 only (skank feel)
    if (beat === 0) {
      hits.push({
        offsetSeconds: beatTime,
        drum: 'kick',
        duration: beatDuration * 0.4,
        volume: -2,
        frequency: KICK_FREQ,
      });
    }

    // Snare hits on offbeat (2.5 and 3.5)
    if (beat === 1 || beat === 2) {
      hits.push({
        offsetSeconds: beatTime + beatDuration * 0.5,
        drum: 'snare',
        duration: beatDuration * 0.25,
        volume: -2,
      });
    }

    // Steady hi-hat quarter notes
    hits.push({
      offsetSeconds: beatTime,
      drum: 'hihat',
      duration: beatDuration * 0.12,
      volume: -2,
    });
  }

  return { offsetSeconds: 0, hits };
}

// SOUL GROOVE: syncopated kick, strong snare backbeat, ghost snare hits
function soulGrooveDrums(
  durationSeconds: number,
  beatsPerChord: number = 4
): DrumPattern {
  const beatDuration = durationSeconds / beatsPerChord;
  const hits: DrumHit[] = [];

  for (let beat = 0; beat < beatsPerChord; beat++) {
    const beatTime = beat * beatDuration;

    // Syncopated kick: 1, 1.5, 3, 3.5 (syncopated feel)
    if (beat === 0) {
      // Kick on 1
      hits.push({
        offsetSeconds: beatTime,
        drum: 'kick',
        duration: beatDuration * 0.4,
        volume: -1,
        frequency: KICK_FREQ,
      });

      // Kick on 1.5 (syncopated)
      hits.push({
        offsetSeconds: beatTime + beatDuration * 0.5,
        drum: 'kick',
        duration: beatDuration * 0.3,
        volume: -3,
        frequency: KICK_FREQ,
      });
    }

    if (beat === 2) {
      // Kick on 3
      hits.push({
        offsetSeconds: beatTime,
        drum: 'kick',
        duration: beatDuration * 0.4,
        volume: -1,
        frequency: KICK_FREQ,
      });

      // Kick on 3.5 (syncopated)
      hits.push({
        offsetSeconds: beatTime + beatDuration * 0.5,
        drum: 'kick',
        duration: beatDuration * 0.3,
        volume: -3,
        frequency: KICK_FREQ,
      });
    }

    // Strong snare on 2 and 4
    if (beat === 1 || beat === 3) {
      hits.push({
        offsetSeconds: beatTime,
        drum: 'snare',
        duration: beatDuration * 0.3,
        volume: 1,
      });

      // Ghost snare hits (quiet) on the syncopation
      hits.push({
        offsetSeconds: beatTime + beatDuration * 0.5,
        drum: 'snare',
        duration: beatDuration * 0.2,
        volume: -6,
      });
    }

    // Hi-hat steady eighth notes
    for (let eighth = 0; eighth < 2; eighth++) {
      const hatTime = beatTime + (eighth * beatDuration) / 2;
      hits.push({
        offsetSeconds: hatTime,
        drum: 'hihat',
        duration: beatDuration * 0.1,
        volume: -2,
      });
    }
  }

  return { offsetSeconds: 0, hits };
}

// CLASSICAL WALTZ (3/4): kick on 1, light snare on 2 & 3
function classicalWaltzDrums(
  durationSeconds: number,
  beatsPerChord: number = 3
): DrumPattern {
  const beatDuration = durationSeconds / beatsPerChord;
  const hits: DrumHit[] = [];

  for (let beat = 0; beat < beatsPerChord; beat++) {
    const beatTime = beat * beatDuration;

    // Kick on beat 1 (strong)
    if (beat === 0) {
      hits.push({
        offsetSeconds: beatTime,
        drum: 'kick',
        duration: beatDuration * 0.5,
        volume: -1,
        frequency: KICK_FREQ,
      });
    }

    // Light snare on 2 and 3
    if (beat === 1 || beat === 2) {
      hits.push({
        offsetSeconds: beatTime,
        drum: 'snare',
        duration: beatDuration * 0.25,
        volume: -2,
      });
    }
  }

  return { offsetSeconds: 0, hits };
}

// ---- Accompaniment pattern builders ----

// JAZZ COMPING: sparse, syncopated chord hits with variety
function jazzComping(
  chordNotes: string[],
  durationSeconds: number
): AccompanimentPattern {
  const notes: AccompanimentNote[] = [];

  if (chordNotes.length === 0) {
    return { offsetSeconds: 0, notes };
  }

  // Typical jazz comping: hits on and around the backbeat
  // Chord on beat 2 (offset), chord voicing on beat 3 or 4

  // Hit on beat 2 (offset by a bit for swing feel)
  notes.push({
    offsetSeconds: durationSeconds * 0.45,
    degreeOffset: 2, // Fifth (rootless voicing)
    octaveOffset: -1,
    duration: durationSeconds * 0.3,
    volume: -3,
  });

  // Hit on beat 3 or 4
  notes.push({
    offsetSeconds: durationSeconds * 0.68,
    degreeOffset: 1, // Third
    octaveOffset: -1,
    duration: durationSeconds * 0.25,
    volume: -4,
  });

  return { offsetSeconds: 0, notes };
}

// ROCK COMPING: fuller chords, on-beat emphasis
function rockComping(
  chordNotes: string[],
  durationSeconds: number
): AccompanimentPattern {
  const notes: AccompanimentNote[] = [];

  if (chordNotes.length === 0) {
    return { offsetSeconds: 0, notes };
  }

  // Rock: chord on beat 1, hit on beat 3
  notes.push({
    offsetSeconds: durationSeconds * 0.05,
    degreeOffset: 0, // Root
    octaveOffset: -1,
    duration: durationSeconds * 0.4,
    volume: -2,
  });

  notes.push({
    offsetSeconds: durationSeconds * 0.5,
    degreeOffset: 2, // Fifth
    octaveOffset: -1,
    duration: durationSeconds * 0.35,
    volume: -3,
  });

  return { offsetSeconds: 0, notes };
}

// POP COMPING: bright, steady rhythm hits
function popComping(
  chordNotes: string[],
  durationSeconds: number
): AccompanimentPattern {
  const notes: AccompanimentNote[] = [];

  if (chordNotes.length === 0) {
    return { offsetSeconds: 0, notes };
  }

  // Pop: hits on beat 1 and beat 3
  notes.push({
    offsetSeconds: durationSeconds * 0.02,
    degreeOffset: 0, // Root
    octaveOffset: -1,
    duration: durationSeconds * 0.35,
    volume: -1,
  });

  notes.push({
    offsetSeconds: durationSeconds * 0.5,
    degreeOffset: 2, // Fifth
    octaveOffset: -1,
    duration: durationSeconds * 0.35,
    volume: -2,
  });

  // Extra hit on beat 2 and 4 for energy
  notes.push({
    offsetSeconds: durationSeconds * 0.25,
    degreeOffset: 1, // Third
    octaveOffset: -1,
    duration: durationSeconds * 0.2,
    volume: -3,
  });

  notes.push({
    offsetSeconds: durationSeconds * 0.75,
    degreeOffset: 1, // Third
    octaveOffset: -1,
    duration: durationSeconds * 0.2,
    volume: -3,
  });

  return { offsetSeconds: 0, notes };
}

// SOUL COMPING: groovy, syncopated hits
function soulComping(
  chordNotes: string[],
  durationSeconds: number
): AccompanimentPattern {
  const notes: AccompanimentNote[] = [];

  if (chordNotes.length === 0) {
    return { offsetSeconds: 0, notes };
  }

  // Soul: syncopated hits with emphasis on backbeat
  notes.push({
    offsetSeconds: durationSeconds * 0.08,
    degreeOffset: 0, // Root
    octaveOffset: -1,
    duration: durationSeconds * 0.35,
    volume: -1,
  });

  // Syncopated hit on 2
  notes.push({
    offsetSeconds: durationSeconds * 0.48,
    degreeOffset: 2, // Fifth
    octaveOffset: -1,
    duration: durationSeconds * 0.25,
    volume: -2,
  });

  notes.push({
    offsetSeconds: durationSeconds * 0.6,
    degreeOffset: 1, // Third
    octaveOffset: -1,
    duration: durationSeconds * 0.2,
    volume: -3,
  });

  return { offsetSeconds: 0, notes };
}

// REGGAE COMPING: minimal, spacious hits
function reggaeComping(
  chordNotes: string[],
  durationSeconds: number
): AccompanimentPattern {
  const notes: AccompanimentNote[] = [];

  if (chordNotes.length === 0) {
    return { offsetSeconds: 0, notes };
  }

  // Reggae: sparse, offbeat emphasis
  notes.push({
    offsetSeconds: durationSeconds * 0.5,
    degreeOffset: 0, // Root
    octaveOffset: -1,
    duration: durationSeconds * 0.3,
    volume: -2,
  });

  return { offsetSeconds: 0, notes };
}

// CLASSICAL COMPING: arpeggiated figures
function classicalComping(
  chordNotes: string[],
  durationSeconds: number
): AccompanimentPattern {
  const notes: AccompanimentNote[] = [];

  if (chordNotes.length === 0) {
    return { offsetSeconds: 0, notes };
  }

  // Classical: broken chord pattern (Alberti bass-like)
  // Root, Fifth, Third, Fifth in sequence
  const times = [0.0, 0.25, 0.5, 0.75];
  const degrees = [0, 2, 1, 2]; // Root, Fifth, Third, Fifth

  for (let i = 0; i < times.length; i++) {
    notes.push({
      offsetSeconds: durationSeconds * times[i],
      degreeOffset: degrees[i],
      octaveOffset: -1,
      duration: durationSeconds * 0.15,
      volume: -3,
    });
  }

  return { offsetSeconds: 0, notes };
}

// ---- Backing track catalog ----
// Maps to play style IDs, so each style gets matching drums + accompaniment

const backingTracks: Record<string, BackingTrack> = {
  'jazz-cool': {
    id: 'jazz-cool',
    label: 'Jazz: Cool (Backing)',
    drumPattern: jazzSwingDrums,
    accompanimentPattern: jazzComping,
  },

  'jazz-swing': {
    id: 'jazz-swing',
    label: 'Jazz: Swing (Backing)',
    drumPattern: jazzSwingDrums,
    accompanimentPattern: jazzComping,
  },

  'jazz-bebop': {
    id: 'jazz-bebop',
    label: 'Jazz: Bebop (Backing)',
    drumPattern: jazzSwingDrums,
    accompanimentPattern: jazzComping,
  },

  'jazz-ballad': {
    id: 'jazz-ballad',
    label: 'Jazz: Ballad (Backing)',
    drumPattern: (duration) => {
      // Ballad: very sparse, minimal drums
      const beatDuration = duration / 4;
      return {
        offsetSeconds: 0,
        hits: [
          {
            offsetSeconds: 0,
            drum: 'kick',
            duration: beatDuration * 0.5,
            volume: -3,
            frequency: KICK_FREQ,
          },
          {
            offsetSeconds: duration * 0.5,
            drum: 'snare',
            duration: beatDuration * 0.25,
            volume: -2,
          },
        ],
      };
    },
    accompanimentPattern: jazzComping,
  },

  'rock-power': {
    id: 'rock-power',
    label: 'Rock: Power Chords (Backing)',
    drumPattern: fourOnTheFloorDrums,
    accompanimentPattern: rockComping,
  },

  'rock-strum': {
    id: 'rock-strum',
    label: 'Rock: Acoustic Strum (Backing)',
    drumPattern: halfTimeRockDrums,
    accompanimentPattern: rockComping,
  },

  'rock-progressive': {
    id: 'rock-progressive',
    label: 'Rock: Progressive (Backing)',
    drumPattern: halfTimeRockDrums,
    accompanimentPattern: rockComping,
  },

  'pop-standard': {
    id: 'pop-standard',
    label: 'Pop: Standard (Backing)',
    drumPattern: fourOnTheFloorDrums,
    accompanimentPattern: popComping,
  },

  'pop-ballad': {
    id: 'pop-ballad',
    label: 'Pop: Ballad (Backing)',
    drumPattern: halfTimeRockDrums,
    accompanimentPattern: popComping,
  },

  'pop-upbeat': {
    id: 'pop-upbeat',
    label: 'Pop: Upbeat (Backing)',
    drumPattern: fourOnTheFloorDrums,
    accompanimentPattern: popComping,
  },

  'soul-classic': {
    id: 'soul-classic',
    label: 'Soul: Classic (Backing)',
    drumPattern: soulGrooveDrums,
    accompanimentPattern: soulComping,
  },

  'soul-ballad': {
    id: 'soul-ballad',
    label: 'Soul: Ballad (Backing)',
    drumPattern: (duration) => {
      // Ballad: minimal
      const beatDuration = duration / 4;
      return {
        offsetSeconds: 0,
        hits: [
          {
            offsetSeconds: 0,
            drum: 'kick',
            duration: beatDuration * 0.5,
            volume: -3,
            frequency: KICK_FREQ,
          },
          {
            offsetSeconds: duration * 0.5,
            drum: 'snare',
            duration: beatDuration * 0.25,
            volume: -2,
          },
        ],
      };
    },
    accompanimentPattern: soulComping,
  },

  'reggae-steady': {
    id: 'reggae-steady',
    label: 'Reggae: Steady (Backing)',
    drumPattern: reggaeSankDrums,
    accompanimentPattern: reggaeComping,
  },

  'reggae-dub': {
    id: 'reggae-dub',
    label: 'Reggae: Dub (Backing)',
    drumPattern: (duration) => {
      // Dub: sparse, spacious
      const beatDuration = duration / 4;
      return {
        offsetSeconds: 0,
        hits: [
          {
            offsetSeconds: 0,
            drum: 'kick',
            duration: beatDuration * 0.4,
            volume: -2,
            frequency: KICK_FREQ,
          },
          {
            offsetSeconds: duration * 0.5,
            drum: 'snare',
            duration: beatDuration * 0.25,
            volume: -3,
          },
        ],
      };
    },
    accompanimentPattern: reggaeComping,
  },

  'classical-waltz': {
    id: 'classical-waltz',
    label: 'Classical: Waltz (Backing)',
    drumPattern: classicalWaltzDrums,
    accompanimentPattern: classicalComping,
  },

  'classical-sonata': {
    id: 'classical-sonata',
    label: 'Classical: Sonata (Backing)',
    drumPattern: (duration) => {
      // Sonata: moderate tempo, clear rhythm
      const beatDuration = duration / 4;
      const hits: DrumHit[] = [];

      for (let beat = 0; beat < 4; beat++) {
        const beatTime = beat * beatDuration;

        // Kick on 1 and 3
        if (beat === 0 || beat === 2) {
          hits.push({
            offsetSeconds: beatTime,
            drum: 'kick',
            duration: beatDuration * 0.4,
            volume: -2,
            frequency: KICK_FREQ,
          });
        }

        // Snare on 2 and 4
        if (beat === 1 || beat === 3) {
          hits.push({
            offsetSeconds: beatTime,
            drum: 'snare',
            duration: beatDuration * 0.25,
            volume: -1,
          });
        }
      }

      return { offsetSeconds: 0, hits };
    },
    accompanimentPattern: classicalComping,
  },
};

export function getBackingTrack(styleId: string): BackingTrack | undefined {
  return backingTracks[styleId];
}

export function getAllBackingTracks(): BackingTrack[] {
  return Object.values(backingTracks);
}
