import { chordTypes } from "../data/chords";
import {
  formatNoteForDisplay,
  getNotesByPreference,
  type AccidentalPreference,
} from "../utils/musicTheory";

interface ChordSelectorProps {
  rootNote: string;
  chordTypeIndex: number;
  accidentalPreference: AccidentalPreference;
  onRootChange: (note: string) => void;
  onChordTypeChange: (index: number) => void;
  onAccidentalPreferenceChange: (
    preference: AccidentalPreference
  ) => void;
}

function ChordSelector({
  rootNote,
  chordTypeIndex,
  accidentalPreference,
  onRootChange,
  onChordTypeChange,
  onAccidentalPreferenceChange,
}: ChordSelectorProps) {
  const notes = getNotesByPreference(
    accidentalPreference
  );

  const categories = [
    "Triads",
    "Suspended",
    "Sixth Chords",
    "Seventh Chords",
    "Extended Chords",
    "Altered Chords",
    "Added Tone Chords",
  ];

  return (
    <div className="chord-selector">

      {/* ROOT NOTE — tap-friendly pills */}
      <div className="selector-group root-group">
        <span className="selector-label" id="root-label">
          Root note
        </span>

        <div
          className="root-pills"
          role="group"
          aria-labelledby="root-label"
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


      {/* CHORD TYPE */}
      <div className="selector-group">
        <label
          className="selector-label"
          htmlFor="chord-type"
        >
          Chord type
        </label>

        <select
          id="chord-type"
          value={chordTypeIndex}
          onChange={(event) =>
            onChordTypeChange(
              Number(event.target.value)
            )
          }
        >
          {categories.map((category) => {
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


      {/* SPELLING — segmented toggle */}
      <div className="selector-group">
        <span
          className="selector-label"
          id="notation-label"
        >
          Spelling
        </span>

        <div
          className="segmented"
          role="group"
          aria-labelledby="notation-label"
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
  );
}

export default ChordSelector;