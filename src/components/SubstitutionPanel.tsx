// ============================================================
// "Try a substitution" sheet for one chord in the Progression
// Builder. Lists the ideas from utils/substitutions.ts, each
// with a plain-language reason, a way to hear it in context
// next to the original, and a button to put it in.
// ============================================================

import type { Substitution } from "../utils/substitutions";

export interface SubstitutionCard {
  substitution: Substitution;
  // Display label + notes of the chord it brings in.
  label: string;
  notes: string[];
}

interface SubstitutionPanelProps {
  chordNumber: number;
  chordLabel: string;
  cards: SubstitutionCard[];
  // Set right after a substitution was used, until the
  // progression changes some other way.
  appliedLabel: string | null;
  onHearOriginal: () => void;
  onHear: (substitution: Substitution) => void;
  onApply: (substitution: Substitution) => void;
  onUndo: () => void;
  onClose: () => void;
}

const kindClass: Record<Substitution["kind"], string> = {
  tritone: "sub-kind-tritone",
  relative: "sub-kind-relative",
  passing: "sub-kind-passing",
};

function SubstitutionPanel({
  chordNumber,
  chordLabel,
  cards,
  appliedLabel,
  onHearOriginal,
  onHear,
  onApply,
  onUndo,
  onClose,
}: SubstitutionPanelProps) {
  return (
    <section
      className="inline-builder sub-panel"
      aria-label={`Substitution ideas for chord ${chordNumber}`}
    >
      <div className="inline-builder-head">
        <p className="eyebrow">TRY A SUBSTITUTION · CHORD {chordNumber}</p>

        <button
          type="button"
          className="slot-btn"
          aria-label="Close substitution ideas"
          onClick={onClose}
        >
          ×
        </button>
      </div>

      <div className="sub-intro">
        <p>
          Swap <strong className="sub-original">{chordLabel}</strong> for
          something with more colour. Hear each idea between the chords
          around it, then use the one you like.
        </p>

        <button
          type="button"
          className="clear-selection"
          onClick={onHearOriginal}
        >
          ▶ Hear the original
        </button>
      </div>

      {appliedLabel && (
        <p className="sub-applied" role="status">
          Put in {appliedLabel}.{" "}
          <button type="button" className="sub-undo" onClick={onUndo}>
            Undo
          </button>
        </p>
      )}

      {cards.length === 0 ? (
        <p className="hint sub-empty">
          No substitutions for this chord yet. These ideas work on major,
          minor and dominant 7th chords, and the passing chord needs another
          chord to lead into.
        </p>
      ) : (
        <ul className="sub-list">
          {cards.map(({ substitution, label, notes }) => (
            <li className="sub-card" key={substitution.id}>
              <div className="sub-card-head">
                <span className={`sub-kind ${kindClass[substitution.kind]}`}>
                  {substitution.kindLabel}
                </span>
                <strong className="sub-chord">{label}</strong>
                <span className="sub-notes">{notes.join(" · ")}</span>
              </div>

              <p className="sub-explanation">{substitution.explanation}</p>

              <div className="sub-actions">
                <button
                  type="button"
                  className="clear-selection"
                  onClick={() => onHear(substitution)}
                >
                  ▶ Hear it
                </button>

                <button
                  type="button"
                  className="play-chord"
                  onClick={() => onApply(substitution)}
                >
                  {substitution.kind === "passing"
                    ? `+ Add ${label}`
                    : `Use ${label}`}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default SubstitutionPanel;
