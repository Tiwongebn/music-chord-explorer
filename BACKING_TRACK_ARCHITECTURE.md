# Backing Track Architecture

## System Overview

The backing track system provides a complete rhythm section (drums + accompaniment) that enhances chord progressions with musical context. It integrates with the existing play styles system to deliver genre-authentic performances.

```
┌─────────────────────────────────────────────────────────┐
│  User selects play style (e.g., "Jazz: Swing")          │
└──────────────────────┬──────────────────────────────────┘
                       │
                       v
        ┌──────────────────────────────┐
        │ getBackingTrack(styleId)     │
        │ (from backingTrack.ts)       │
        └──────────┬───────────────────┘
                   │
        ┌──────────┴──────────┐
        v                     v
   ┌─────────────┐    ┌──────────────────┐
   │ drumPattern │    │ accompanimentPattern│
   └──────┬──────┘    └─────────┬────────┘
          │                     │
          v                     v
    playDrumHits()     playAccompanimentNotes()
    (backingTrack      (backingTrack
     Player.ts)        Player.ts)
          │                     │
          v                     v
    ┌───────────┐        ┌─────────────┐
    │ Tone.Synth│        │ Piano       │
    │ Drums     │        │ Sampler     │
    └───────────┘        └─────────────┘
          │                     │
          └────────────┬────────┘
                       v
                  ┌─────────┐
                  │  Audio  │
                  │  Output │
                  └─────────┘
```

## Data Flow

### 1. Play Style Selection

User selects a play style via dropdown in ChordProgressions component:
```typescript
const handleApplyStyle = (styleIdToApply: string) => {
  setStyleId(styleIdToApply);  // e.g., "jazz-swing"
  setPatternId(style.patternId);
  setChordSeconds(style.defaultSecondsPerBeat);
  setSwingEnabled(style.swingEnabled);
  setAccentType(style.accentType);
};
```

### 2. Backing Track Retrieval

When play button is clicked, backing track is fetched:
```typescript
const handlePlaySnapshotList = (chords: ProgressionChord[]) => {
  const backingTrack = getBackingTrack(styleId);  // NEW
  playTimedProgression(toTimedChords(chords), secondsPerBeat, {
    pattern,
    bassLayer: style?.bassLayer,
    backingTrack,  // NEW
  });
};
```

### 3. Chord Iteration

For each chord in progression, audio plays:
```typescript
for (const chord of chords) {
  const duration = chord.beats * secondsPerBeat;
  
  // Existing: melody via pattern
  playNote(`${note}4`, { when, duration });
  
  // Existing: bass layer
  playBassNote(rootNote, when, duration);
  
  // NEW: backing track
  if (backingTrack && !chord.isRest && chord.rootNote) {
    const drumPattern = backingTrack.drumPattern(duration);
    playDrumHits(drumPattern.hits, when);
    
    const accompPattern = backingTrack.accompanimentPattern(
      chord.notes,
      duration
    );
    playAccompanimentNotes(accompPattern.notes, chord.rootNote, when);
  }
}
```

### 4. Drum Synthesis

Each drum hit scheduled at precise time:
```typescript
export async function playDrumHits(
  hits: DrumHit[],
  baseWhen: number = 0
): Promise<void> {
  for (const hit of hits) {
    const when = baseWhen + hit.offsetSeconds;
    
    switch (hit.drum) {
      case "kick":
        await playKick(when, hit.duration, hit.frequency, hit.volume);
        break;
      case "snare":
        await playSnare(when, hit.duration, hit.volume);
        break;
      case "hihat":
        await playHihat(when, hit.duration, hit.volume);
        break;
    }
  }
}
```

### 5. Accompaniment Synthesis

Degree offsets converted to MIDI notes:
```typescript
export async function playAccompanimentNotes(
  notes: AccompanimentNote[],
  chordRootNote: string,
  baseWhen: number = 0
): Promise<void> {
  for (const note of notes) {
    // Map degree offset to semitones
    const semitones = degreeToSemitones[note.degreeOffset]; // e.g., 4 for third
    const targetMidi = rootMidi + semitones + octaveOffset * 12;
    const targetNote = Tone.Frequency(targetMidi, "midi").toNote();
    
    // Play via piano sampler
    await playNote(targetNote, {
      when: baseWhen + note.offsetSeconds,
      duration: note.duration,
      volume: note.volume,
    });
  }
}
```

## Pattern Catalog

### Drum Patterns

Each pattern returns a `DrumPattern` with timestamped `DrumHit[]`:

#### Four-on-the-Floor (Rock, Pop)
```
Beat:  1          2          3          4
Kick:  X          X          X          X          (every beat)
Snare:            X                     X          (2 & 4)
Hat:   X  X  X  X X  X  X  X X  X  X  X X  X  X  (eighth notes)
```

#### Half-Time Rock (Rock Progressive)
```
Beat:  1          2          3          4
Kick:  X                     X                    (1 & 3)
Snare:            X                     X         (2 & 4)
Hat:   X          X          X          X         (quarter notes)
```

#### Jazz Swing (Jazz styles)
```
Beat:  1          2          3          4
Kick:  X    (light)         X    (light)         (1 & 3, -3dB)
Snare:            X                     X        (2 & 4, -1dB)
Hat:   X  X  X  X  X  X  X  X X  X  X  X X  X  X (triplet feel)
```

#### Reggae Skank (Reggae Steady)
```
Beat:  1          2     3          4     
Kick:  X                                          (1 only)
Snare:                  X                  X      (offbeat 2.5 & 3.5)
Hat:   X          X          X          X        (quarter notes)
```

