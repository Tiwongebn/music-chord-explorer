import { useMemo, useState } from "react";
import {
  analyzeJazzChord,
  guitarJazzVoicings,
  midiToNote,
  pianoJazzVoicings,
  type JazzTone,
} from "../utils/jazzVoicings";
import {
  noteAt,
  voicingToStrings,
} from "../utils/guitarVoicings";
import {
  calculateChordNotes,
  formatNoteForDisplay,
  getPitchClass,
  type AccidentalPreference,
} from "../utils/musicTheory";
import {
  playGuitarString,
  playNote,
  playNotes,
  strumGuitar,
} from "../utils/audio";

interface JazzVoicingsProps {
  chordName: string;
  rootNote: string;
  intervals: number[];
  accidentalPreference: AccidentalPreference;
}

type Level = "simple" | "full";

const STRING_LABELS = ["E", "A", "D", "G", "B", "e"];

// Same geometry as the chord shape in GuitarFretboard.
const LEFT = 36;
const TOP = 34;
const STRING_GAP = 28;
const FRET_GAP = 34;
const DOT_R = 11;
const SHAPE_ROWS = 5;

const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11];

function JazzVoicings({
  chordName,
  rootNote,
  intervals,
  accidentalPreference,
}: JazzVoicingsProps) {
  const [level, setLevel] = useState<Level>("simple");
  const [pianoIndex, setPianoIndex] = useState(0);
  const [guitarIndex, setGuitarIndex] = useState(0);

  const rootPc = getPitchClass(rootNote);
  const intervalKey = intervals.join(",");

  const { chord, piano, guitar } = useMemo(
    () => ({
      chord: analyzeJazzChord(intervals),
      piano: pianoJazzVoicings(
        rootPc,
        intervals,
        level === "simple" ? "shell" : "rootless"
      ),
      guitar: guitarJazzVoicings(
        rootPc,
        intervals,
        level === "simple" ? "shell" : "drop2"
      ),
    }),
    // intervals is rebuilt each render; its contents are the key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rootPc, intervalKey, level]
  );

  // Spell each tone against the root so Sharps/Flats and odd
  // spellings (B𝄫 in Cdim7) come out right.
  const spell = (tone: JazzTone) =>
    formatNoteForDisplay(
      calculateChordNotes(
        rootNote,
        [tone.semitones],
        [tone.intervalName],
        accidentalPreference
      )[0] ?? ""
    );

  const pianoVoicing = piano[pianoIndex % piano.length];
  const guitarVoicing = guitar.length
    ? guitar[guitarIndex % guitar.length]
    : null;

  const switchLevel = (next: Level) => {
    setLevel(next);
    setPianoIndex(0);
    setGuitarIndex(0);
  };

  const playPiano = () => {
    playNotes(pianoVoicing.notes.map((note) => midiToNote(note.midi)));
  };

  const strum = () => {
    if (guitarVoicing) {
      strumGuitar(voicingToStrings(guitarVoicing.frets), "down", 35);
    }
  };

  const pluck = (string: number, fret: number) => {
    playGuitarString({ string, note: noteAt(string, fret) });
  };

  // ---- Mini keyboard: only the octaves the voicing uses.
  const midis = pianoVoicing.notes.map((note) => note.midi);
  const lowC = Math.floor(Math.min(...midis) / 12) * 12;
  const highB = Math.floor(Math.max(...midis) / 12) * 12 + 11;
  const keys: { midi: number; white: boolean; whiteIndex: number }[] = [];
  let whiteCount = 0;

  for (let midi = lowC; midi <= highB; midi++) {
    const white = WHITE_PCS.includes(midi % 12);

    keys.push({ midi, white, whiteIndex: whiteCount });

    if (white) {
      whiteCount++;
    }
  }

  const toneAt = new Map(
    pianoVoicing.notes.map((note) => [note.midi, note.tone])
  );
  const whiteWidth = 100 / whiteCount;

  const keyName = (midi: number) => {
    const tone = toneAt.get(midi);

    return tone
      ? `${spell(tone)}${Math.floor(midi / 12) - 1}`
      : midiToNote(midi);
  };

  const renderKey = (key: (typeof keys)[number]) => {
    const tone = toneAt.get(key.midi);
    const classes = [
      "piano-key",
      key.white ? "white" : "black",
      tone ? "active" : "",
      tone?.degree === "R" ? "jazz-root" : "",
    ].join(" ");

    return (
      <button
        key={key.midi}
        type="button"
        className={classes}
        style={
          key.white
            ? undefined
            : {
                left: `${(key.whiteIndex - 0.35) * whiteWidth}%`,
                width: `${whiteWidth * 0.7}%`,
              }
        }
        aria-label={
          tone
            ? `${keyName(key.midi)}, the ${tone.degree === "R" ? "root" : tone.degree}`
            : keyName(key.midi)
        }
        onClick={() => playNote(midiToNote(key.midi))}
      >
        {tone && <span className="key-label">{tone.degree}</span>}
        {key.white && key.midi % 12 === 0 && !tone && (
          <span className="octave-label">
            C{Math.floor(key.midi / 12) - 1}
          </span>
        )}
      </button>
    );
  };

  // ---- Guitar diagram geometry.
  const width = LEFT + STRING_GAP * 5 + 30;
  const height = TOP + FRET_GAP * SHAPE_ROWS + 14;

  const shapeName = (index: number) =>
    level === "simple" ? `Shell ${index + 1}` : `Drop 2 · ${index + 1}`;

  return (
    <section className="jazz-voicings">
      <div className="fretboard-header">
        <h2>Jazz voicings · {chordName}</h2>

        <div className="segmented" role="group" aria-label="Voicing detail">
          {(["simple", "full"] as const).map((item) => (
            <button
              key={item}
              type="button"
              className={level === item ? "seg active" : "seg"}
              aria-pressed={level === item}
              onClick={() => switchLevel(item)}
            >
              {item === "simple" ? "Simple · shells" : "Full · rootless & drop 2"}
            </button>
          ))}
        </div>
      </div>

      <p className="jazz-intro">
        {level === "simple" ? (
          <>
            Not sure what to play under <strong>{chordName}</strong>?
            Start with a <strong>shell</strong>: just the root, the{" "}
            {chord.third.degree === "4" || chord.third.degree === "2"
              ? "sus note"
              : "3rd"}{" "}
            and the {chord.seventh.degree === "6" ? "6th" : "7th"}. Those
            three notes already tell the band what kind of chord it
            is. The 5th and any extensions can wait.
          </>
        ) : (
          <>
            Full voicings add colour. On piano the{" "}
            <strong>rootless</strong> shapes drop the root (the bass
            player covers it) and add the 9th
            {chord.third.semitones === 4 && chord.seventh.semitones === 10
              ? " and 13th"
              : ""}
            . On guitar, <strong>drop 2</strong> shapes spread four
            chord tones across four neighbouring strings.
          </>
        )}
      </p>

      {chord.borrowed && (
        <p className="jazz-borrowed">
          {chordName} has no 7th. Jazz players nearly always add one,
          so these voicings borrow the{" "}
          {chord.borrowed.intervalName.toLowerCase()} (
          {spell(chord.borrowed)}).
        </p>
      )}

      <div className="jazz-grid">

        {/* PIANO */}
        <div className="jazz-instrument">
          <h3 className="jazz-instrument-name">Piano</h3>

          <div className="segmented" role="group" aria-label="Piano voicing">
            {piano.map((voicing, index) => (
              <button
                key={voicing.label}
                type="button"
                className={
                  pianoIndex % piano.length === index ? "seg active" : "seg"
                }
                aria-pressed={pianoIndex % piano.length === index}
                onClick={() => setPianoIndex(index)}
              >
                {voicing.label}
              </button>
            ))}
          </div>

          <div className="jazz-keys-wrapper">
            <div
              className="jazz-keyboard"
              style={{ minWidth: `${whiteCount * 24}px` }}
            >
              {keys.filter((key) => key.white).map(renderKey)}
              {keys.filter((key) => !key.white).map(renderKey)}
            </div>
          </div>

          <p className="jazz-notes">
            {pianoVoicing.notes.map((note) => (
              <span key={note.midi}>
                <span className="jazz-degree">{note.tone.degree}</span>{" "}
                {spell(note.tone)}
              </span>
            ))}
          </p>

          <p className="fretboard-hint">{pianoVoicing.hint}</p>

          <button type="button" className="play-chord" onClick={playPiano}>
            ▶ Play piano
          </button>
        </div>

        {/* GUITAR */}
        <div className="jazz-instrument">
          <h3 className="jazz-instrument-name">Guitar</h3>

          {guitarVoicing ? (
            <>
              <div className="jazz-guitar">
                <svg
                  viewBox={`0 0 ${width} ${height}`}
                  role="img"
                  aria-label={`${chordName} ${shapeName(guitarIndex % guitar.length)}, frets ${guitarVoicing.frets
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
                      {guitarVoicing.frets[string] < 0 ? "×" : label}
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
                        row === 0 && guitarVoicing.baseFret === 1
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

                  {guitarVoicing.baseFret > 1 && (
                    <text
                      x={LEFT - 12}
                      y={TOP + FRET_GAP / 2 + 5}
                      textAnchor="end"
                      className="fretboard-label"
                    >
                      {guitarVoicing.baseFret}fr
                    </text>
                  )}

                  {guitarVoicing.frets.map((fret, string) => {
                    const tone = guitarVoicing.tones[string];

                    if (fret < 0 || !tone) {
                      return null;
                    }

                    const x = LEFT + string * STRING_GAP;

                    if (fret === 0) {
                      return (
                        <g key={`dot-${string}`}>
                          <circle
                            cx={x}
                            cy={TOP - 10}
                            r={6}
                            className="fretboard-open"
                          />
                        </g>
                      );
                    }

                    const row = fret - guitarVoicing.baseFret;
                    const y = TOP + row * FRET_GAP + FRET_GAP / 2;

                    return (
                      <g key={`dot-${string}`}>
                        <circle
                          cx={x}
                          cy={y}
                          r={DOT_R}
                          className={
                            tone.degree === "R"
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
                          {tone.degree}
                        </text>
                      </g>
                    );
                  })}

                  {guitarVoicing.frets.map((fret, string) =>
                    fret < 0 ? null : (
                      <rect
                        key={`hit-${string}`}
                        x={LEFT + string * STRING_GAP - STRING_GAP / 2}
                        y={0}
                        width={STRING_GAP}
                        height={height}
                        className="fretboard-hit"
                        role="button"
                        tabIndex={0}
                        aria-label={`Pluck ${STRING_LABELS[string]} string, ${formatNoteForDisplay(noteAt(string, fret))}`}
                        onClick={() => pluck(string, fret)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            pluck(string, fret);
                          }
                        }}
                      />
                    )
                  )}
                </svg>

                <div className="fretboard-controls">
                  <p className="fretboard-count">
                    {shapeName(guitarIndex % guitar.length)} of {guitar.length}
                    <br />
                    {guitarVoicing.label}
                  </p>

                  <p className="jazz-notes">
                    {guitarVoicing.tones.map((tone, string) =>
                      tone ? (
                        <span key={string}>
                          <span className="jazz-degree">{tone.degree}</span>{" "}
                          {spell(tone)}
                        </span>
                      ) : null
                    )}
                  </p>

                  <button type="button" className="play-chord" onClick={strum}>
                    ▶ Strum
                  </button>

                  {guitar.length > 1 && (
                    <button
                      type="button"
                      className="template-use"
                      onClick={() =>
                        setGuitarIndex((guitarIndex + 1) % guitar.length)
                      }
                    >
                      Next shape
                    </button>
                  )}
                </div>
              </div>

              <p className="fretboard-hint">
                {level === "simple"
                  ? "Mute the × strings with spare fingers. Learn the two 6th-string and two 5th-string shells and you can play almost any jazz tune."
                  : "Each shape is a different inversion of the same chord. Pick the one closest to your last chord so your hand moves as little as possible."}
                {" "}Tap a string to pluck it.
              </p>
            </>
          ) : (
            <p className="fretboard-hint">
              This chord doesn&apos;t fit a four-string drop 2 shape.
              Try the simple shells instead.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export default JazzVoicings;
