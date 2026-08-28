import { notes } from "../utils/musicTheory";
import { chordTypes } from "../data/chords";

interface ChordSelectorProps {
  rootNote: string;
  chordTypeIndex: number;
  onRootChange: (note: string) => void;
  onChordTypeChange: (index: number) => void;
}

function ChordSelector({
  rootNote,
  chordTypeIndex,
  onRootChange,
  onChordTypeChange,
}: ChordSelectorProps) {
  return (
    <div className="chord-selector">
      <div className="selector-group">
        <label htmlFor="root-note">Root Note</label>

        <select
          id="root-note"
          value={rootNote}
          onChange={(event) => onRootChange(event.target.value)}
        >
          {notes.map((note) => (
            <option key={note} value={note}>
              {note}
            </option>
          ))}
        </select>
      </div>

      <div className="selector-group">
        <label htmlFor="chord-type">Chord Type</label>

        <select
          id="chord-type"
          value={chordTypeIndex}
          onChange={(event) =>
            onChordTypeChange(Number(event.target.value))
          }
        >
          {chordTypes.map((chord, index) => (
            <option key={chord.name} value={index}>
              {chord.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default ChordSelector;