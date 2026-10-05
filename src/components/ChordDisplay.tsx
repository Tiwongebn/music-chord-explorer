import { formatNoteForDisplay } from "../utils/musicTheory";

interface ChordDisplayProps {
  chordName: string;
  notes: string[];
  intervalNames: string[];
  intervals: number[];
  onPlay?: () => void;
}

function ChordDisplay({
  chordName,
  notes,
  intervalNames,
  intervals,
  onPlay,
}: ChordDisplayProps) {
  return (
    <section className="chord-display">
      <div className="chord-display-header">
        <h2>{chordName}</h2>

        {onPlay && (
          <button
            className="play-chord"
            type="button"
            onClick={onPlay}
          >
            ▶ Play chord
          </button>
        )}
      </div>

      <div className="chord-notes">
        {notes.map((note, index) => (
          <div
            className="note-card"
            key={`${note}-${index}`}
          >
            <span className="note-name">
              {formatNoteForDisplay(note)}
            </span>

            <span className="interval-name">
              {intervalNames[index]}
            </span>

            <span className="semitone-value">
              {intervals[index] === 0
                ? "Root"
                : `+${intervals[index]} semitones`}
            </span>
          </div>
        ))}
      </div>

      <div className="structure">
        <h3>Chord Structure</h3>

        <p className="structure-notes">
          {notes
            .map((note) => formatNoteForDisplay(note))
            .join(" → ")}
        </p>

        <p className="structure-intervals">
          {intervalNames.join(" → ")}
        </p>

        <p className="structure-semitones">
          {intervals.join(" → ")} semitones
        </p>
      </div>
    </section>
  );
}

export default ChordDisplay;