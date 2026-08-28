import { chordTypes } from "../data/chords";
import {
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

      <div className="selector-group">
        <label htmlFor="root-note">
          Root Note
        </label>

        <select
          id="root-note"
          value={rootNote}
          onChange={(event) =>
            onRootChange(event.target.value)
          }
        >
          {notes.map((note) => (
            <option key={note} value={note}>
              {note}
            </option>
          ))}
        </select>
      </div>

      <div className="selector-group">
        <label htmlFor="notation">
          Note Spelling
        </label>

        <select
          id="notation"
          value={accidentalPreference}
          onChange={(event) =>
            onAccidentalPreferenceChange(
              event.target.value as AccidentalPreference
            )
          }
        >
          <option value="sharps">
            Sharps
          </option>

          <option value="flats">
            Flats
          </option>
        </select>
      </div>

      <div className="selector-group">
        <label htmlFor="chord-type">
          Chord Type
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

    </div>
  );
}

export default ChordSelector;