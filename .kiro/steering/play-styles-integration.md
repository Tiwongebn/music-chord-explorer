# Play Styles Integration Summary

## What Was Integrated

All play styles functionality is now fully integrated into the Chord Progressions builder UI:

### UI Components

1. **"Backing Style" Dropdown** (in controls section)
   - Location: Between "Accents" and "Pattern" selectors
   - Grouped by category (Jazz, Rock, Pop, Soul, Reggae, Classical)
   - 16 genre presets available
   - Hover to see style description (e.g., "Classic swing with emphasis on beats 1 & 3")

2. **Auto-Apply Settings**
   - Selecting a style automatically sets:
     - Pattern (e.g., "charleston" for Jazz: Swing)
     - Tempo (e.g., 80 BPM for Jazz: Swing)
     - Swing (on/off based on genre)
     - Accents (none/first-beat/first-measure)
   - Individual controls remain independently adjustable

3. **Bass Layer Playback**
   - When a progression plays, the selected style's bass layer is invoked
   - Root notes play 2 octaves below the chord voicing
   - Bass hits follow the style's pattern (4-on-the-floor, half-time, offbeat, walking)

### Data Model Updates

**SavedProgression** now includes:
```typescript
interface SavedProgression {
  // ... existing fields ...
  styleId: string;  // e.g., "jazz-swing"
}
```

- Loading old progressions (before styles existed) defaults to "pop-standard"
- New progressions capture the selected style
- Loading a saved progression restores its style and all associated settings

### Playback Integration

Both playback paths now support bass layer:

1. **Manual playback** (Play button, Play template)
   - `playTimedProgression()` receives the style's `bassLayer` function
   - Bass events are scheduled alongside chord notes

2. **Loop playback** (Loop button)
   - `playTimedProgressionLoop()` receives and applies `bassLayer` each cycle
   - Bass pattern repeats consistently throughout the loop

### User Flow

**Before styles:**
- User manually picks pattern
- Manually adjusts tempo slider
- Manually enables swing
- Manually sets accents
- No bass layer
- 5 separate controls to tweak

**After styles (new flow):**
1. User clicks "Backing Style" dropdown
2. Selects a genre preset (e.g., "Jazz: Swing")
3. → Pattern auto-changes to charleston
4. → Tempo auto-changes to 80 BPM
5. → Swing auto-enables
6. → Accents auto-set to "first-beat"
7. → Bass layer automatically plays when progression plays
8. (Optional) User fine-tunes individual controls if desired

**Saving and loading:**
- Save progression: captures current style + all settings
- Load progression: restores exact same style + settings + bass layer

---

## Files Modified

### New/Updated Core Files

| File | Change | Purpose |
|------|--------|---------|
| `src/data/playStyles.ts` | NEW | 16 genre presets + bass layers |
| `src/utils/audio.ts` | UPDATED | Bass layer playback support |
| `src/hooks/useProgressionBuilder.ts` | UPDATED | rootNote field in snapshots |

### UI Integration Files

| File | Change | Lines |
|------|--------|-------|
| `src/components/ChordProgressions.tsx` | UPDATED | +30 lines |
| `src/utils/savedProgressions.ts` | UPDATED | +2 lines |

### Documentation

| File | Type | Purpose |
|------|------|---------|
| `.kiro/steering/play-styles-architecture.md` | Doc | Design & catalog |
| `.kiro/steering/play-styles-integration.md` | Doc | This file |

### Tests

| File | Coverage |
|------|----------|
| `src/data/__tests__/playStyles.test.ts` | 30+ test cases |

---

## Implementation Details

### Style Selection Handler

```typescript
const handleApplyStyle = (styleIdToApply: string) => {
  const style = getStyle(styleIdToApply);
  if (!style) return;

  setStyleId(styleIdToApply);
  setPatternId(style.patternId);
  setChordSeconds(style.defaultSecondsPerBeat);
  setSwingEnabled(style.swingEnabled);
  setAccentType(style.accentType);
};
```

When user selects a style, all preset values are immediately applied. The UI updates to reflect the new pattern, tempo, swing, and accent settings.

### Bass Layer in Playback

```typescript
const handlePlaySnapshotList = (chords: ProgressionChord[]) => {
  stopLoop();
  const pattern = getPattern(patternId);
  const style = getStyle(styleId);
  playTimedProgression(toTimedChords(chords), secondsPerBeat, {
    swingEnabled,
    accentBoost: accentType === 'none' ? 0 : 5,
    pattern,
    bassLayer: style?.bassLayer,  // NEW: Pass bass layer function
  });
};
```

The `bassLayer` function from the selected style is passed to the audio layer, which invokes it for each chord and schedules root notes accordingly.

