import { useState } from "react";
import ScaleHints from "./ScaleHints";
import { scaleHintFor, type KeyContext } from "../utils/scaleHints";
import {
  formatNoteForDisplay,
  type AccidentalPreference,
} from "../utils/musicTheory";

export interface HintChord {
  label: string;
  // Spelled root under the Sharps/Flats setting.
  root: string;
  intervals: number[];
}

interface ProgressionScaleHintsProps {
  chords: HintChord[];
  accidentalPreference: AccidentalPreference;
  songKey?: KeyContext & { name: string };
}

// "What do I play over each chord?" for a whole progression:
// one row per different chord, in the order they first
// appear. Tap a row for the full hint with piano and guitar.
function ProgressionScaleHints({
  chords,
  accidentalPreference,
  songKey,
}: ProgressionScaleHintsProps) {
  const [openLabel, setOpenLabel] = useState<string | null>(null);

  const unique = chords.filter(
    (chord, index) =>
      chords.findIndex((item) => item.label === chord.label) === index
  );

  if (unique.length === 0) {
    return null;
  }

  const open = unique.find((chord) => chord.label === openLabel);

  return (
    <section className="scale-hints-rows" aria-label="Improvise over this progression">
      <h3>Improvise over it</h3>
      <p className="hint">
        The scale to solo with over each chord, and its guide tones
        (3rd &amp; 7th) in mint. Tap a chord for the notes on piano and
        guitar.
      </p>

      <ul className="scale-row-list">
        {unique.map((chord) => {
          const hint = scaleHintFor(
            chord.root,
            chord.intervals,
            accidentalPreference,
            songKey
          );
          const isOpen = chord.label === openLabel;

          return (
            <li key={chord.label}>
              <button
                type="button"
                className={isOpen ? "scale-row active" : "scale-row"}
                aria-expanded={isOpen}
                onClick={() => setOpenLabel(isOpen ? null : chord.label)}
              >
                <span className="scale-row-chord">{chord.label}</span>
                <span className="scale-row-scale">
                  {hint.scale
                    ? `${formatNoteForDisplay(chord.root)} ${hint.scale.name}`
                    : "Chord tones"}
                </span>
                <span className="scale-row-guides">
                  {hint.guideTones
                    .map((tone) => formatNoteForDisplay(tone.note))
                    .join(" · ")}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {open && (
        <ScaleHints
          key={open.label}
          chordName={open.label}
          root={open.root}
          intervals={open.intervals}
          accidentalPreference={accidentalPreference}
          songKey={songKey}
        />
      )}
    </section>
  );
}

export default ProgressionScaleHints;
