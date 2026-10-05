import { useMemo, useState } from "react";

import {
  commonProgressions,
  functionDescriptions,
  progressionMap,
  type ScaleType,
} from "../data/scales";
import {
  buildScaleChords,
  type ScaleChord,
} from "../utils/scaleHarmony";
import {
  formatNoteForDisplay,
  getNotesByPreference,
  type AccidentalPreference,
} from "../utils/musicTheory";
import { playNotes, playProgression } from "../utils/audio";

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

  const [highlightedDegree, setHighlightedDegree] =
    useState<number | null>(null);

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

  return (
    <section className="panel progressions-panel">
      <div className="progressions-header">
        <p className="eyebrow">HARMONY MAP</p>
        <h2>Chord Progressions</h2>
        <p className="subtitle-left">
          See every chord that naturally belongs to a
          key, which chords it flows into, and borrow a
          few progressions that always work.
        </p>
      </div>

      {/* KEY + SCALE PICKER */}
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
      </div>

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
            <button
              key={chord.degree}
              type="button"
              className={classes.join(" ")}
              onClick={() => {
                setHighlightedDegree((current) =>
                  current === chord.degree
                    ? null
                    : chord.degree
                );
                handlePlayChord(chord);
              }}
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
            goes well with — the highlighted cards show
            where it naturally wants to lead.
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
                </div>

                <div className="template-chip-row">
                  {template.degrees.map(
                    (degree, index) => (
                      <span
                        className="template-chip"
                        key={`${degree}-${index}`}
                      >
                        {chordByDegree(degree)
                          .chordLabel}
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
    </section>
  );
}

export default ChordProgressions;
