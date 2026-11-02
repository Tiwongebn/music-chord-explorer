import { useCallback, useMemo, useState } from "react";

import ChordDisplay from "./ChordDisplay";
import GuitarFretboard from "./GuitarFretboard";
import PianoKeyboard from "./PianoKeyboard";
import {
  chordAlterations,
  chordExtensions,
  chordQualities,
} from "../data/chordBuilder";
import { buildChord, type ChordSpec } from "../utils/chordBuild";
import {
  calculateChordNotes,
  convertRootNote,
  formatNoteForDisplay,
  getNotesByPreference,
  type AccidentalPreference,
} from "../utils/musicTheory";
import {
  playChordOn,
  playNote,
  type InstrumentId,
} from "../utils/audio";

// The chord builder, shown inline in the Progression Builder.
// It builds a new chord to add, or edits one already in the
// progression; the parent remounts it (via `key`) whenever a
// different chord is opened, so its local state always starts
// from initialRoot / initialSpec.
interface ChordBuilderProps {
  // Slot number being edited (1-based), or null when adding.
  editingNumber: number | null;
  initialRoot: string;
  initialSpec: ChordSpec;
  accidentalPreference: AccidentalPreference;
  sound: InstrumentId;
  // Stops any looping progression before a preview plays.
  onBeforePlay?: () => void;
  onSubmit: (rootNote: string, spec: ChordSpec) => void;
  onCancel: () => void;
}

function toggle(list: string[], id: string): string[] {
  return list.includes(id)
    ? list.filter((item) => item !== id)
    : [...list, id];
}

function ChordBuilder({
  editingNumber,
  initialRoot,
  initialSpec,
  accidentalPreference,
  sound,
  onBeforePlay,
  onSubmit,
  onCancel,
}: ChordBuilderProps) {
  const [rootNote, setRootNote] = useState(initialRoot);
  const [spec, setSpec] = useState<ChordSpec>(initialSpec);

  // The chord card, fretboard and keyboard (what the old
  // Chord Lab tab showed) stay folded away until asked for,
  // so the builder doesn't push the progression off screen.
  const [showDetails, setShowDetails] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);

  // Keep the root spelled the way the rest of the app is
  // (e.g. "A#" becomes "Bb" when Flats is picked).
  const displayRoot = convertRootNote(rootNote, accidentalPreference);

  const built = useMemo(() => buildChord(spec), [spec]);

  const notes = calculateChordNotes(
    displayRoot,
    built.intervals,
    built.intervalNames,
    accidentalPreference
  );

  const chordName = `${formatNoteForDisplay(displayRoot)}${formatNoteForDisplay(built.symbol)}`;

  const handlePlay = () => {
    onBeforePlay?.();
    playChordOn(notes, sound);
  };

  const handleNoteToggle = useCallback((note: string) => {
    playNote(note);
    setSelectedNotes((current) => toggle(current, note));
  }, []);

  const isEditing = editingNumber !== null;

  return (
    <section
      className="chord-builder inline-builder"
      aria-label={isEditing ? `Edit chord ${editingNumber}` : "Build a chord"}
    >
      <div className="inline-builder-head">
        <p className="eyebrow">
          {isEditing ? `EDIT CHORD ${editingNumber}` : "BUILD A CHORD"}
        </p>

        <button
          type="button"
          className="slot-btn"
          aria-label="Close chord builder"
          onClick={onCancel}
        >
          ×
        </button>
      </div>

      {/* ROOT */}
      <div className="builder-group">
        <h3 id="builder-root-label">Root</h3>

        <div
          className="root-pills"
          role="group"
          aria-labelledby="builder-root-label"
        >
          {getNotesByPreference(accidentalPreference).map((note) => (
            <button
              key={note}
              type="button"
              className={displayRoot === note ? "root-pill active" : "root-pill"}
              aria-pressed={displayRoot === note}
              onClick={() => setRootNote(note)}
            >
              {formatNoteForDisplay(note)}
            </button>
          ))}
        </div>
      </div>

      <div className="inline-builder-options">
        {/* QUALITY */}
        <div className="builder-group">
          <h3>Quality</h3>

          <div className="builder-options">
            {chordQualities.map((item) => (
              <label className="builder-option" key={item.id}>
                <input
                  type="radio"
                  name="chord-quality"
                  checked={spec.quality === item.id}
                  onChange={() =>
                    setSpec((current) => ({ ...current, quality: item.id }))
                  }
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* EXTENSIONS */}
        <div className="builder-group">
          <h3>Extensions</h3>

          <div className="builder-options">
            {chordExtensions.map((item) => (
              <label className="builder-option" key={item.id}>
                <input
                  type="checkbox"
                  checked={spec.extensions.includes(item.id)}
                  onChange={() =>
                    setSpec((current) => ({
                      ...current,
                      extensions: toggle(current.extensions, item.id),
                    }))
                  }
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* ALTERATIONS */}
        <div className="builder-group">
          <h3>Alterations</h3>

          <div className="builder-options">
            {chordAlterations.map((item) => (
              <label className="builder-option" key={item.id}>
                <input
                  type="checkbox"
                  checked={spec.alterations.includes(item.id)}
                  onChange={() =>
                    setSpec((current) => ({
                      ...current,
                      alterations: toggle(current.alterations, item.id),
                    }))
                  }
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* RESULT + ACTIONS */}
      <div className="inline-builder-result">
        <div className="inline-builder-name">
          <strong key={chordName}>{chordName}</strong>
          <span className="inline-builder-notes">
            {notes.map((note) => formatNoteForDisplay(note)).join(" · ")}
          </span>
          <span className="inline-builder-intervals">
            {built.intervalNames.join(" · ")}
          </span>
        </div>

        <div className="inline-builder-actions">
          <button
            type="button"
            className="clear-selection"
            onClick={handlePlay}
          >
            ▶ Hear it
          </button>

          <button
            type="button"
            className="play-chord"
            onClick={() => onSubmit(displayRoot, spec)}
          >
            {isEditing ? "Update chord" : "+ Add to progression"}
          </button>

          <button
            type="button"
            className="clear-selection"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>

      <button
        type="button"
        className="glossary-toggle inline-builder-details-toggle"
        aria-expanded={showDetails}
        onClick={() => setShowDetails((current) => !current)}
      >
        {showDetails
          ? "− Hide chord card, guitar & piano"
          : "Show chord card, guitar & piano"}
      </button>

      {showDetails && (
        <div className="inline-builder-details">
          <section className="panel chord-display-panel">
            <ChordDisplay
              chordName={chordName}
              notes={notes}
              intervalNames={built.intervalNames}
              intervals={built.intervals}
              onPlay={handlePlay}
            />
          </section>

          <section className="panel guitar-panel">
            <GuitarFretboard
              chordName={chordName}
              rootNote={displayRoot}
              notes={notes}
              intervals={built.intervals}
            />
          </section>

          <section className="panel piano-panel">
            <PianoKeyboard
              chordNotes={notes}
              accidentalPreference={accidentalPreference}
              selectedNotes={selectedNotes}
              onNoteToggle={handleNoteToggle}
              onClearSelection={() => setSelectedNotes([])}
            />
          </section>
        </div>
      )}
    </section>
  );
}

export default ChordBuilder;