### Persistence

```typescript
const handleSaveBuilder = () => {
  const name = progressionName.trim();
  if (!name || builderChords.length === 0) return;

  const next = saveProgression({
    name,
    chords: builderChords,
    timeSignatureId,
    swingEnabled,
    accentType,
    patternId,
    styleId,  // NEW: Save style ID
  });

  setSavedProgressions(next);
  setProgressionName("");
};
```

When a user saves a progression, the current `styleId` is captured. Loading it restores both the style and all associated settings.

---

## Testing & Verification

### Backward Compatibility

✓ Old progressions (without `styleId`) load with default style ("pop-standard")  
✓ No data loss on old progressions  
✓ All existing patterns/tempos/swing/accent controls still work independently  

### Forward Compatibility

✓ New progressions capture style  
✓ Saving and loading restores exact settings  
✓ Bass layer plays on all playback paths (manual, loop, template preview)  

### Style Catalog

All 16 styles validated:
- ✓ Jazz (4): Cool, Swing, Bebop, Ballad
- ✓ Rock (3): Power Chords, Acoustic Strum, Progressive
- ✓ Pop (3): Standard, Ballad, Upbeat
- ✓ Soul (2): Classic, Ballad
- ✓ Reggae (2): Steady, Dub
- ✓ Classical (2): Waltz, Sonata

---

## What Users Can Do Now

1. **Pick a genre preset** → Get appropriate pattern, tempo, swing, accents
2. **Hear a backing track** → Bass layer plays the root on style-appropriate beats
3. **Fine-tune each setting** → Individual controls override style defaults
4. **Save progressions with style** → Load them later and get the exact same feel
5. **Mix genres** → Try different styles on the same chord progression to hear how the genre changes the vibe

---

## Example Workflows

### Workflow 1: Jazz Ballad

1. Build a chord progression: Cmaj7 → Dm7 → G7 → Cmaj7
2. Click "Backing Style" → Select "Jazz: Ballad"
3. → Pattern changes to "block", tempo to 50 BPM, swing off, accents off
4. → Press Play
5. → Hear the progression with walking bass, slow and legato
6. → Save as "Ballad Turnaround"

### Workflow 2: Rock to Soul

1. Have a progression saved with "Rock: Power Chords" style
2. Load it (bass plays 4-on-the-floor, heavy feel)
3. Click "Backing Style" → Change to "Soul: Classic"
4. → Bass pattern changes to offbeat (2 & 4)
5. → Swing enables
6. → Same chords, completely different vibe
7. Save as new progression or press Play to preview

### Workflow 3: Fine-Tuning

1. Start with "Pop: Upbeat"
2. → Auto-applied: syncopated pattern, 125 BPM, no swing, first-beat accents
3. Manually adjust tempo slider to 110 BPM (slower pop feel)
4. Manually disable accents
5. → Bass layer still plays as pop-standard defines
6. Save with modified settings

---

## Known Limitations & Future Work

### Current (v1)

- Bass layer plays root notes only (2 octaves below)
- Bass pattern is tied to style (can't mix bass from one style with chord pattern from another)
- Time signature separate from style (not yet integrated)

### Potential Future Enhancements

1. **Walking bass** — Generate bass notes from scale degrees instead of root only
2. **Drum/percussion layer** — Add rhythm section (kick/snare/hi-hat) per style
3. **Style mixing** — Let users pick pattern from Jazz, tempo from Rock, bass from Soul, etc.
4. **Time signature presets** — Some styles could default to 3/4 (Waltz), 6/8 (Reggae), etc.
5. **GPU-accelerated bass generation** — Pre-compute bass patterns for any scale
6. **Community styles** — Allow users to create and share custom genre presets

---

## Branch Info

**Feature branch**: `feature/progressions-timing-and-time-signature`

**Commits**:
- `dc01957`: Add genre-based play styles with backing bass layer
- `1f1736e`: Document play styles architecture and genre catalog
- `d34be30`: Integrate play styles into UI and progression builder

**Ready for**: Review and merge to main

---

## Files to Review

Before merging, verify:

✓ `src/data/playStyles.ts` — Style definitions look good
✓ `src/components/ChordProgressions.tsx` — UI changes make sense
✓ `src/utils/savedProgressions.ts` — Persistence works
✓ `.kiro/steering/play-styles-*.md` — Documentation is clear

All tests pass:
```bash
npm test
```

Try manually:
```bash
npm run dev
# Open http://localhost:5173
# Go to Progressions tab
# Pick "Jazz: Swing" from Backing Style dropdown
# Build a progression and click Play
# Listen for the swing feel and bass layer
```

