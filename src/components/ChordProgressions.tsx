import { useEffect, useMemo, useState } from "react";

import {
  commonProgressions,
  functionDescriptions,
  progressionMap,
  progressionsGlossary,
  type ProgressionDifficulty,
  type ScaleType,
} from "../data/scales";
import { chordTypes } from "../data/chords";
import {
  buildScaleChords,
  getDisplayKeyRoot,
  resolveChordSnapshot,
  type ScaleChord,
} from "../utils/scaleHarmony";
import {
  formatNoteForDisplay,
  getNotesByPreference,
  type AccidentalPreference,
} from "../utils/musicTheory";
import { playNotes, playProgression } from "../utils/audio";
import {
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

  // Resolves a frozen builder/saved-progression chord
  // snapshot to its current display label + notes under the
  // live sharps/flats preference (spelling can still follow
  // that shared toggle — only the key/scale/chord-type no
  // longer matters once a chord is a snapshot).
  const resolveSnapshot = (chord: ProgressionChord) =>
    resolveChordSnapshot(
      chord.rootNote,
      chord.chordTypeIndex,
      accidentalPreference
    );

  const followUps = highlightedDegree
    ? progressionMap[scaleType][highlightedDegree] ?? []
    : [];

  const handlePlayChord = (chord: ScaleChord) => {
    playNotes(chord.rawNotes.map((note) => `${note}4`));
  };

  const handlePlaySnapshotList = (
    chords: ProgressionChord[]
  ) => {
    const chordGroups = chords.map(
      (chord) => resolveSnapshot(chord).rawNotes
    );

    playProgression(chordGroups);
  };

  const handlePlayTemplate = (degrees: number[]) => {
    const chordGroups = degrees.map(
      (degree) => chordByDegree(degree).rawNotes
    );

    playProgression(chordGroups);
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
    setBuilderChords((current) => [
      ...current,
      {
        rootNote: chord.rawRootNote,
        chordTypeIndex: chord.chordTypeIndex,
      },
    ]);
  };

  // Adds a frozen snapshot of a preset template's chord
  // (looked up against the scale currently shown) to the
  // builder, same independence guarantee as above.
  const handleAddTemplateToBuilder = (
    degrees: number[]
  ) => {
    setBuilderChords((current) => [
      ...current,
      ...degrees.map((degree) => {
        const chord = chordByDegree(degree);
        return {
          rootNote: chord.rawRootNote,
          chordTypeIndex: chord.chordTypeIndex,
        };
      }),
    ]);
  };

  const handleRemoveFromBuilder = (index: number) => {
    setBuilderChords((current) =>
      current.filter((_, i) => i !== index)
    );
  };

  const handleMoveBuilderChord = (
    index: number,
    direction: -1 | 1
  ) => {
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
    });

    setSavedProgressions(next);
    setProgressionName("");
  };

  const handleDeleteSaved = (id: string) => {
    setSavedProgressions(deleteProgression(id));
  };

  const handleLoadSaved = (saved: SavedProgression) => {
    setBuilderChords(saved.chords);
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
          <p className="eyebrow">YOUR SKETCHPAD</p>
          <h3>Progression Builder</h3>
          <p className="builder-section-hint">
            Click <strong>+ Add to builder</strong> on any
            chord above (as many times, in any order, as
            you like) — each one is locked in as-is, so
            changing the key, scale, or chord type above
            afterward won't alter chords already here.
            Reorder or remove chords below, then play the
            sequence back or save it for later.
          </p>
        </div>

        {builderChords.length === 0 ? (
          <p className="hint builder-empty">
            Your progression is empty — add a chord from
            the row above to get started.
          </p>
        ) : (
          <ol className="builder-slot-row">
            {builderChords.map((chord, index) => {
              const resolved = resolveSnapshot(chord);

              return (
                <li
                  className="builder-slot"
                  key={`${chord.rootNote}-${chord.chordTypeIndex}-${index}`}
                >
                  <span className="builder-slot-index">
                    {index + 1}
                  </span>

                  <span className="builder-slot-chord">
                    {resolved.chordLabel}
                  </span>

                  <div className="builder-slot-actions">
                    <button
                      type="button"
                      className="slot-btn"
                      aria-label="Move left"
                      disabled={index === 0}
                      onClick={() =>
                        handleMoveBuilderChord(index, -1)
                      }
                    >
                      ←
                    </button>

                    <button
                      type="button"
                      className="slot-btn"
                      aria-label="Move right"
                      disabled={
                        index === builderChords.length - 1
                      }
                      onClick={() =>
                        handleMoveBuilderChord(index, 1)
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
            })}
          </ol>
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
                    {saved.chords.map((chord, index) => (
                      <span
                        className="template-chip"
                        key={`${chord.rootNote}-${chord.chordTypeIndex}-${index}`}
                      >
                        {
                          resolveSnapshot(chord)
                            .chordLabel
                        }
                      </span>
                    ))}
                  </div>

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
