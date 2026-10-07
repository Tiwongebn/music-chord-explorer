# Backing Track Implementation

## Overview

Added a full backing track system (drums + accompaniment) to the Music Chord Explorer. This provides a complete rhythm section that supports all 16 genre-based play styles.

## New Files Created

### 1. `/src/data/backingTrack.ts` (19.8 KB)

Defines the backing track architecture:

- **DrumHit**: Represents a single drum hit with timing, drum type, duration, volume, and optional frequency
  - Drum types: kick, snare, hihat, tom, crash
  - Supports volume control in dB for dynamic mixing

- **AccompanimentNote**: Represents a chordal accompaniment note
  - Uses scale degree offsets (0=root, 1=third, 2=fifth, etc.) for harmonic content
  - Octave relative positioning (e.g., -1 octave down)
  - Dynamic volume control

- **BackingTrack Interface**: Bundles drum and accompaniment patterns for a style
  - `drumPattern()`: Returns drum hits for a chord duration
  - `accompanimentPattern()`: Returns accompaniment notes for a chord duration

#### Drum Patterns Implemented

1. **Four-on-the-Floor** (Pop, Rock Power)
   - Kick on every beat
   - Snare on 2 & 4
   - Steady hi-hat eighth notes

2. **Half-Time Rock** (Rock Strum, Rock Progressive)
   - Kick on 1 & 3
   - Snare backbeat (2 & 4)
   - Quarter-note hi-hat

3. **Jazz Swing** (Jazz styles)
   - Light kick on 1 & 3
   - Snare on 2 & 4
   - Triplet hi-hat for ride cymbal feel

4. **Reggae Skank** (Reggae Steady)
   - Kick on 1 only
   - Snare on offbeats (2.5, 3.5)
   - Steady hi-hat quarter notes

5. **Soul Groove** (Soul styles)
   - Syncopated kick pattern
   - Strong snare backbeat with ghost hits
   - Steady eighth-note hi-hat

6. **Classical Waltz** (Classical Waltz, 3/4 time)
   - Kick on beat 1
   - Snare on 2 & 3
   - Minimal, formal feel

#### Accompaniment Patterns Implemented

1. **Jazz Comping**: Sparse, syncopated hits on backbeat
   - Hit on beat 2 (fifth): -3 dB
   - Hit on beat 3/4 (third): -4 dB

2. **Rock Comping**: Fuller chords, on-beat emphasis
   - Beat 1 (root): -2 dB
   - Beat 3 (fifth): -3 dB

3. **Pop Comping**: Bright, steady rhythm hits
   - Beats 1 & 3 (root/fifth): -1 to -2 dB
   - Beats 2 & 4 (third): -3 dB (extra energy)

4. **Soul Comping**: Groovy, syncopated
   - Beat 1 (root): -1 dB
   - Beat 2 (fifth): -2 dB
   - Beat 2.5 (third): -3 dB

5. **Reggae Comping**: Minimal, spacious
   - Hit on beat 2.5 (root): -2 dB

6. **Classical Comping**: Arpeggiated figures
   - Alberti bass-like pattern: Root → Fifth → Third → Fifth
   - Each note: -3 dB with staggered timing

#### All 16 Play Styles Mapped

Each play style gets dedicated drum + accompaniment patterns:

- **Jazz**: Swing drums + jazz comping (Cool, Swing, Bebop, Ballad)
- **Rock**: Rock drums + rock comping (Power, Strum, Progressive)
- **Pop**: Four-on-the-floor + pop comping (Standard, Ballad, Upbeat)
- **Soul**: Soul groove + soul comping (Classic, Ballad)
- **Reggae**: Skank + reggae comping (Steady, Dub)
- **Classical**: Waltz/Sonata patterns + classical comping (Waltz, Sonata)

### 2. `/src/utils/backingTrackPlayer.ts` (6.4 KB)

Audio synthesis engine for backing tracks:

- **Drum Synths**:
  - **Kick Synth**: Tone.Synth with sine wave, short decay (0.5s), perfect for low-frequency bass
  - **Snare Synth**: PolySynth with square wave, tight envelope (0.2s decay)
  - **Hi-Hat Synth**: Tone.MetalSynth with complex harmonics for metallic texture
  - **Tom Synth**: Uses kick synth with mid/high frequencies (150-200 Hz)
  - **Crash Synth**: Uses MetalSynth for cymbal crashes

- **Public API**:
  - `playDrumHits(hits, baseWhen)`: Schedule drum hits at specified time
  - `playAccompanimentNotes(notes, rootNote, baseWhen)`: Schedule accompaniment notes, converting degree offsets to actual pitches

