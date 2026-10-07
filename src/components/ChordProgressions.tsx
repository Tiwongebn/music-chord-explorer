import { useEffect, useMemo, useRef, useState } from "react";

import {
  commonProgressions,
  functionDescriptions,
  generateRandomProgression,
  progressionMap,
  progressionsGlossary,
  type ProgressionDifficulty,
  type ScaleType,
} from "../data/scales";
import { chordTypes } from "../data/chords";
import {
  beatOptions,
  defaultTimeSignatureId,
  getTimeSignature,
  maxBeats,
  minBeats,
  timeSignatures,
} from "../data/rhythm";
import {
  getPatterns,
  getPattern,
  getDefaultPatternId,
} from "../data/patterns";
import {
  getStyles,
  getStyle,
  getDefaultStyleId,
  getStylesByCategory,
} from "../data/playStyles";
import {
  buildScaleChords,
  classifyChordInKey,
  getDisplayKeyRoot,
  resolveChordSnapshot,
  type ChordKeyRelation,
  type ScaleChord,
} from "../utils/scaleHarmony";
import {
  formatNoteForDisplay,
  getNotesByPreference,
  type AccidentalPreference,
} from "../utils/musicTheory";
import {
  playNotes,
  playProgression,
  playTimedProgression,
  playTimedProgressionLoop,
  type ProgressionLoopHandle,
  type TimedChord,
} from "../utils/audio";
import {
  DEFAULT_CHORD_BEATS,
  deleteProgression,
  loadSavedProgressions,
  saveProgression,
  type ProgressionChord,
  type SavedProgression,
} from "../utils/savedProgressions";

interface ChordProgressionsProps {
  rootNote: string;
  accidentalPreference: AccidentalPreference;
  onRootChange: (note: string) => void;
  onAccidentalPreferenceChange: (
    preference: AccidentalPreference
  ) => void;
}

const functionClass: Record<string, string> = {
  Tonic: "fn-tonic",
  Subdominant: "fn-subdominant",
  Dominant: "fn-dominant",
};

// Shown by default — the categories a newcomer is likely to
// recognize. The rest (Suspended, Extended, Altered, Added
// Tone) are hidden behind "Show advanced chord types" so the
// dropdown doesn't overwhelm a first-time visitor with things
// like "Dominant 7th Sharp 9" before they've met a plain 7th
// chord.
const basicChordCategories = [
  "Triads",
  "Sixth Chords",
  "Seventh Chords",
];

const advancedChordCategories = [
  "Suspended",
  "Extended Chords",
  "Altered Chords",
  "Added Tone Chords",
];

const difficultyClass: Record<ProgressionDifficulty, string> = {
  Beginner: "difficulty-beginner",
  Intermediate: "difficulty-intermediate",
  Advanced: "difficulty-advanced",
};

// Easiest-first ordering so a newcomer's eye lands on
// Beginner-friendly progressions before Advanced ones.
const difficultyRank: Record<ProgressionDifficulty, number> = {
  Beginner: 0,
  Intermediate: 1,
  Advanced: 2,
};

// Labels/classes for the borrowed/chromatic chord badge.
// "diatonic" chords get no badge at all (see render below).
const relationLabel: Record<ChordKeyRelation, string> = {
  diatonic: "",
  borrowed: "Borrowed",
  chromatic: "Chromatic",
};

const relationClass: Record<ChordKeyRelation, string> = {
  diatonic: "",
  borrowed: "relation-borrowed",
  chromatic: "relation-chromatic",
};

