import { analyzeChord } from "../utils/chordAnalyzer";
import { detectInversion } from "../utils/inversionAnalyzer";
import {
  convertRootNote,
  formatNoteForDisplay,
  type AccidentalPreference,
} from "../utils/musicTheory";

interface ChordAnalyzerProps {
  selectedNotes: string[];
  accidentalPreference: AccidentalPreference;
  onUseDetectedChord: () => void;
}

function removeOctave(note: string): string {
  return note.replace(/\d+$/, "");
}

// "C#4" -> "D♭4" when flats are preferred.
function displayNote(
  note: string,
  preference: AccidentalPreference
): string {
  const pitchClass = removeOctave(note);
  const octave = note.slice(pitchClass.length);

  return `${formatNoteForDisplay(
    convertRootNote(pitchClass, preference)
  )}${octave}`;
}

function ChordAnalyzer({
  selectedNotes,
  accidentalPreference,
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
    <section className="chord-analyzer" aria-live="polite">

      <h2>Chord Analyzer</h2>

      {selectedNotes.length === 0 ? (
        <p>
          Tap two or more keys on the piano above
          and the chord name shows up here.
        </p>
      ) : detectedChord ? (
        <div className="detected-chord">

          <p className="detected-label">
            Detected Chord
          </p>

          <h3>
            {formatNoteForDisplay(
              convertRootNote(
                detectedChord.root,
                accidentalPreference
              )
            )}
            {formatNoteForDisplay(detectedChord.symbol)}
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
                  {displayNote(
                    note,
                    accidentalPreference
                  )}
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