#### Soul Groove (Soul styles)
```
Beat:  1    1.5  2    2.5  3    3.5  4    4.5
Kick:  X    X         X    X                    (syncopated)
Snare:           X    X         X    X          (backbeat + ghost)
Hat:   X  X  X  X X  X  X  X X  X  X  X X  X  X (eighth notes)
```

#### Classical Waltz (Classical, 3/4)
```
Beat:  1          2          3
Kick:  X                               (beat 1 only)
Snare:            X          X         (2 & 3)
```

### Accompaniment Patterns

Each pattern returns `AccompanimentNote[]` with degree offsets:

#### Jazz Comping
```
Degree:        0(Root)  1(Third)  2(Fifth)
Timing:                                
Beat 2:               X (-3dB)
Beat 3-4:                     X (-4dB)
Character: Sparse, syncopated, behind-the-beat
```

#### Rock Comping
```
Beat 1:  X (Root, -2dB)
Beat 3:        X (Fifth, -3dB)
Character: Bold, on-beat, straightforward
```

#### Pop Comping
```
Beat 1:  X (Root, -1dB)
Beat 2:        X (Third, -3dB)
Beat 3:              X (Fifth, -2dB)
Beat 4:                   X (Third, -3dB)
Character: Bright, energetic, fills all beats
```

#### Soul Comping
```
Beat 1:   X (Root, -1dB)
Beat 2:       X (Fifth, -2dB)
Beat 2.5:          X (Third, -3dB)
Character: Groovy, syncopated, with ghost hits
```

#### Reggae Comping
```
Beat 2.5: X (Root, -2dB)
Character: Minimal, spacious, skank feel
```

#### Classical Comping
```
Alberti Bass Pattern:
Root → Fifth → Third → Fifth (repeated)
Timing: 0%, 25%, 50%, 75% of chord duration
Character: Broken chord, arpeggiated, elegant
```

## Module Dependencies

```
ChordProgressions.tsx
    ├─ getBackingTrack()          (from backingTrack.ts)
    ├─ playTimedProgression()     (from audio.ts)
    └─ playTimedProgressionLoop() (from audio.ts)
            │
            ├─ playDrumHits()        (from backingTrackPlayer.ts)
            ├─ playAccompanimentNotes() (from backingTrackPlayer.ts)
            └─ playNote()             (from audio.ts)
```

## Timing Architecture

All playback uses Tone.js's `Tone.now()` for precise synchronization:

```typescript
// Chord 1: C major, 4 beats, 0.5s per beat = 2s total
when = 0s
  kick:           0.0s, 0.5s, 1.0s, 1.5s (every beat)
  snare:          0.5s, 1.5s (2 & 4)
  melody:         0.0s (all notes of chord)
  bass:           0.0s, 0.5s, 1.0s, 1.5s
  accompaniment:  0.9s, 1.7s (jazz comping on offbeat)

// Chord 2: F major, 2 beats, 0.5s per beat = 1s total
when = 2s
  kick:           2.0s, 2.5s
  snare:          2.5s
  melody:         2.0s
  bass:           2.0s, 2.5s
  accompaniment:  2.45s, 2.85s
```

## Volume Mixing

Default dB offsets (relative to piano melody at 0 dB):

| Element | Default | Range | Notes |
|---------|---------|-------|-------|
| Melody (Piano) | 0 dB | -inf to +6 | Reference level |
| Bass Notes | -2 dB | -4 to -1 | Subtle underpinning |
| Kick Drums | -1 dB | -3 to 0 | Punchy, present |
| Snare | -1 dB | -3 to 0 | Cutting, clear |
| Hi-Hat | -3 dB | -6 to -2 | Texture, not dominant |
| Accompaniment | -2 dB | -4 to -1 | Harmonic fill |

Per-style adjustments:
- **Jazz**: Quieter drums (-3 dB kicks) for sophistication
- **Rock**: Louder snare (0 dB) for power
- **Pop**: Balanced, bright
- **Soul**: Punchy kick (-1 dB), strong snare (0 dB)
- **Reggae**: Sparse, mid-volume (-2 dB range)
- **Classical**: Minimal, delicate (-3 dB range)

## Extension Points

Future enhancements can hook into:

1. **Drum Synth Customization**:
   - Replace `Tone.Synth` with samples (drum kit samples)
   - Add compression/effects to drum bus
   - Implement humanization (timing drift, velocity variation)

2. **Accompaniment Enhancement**:
   - Generate patterns based on chord quality (major, minor, dominant, etc.)
   - Detect chord changes and add transition fills
   - Implement style-specific voicings (rootless jazz, pop power chords, etc.)

3. **User Control**:
   - Toggles for drums on/off, accompaniment on/off
   - Per-layer volume sliders
   - Pattern variability (intro/verse/chorus sections)

4. **Advanced Patterns**:
   - Time signature transitions
   - Polyrhythmic sections
   - Fill transitions between sections
   - Dynamic complexity based on progression length

## Performance Considerations

- **Synth Reuse**: Drum synths are instantiated once and reused (pooling pattern)
- **Tone.js Scheduling**: Uses Web Audio API for sample-accurate scheduling
- **Memory**: No audio files downloaded; everything synthesized in real-time
- **Latency**: Minimal (Tone.js handles lookahead buffering)

## Testing Checklist

- [ ] Each play style has distinct drum character
- [ ] Accompaniment notes follow correct harmonic intervals
- [ ] No audio glitches or pops between chords
- [ ] Drums and accompaniment sync with melody
- [ ] Loop cycles without dropping audio or clicking
- [ ] Volume balance appropriate for all styles
- [ ] Ballads sound sparse and minimal
- [ ] Rock styles sound driving and energetic
- [ ] Jazz styles sound sophisticated and syncopated
- [ ] Reggae feels spacious and laid-back