function ChordProgressions({
  rootNote,
  accidentalPreference,
  onRootChange,
  onAccidentalPreferenceChange,
}: ChordProgressionsProps) {
  const [scaleType, setScaleType] =
    useState<ScaleType>("major");

  // -1 means "use each degree's natural triad" (the default,
  // simplest view). Any other value is an index into
  // chordTypes — the whole key gets voiced with that one
  // chord type, exactly like Explore's chord-type dropdown.
  // This only affects how the diatonic row above is VOICED
  // for browsing — it has no bearing on chords already
  // sitting in the builder below (see ProgressionChord).
  const [chordTypeIndex, setChordTypeIndex] =
    useState<number>(-1);

  // Keeps the "advanced" chord categories (Suspended,
  // Extended, Altered, Added Tone) collapsed by default so
  // newcomers see a short, familiar list first.
  const [showAdvancedChordTypes, setShowAdvancedChordTypes] =
    useState(false);

  const [showGlossary, setShowGlossary] = useState(false);

  // Tempo for every chord-sequence playback in this tab
  // (templates, the builder, saved progressions) — one shared
  // control rather than a separate dial per list. Stored as
  // seconds-per-chord internally since that's what the audio
  // helpers expect; the UI shows it as a BPM-style value.
  const [chordSeconds, setChordSeconds] = useState(0.85);

  // Time signature only affects how the builder visually
  // groups its chord slots into bars (vertical divider
  // lines) — it does not change playback timing, which comes
  // purely from each chord's own beat count + chordSeconds
  // below. See data/rhythm.ts for why 6/8 isn't special-cased.
  const [timeSignatureId, setTimeSignatureId] = useState(
    defaultTimeSignatureId
  );

  const timeSignature = getTimeSignature(timeSignatureId);

  // chordSeconds above is actually "seconds per beat" now
  // that chords can span more than one beat — kept the same
  // variable/slider so the tempo control's range and feel are
  // unchanged from before per-chord timing existed (where
  // every chord was implicitly exactly 1 beat long).
  const secondsPerBeat = chordSeconds;

  // Swing/groove feel: when enabled, off-beat notes are delayed
  // slightly for a jazzier sound (typically 2:1 ratio).
  const [swingEnabled, setSwingEnabled] = useState(false);

  // Accents/dynamics: controls whether and how beats are
  // emphasized with slightly louder volume.
  const [accentType, setAccentType] = useState<
    'none' | 'first-beat' | 'first-measure'
  >('none');

  // Rhythmic pattern: controls the articulation (arpeggios,
  // strums, syncopation, etc.) that determines when notes
  // fire within each chord's duration. Applied globally to
  // the whole progression.
  const [patternId, setPatternId] = useState(
    getDefaultPatternId()
  );

  // Play style: genre preset that bundles pattern, tempo, swing,
  // accents, and bass layer. When a user picks a style, it auto-sets
  // pattern/tempo/swing/accents. Individual controls remain overridable.
  const [styleId, setStyleId] = useState(
    getDefaultStyleId()
  );

  // Handle for the builder's currently-looping playback, if
  // any. Non-null exactly while the loop button shows "Stop".
  const [loopHandle, setLoopHandle] =
    useState<ProgressionLoopHandle | null>(null);

  // Mirrors loopHandle for the unmount-cleanup effect below,
  // which needs the latest handle but must only register its
  // cleanup once (an empty-deps effect only closes over the
  // state from its first render otherwise).
  const loopHandleRef = useRef<ProgressionLoopHandle | null>(
    null
  );
  loopHandleRef.current = loopHandle;

  const [highlightedDegree, setHighlightedDegree] =
    useState<number | null>(null);

  // The progression the user is composing: a plain list of
  // frozen chord snapshots (root note + chord-type index).
  // Each entry is fully independent of the key/scale/chord
  // type controls above — adding a chord here "locks it in"
  // so later changing the key, scale, or chord-type dropdown
  // never rewrites a chord the user already placed here.
  const [builderChords, setBuilderChords] = useState<
    ProgressionChord[]
  >([]);

  const [progressionName, setProgressionName] =
    useState("");

  const [savedProgressions, setSavedProgressions] =
    useState<SavedProgression[]>([]);

  useEffect(() => {
    setSavedProgressions(loadSavedProgressions());
  }, []);

  // Stop any looping playback if this tab is unmounted (e.g.
  // the user switches to Explore or Chord Lab) — otherwise the
  // loop would keep firing silently in the background forever.
  // Reads loopHandleRef (always current) rather than
  // loopHandle directly, since this effect's cleanup is only
  // registered once and would otherwise close over whatever
  // loopHandle was at mount time (null).
  useEffect(() => {
    return () => {
      loopHandleRef.current?.stop();
    };
  }, []);

  const notes = getNotesByPreference(
    accidentalPreference
  );

  const selectedChordType =
    chordTypeIndex === -1
      ? undefined
      : chordTypes[chordTypeIndex];

  const scaleChords = useMemo(
    () =>
      buildScaleChords(
        rootNote,
        scaleType,
        accidentalPreference,
        selectedChordType
      ),
    [
      rootNote,
      scaleType,
      accidentalPreference,
      selectedChordType,
    ]
  );

  const displayKeyRoot = getDisplayKeyRoot(
    rootNote,
    accidentalPreference
  );

  const sortedTemplates = useMemo(
    () =>
      [...commonProgressions[scaleType]].sort(
        (a, b) =>
          difficultyRank[a.difficulty] -
          difficultyRank[b.difficulty]
      ),
    [scaleType]
  );

  const chordByDegree = (degree: number): ScaleChord =>
    scaleChords[degree - 1];

  // Classifies a frozen builder/saved-progression chord
  // against the currently-displayed key/scale, for the
  // "borrowed"/"chromatic" badge. Rests always classify as
  // diatonic (they have no harmonic content).
  const relationFor = (
    chord: ProgressionChord
  ): ChordKeyRelation => {
    if (chord.type === 'rest') {
      return 'diatonic';
    }

    return classifyChordInKey(
      chord.rootNote!,
      chord.chordTypeIndex!,
      rootNote,
      scaleType
    );
  };

  // Resolves a frozen builder/saved-progression chord
  // snapshot to its current display label + notes under the
  // live sharps/flats preference. Only valid for chords, not
  // rests (which have no harmonic content).
  const resolveSnapshot = (chord: ProgressionChord) => {
    if (chord.type === 'rest') {
      return {
        chordLabel: '(rest)',
        rawNotes: [],
      };
    }

    return resolveChordSnapshot(
      chord.rootNote!,
      chord.chordTypeIndex!,
      accidentalPreference
    );
  };

  const followUps = highlightedDegree
    ? progressionMap[scaleType][highlightedDegree] ?? []
    : [];

  // Always stop any active builder loop before anything else
  // plays — otherwise a looping builder sequence would keep
  // firing underneath (and eventually clashing with) a
  // one-shot template/chord preview.
  const stopLoop = () => {
    setLoopHandle((current) => {
      current?.stop();
      return null;
    });
  };

  const handlePlayChord = (chord: ScaleChord) => {
    stopLoop();
    playNotes(chord.rawNotes.map((note) => `${note}4`));
  };

  // Resolves a list of frozen chord snapshots to the
  // TimedChord[] shape playTimedProgression()/
  // playTimedProgressionLoop() expect, preserving each
  // chord's own beat count and including accent markers.
  const toTimedChords = (
    chords: ProgressionChord[]
  ): TimedChord[] => {
    let beatInMeasure = 0;
    const beatsPerMeasure = timeSignature.beatsPerBar;

    return chords.map((chord) => {
      const isFirstBeat =
        beatInMeasure === 0 && chord.type === 'chord';
      const shouldAccent =
        (accentType === 'first-beat' && isFirstBeat) ||
        (accentType === 'first-measure' && beatInMeasure === 0);

      beatInMeasure = (beatInMeasure + chord.beats) % beatsPerMeasure;

      return {
        notes:
          chord.type === 'chord'
            ? resolveSnapshot(chord).rawNotes
            : [],
        beats: chord.beats,
        isRest: chord.type === 'rest',
        isAccented: shouldAccent,
      };
    });
  };

  const handlePlaySnapshotList = (
    chords: ProgressionChord[]
  ) => {
    stopLoop();
    const pattern = getPattern(patternId);
    const style = getStyle(styleId);
    playTimedProgression(toTimedChords(chords), secondsPerBeat, {
      swingEnabled,
      accentBoost: accentType === 'none' ? 0 : 5,
      pattern,
      bassLayer: style?.bassLayer,
    });
  };

  const handlePlayTemplate = (degrees: number[]) => {
    stopLoop();

    const chordGroups = degrees.map(
      (degree) => chordByDegree(degree).rawNotes
    );

    playProgression(chordGroups, chordSeconds);
  };

  // Toggles looped playback of the builder's current chord
  // sequence. Starting a new loop (or any other playback)
  // always stops a previous one first via stopLoop() above.
  const handleToggleBuilderLoop = () => {
    if (loopHandle) {
      stopLoop();
      return;
    }

    const pattern = getPattern(patternId);
    const style = getStyle(styleId);

    setLoopHandle(
      playTimedProgressionLoop(
        toTimedChords(builderChords),
        secondsPerBeat,
        {
          swingEnabled,
          accentBoost: accentType === 'none' ? 0 : 5,
          pattern,
          bassLayer: style?.bassLayer,
        }
      )
    );
  };

  // Replaces the builder with a freshly randomized
  // progression, walking the harmony graph for the scale
  // currently shown — a quick source of inspiration, or just
  // something fun to mash the button on.
  const handleSurpriseMe = () => {
    stopLoop();

    const degrees = generateRandomProgression(scaleType, 4);

    setBuilderChords(
      degrees.map((degree) => {
        const chord = chordByDegree(degree);
        return {
          type: 'chord' as const,
          rootNote: chord.rawRootNote,
          chordTypeIndex: chord.chordTypeIndex,
          beats: DEFAULT_CHORD_BEATS,
        };
      })
    );
  };

  const handleDegreeClick = (chord: ScaleChord) => {
    setHighlightedDegree((current) =>
      current === chord.degree ? null : chord.degree
    );
    handlePlayChord(chord);
  };

  // Adds a frozen snapshot of the clicked diatonic chord to
  // the builder — its own root note + the chord-type index it
  // is currently voiced with. From this point on it no longer
  // cares what the key/scale/chord-type controls do.
  const handleAddToBuilder = (chord: ScaleChord) => {
    stopLoop();

    setBuilderChords((current) => [
      ...current,
      {
        type: 'chord' as const,
        rootNote: chord.rawRootNote,
        chordTypeIndex: chord.chordTypeIndex,
        beats: DEFAULT_CHORD_BEATS,
      },
    ]);
  };

  // Adds a frozen snapshot of a preset template's chord
  // (looked up against the scale currently shown) to the
  // builder, same independence guarantee as above.
  const handleAddTemplateToBuilder = (
    degrees: number[]
  ) => {
    stopLoop();

    setBuilderChords((current) => [
      ...current,
      ...degrees.map((degree) => {
        const chord = chordByDegree(degree);
        return {
          type: 'chord' as const,
          rootNote: chord.rawRootNote,
          chordTypeIndex: chord.chordTypeIndex,
          beats: DEFAULT_CHORD_BEATS,
        };
      }),
    ]);
  };

  // Changes how many beats a single builder chord holds for,
  // clamped to the selectable beatOptions range.
  const handleSetChordBeats = (
    index: number,
    beats: number
  ) => {
    stopLoop();

    const clamped = Math.min(
      Math.max(beats, minBeats),
      maxBeats
    );

    setBuilderChords((current) =>
      current.map((chord, i) =>
        i === index ? { ...chord, beats: clamped } : chord
      )
    );
  };

  // Toggles between chord and rest at a given index.
  const handleToggleRest = (index: number) => {
    stopLoop();

    setBuilderChords((current) =>
      current.map((chord, i) => {
        if (i !== index) return chord;

        if (chord.type === 'rest') {
          // Convert rest back to a default chord
          return {
            type: 'chord' as const,
            rootNote: 'C',
            chordTypeIndex: 0,
            beats: chord.beats,
          };
        } else {
          // Convert chord to rest (drop root/chordType)
          return {
            type: 'rest' as const,
            beats: chord.beats,
          };
        }
      })
    );
  };

  const handleRemoveFromBuilder = (index: number) => {
    stopLoop();

    setBuilderChords((current) =>
      current.filter((_, i) => i !== index)
    );
  };

  const handleMoveBuilderChord = (
    index: number,
    direction: -1 | 1
  ) => {
    stopLoop();

    setBuilderChords((current) => {
      const target = index + direction;

      if (target < 0 || target >= current.length) {
        return current;
      }

      const next = [...current];
      [next[index], next[target]] = [
        next[target],
        next[index],
      ];
      return next;
    });
  };

  const handleClearBuilder = () => {
    stopLoop();
    setBuilderChords([]);
  };

  const handleSaveBuilder = () => {
    const name = progressionName.trim();

    if (!name || builderChords.length === 0) {
      return;
    }

    const next = saveProgression({
      name,
      chords: builderChords,
      timeSignatureId,
      swingEnabled,
      accentType,
      patternId,
      styleId,
    });

    setSavedProgressions(next);
    setProgressionName("");
  };

  const handleDeleteSaved = (id: string) => {
    setSavedProgressions(deleteProgression(id));
  };

  const handleLoadSaved = (saved: SavedProgression) => {
    stopLoop();
    setBuilderChords(saved.chords);
    setTimeSignatureId(saved.timeSignatureId);
    setSwingEnabled(saved.swingEnabled);
    setAccentType(saved.accentType);
    setPatternId(saved.patternId);
    setStyleId(saved.styleId);
  };

  // Apply a play style: auto-set pattern, tempo, swing, accents
  // from the style preset. Individual controls remain overridable
  // after selection.
  const handleApplyStyle = (styleIdToApply: string) => {
    const style = getStyle(styleIdToApply);
    if (!style) return;

    setStyleId(styleIdToApply);
    setPatternId(style.patternId);
    setChordSeconds(style.defaultSecondsPerBeat);
    setSwingEnabled(style.swingEnabled);
    setAccentType(style.accentType);
  };

  return (
    <section className="panel progressions-panel">
      <div className="progressions-header">
        <p className="eyebrow">HARMONY MAP</p>
        <h2>Chord Progressions</h2>
        <p className="subtitle-left">
          See every chord that naturally belongs to a
          key, which chords it flows into, and build your
          own progression from them.
        </p>
      </div>

      {/* KEY + SCALE + CHORD TYPE + SPELLING PICKER */}
      <div className="prog-controls">
        <div className="selector-group root-group">
          <span
            className="selector-label"
            id="prog-root-label"
          >
            Key
          </span>

          <div
            className="root-pills"
            role="group"
            aria-labelledby="prog-root-label"
          >
            {notes.map((note) => (
              <button
                key={note}
                type="button"
                className={
                  rootNote === note
                    ? "root-pill active"
                    : "root-pill"
                }
                onClick={() => onRootChange(note)}
              >
                {formatNoteForDisplay(note)}
              </button>
            ))}
          </div>
        </div>

        <div className="selector-group">
          <span
            className="selector-label"
            id="prog-scale-label"
          >
            Scale
          </span>

          <div
            className="segmented"
            role="group"
            aria-labelledby="prog-scale-label"
          >
            <button
              type="button"
              className={
                scaleType === "major"
                  ? "seg active"
                  : "seg"
              }
              onClick={() => {
                setScaleType("major");
                setHighlightedDegree(null);
              }}
            >
              Major
            </button>

            <button
              type="button"
              className={
                scaleType === "minor"
                  ? "seg active"
                  : "seg"
              }
              onClick={() => {
                setScaleType("minor");
                setHighlightedDegree(null);
              }}
            >
              Minor
            </button>
          </div>
        </div>

        <div className="selector-group">
          <label
            className="selector-label"
            htmlFor="prog-chord-type"
          >
            Chord type
          </label>

          <select
            id="prog-chord-type"
            value={chordTypeIndex}
            onChange={(event) =>
              setChordTypeIndex(
                Number(event.target.value)
              )
            }
          >
            <option value={-1}>
              Natural triad (default)
            </option>

            {basicChordCategories.map((category) => {
              const categoryChords = chordTypes
                .map((chord, index) => ({
                  chord,
                  index,
                }))
                .filter(
                  ({ chord }) =>
                    chord.category === category
                );

              return (
                <optgroup
                  key={category}
                  label={category}
                >
                  {categoryChords.map(
                    ({ chord, index }) => (
                      <option
                        key={chord.name}
                        value={index}
                      >
                        {chord.name}
                      </option>
                    )
                  )}
                </optgroup>
              );
            })}

            {showAdvancedChordTypes &&
              advancedChordCategories.map((category) => {
                const categoryChords = chordTypes
                  .map((chord, index) => ({
                    chord,
                    index,
                  }))
                  .filter(
                    ({ chord }) =>
                      chord.category === category
                  );

                return (
                  <optgroup
                    key={category}
                    label={category}
                  >
                    {categoryChords.map(
                      ({ chord, index }) => (
                        <option
                          key={chord.name}
                          value={index}
                        >
                          {chord.name}
                        </option>
                      )
                    )}
                  </optgroup>
                );
              })}
          </select>

          <button
            type="button"
            className="advanced-toggle"
            onClick={() =>
              setShowAdvancedChordTypes((current) => {
                const next = !current;

                // Hiding the advanced categories while one of
                // their chord types is selected would leave
                // the <select> pointing at an option that no
                // longer exists — fall back to the default.
                if (
                  !next &&
                  chordTypeIndex !== -1 &&
                  advancedChordCategories.includes(
                    chordTypes[chordTypeIndex].category
                  )
                ) {
                  setChordTypeIndex(-1);
                }

                return next;
              })
            }
          >
            {showAdvancedChordTypes
              ? "− Hide advanced chord types"
              : "+ Show advanced chord types"}
          </button>
        </div>

        <div className="selector-group">
          <span
            className="selector-label"
            id="prog-notation-label"
          >
            Spelling
          </span>

          <div
            className="segmented"
            role="group"
            aria-labelledby="prog-notation-label"
          >
            <button
              type="button"
              className={
                accidentalPreference === "sharps"
                  ? "seg active"
                  : "seg"
              }
              onClick={() =>
                onAccidentalPreferenceChange("sharps")
              }
            >
              ♯ Sharps
            </button>

            <button
              type="button"
              className={
                accidentalPreference === "flats"
                  ? "seg active"
                  : "seg"
              }
              onClick={() =>
                onAccidentalPreferenceChange("flats")
              }
            >
              ♭ Flats
            </button>
          </div>
        </div>

        <div className="selector-group tempo-group">
          <label
            className="selector-label"
            htmlFor="prog-tempo"
          >
            Tempo
          </label>

          <div className="tempo-control">
            <input
              id="prog-tempo"
              type="range"
              min={300}
              max={1500}
              step={50}
              // The slider reads fastest-on-the-right, so it
              // tracks milliseconds-per-chord inverted from
              // chordSeconds (smaller chordSeconds = faster =
              // slider further right).
              value={Math.round(
                1800 - chordSeconds * 1000
              )}
              onChange={(event) =>
                setChordSeconds(
                  (1800 - Number(event.target.value)) /
                    1000
                )
              }
            />

            <span className="tempo-value">
              {Math.round(60 / chordSeconds)} BPM
            </span>
          </div>
        </div>

        <div className="selector-group">
          <label
            className="selector-label"
            htmlFor="prog-time-signature"
          >
            Time signature
          </label>

          <select
            id="prog-time-signature"
            value={timeSignatureId}
            onChange={(event) =>
              setTimeSignatureId(event.target.value)
            }
          >
            {timeSignatures.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="selector-group">
          <span
            className="selector-label"
            id="prog-groove-label"
          >
            Groove
          </span>

          <div
            className="segmented"
            role="group"
            aria-labelledby="prog-groove-label"
          >
            <button
              type="button"
              className={
                swingEnabled ? "seg active" : "seg"
              }
              onClick={() => setSwingEnabled(!swingEnabled)}
              title="Add swing/shuffle feel to the groove"
            >
              {swingEnabled ? "🎷 Swing on" : "🎷 Swing off"}
            </button>
          </div>
        </div>

        <div className="selector-group">
          <label
            className="selector-label"
            htmlFor="prog-accents"
          >
            Accents
          </label>

          <select
            id="prog-accents"
            value={accentType}
            onChange={(event) =>
              setAccentType(
                event.target.value as
                  | 'none'
                  | 'first-beat'
                  | 'first-measure'
              )
            }
          >
            <option value="none">None</option>
            <option value="first-beat">
              First beat of each chord
            </option>
            <option value="first-measure">
              First beat of each bar
            </option>
          </select>
        </div>

        <div className="selector-group">
          <label
            className="selector-label"
            htmlFor="prog-style"
          >
            Backing Style
          </label>

          <select
            id="prog-style"
            value={styleId}
            onChange={(event) => {
              handleApplyStyle(event.target.value);
            }}
          >
            {Array.from(
              new Set(getStyles().map((s) => s.category))
            )
              .sort()
              .map((category) => (
                <optgroup
                  key={category}
                  label={category}
                >
                  {getStylesByCategory(
                    category as any
                  ).map((style) => (
                    <option
                      key={style.id}
                      value={style.id}
                      title={style.description}
                    >
                      {style.label}
                    </option>
                  ))}
                </optgroup>
              ))}
          </select>
        </div>

        <div className="selector-group">
          <label
            className="selector-label"
            htmlFor="prog-pattern"
          >
            Pattern
          </label>

          <select
            id="prog-pattern"
            value={patternId}
            onChange={(event) => setPatternId(event.target.value)}
          >
            {getPatterns().map((pattern) => (
              <option key={pattern.id} value={pattern.id}>
                {pattern.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="prog-key-label">
        Key of <strong>{displayKeyRoot} {scaleType}</strong>
        {selectedChordType && (
          <>
            {" "}· voiced as <strong>{selectedChordType.name}</strong>
          </>
        )}
      </p>

      {/* RAW SCALE STRIP — shows where the chords below come
          from: the plain notes of the scale, numbered by
          scale degree, before any chords are built on them. */}
      <div
        className="scale-strip"
        aria-label={`Notes of the ${displayKeyRoot} ${scaleType} scale`}
      >
        {scaleChords.map((chord) => (
          <div className="scale-note" key={chord.degree}>
            <span className="scale-note-degree">
              {chord.degree}
            </span>
            <span className="scale-note-name">
              {chord.rootNote}
            </span>
          </div>
        ))}
      </div>

      {/* GLOSSARY DISCLOSURE */}
      <button
        type="button"
        className="glossary-toggle"
        onClick={() => setShowGlossary((current) => !current)}
        aria-expanded={showGlossary}
      >
        {showGlossary
          ? "− Hide term explanations"
          : "❓ What do these terms mean?"}
      </button>

      {showGlossary && (
        <dl className="glossary-list">
          {progressionsGlossary.map((entry) => (
            <div className="glossary-entry" key={entry.term}>
              <dt>{entry.term}</dt>
              <dd>{entry.explanation}</dd>
            </div>
          ))}
        </dl>
      )}

      {/* DIATONIC CHORD ROW */}
      <div className="degree-row">
        {scaleChords.map((chord) => {
          const isHighlighted =
            highlightedDegree === chord.degree;

          const isSuggested = followUps.includes(
            chord.degree
          );

          const classes = [
            "degree-card",
            functionClass[chord.function],
          ];

          if (isHighlighted) classes.push("active");
          if (isSuggested) classes.push("suggested");

          return (
            <div className="degree-card-wrap" key={chord.degree}>
              <button
                type="button"
                className={classes.join(" ")}
                onClick={() => handleDegreeClick(chord)}
              >
                <span className="degree-roman">
                  {chord.roman}
                </span>

                <span className="degree-chord-name">
                  {chord.chordLabel}
                </span>

                <span className="degree-notes">
                  {chord.notes.join(" · ")}
                </span>

                <span className="degree-function">
                  {chord.function}
                </span>
              </button>

              <button
                type="button"
                className="degree-add-btn"
                title={`Add ${chord.chordLabel} to your progression`}
                onClick={() => handleAddToBuilder(chord)}
              >
                + Add to builder
              </button>
            </div>
          );
        })}
      </div>

      {/* "GOES WELL WITH" EXPLANATION */}
      <div className="harmony-hint">
        {highlightedDegree ? (
          <p>
            <strong>
              {chordByDegree(highlightedDegree).chordLabel}{" "}
              ({chordByDegree(highlightedDegree).roman})
            </strong>{" "}
            flows naturally into{" "}
            {followUps.map((degree, index) => (
              <span key={degree}>
                <strong>
                  {chordByDegree(degree).chordLabel} (
                  {chordByDegree(degree).roman})
                </strong>
                {index < followUps.length - 1
                  ? index === followUps.length - 2
                    ? " and "
                    : ", "
                  : ""}
              </span>
            ))}
            . {functionDescriptions[
              chordByDegree(highlightedDegree).function
            ]}
          </p>
        ) : (
          <p>
            Tap a chord above to see which chords it
            goes well with, or hit{" "}
            <strong>+ Add to builder</strong> to drop it
            into the progression builder below.
          </p>
        )}
      </div>

      {/* FUNCTION LEGEND */}
      <div className="function-legend">
        {(
          ["Tonic", "Subdominant", "Dominant"] as const
        ).map((fn) => (
          <div
            className={`legend-item ${functionClass[fn]}`}
            key={fn}
          >
            <span className="legend-dot" />
            <strong>{fn}</strong> —{" "}
            {functionDescriptions[fn]}
          </div>
        ))}
      </div>

      {/* READY-MADE PROGRESSIONS */}
      <div className="progression-templates">
        <h3>Progressions worth stealing</h3>
        <p className="progression-templates-hint">
          Sorted easiest first — try a{" "}
          <span className="difficulty-chip difficulty-beginner">
            Beginner
          </span>{" "}
          one if you're just starting out.
        </p>

        <div className="template-grid">
          {sortedTemplates.map(
            (template) => (
              <div
                className="template-card"
                key={template.name}
              >
                <div className="template-card-head">
                  <h4>
                    {template.name}
                    <span
                      className={`difficulty-chip ${
                        difficultyClass[template.difficulty]
                      }`}
                    >
                      {template.difficulty}
                    </span>
                  </h4>

                  <div className="template-card-actions">
                    <button
                      type="button"
                      className="play-chord template-play"
                      onClick={() =>
                        handlePlayTemplate(
                          template.degrees
                        )
                      }
                    >
                      ▶ Play
                    </button>

                    <button
                      type="button"
                      className="template-use"
                      title="Add these chords to the progression builder"
                      onClick={() =>
                        handleAddTemplateToBuilder(
                          template.degrees
                        )
                      }
                    >
                      + Add to builder
                    </button>
                  </div>
                </div>

                <div className="template-chip-row">
                  {template.degrees.map(
                    (degree, index) => (
                      <span
                        className="template-chip"
                        key={`${degree}-${index}`}
                      >
                        {chordByDegree(degree).chordLabel}
                      </span>
                    )
                  )}
                </div>

                <p className="template-vibe">
                  {template.vibe}
                </p>
              </div>
            )
          )}
        </div>
      </div>

      {/* CUSTOM PROGRESSION BUILDER */}
      <section className="panel builder-panel">
        <div className="builder-panel-header">
          <div className="builder-panel-header-top">
            <div>
              <p className="eyebrow">YOUR SKETCHPAD</p>
              <h3>Progression Builder</h3>
            </div>

            <button
              type="button"
              className="surprise-me-btn"
              title="Replace the builder with a random progression"
              onClick={handleSurpriseMe}
            >
              🎲 Surprise me
            </button>
          </div>

          <p className="builder-section-hint">
            Click <strong>+ Add to builder</strong> on any
            chord above (as many times, in any order, as
            you like) — each one is locked in as-is, so
            changing the key, scale, or chord type above
            afterward won't alter chords already here. You
            can also add <strong>rests</strong> for
            silence, toggle swing/shuffle feel, add accents
            for dynamics, and choose a rhythmic pattern
            (arpeggios, strums, syncopation, etc.) to
            articulate how notes fire. Reorder or remove
            chords below, then play the sequence back, loop
            it, or save it for later. Chords outside the
            current key are flagged as{" "}
            <span className="relation-chip relation-borrowed">
              Borrowed
            </span>{" "}
            or{" "}
            <span className="relation-chip relation-chromatic">
              Chromatic
            </span>
            .
          </p>
        </div>

        {builderChords.length === 0 ? (
          <p className="hint builder-empty">
            Your progression is empty — add a chord from
            the row above to get started.
          </p>
        ) : (
          <>
            <ol className="builder-slot-row">
              {(() => {
                // Tracks beats-so-far to know when a bar
                // boundary falls right after a slot, so a
                // divider line can be rendered there.
                let beatsSoFar = 0;

                return builderChords.map((chord, index) => {
                  const resolved = chord.type === 'chord' ? resolveSnapshot(chord) : null;
                  const relation = chord.type === 'chord' ? relationFor(chord) : 'diatonic';

                  beatsSoFar += chord.beats;

                  const isLast =
                    index === builderChords.length - 1;
                  const endsBar =
                    !isLast &&
                    beatsSoFar %
                      timeSignature.beatsPerBar ===
                      0;

                  const isRest = chord.type === 'rest';

                  return (
                    <li
                      className={
                        isRest
                          ? endsBar
                            ? "builder-slot rest-slot bar-end"
                            : "builder-slot rest-slot"
                          : endsBar
                            ? "builder-slot bar-end"
                            : "builder-slot"
                      }
                      key={`${chord.type}-${index}`}
                    >
                      <span className="builder-slot-index">
                        {index + 1}
                      </span>

                      {isRest ? (
                        <span className="builder-slot-chord rest">
                          (rest)
                        </span>
                      ) : (
                        <>
                          <span className="builder-slot-chord">
                            {resolved!.chordLabel}
                          </span>

                          {relation !== "diatonic" && (
                            <span
                              className={`relation-chip ${relationClass[relation]}`}
                              title={`This chord doesn't match the ${displayKeyRoot} ${scaleType} key currently shown.`}
                            >
                              {relationLabel[relation]}
                            </span>
                          )}
                        </>
                      )}

                      <div className="beats-stepper">
                        <button
                          type="button"
                          className="slot-btn"
                          aria-label="Fewer beats"
                          disabled={chord.beats <= minBeats}
                          onClick={() =>
                            handleSetChordBeats(
                              index,
                              beatOptions[
                                Math.max(
                                  beatOptions.indexOf(
                                    chord.beats
                                  ) - 1,
                                  0
                                )
                              ]
                            )
                          }
                        >
                          −
                        </button>

                        <span className="beats-value">
                          {chord.beats}{" "}
                          {chord.beats === 1
                            ? "beat"
                            : "beats"}
                        </span>

                        <button
                          type="button"
                          className="slot-btn"
                          aria-label="More beats"
                          disabled={chord.beats >= maxBeats}
                          onClick={() =>
                            handleSetChordBeats(
                              index,
                              beatOptions[
                                Math.min(
                                  beatOptions.indexOf(
                                    chord.beats
                                  ) + 1,
                                  beatOptions.length - 1
                                )
                              ]
                            )
                          }
                        >
                          +
                        </button>
                      </div>

                      <div className="builder-slot-actions">
                        <button
                          type="button"
                          className="slot-btn"
                          title={
                            isRest
                              ? "Convert to chord"
                              : "Convert to rest"
                          }
                          onClick={() =>
                            handleToggleRest(index)
                          }
                        >
                          {isRest ? "𝄽" : "𝄽"}
                        </button>

                        <button
                          type="button"
                          className="slot-btn"
                          aria-label="Move left"
                          disabled={index === 0}
                          onClick={() =>
                            handleMoveBuilderChord(
                              index,
                              -1
                            )
                          }
                        >
                          ←
                        </button>

                        <button
                          type="button"
                          className="slot-btn"
                          aria-label="Move right"
                          disabled={isLast}
                          onClick={() =>
                            handleMoveBuilderChord(
                              index,
                              1
                            )
                          }
                        >
                          →
                        </button>

                        <button
                          type="button"
                          className="slot-btn slot-remove"
                          aria-label="Remove chord"
                          onClick={() =>
                            handleRemoveFromBuilder(index)
                          }
                        >
                          ×
                        </button>
                      </div>
                    </li>
                  );
                });
              })()}
            </ol>

            <p className="builder-bar-hint">
              {timeSignature.label} ·{" "}
              {builderChords.reduce(
                (sum, chord) => sum + chord.beats,
                0
              )}{" "}
              beats total · bar lines shown every{" "}
              {timeSignature.beatsPerBar} beats
            </p>
          </>
        )}

        <div className="builder-actions">
          <button
            type="button"
            className="play-chord"
            disabled={builderChords.length === 0}
            onClick={() =>
              handlePlaySnapshotList(builderChords)
            }
          >
            ▶ Play progression
          </button>

          <button
            type="button"
            className={
              loopHandle
                ? "play-chord loop-btn looping"
                : "play-chord loop-btn"
            }
            disabled={builderChords.length === 0}
            onClick={handleToggleBuilderLoop}
          >
            {loopHandle ? "■ Stop loop" : "🔁 Loop"}
          </button>

          <button
            type="button"
            className="clear-selection"
            title="Add a rest (silence) to the progression"
            onClick={() => {
              stopLoop();
              setBuilderChords((current) => [
                ...current,
                {
                  type: 'rest' as const,
                  beats: DEFAULT_CHORD_BEATS,
                },
              ]);
            }}
          >
            𝄽 Add rest
          </button>

          <button
            type="button"
            className="clear-selection"
            disabled={builderChords.length === 0}
            onClick={handleClearBuilder}
          >
            Clear
          </button>
        </div>

        <div className="builder-save-row">
          <input
            type="text"
            className="builder-save-input"
            placeholder="Name this progression…"
            value={progressionName}
            onChange={(event) =>
              setProgressionName(event.target.value)
            }
          />

          <button
            type="button"
            className="use-detected-chord"
            disabled={
              builderChords.length === 0 ||
              !progressionName.trim()
            }
            onClick={handleSaveBuilder}
          >
            💾 Save
          </button>
        </div>

        {savedProgressions.length > 0 && (
          <div className="saved-progressions">
            <h4>Your saved progressions</h4>

            <div className="saved-list">
              {savedProgressions.map((saved) => (
                <div
                  className="saved-card"
                  key={saved.id}
                >
                  <div className="saved-card-head">
                    <strong>{saved.name}</strong>

                    <span className="saved-card-key">
                      {saved.chords.length} chord
                      {saved.chords.length === 1
                        ? ""
                        : "s"}
                    </span>
                  </div>

                  <div className="template-chip-row">
                    {saved.chords.map((chord, index) => {
                      const relation = relationFor(chord);

                      return (
                        <span
                          className="template-chip"
                          key={`${chord.rootNote}-${chord.chordTypeIndex}-${index}`}
                        >
                          {
                            resolveSnapshot(chord)
                              .chordLabel
                          }
                          {chord.beats !==
                            DEFAULT_CHORD_BEATS && (
                            <span className="beats-chip">
                              {chord.beats}♩
                            </span>
                          )}
                          {relation !== "diatonic" && (
                            <span
                              className={`relation-chip ${relationClass[relation]}`}
                              title={`This chord doesn't match the ${displayKeyRoot} ${scaleType} key currently shown.`}
                            >
                              {relationLabel[relation]}
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </div>

                  <p className="saved-card-time-signature">
                    {
                      getTimeSignature(
                        saved.timeSignatureId
                      ).label
                    }
                  </p>

                  <div className="saved-card-actions">
                    <button
                      type="button"
                      className="play-chord template-play"
                      onClick={() =>
                        handlePlaySnapshotList(
                          saved.chords
                        )
                      }
                    >
                      ▶ Play
                    </button>

                    <button
                      type="button"
                      className="template-use"
                      onClick={() =>
                        handleLoadSaved(saved)
                      }
                    >
                      Load
                    </button>

                    <button
                      type="button"
                      className="saved-delete"
                      onClick={() =>
                        handleDeleteSaved(saved.id)
                      }
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </section>
  );
}

export default ChordProgressions;
