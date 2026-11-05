// ============================================================
// "Why this chord?" — the job a chord does in its key and
// where it usually goes next, in plain words for beginners.
//
//  - WhyChordPanel: the sheet under the Progression Builder
//    for one chord of the progression, in the current key.
//  - ChordRoles: the Explore panel. A chord picked there has
//    no key yet, so it lists the keys it naturally lives in
//    and its job in each.
// ============================================================

import {
  detourForChord,
  explainChord,
  familyOf,
  keyChordAt,
  keysForChord,
  roleLabel,
  type ChordExplanation,
  type ChordRole,
  type FunctionChord,
  type FunctionKey,
} from "../utils/chordFunction";
import { playProgression } from "../utils/audio";
import { sharpNotes } from "../utils/musicTheory";

const roleClass: Record<ChordRole, string> = {
  home: "role-home",
  away: "role-away",
  tension: "role-tension",
  detour: "role-detour",
  borrowed: "role-borrowed",
  colour: "role-colour",
};

function RoleChip({ role }: { role: ChordRole }) {
  return <span className={`role-chip ${roleClass[role]}`}>{roleLabel[role]}</span>;
}

// Pitch-class names for audio (octave added by the player).
const audioNotes = (chord: FunctionChord) =>
  chord.intervals.map((interval) => sharpNotes[(chord.root + interval) % 12]);

// The one-line legend, so the role names mean something.
function RoleLegend() {
  return (
    <p className="why-legend">
      <RoleChip role="home" /> feels settled · <RoleChip role="away" /> steps out ·{" "}
      <RoleChip role="tension" /> wants to resolve
    </p>
  );
}

interface WhyChordPanelProps {
  chordNumber: number;
  chordLabel: string;
  chord: FunctionChord;
  keyName: string;
  songKey: FunctionKey;
  name: (pitchClass: number) => string;
  next?: FunctionChord;
  nextWraps?: boolean;
  onHearMove?: () => void;
  onClose: () => void;
}

export function WhyChordPanel({
  chordNumber,
  chordLabel,
  chord,
  keyName,
  songKey,
  name,
  next,
  nextWraps,
  onHearMove,
  onClose,
}: WhyChordPanelProps) {
  const explanation = explainChord(chord, songKey, {
    name,
    next,
    nextWraps,
    isLast: !next,
  });

  return (
    <section className="inline-builder why-panel" aria-label={`Why chord ${chordNumber}?`}>
      <div className="inline-builder-head">
        <p className="eyebrow">WHY THIS CHORD? · CHORD {chordNumber}</p>

        <button type="button" className="slot-btn" aria-label="Close the chord explainer" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="why-head">
        <strong className="why-chord">{chordLabel}</strong>
        <RoleChip role={explanation.role} />
        <span className="why-roman" title={explanation.theoryName}>
          {explanation.roman} in {keyName}
        </span>
      </div>

      <Explanation explanation={explanation} />

      <div className="why-foot">
        {onHearMove && next && (
          <button type="button" className="clear-selection" onClick={onHearMove}>
            ▶ Hear it move
          </button>
        )}
        <RoleLegend />
      </div>
    </section>
  );
}

function Explanation({ explanation }: { explanation: ChordExplanation }) {
  return (
    <div className="why-body">
      <p className="why-summary">{explanation.summary}</p>
      <p className="why-goes">
        <span className="why-arrow" aria-hidden="true">
          →
        </span>{" "}
        {explanation.goesTo}
      </p>
      {explanation.inContext && <p className="why-context">{explanation.inContext}</p>}
      <p className="why-theory">Theory name: {explanation.theoryName}</p>
    </div>
  );
}

interface ChordRolesProps {
  chordName: string;
  rootPitchClass: number;
  intervals: number[];
  name: (pitchClass: number) => string;
}

export function ChordRoles({ chordName, rootPitchClass, intervals, name }: ChordRolesProps) {
  const chord = { root: rootPitchClass, intervals };
  const keys = keysForChord(chord, name);
  const passing = familyOf(intervals) === "diminished" ? detourForChord(chord, name) : null;
  const entries = passing ? [passing, ...keys.slice(0, 2)] : keys;

  const hearMove = (key: FunctionKey, explanation: ChordExplanation) => {
    const target = explanation.targets[0];
    // Home chords: hear it settle after its usual lead-in.
    if (target === undefined) {
      const lead = keyChordAt(key, (key.root + 7) % 12);
      playProgression([audioNotes(lead), audioNotes(chord)], 0.9);
      return;
    }
    playProgression([audioNotes(chord), audioNotes(keyChordAt(key, target))], 0.9);
  };

  return (
    <div className="why-explore">
      <h2>Why this chord?</h2>
      <p className="hint">
        A chord's job depends on the key it's in. Here is where <strong>{chordName}</strong> usually
        lives, what it does there and where it likes to go.
      </p>

      {entries.length === 0 ? (
        <p className="why-summary why-none">
          {chordName} doesn't belong to any one key. It's usually a passing colour that slides into the
          next chord by a half or whole step.
        </p>
      ) : (
        <ul className="why-list">
          {entries.map((entry) => (
            <li className="why-card" key={`${entry.keyName}-${entry.roman}`}>
              <div className="why-card-head">
                <RoleChip role={entry.role} />
                <span className="why-key">
                  <strong>{entry.roman}</strong> in {entry.keyName}
                </span>
              </div>
              <p className="why-summary">{entry.summary}</p>
              <div className="why-card-foot">
                <p className="why-goes">
                  <span className="why-arrow" aria-hidden="true">
                    →
                  </span>{" "}
                  {entry.goesTo}
                </p>
                <button
                  type="button"
                  className="clear-selection"
                  onClick={() => hearMove(entry.key, entry)}
                >
                  ▶ {entry.targets.length === 0 ? "Hear it land" : "Hear it go there"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <RoleLegend />
    </div>
  );
}
