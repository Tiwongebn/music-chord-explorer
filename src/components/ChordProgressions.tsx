import { useEffect, useMemo, useState } from "react";

import {
  commonProgressions,
  functionDescriptions,
  progressionMap,
  type ScaleType,
} from "../data/scales";
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
  type ChordVoicing,
  type SavedProgression,
} from "../utils/savedProgressions";

interface ChordProgressionsProps {
  rootNote: string;
  accidentalPreference: AccidentalPreference;
  onRootChange: (note: string) => void;
}

const functionClass: Record<string, string> = {
  Tonic: "fn-tonic",
  Subdominant: "fn-subdominant",
  Dominant: "fn-dominant",
};

function ChordProgressions({
  rootNote,
  accidentalPreference,
  onRootChange,
}: ChordProgressionsProps) {
  const [scaleType, setScaleType] =
    useState<ScaleType>("major");

  const [voicing, setVoicing] =
    useState<ChordVoicing>("triads");

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

  const scaleChords = useMemo(
    () =>
      buildScaleChords(
        rootNote,
        scaleType,
        accidentalPreference
      ),
    [rootNote, scaleType, accidentalPreference]
  );

  const displayKeyRoot = getDisplayKeyRoot(
    rootNote,
    scaleType
  );

  const chordByDegree = (degree: number): ScaleChord =>
    scaleChords[degree - 1];

  const labelFor = (chord: ScaleChord): string =>
    voicing === "sevenths"
      ? chord.seventhChordLabel
      : chord.chordLabel;

  const notesFor = (chord: ScaleChord): string[] =>
    voicing === "sevenths" ? chord.seventhNotes : chord.notes;

  const rawNotesFor = (chord: ScaleChord): string[] =>
    voicing === "sevenths"
      ? chord.seventhRawNotes
      : chord.rawNotes;

  const followUps = highlightedDegree
    ? progressionMap[scaleType][highlightedDegree] ?? []
    : [];

  const handlePlayChord = (chord: ScaleChord) => {
    playNotes(
      rawNotesFor(chord).map((note) => `${note}4`)
    );
  };

  const handlePlayProgression = (
    degrees: number[]
  ) => {
    const chordGroups = degrees.map((degree) =>
      rawNotesFor(chordByDegree(degree))
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
      voicing,
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
    setVoicing(saved.voicing);
    setCustomDegrees(saved.degrees);
    setHighlightedDegree(null);
  };

  const handlePlaySaved = (saved: SavedProgression) => {
    // Rebuild the chord set for the saved progression's own
    // key/scale/voicing so it plays back correctly even if
    // it differs from what's currently on screen.
    const chords = buildScaleChords(
      saved.rootNote,
      saved.scaleType,
      accidentalPreference
    );

    const chordGroups = saved.degrees.map((degree) => {
      const chord = chords[degree - 1];
      return saved.voicing === "sevenths"
        ? chord.seventhRawNotes
        : chord.rawNotes;
    });

    playProgression(chordGroups);
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

      {/* KEY + SCALE + VOICING PICKER */}
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
          <span
            className="selector-label"
            id="prog-voicing-label"
          >
            Chord type
          </span>

          <div
            className="segmented"
            role="group"
            aria-labelledby="prog-voicing-label"
          >
            <button
              type="button"
              className={
                voicing === "triads"
                  ? "seg active"
                  : "seg"
              }
              onClick={() => setVoicing("triads")}
            >
              Triads
            </button>

            <button
              type="button"
              className={
                voicing === "sevenths"
                  ? "seg active"
                  : "seg"
              }
              onClick={() => setVoicing("sevenths")}
            >
              7th Chords
            </button>
          </div>
        </div>
      </div>

      <p className="prog-key-label">
        Key of <strong>{displayKeyRoot} {scaleType}</strong>
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
                  {voicing === "sevenths"
                    ? chord.seventhRoman
                    : chord.roman}
                </span>

                <span className="degree-chord-name">
                  {labelFor(chord)}
                </span>

                <span className="degree-notes">
                  {notesFor(chord).join(" · ")}
                </span>

                <span className="degree-function">
                  {chord.function}
                </span>
              </button>

              <button
                type="button"
                className="degree-add-btn"
                title={`Add ${labelFor(chord)} to your progression`}
                onClick={() =>
                  handleAddToCustom(chord.degree)
                }
              >
                + Add
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
              {labelFor(chordByDegree(highlightedDegree))}{" "}
              ({chordByDegree(highlightedDegree).roman})
            </strong>{" "}
            flows naturally into{" "}
            {followUps.map((degree, index) => (
              <span key={degree}>
                <strong>
                  {labelFor(chordByDegree(degree))} (
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
            goes well with, or hit <strong>+ Add</strong>{" "}
            to drop it into the progression builder below.
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
                        {labelFor(chordByDegree(degree))}
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
      <div className="builder-section">
        <h3>Build your own progression</h3>

        <p className="builder-section-hint">
          Click <strong>+ Add</strong> on any chord above
          (as many times, in any order you like) to build
          a sequence, then play it back or save it.
        </p>

        {customDegrees.length === 0 ? (
          <p className="hint">
            Your progression is empty — add a chord to get
            started.
          </p>
        ) : (
          <div className="custom-chip-row">
            {customDegrees.map((degree, index) => (
              <span
                className="template-chip custom-chip"
                key={`${degree}-${index}`}
              >
                {labelFor(chordByDegree(degree))}

                <button
                  type="button"
                  className="chip-remove"
                  aria-label="Remove chord"
                  onClick={() =>
                    handleRemoveFromCustom(index)
                  }
                >
                  ×
                </button>
              </span>
            ))}
          </div>
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
              {savedProgressions.map((saved) => (
                <div
                  className="saved-card"
                  key={saved.id}
                >
                  <div className="saved-card-head">
                    <strong>{saved.name}</strong>

                    <span className="saved-card-key">
                      {getDisplayKeyRoot(
                        saved.rootNote,
                        saved.scaleType
                      )}{" "}
                      {saved.scaleType} ·{" "}
                      {saved.voicing === "sevenths"
                        ? "7th chords"
                        : "triads"}
                    </span>
                  </div>

                  <div className="template-chip-row">
                    {saved.degrees.map((degree, index) => {
                      const chords = buildScaleChords(
                        saved.rootNote,
                        saved.scaleType,
                        accidentalPreference
                      );
                      const chord = chords[degree - 1];

                      return (
                        <span
                          className="template-chip"
                          key={`${degree}-${index}`}
                        >
                          {saved.voicing === "sevenths"
                            ? chord.seventhChordLabel
                            : chord.chordLabel}
                        </span>
                      );
                    })}
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
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default ChordProgressions;
