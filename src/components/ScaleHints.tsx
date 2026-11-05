import { useMemo, useState } from "react";
import {
  scaleHintFor,
  type HintNote,
  type KeyContext,
  type SpelledScale,
} from "../utils/scaleHints";
import { STANDARD_TUNING } from "../utils/guitarVoicings";
import {
  formatNoteForDisplay,
  getPitchClass,
  type AccidentalPreference,
} from "../utils/musicTheory";
import {
  playGuitarString,
  playNote,
  preloadGuitar,
} from "../utils/audio";

interface ScaleHintsProps {
  chordName: string;
  // Spelled root under the Sharps/Flats setting, e.g. "Db".
  root: string;
  intervals: number[];
  accidentalPreference: AccidentalPreference;
  // Explore only: the switch that marks guide tones on the
  // big piano and guitar above.
  markGuides?: boolean;
  onMarkGuidesChange?: (value: boolean) => void;
  // Progressions: the song's key, so chords that belong to
  // it get the key's own scale ("C major" shown on screen).
  songKey?: KeyContext & { name: string };
}

type View = "piano" | "guitar";

const fmt = formatNoteForDisplay;

const ROLE_TEXT: Record<HintNote["role"], string> = {
  root: "root",
  guide: "guide tone",
  chord: "chord tone",
  scale: "scale note",
  avoid: "careful",
};

const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11];
const BLACK_KEYS = [
  { pc: 1, after: 0 },
  { pc: 3, after: 1 },
  { pc: 6, after: 3 },
  { pc: 8, after: 4 },
  { pc: 10, after: 5 },
];

const STRING_NAMES = ["E", "A", "D", "G", "B", "e"];
const NECK_FRETS = 12;

function joinNotes(notes: string[]): string {
  if (notes.length <= 1) {
    return notes.join("");
  }

  return `${notes.slice(0, -1).join(", ")} and ${notes[notes.length - 1]}`;
}

interface Box {
  low: number;
  high: number;
  // String (0 = low E) and fret the box's root sits on.
  rootString: number;
  rootFret: number;
}

// A five-fret box where a beginner can play the whole scale
// without shifting: root on the low E string, or on the A
// string when the low-E root is too high to fit the 12 frets
// on screen (D, E♭).
function boxFor(rootPc: number): Box {
  const lowE = (rootPc - 4 + 12) % 12;

  if (lowE === 0) {
    return { low: 0, high: 4, rootString: 0, rootFret: 0 };
  }

  if (lowE + 3 <= NECK_FRETS) {
    return { low: lowE - 1, high: lowE + 3, rootString: 0, rootFret: lowE };
  }

  const onA = (rootPc - 9 + 12) % 12;

  return { low: onA - 1, high: onA + 3, rootString: 1, rootFret: onA };
}

// One octave up from the root and back down, as MIDI notes.
function scaleRun(rootMidi: number, scale: SpelledScale): number[] {
  const up = [
    ...scale.notes.map((item) => rootMidi + item.semitones),
    rootMidi + 12,
  ];

  return [...up, ...up.slice(0, -1).reverse()];
}

