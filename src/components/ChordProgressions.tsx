import { useEffect, useMemo, useState } from "react";

import {
  commonProgressions,
  functionDescriptions,
  progressionMap,
  type ScaleType,
} from "../data/scales";
import { chordTypes } from "../data/chords";
import {
  buildScaleChords,
  getDisplayKeyRoot,
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

const chordCategories = [
  "Triads",
  "Suspended",
  "Sixth Chords",
  "Seventh Chords",
  "Extended Chords",
  "Altered Chords",
  "Added Tone Chords",
];

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
  const [chordTypeIndex, setChordTypeIndex] =
    useState<number>(-1);

  const [highlightedDegree, setHighlightedDegree] =
    useState<number | null>(null);

  // The progression the user is currently composing by
  // clicking chords — a plain list of scale degrees (1-7),
  // played/saved in order, duplicates and repeats allowed.
  const [customDegrees, setCustomDegrees] = useState<
    number[]
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

  const chordByDegree = (degree: number): ScaleChord =>
    scaleChords[degree - 1];

  const followUps = highlightedDegree
    ? progressionMap[scaleType][highlightedDegree] ?? []
    : [];

  const handlePlayChord = (chord: ScaleChord) => {
    playNotes(chord.rawNotes.map((note) => `${note}4`));
  };

  const handlePlayProgression = (
    degrees: number[]
  ) => {
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

  const handleAddToCustom = (degree: number) => {
    setCustomDegrees((current) => [...current, degree]);
  };

  const handleRemoveFromCustom = (index: number) => {
    setCustomDegrees((current) =>
      current.filter((_, i) => i !== index)
    );
  };

  const handleMoveCustom = (
    index: number,
    direction: -1 | 1
  ) => {
    setCustomDegrees((current) => {
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

  const handleClearCustom = () => {
    setCustomDegrees([]);
  };

  const handleSaveCustom = () => {
    const name = progressionName.trim();

    if (!name || customDegrees.length === 0) {
      return;
    }

    const next = saveProgression({
      name,
      rootNote,
      scaleType,
      chordTypeIndex,
      degrees: customDegrees,
    });

    setSavedProgressions(next);
    setProgressionName("");
  };

  const handleDeleteSaved = (id: string) => {
    setSavedProgressions(deleteProgression(id));
  };

  const handleLoadSaved = (saved: SavedProgression) => {
    onRootChange(saved.rootNote);
    setScaleType(saved.scaleType);
    setChordTypeIndex(saved.chordTypeIndex);
    setCustomDegrees(saved.degrees);
    setHighlightedDegree(null);
  };

  const handlePlaySaved = (saved: SavedProgression) => {
    // Rebuild the chord set for the saved progression's own
    // key/scale/chord-type so it plays back correctly even
    // if it differs from what's currently on screen.
    const chords = buildScaleChords(
      saved.rootNote,
      saved.scaleType,
      accidentalPreference,
      saved.chordTypeIndex === -1
        ? undefined
        : chordTypes[saved.chordTypeIndex]
    );

    const chordGroups = saved.degrees.map(
      (degree) => chords[degree - 1].rawNotes
    );

    playProgression(chordGroups);
  };

  const buildChordsForSaved = (
    saved: SavedProgression
  ): ScaleChord[] =>
    buildScaleChords(
      saved.rootNote,
      saved.scaleType,
      accidentalPreference,
      saved.chordTypeIndex === -1
        ? undefined
        : chordTypes[saved.chordTypeIndex]
    );

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

            {chordCategories.map((category) => {
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
                onClick={() =>
                  handleAddToCustom(chord.degree)
                }
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

        <div className="template-grid">
          {commonProgressions[scaleType].map(
            (template) => (
              <div
                className="template-card"
                key={template.name}
              >
                <div className="template-card-head">
                  <h4>{template.name}</h4>

                  <div className="template-card-actions">
                    <button
                      type="button"
                      className="play-chord template-play"
                      onClick={() =>
                        handlePlayProgression(
                          template.degrees
                        )
                      }
                    >
                      ▶ Play
                    </button>

                    <button
                      type="button"
                      className="template-use"
                      title="Load into the progression builder"
                      onClick={() =>
                        setCustomDegrees(
                          template.degrees
                        )
                      }
                    >
                      Use this
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
            you like), reorder or remove chords below, then
            play it back or save it for later.
          </p>
        </div>

        {customDegrees.length === 0 ? (
          <p className="hint builder-empty">
            Your progression is empty — add a chord from
            the row above to get started.
          </p>
        ) : (
          <ol className="builder-slot-row">
            {customDegrees.map((degree, index) => (
              <li
                className="builder-slot"
                key={`${degree}-${index}`}
              >
                <span className="builder-slot-index">
                  {index + 1}
                </span>

                <span className="builder-slot-chord">
                  {chordByDegree(degree).chordLabel}
                </span>

                <span className="builder-slot-roman">
                  {chordByDegree(degree).roman}
                </span>

                <div className="builder-slot-actions">
                  <button
                    type="button"
                    className="slot-btn"
                    aria-label="Move left"
                    disabled={index === 0}
                    onClick={() =>
                      handleMoveCustom(index, -1)
                    }
                  >
                    ←
                  </button>

                  <button
                    type="button"
                    className="slot-btn"
                    aria-label="Move right"
                    disabled={
                      index === customDegrees.length - 1
                    }
                    onClick={() =>
                      handleMoveCustom(index, 1)
                    }
                  >
                    →
                  </button>

                  <button
                    type="button"
                    className="slot-btn slot-remove"
                    aria-label="Remove chord"
                    onClick={() =>
                      handleRemoveFromCustom(index)
                    }
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}

        <div className="builder-actions">
          <button
            type="button"
            className="play-chord"
            disabled={customDegrees.length === 0}
            onClick={() =>
              handlePlayProgression(customDegrees)
            }
          >
            ▶ Play progression
          </button>

          <button
            type="button"
            className="clear-selection"
            disabled={customDegrees.length === 0}
            onClick={handleClearCustom}
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
              customDegrees.length === 0 ||
              !progressionName.trim()
            }
            onClick={handleSaveCustom}
          >
            💾 Save
          </button>
        </div>

        {savedProgressions.length > 0 && (
          <div className="saved-progressions">
            <h4>Your saved progressions</h4>

            <div className="saved-list">
              {savedProgressions.map((saved) => {
                const savedChords =
                  buildChordsForSaved(saved);

                return (
                <div
                  className="saved-card"
                  key={saved.id}
                >
                  <div className="saved-card-head">
                    <strong>{saved.name}</strong>

                    <span className="saved-card-key">
                      {getDisplayKeyRoot(
                        saved.rootNote,
                        accidentalPreference
                      )}{" "}
                      {saved.scaleType} ·{" "}
                      {saved.chordTypeIndex === -1
                        ? "natural triads"
                        : chordTypes[
                            saved.chordTypeIndex
                          ].name}
                    </span>
                  </div>

                  <div className="template-chip-row">
                    {saved.degrees.map((degree, index) => (
                      <span
                        className="template-chip"
                        key={`${degree}-${index}`}
                      >
                        {
                          savedChords[degree - 1]
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
                        handlePlaySaved(saved)
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
                );
              })}
            </div>
          </div>
        )}
      </section>
    </section>
  );
}

export default ChordProgressions;
