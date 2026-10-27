import { useMemo, useState } from "react";
import {
  STANDARD_TUNING,
  findGuitarVoicings,
  voicingToNotes,
} from "../utils/guitarVoicings";
import {
  formatNoteForDisplay,
  getPitchClass,
} from "../utils/musicTheory";
import { playNotes } from "../utils/audio";

interface GuitarFretboardProps {
  chordName: string;
  rootNote: string;
  // Spelled chord tones (already respect Sharps/Flats).
  notes: string[];
  intervals: number[];
}

const STRING_LABELS = ["E", "A", "D", "G", "B", "e"];
const NECK_FRETS = 12;
const SHAPE_ROWS = 5;

// Diagram geometry (viewBox units).
const LEFT = 36;
const TOP = 34;
const STRING_GAP = 28;
const FRET_GAP = 34;
const DOT_R = 11;

function GuitarFretboard({
  chordName,
  rootNote,
  notes,
  intervals,
}: GuitarFretboardProps) {
  const [view, setView] = useState<"shape" | "neck">("shape");
  const [shapeIndex, setShapeIndex] = useState(0);

  const rootPc = getPitchClass(rootNote);
  const intervalKey = intervals.join(",");

  const voicings = useMemo(
    () => findGuitarVoicings(rootPc, intervals),
    // intervals is rebuilt each render; its contents are the key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rootPc, intervalKey]
  );

  // Spelling for a pitch class, so dots follow Sharps/Flats.
  const spelling = new Map(
    notes.map((note) => [getPitchClass(note), note])
  );
  const noteName = (pc: number) =>
    formatNoteForDisplay(spelling.get(pc) ?? "");

  const voicing = voicings[shapeIndex % (voicings.length || 1)];

  const handlePlay = () => {
    if (voicing) {
      playNotes(voicingToNotes(voicing.frets), 40);
    }
  };

  const width = LEFT + STRING_GAP * 5 + 30;
  const height = TOP + FRET_GAP * SHAPE_ROWS + 14;

  return (
    <section className="fretboard">
      <div className="fretboard-header">
        <h2>Guitar · {chordName}</h2>

        <div className="segmented" role="group" aria-label="Guitar view">
          <button
            type="button"
            className={view === "shape" ? "seg active" : "seg"}
            aria-pressed={view === "shape"}
            onClick={() => setView("shape")}
          >
            Chord shape
          </button>

          <button
            type="button"
            className={view === "neck" ? "seg active" : "seg"}
            aria-pressed={view === "neck"}
            onClick={() => setView("neck")}
          >
            Whole neck
          </button>
        </div>
      </div>

      {view === "shape" ? (
        voicing ? (
          <div className="fretboard-shape">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              role="img"
              aria-label={`${chordName} guitar shape, frets ${voicing.frets
                .map((fret) => (fret < 0 ? "x" : fret))
                .join(" ")}`}
            >
              {STRING_LABELS.map((label, string) => (
                <text
                  key={`label-${string}`}
                  x={LEFT + string * STRING_GAP}
                  y={14}
                  textAnchor="middle"
                  className="fretboard-label"
                >
                  {voicing.frets[string] < 0 ? "×" : label}
                </text>
              ))}

              {Array.from({ length: SHAPE_ROWS + 1 }, (_, row) => (
                <line
                  key={`fret-${row}`}
                  x1={LEFT}
                  x2={LEFT + STRING_GAP * 5}
                  y1={TOP + row * FRET_GAP}
                  y2={TOP + row * FRET_GAP}
                  className={
                    row === 0 && voicing.baseFret === 1
                      ? "fretboard-nut"
                      : "fretboard-fret"
                  }
                />
              ))}

              {STRING_LABELS.map((_, string) => (
                <line
                  key={`string-${string}`}
                  x1={LEFT + string * STRING_GAP}
                  x2={LEFT + string * STRING_GAP}
                  y1={TOP}
                  y2={TOP + SHAPE_ROWS * FRET_GAP}
                  className="fretboard-string"
                />
              ))}

              {voicing.baseFret > 1 && (
                <text
                  x={LEFT - 12}
                  y={TOP + FRET_GAP / 2 + 5}
                  textAnchor="end"
                  className="fretboard-label"
                >
                  {voicing.baseFret}fr
                </text>
              )}

              {voicing.frets.map((fret, string) => {
                if (fret < 0) {
                  return null;
                }

                const pc = (STANDARD_TUNING[string] + fret) % 12;
                const x = LEFT + string * STRING_GAP;
                const isRoot = pc === rootPc;

                if (fret === 0) {
                  return (
                    <circle
                      key={`dot-${string}`}
                      cx={x}
                      cy={TOP - 10}
                      r={6}
                      className="fretboard-open"
                    />
                  );
                }

                const row = fret - voicing.baseFret;

                return (
                  <g key={`dot-${string}`}>
                    <circle
                      cx={x}
                      cy={TOP + row * FRET_GAP + FRET_GAP / 2}
                      r={DOT_R}
                      className={
                        isRoot
                          ? "fretboard-dot root"
                          : "fretboard-dot"
                      }
                    />
                    <text
                      x={x}
                      y={TOP + row * FRET_GAP + FRET_GAP / 2 + 4}
                      textAnchor="middle"
                      className="fretboard-dot-label"
                    >
                      {noteName(pc)}
                    </text>
                  </g>
                );
              })}
            </svg>

            <div className="fretboard-controls">
              <p className="fretboard-count">
                Shape {(shapeIndex % voicings.length) + 1} of{" "}
                {voicings.length}
              </p>

              <button
                type="button"
                className="play-chord"
                onClick={handlePlay}
              >
                ▶ Strum
              </button>

              {voicings.length > 1 && (
                <button
                  type="button"
                  className="play-chord"
                  onClick={() =>
                    setShapeIndex(
                      (shapeIndex + 1) % voicings.length
                    )
                  }
                >
                  Next shape
                </button>
              )}

              <p className="fretboard-hint">
                Purple dots are the root. × means skip that
                string; a ring above the nut is an open string.
              </p>
            </div>
          </div>
        ) : (
          <p className="fretboard-hint">
            No comfortable guitar shape found for this chord.
            Try the whole-neck view to find the notes.
          </p>
        )
      ) : (
        <div className="fretboard-neck">
          <svg
            viewBox={`0 0 ${NECK_FRETS * 52 + 50} ${5 * 26 + 56}`}
            role="img"
            aria-label={`Every ${chordName} note on the neck`}
          >
            {Array.from({ length: NECK_FRETS + 1 }, (_, fret) => (
              <g key={`neck-fret-${fret}`}>
                <line
                  x1={40 + fret * 52}
                  x2={40 + fret * 52}
                  y1={20}
                  y2={20 + 5 * 26}
                  className={
                    fret === 0 ? "fretboard-nut" : "fretboard-fret"
                  }
                />
                {fret > 0 && (
                  <text
                    x={40 + fret * 52 - 26}
                    y={20 + 5 * 26 + 24}
                    textAnchor="middle"
                    className="fretboard-label"
                  >
                    {fret}
                  </text>
                )}
              </g>
            ))}

            {/* High string on top, like tab. */}
            {[...STRING_LABELS].reverse().map((label, row) => {
              const string = 5 - row;
              const y = 20 + row * 26;

              return (
                <g key={`neck-string-${string}`}>
                  <text
                    x={7}
                    y={y + 4}
                    textAnchor="middle"
                    className="fretboard-label"
                  >
                    {label}
                  </text>
                  <line
                    x1={40}
                    x2={40 + NECK_FRETS * 52}
                    y1={y}
                    y2={y}
                    className="fretboard-string"
                  />

                  {Array.from({ length: NECK_FRETS + 1 }, (_, fret) => {
                    const pc =
                      (STANDARD_TUNING[string] + fret) % 12;

                    if (!spelling.has(pc)) {
                      return null;
                    }

                    // Open-string dots sit left of the nut.
                    const x = fret === 0 ? 24 : 40 + fret * 52 - 26;

                    return (
                      <g key={`neck-dot-${string}-${fret}`}>
                        <circle
                          cx={x}
                          cy={y}
                          r={10}
                          className={
                            pc === rootPc
                              ? "fretboard-dot root"
                              : "fretboard-dot"
                          }
                        />
                        <text
                          x={x}
                          y={y + 4}
                          textAnchor="middle"
                          className="fretboard-dot-label"
                        >
                          {noteName(pc)}
                        </text>
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </section>
  );
}

export default GuitarFretboard;