- **Degree-to-MIDI Mapping**:
  ```
  0: Root (C)
  1: Third (+4 semitones)
  2: Fifth (+7 semitones)
  3: Seventh (+11 semitones)
  4: Octave (+12 semitones)
  5: Ninth (+16 semitones)
  6: Eleventh (+19 semitones)
  7: Thirteenth (+23 semitones)
  ```

## Modified Files

### 1. `/src/utils/audio.ts`

**Changes**:
- Added import of `playDrumHits`, `playAccompanimentNotes` from backingTrackPlayer
- Added import of `BackingTrack` type from backingTrack
- Extended `playTimedProgression()` options with `backingTrack?: BackingTrack`
- Extended `playTimedProgressionLoop()` options with `backingTrack?: BackingTrack`
- Added backing track playback in main chord loop:
  ```typescript
  // Play backing track (drums + accompaniment) if provided
  if (backingTrack && !chord.isRest && chord.rootNote) {
    const drumPattern = backingTrack.drumPattern(duration);
    playDrumHits(drumPattern.hits, when);
    
    const accompPattern = backingTrack.accompanimentPattern(chord.notes, duration);
    playAccompanimentNotes(accompPattern.notes, chord.rootNote, when);
  }
  ```

### 2. `/src/components/ChordProgressions.tsx`

**Changes**:
- Added import of `getBackingTrack` from backingTrack data module
- Updated `toTimedChords()` to include `rootNote` field (required for backing track)
- Modified `handlePlaySnapshotList()`:
  ```typescript
  const backingTrack = getBackingTrack(styleId);
  playTimedProgression(toTimedChords(chords), secondsPerBeat, {
    swingEnabled,
    accentBoost: accentType === 'none' ? 0 : 5,
    pattern,
    bassLayer: style?.bassLayer,
    backingTrack,  // NEW
  });
  ```
- Modified `handleToggleBuilderLoop()` to pass backing track to loop

## How It Works

1. **Play Style Selection**: User selects a play style (e.g., "Jazz: Swing")

2. **Backing Track Retrieval**: `getBackingTrack(styleId)` returns the corresponding `BackingTrack` with drum + accompaniment patterns

3. **Chord Playback**: For each chord in the progression:
   - Chord notes play via the main melody (piano sampler)
   - Bass layer plays root notes underneath (from playStyles.ts)
   - **NEW**: Drums play via synth kicks/snares/hi-hats
   - **NEW**: Accompaniment notes play comping chords via piano sampler

4. **Timing**: All elements scheduled with precise timing offsets:
   ```
   Chord start → Drums (via playDrumHits) → Accompaniment (via playAccompanimentNotes)
   ```

5. **Looping**: Full rhythm section (melody + bass + drums + accompaniment) loops continuously

## Audio Levels

Default mixing:
- Piano samples (melody): 0 dB (reference)
- Bass notes: -2 to -4 dB (subtle underpinning)
- Kick drums: -1 to 0 dB (punchy, present)
- Snare drums: -1 to 0 dB (cutting, clear)
- Hi-hat: -2 to -4 dB (texture, not dominant)
- Accompaniment: -1 to -4 dB (harmonic fill, not competing with melody)

Volume offsets per style allow customization (e.g., jazz uses quieter drums for sophistication).

## Per-Style Character

Each genre-specific backing track preserves its musical character:

- **Jazz**: Sparse drums (light kick/snare), rootless jazz comping (thirds/fifths)
- **Rock**: Driving four-on-the-floor, bold drum backbeat, full chord comping
- **Pop**: High-energy kick pattern, bright comping fills on every beat
- **Soul**: Syncopated kick, strong snare, groovy comping with ghost hits
- **Reggae**: Sparse kick, skank snare, minimal offbeat comping
- **Classical**: Formal waltz drums, arpeggiated Alberti bass-style accompaniment

## Future Enhancements

Potential additions (not implemented yet):

1. **Sample-based Drums**: Replace synth drums with sampled drum kit for more organic sound
2. **Adaptive Accompaniment**: Generate comping patterns based on chord quality (maj, min, dom, etc.)
3. **Humanization**: Add micro-timing variations and dynamic velocity for natural feel
4. **Style Mixing**: Allow users to mix drum patterns from one style with accompaniment from another
5. **User Customization**: Toggles for drums on/off, accompaniment on/off, volume sliders per layer
6. **Polyrhythmic Sections**: Support for time signature changes within a progression
7. **Fills**: Transition fills between sections (e.g., drum fill into new chord)
8. **Backing Track Editor UI**: Visual drum/accompaniment pattern editor

## Testing

To verify functionality:

1. Select a play style from the "Backing Style" dropdown
2. Build a chord progression in the builder
3. Click "Play" or toggle the loop button
4. Listen for:
   - Drums playing in time with melody
   - Accompaniment (comping) chords filling the harmony
   - Smooth looping with no gaps

Each style should have distinct drum and accompaniment character appropriate to the genre.