function midiToName(midi: number): string {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

  return `${names[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

// Where to fret a MIDI note: inside the box if it fits,
// otherwise the lowest string that can reach it.
function placeOnGuitar(
  midi: number,
  [low, high]: [number, number]
): { string: number; fret: number } | null {
  for (let string = 0; string < 6; string++) {
    const fret = midi - STANDARD_TUNING[string];

    if (fret >= low && fret <= high) {
      return { string, fret };
    }
  }

  for (let string = 5; string >= 0; string--) {
    const fret = midi - STANDARD_TUNING[string];

    if (fret >= 0 && fret <= 15) {
      return { string, fret };
    }
  }

  return null;
}

function ScaleHints({
  chordName,
  root,
  intervals,
  accidentalPreference,
  markGuides,
  onMarkGuidesChange,
  songKey,
}: ScaleHintsProps) {
  const [view, setView] = useState<View>("piano");
  // Which scale is on show: the main pick, an alternative,
  // or the easy pentatonic. Stored by id so changing chord
  // falls back to the main pick if the id isn't offered.
  const [pickedId, setPickedId] = useState<string | null>(null);

  const intervalKey = intervals.join(",");
  const keyPcs = songKey?.pitchClasses.join(",");
  const hint = useMemo(
    () =>
      scaleHintFor(root, intervals, accidentalPreference, songKey),
    // intervals and songKey are rebuilt each render; their
    // contents are the key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [root, intervalKey, accidentalPreference, keyPcs]
  );

  const rootName = fmt(root);
  const rootPc = getPitchClass(root);

  const options = [
    hint.scale,
    ...hint.alternatives,
    hint.easy,
  ].filter((item): item is SpelledScale => item !== null);

  const shown =
    options.find((item) => item.id === pickedId) ?? hint.scale;

  const guideNames = hint.guideTones.map(
    (tone) => `${fmt(tone.note)} (${tone.label})`
  );
  const implied = hint.guideTones.filter((tone) => tone.implied);

  const box = boxFor(rootPc);

  const handlePlayScale = () => {
    if (!shown) {
      return;
    }

    if (view === "piano") {
      scaleRun(60 + rootPc, shown).forEach((midi, index) => {
        playNote(midiToName(midi), { when: index * 0.26, duration: 0.5 });
      });
      return;
    }

    preloadGuitar();

    const rootMidi = STANDARD_TUNING[box.rootString] + box.rootFret;

    scaleRun(rootMidi, shown).forEach((midi, index) => {
      const spot = placeOnGuitar(midi, [box.low, box.high]);

      if (spot) {
        playGuitarString(
          { string: spot.string, note: midiToName(midi) },
          index * 0.26
        );
      }
    });
  };

  // The guide tones one after the other, then together:
  // the sound of the chord with nothing else in the way.
  const handlePlayGuides = () => {
    const midis = hint.guideTones.map(
      (tone) => 60 + ((rootPc + tone.semitones) % 12)
    );
    const sorted = [...midis].sort((a, b) => a - b);

    if (view === "piano") {
      sorted.forEach((midi, index) => {
        playNote(midiToName(midi), { when: index * 0.45, duration: 0.8 });
      });
      sorted.forEach((midi) => {
        playNote(midiToName(midi), {
          when: sorted.length * 0.45 + 0.1,
          duration: 1.6,
        });
      });
      return;
    }

    preloadGuitar();

    sorted.forEach((midi, index) => {
      const spot = placeOnGuitar(midi - 12, [box.low, box.high]);

      if (spot) {
        playGuitarString(
          { string: spot.string, note: midiToName(midi - 12) },
          index * 0.45
        );
      }
    });
  };

  const roleOf = (pc: number): HintNote | undefined =>
    shown?.notes.find(
      (item) => (rootPc + item.semitones) % 12 === pc
    );

  return (
    <section className="scale-hints">
      <div className="scale-hints-head">
        <h2>Improvise over {chordName}</h2>

        <div className="segmented" role="group" aria-label="Show the scale on">
          {(["piano", "guitar"] as const).map((item) => (
            <button
              key={item}
              type="button"
              className={view === item ? "seg active" : "seg"}
              aria-pressed={view === item}
              onClick={() => setView(item)}
            >
              {item === "piano" ? "Piano" : "Guitar"}
            </button>
          ))}
        </div>
      </div>

      {shown ? (
        <>
          <p className="scale-hints-name">
            <span className="scale-hints-root">{rootName}</span>{" "}
            {shown.name}
            {shown.aka && (
              <span className="scale-hints-aka"> ({shown.aka})</span>
            )}
          </p>

          <p className="scale-hints-sound">{shown.sound}</p>

          {options.length > 1 && (
            <div
              className="segmented scale-hints-picker"
              role="group"
              aria-label="Scale to show"
            >
              {options.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className={shown.id === item.id ? "seg active" : "seg"}
                  aria-pressed={shown.id === item.id}
                  onClick={() => setPickedId(item.id)}
                >
                  {index === 0
                    ? hint.fromKey
                      ? "In the key"
                      : "Best fit"
                    : item === hint.easy
                      ? "Easy start"
                      : "Also try"}
                  {": "}
                  {item.name}
                </button>
              ))}
            </div>
          )}

          <ol className="scale-hints-notes" aria-label={`${rootName} ${shown.name} notes`}>
            {shown.notes.map((item) => (
              <li
                key={`${item.label}-${item.note}`}
                className={`scale-note role-${item.role}`}
                title={ROLE_TEXT[item.role]}
              >
                <span className="scale-note-degree">{item.label}</span>
                <span className="scale-note-name">{fmt(item.note)}</span>
              </li>
            ))}
          </ol>

          <ul className="scale-hints-legend" aria-label="Colour key">
            <li><span className="swatch role-root" /> root</li>
            <li><span className="swatch role-guide" /> guide tone</li>
            <li><span className="swatch role-chord" /> other chord tone</li>
            <li><span className="swatch role-scale" /> passing note</li>
            {shown.notes.some((item) => item.role === "avoid") && (
              <li><span className="swatch role-avoid" /> careful</li>
            )}
          </ul>

          {view === "piano" ? (
            <div className="scale-piano" aria-hidden="true">
              {[0, 1].map((octave) => (
                <div className="scale-piano-octave" key={octave}>
                  {WHITE_PCS.map((pc) => {
                    const item = roleOf(pc);

                    return (
                      <div
                        key={pc}
                        className={`scale-piano-white${item ? ` on role-${item.role}` : ""}`}
                      >
                        {item && <span>{item.label}</span>}
                      </div>
                    );
                  })}

                  {BLACK_KEYS.map(({ pc, after }) => {
                    const item = roleOf(pc);

                    return (
                      <div
                        key={pc}
                        className={`scale-piano-black${item ? ` on role-${item.role}` : ""}`}
                        style={{ left: `${((after + 1) / 7) * 100}%` }}
                      >
                        {item && <span>{item.label}</span>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : (
            <div className="scale-neck">
              <svg
                viewBox={`0 0 ${NECK_FRETS * 48 + 46} ${5 * 24 + 50}`}
                role="img"
                aria-label={`${rootName} ${shown.name} on the guitar neck, frets 0 to ${NECK_FRETS}`}
              >
                <rect
                  x={box.low === 0 ? 14 : 38 + (box.low - 1) * 48}
                  y={8}
                  width={(box.high - Math.max(box.low, 1) + 1) * 48 + (box.low === 0 ? 24 : 0)}
                  height={5 * 24 + 24}
                  rx={10}
                  className="scale-neck-box"
                />

                {Array.from({ length: NECK_FRETS + 1 }, (_, fret) => (
                  <g key={`fret-${fret}`}>
                    <line
                      x1={38 + fret * 48}
                      x2={38 + fret * 48}
                      y1={20}
                      y2={20 + 5 * 24}
                      className={fret === 0 ? "fretboard-nut" : "fretboard-fret"}
                    />
                    {fret > 0 && (
                      <text
                        x={38 + fret * 48 - 24}
                        y={20 + 5 * 24 + 24}
                        textAnchor="middle"
                        className="fretboard-label"
                      >
                        {fret}
                      </text>
                    )}
                  </g>
                ))}

                {/* High string on top, like tab. */}
                {[...STRING_NAMES].reverse().map((label, row) => {
                  const string = 5 - row;
                  const y = 20 + row * 24;

                  return (
                    <g key={`string-${string}`}>
                      <text x={6} y={y + 4} textAnchor="middle" className="fretboard-label">
                        {label}
                      </text>
                      <line
                        x1={38}
                        x2={38 + NECK_FRETS * 48}
                        y1={y}
                        y2={y}
                        className="fretboard-string"
                      />

                      {Array.from({ length: NECK_FRETS + 1 }, (_, fret) => {
                        const pc = (STANDARD_TUNING[string] + fret) % 12;
                        const item = roleOf(pc);

                        if (!item) {
                          return null;
                        }

                        const x = fret === 0 ? 22 : 38 + fret * 48 - 24;
                        const inBox = fret >= box.low && fret <= box.high;

                        return (
                          <g
                            key={`dot-${string}-${fret}`}
                            className={inBox ? "scale-dot in-box" : "scale-dot"}
                          >
                            <circle cx={x} cy={y} r={10} className={`role-${item.role}`} />
                            <text x={x} y={y + 3.5} textAnchor="middle">
                              {item.label}
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

          {view === "guitar" && (
            <p className="hint">
              The lit box (frets {box.low}–{box.high}) holds the whole
              scale with the root on the {box.rootString === 0 ? "low E" : "A"}{" "}
              string. Start there.
            </p>
          )}

          <div className="scale-hints-actions">
            <button type="button" className="play-chord" onClick={handlePlayScale}>
              ▶ Play scale
            </button>
            <button type="button" className="template-use" onClick={handlePlayGuides}>
              Hear the guide tones
            </button>
          </div>
        </>
      ) : (
        <p className="scale-hints-sound">
          No common scale holds every note of this chord. Stick to
          the chord tones, and lean on the guide tones below.
        </p>
      )}

      <div className="scale-hints-tips">
        <p>
          <strong>Guide tones: {joinNotes(guideNames)}.</strong>{" "}
          The 3rd and 7th are the two notes that tell you what kind of
          chord this is. Land on one of them when the chord changes,
          and your line will sound like it knows where it is.
          {implied.length > 0 && (
            <>
              {" "}
              {joinNotes(implied.map((tone) => fmt(tone.note)))} isn’t in{" "}
              {chordName} as written, but a jazz player would add it.
            </>
          )}
        </p>

        {hint.fromKey && songKey && shown === hint.scale && (
          <p>
            <strong>
              Every note of {chordName} is in {songKey.name}.
            </strong>{" "}
            So the {songKey.name} scale works here. Started from{" "}
            {rootName} it is called {rootName} {hint.scale?.name}, and
            you can keep playing the same notes over the other chords
            in the key too.
          </p>
        )}

        {hint.leadsIntoKey && songKey && shown === hint.scale && (
          <p>
            <strong>{chordName} isn’t in {songKey.name}</strong>, but it
            usually leads into a chord that is. {rootName} {hint.scale?.name}{" "}
            keeps the key’s notes and adds the chord’s own 3rd, so your line
            pulls toward where the chord is going.
          </p>
        )}

        {hint.avoid.length > 0 && shown === hint.scale && (
          <p>
            <strong>
              Careful with {joinNotes(hint.avoid.map((item) => fmt(item.note)))}.
            </strong>{" "}
            {hint.avoid.length === 1
              ? "It sits a half step above a chord tone and rubs against it. Pass through it on the way somewhere else rather than holding it."
              : "They sit a half step above chord tones and rub against them. Pass through them on the way somewhere else rather than holding them."}
          </p>
        )}

        {hint.easy && shown === hint.scale && (
          <p>
            <strong>Not ready for {hint.scale?.notes.length} notes?</strong>{" "}
            Start with {rootName} {hint.easy.name.toLowerCase()}:{" "}
            {hint.easy.notes.map((item) => fmt(item.note)).join(" ")}.
          </p>
        )}

        {hint.note && <p>{hint.note}</p>}
      </div>

      {onMarkGuidesChange && (
        <label className="scale-hints-mark">
          <input
            type="checkbox"
            checked={markGuides ?? false}
            onChange={(event) => onMarkGuidesChange(event.target.checked)}
          />
          Mark guide tones in mint on the piano and guitar
        </label>
      )}
    </section>
  );
}

export default ScaleHints;
