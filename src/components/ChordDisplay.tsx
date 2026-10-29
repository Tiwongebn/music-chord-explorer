import { useState } from "react";
import { formatNoteForDisplay } from "../utils/musicTheory";
import ChordWave from "./ChordWave";

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
  // Counts plays so the waveform behind the name can swell.
  const [plays, setPlays] = useState(0);

  const handlePlay = () => {
    setPlays((count) => count + 1);
    onPlay?.();
  };

  return (
    <section className="chord-display">
      <div className="chord-display-header">
        <div className="chord-stage">
          {notes.length > 0 && (
            <ChordWave
              rootNote={notes[0]}
              intervals={intervals}
              pulse={plays}
            />
          )}

          {/* Keyed so the name animates in on every change. */}
          <h2 key={chordName}>{chordName}</h2>
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

        {onPlay && (
          <button
            className="play-chord"
            type="button"
            onClick={handlePlay}
          >
            ▶ Play chord
          </button>
        )}
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