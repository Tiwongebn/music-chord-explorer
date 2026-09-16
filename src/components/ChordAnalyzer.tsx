import { analyzeChord } from "../utils/chordAnalyzer";
import { detectInversion } from "../utils/inversionAnalyzer";

interface ChordAnalyzerProps {
  selectedNotes: string[];
  onUseDetectedChord: () => void;
}

function removeOctave(note: string): string {
  return note.replace(/\d+$/, "");
}

function ChordAnalyzer({
  selectedNotes,
  onUseDetectedChord,
}: ChordAnalyzerProps) {
  const pitchClasses = selectedNotes.map(
    removeOctave
  );

  const detectedChord =
    analyzeChord(pitchClasses);

  const inversion = detectedChord
    ? detectInversion(
        selectedNotes,
        detectedChord.root
      )
    : null;

  return (
    <section className="chord-analyzer">

      <h2>Chord Analyzer</h2>

      {selectedNotes.length === 0 ? (
        <p>
          Select notes on the piano to analyze
          the chord.
        </p>
      ) : detectedChord ? (
        <div className="detected-chord">

          <p className="detected-label">
            Detected Chord
          </p>

          <h3>
            {detectedChord.root}
            {detectedChord.symbol}
          </h3>

          <p className="chord-type">
            {detectedChord.name}
          </p>

          {inversion && (
            <p className="inversion">
              {inversion}
            </p>
          )}

          <div className="analyzed-notes">

            <h4>Selected Notes</h4>

            <div className="analyzed-note-list">
              {selectedNotes.map((note) => (
                <span
                  className="analyzed-note"
                  key={note}
                >
                  {note}
                </span>
              ))}
            </div>

          </div>

          <button
  className="use-detected-chord"
  type="button"
  onClick={onUseDetectedChord}
>
  Use This Chord
</button>

        </div>
      ) : (
        <div className="unknown-chord">

          <p>
            No matching chord found.
          </p>

          <p>
            Try selecting a different combination
            of notes.
          </p>

        </div>
      )}

    </section>
  );
}

export default ChordAnalyzer;