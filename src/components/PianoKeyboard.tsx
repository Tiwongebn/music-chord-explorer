import { useRef, useEffect, useState } from "react";
import {
  formatNoteForDisplay,
  type AccidentalPreference,
} from "../utils/musicTheory";

interface PianoKeyboardProps {
  chordNotes: string[];
  accidentalPreference: AccidentalPreference;
  selectedNotes: string[];
  onNoteToggle: (note: string) => void;
  onClearSelection?: () => void;
}

interface PianoKey {
  note: string;
  type: "white" | "black";
  whiteKeyIndex?: number;
}

const whiteKeys = [
  "C",
  "D",
  "E",
  "F",
  "G",
  "A",
  "B",
];

const blackKeys: PianoKey[] = [
  {
    note: "C#",
    type: "black",
    whiteKeyIndex: 1,
  },
  {
    note: "D#",
    type: "black",
    whiteKeyIndex: 2,
  },
  {
    note: "F#",
    type: "black",
    whiteKeyIndex: 4,
  },
  {
    note: "G#",
    type: "black",
    whiteKeyIndex: 5,
  },
  {
    note: "A#",
    type: "black",
    whiteKeyIndex: 6,
  },
];

const flatNoteNames: Record<string, string> = {
  "C#": "Db",
  "D#": "Eb",
  "F#": "Gb",
  "G#": "Ab",
  "A#": "Bb",
};

// Maps keyboard keys → note with octave
const keyboardMap: Record<string, string> = {
  // White keys (home row)
  a: "C4",
  s: "D4",
  d: "E4",
  f: "F4",
  g: "G4",
  h: "A4",
  j: "B4",
  k: "C5",
  l: "D5",
  // Black keys (top row)
  w: "C#4",
  e: "D#4",
  t: "F#4",
  y: "G#4",
  u: "A#4",
  o: "C#5",
};

function removeOctave(note: string): string {
  return note.replace(/\d+$/, "");
}

function normalizeNote(note: string): string {
  const noteMap: Record<string, string> = {
    Db: "C#",
    Eb: "D#",
    Gb: "F#",
    Ab: "G#",
    Bb: "A#",

    Cb: "B",
    Fb: "E",

    "C##": "D",
    "D##": "E",
    "E##": "F#",
    "F##": "G",
    "G##": "A",
    "A##": "B",
    "B##": "C#",

    "Cbb": "A#",
    "Dbb": "C",
    "Ebb": "D",
    "Fbb": "D#",
    "Gbb": "F",
    "Abb": "G",
    "Bbb": "A",
  };

  return noteMap[note] ?? note;
}

function getDisplayNote(
  note: string,
  preference: AccidentalPreference
): string {
  const preferredNote =
    preference === "flats" && flatNoteNames[note]
      ? flatNoteNames[note]
      : note;

  return formatNoteForDisplay(preferredNote);
}

function PianoKeyboard({
  chordNotes,
  accidentalPreference,
  selectedNotes,
  onNoteToggle,
  onClearSelection,
}: PianoKeyboardProps) {
  const isPointerDown = useRef(false);
  const [keyboardActiveNotes, setKeyboardActiveNotes] =
    useState<Set<string>>(new Set());

  // Safety net: release the drag flag if the pointer is
  // released anywhere outside the piano keys.
  useEffect(() => {
    const handlePointerUp = () => {
      isPointerDown.current = false;
    };
    window.addEventListener("pointerup", handlePointerUp);
    return () =>
      window.removeEventListener("pointerup", handlePointerUp);
  }, []);

  // Keyboard → piano key mapping
  useEffect(() => {
    const pressedKeys = new Set<string>();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      const note = keyboardMap[e.key.toLowerCase()];
      if (!note || pressedKeys.has(e.key)) return;

      pressedKeys.add(e.key);
      const noteWithoutOctave = removeOctave(note);
      setKeyboardActiveNotes((prev) =>
        new Set([...prev, normalizeNote(noteWithoutOctave)])
      );
      onNoteToggle(note);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      pressedKeys.delete(e.key);
      const note = keyboardMap[e.key.toLowerCase()];
      if (!note) return;
      const noteWithoutOctave = removeOctave(note);
      setKeyboardActiveNotes((prev) => {
        const next = new Set(prev);
        next.delete(normalizeNote(noteWithoutOctave));
        return next;
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [onNoteToggle]);

  const normalizedChordNotes = chordNotes.map(
    normalizeNote
  );

  const normalizedSelectedNotes =
    selectedNotes
      .map(removeOctave)
      .map(normalizeNote);

  const octaves = [3, 4, 5];

  function makeKeyHandlers(noteWithOctave: string) {
    return {
      onPointerDown: (
        e: React.PointerEvent<HTMLButtonElement>
      ) => {
        // Release capture so pointer-enter fires on
        // adjacent keys while dragging.
        e.currentTarget.releasePointerCapture(e.pointerId);
        isPointerDown.current = true;
        onNoteToggle(noteWithOctave);
      },
      onPointerEnter: () => {
        if (isPointerDown.current) {
          onNoteToggle(noteWithOctave);
        }
      },
      onPointerUp: () => {
        isPointerDown.current = false;
      },
    };
  }

  return (
    <section className="piano-section">
      <h2>Tap the keys</h2>

      <p className="piano-description">
        Purple keys = the chord above · yellow keys =
        your picks · <kbd>A</kbd>–<kbd>L</kbd> &amp;{" "}
        <kbd>W</kbd>/<kbd>E</kbd>/<kbd>T</kbd>/<kbd>Y</kbd>/<kbd>U</kbd> = keyboard
      </p>

      <div className="piano-wrapper">
        <div className="piano-keyboard">

          {/* WHITE KEYS */}
          {octaves.map((octave) =>
            whiteKeys.map((note, index) => {
              const isChordNote =
                normalizedChordNotes.includes(note);

              const isSelected =
                normalizedSelectedNotes.includes(note);

              const isKeyboardActive =
                keyboardActiveNotes.has(
                  normalizeNote(note)
                );

              return (
                <button
                  key={`${note}${octave}`}
                  className={`piano-key white ${
                    isChordNote ? "active" : ""
                  } ${isSelected ? "selected" : ""} ${
                    isKeyboardActive ? "keyboard-active" : ""
                  }`}
                  type="button"
                  {...makeKeyHandlers(`${note}${octave}`)}
                >
                  <span className="key-label">
                    {getDisplayNote(
                      note,
                      accidentalPreference
                    )}
                  </span>

                  {index === 0 && (
                    <span className="octave-label">
                      C{octave}
                    </span>
                  )}
                </button>
              );
            })
          )}

          {/* BLACK KEYS */}
          {octaves.flatMap((octave, octaveIndex) =>
            blackKeys.map((key) => {
              const isChordNote =
                normalizedChordNotes.includes(
                  key.note
                );

              const isSelected =
                normalizedSelectedNotes.includes(
                  key.note
                );

              const isKeyboardActive =
                keyboardActiveNotes.has(
                  normalizeNote(key.note)
                );

              const whiteKeyWidth =
                100 /
                (whiteKeys.length * octaves.length);

              const leftPosition =
                (octaveIndex * 7 +
                  (key.whiteKeyIndex ?? 0) -
                  0.35) *
                whiteKeyWidth;

              return (
                <button
                  key={`${key.note}${octave}`}
                  className={`piano-key black ${
                    isChordNote ? "active" : ""
                  } ${
                    isSelected ? "selected" : ""
                  } ${
                    isKeyboardActive ? "keyboard-active" : ""
                  }`}
                  style={{
                    left: `${leftPosition}%`,
                  }}
                  type="button"
                  {...makeKeyHandlers(
                    `${key.note}${octave}`
                  )}
                >
                  <span className="key-label">
                    {getDisplayNote(
                      key.note,
                      accidentalPreference
                    )}
                  </span>
                </button>
              );
            })
          )}

        </div>
      </div>

      {/* SELECTED NOTES */}
      <div className="selected-notes">

        <h3>Your notes</h3>

        {selectedNotes.length === 0 ? (
          <p className="hint">
            No notes yet — tap some keys!
          </p>
        ) : (
          <div className="selected-note-list">
            {selectedNotes.map((note) => (
              <span
                className="selected-note"
                key={note}
              >
                {formatNoteForDisplay(note)}
              </span>
            ))}
          </div>
        )}

        {selectedNotes.length > 0 && (
          <button
            className="clear-selection"
            type="button"
            onClick={onClearSelection}
          >
            Clear selection
          </button>
        )}

      </div>
    </section>
  );
}

export default PianoKeyboard;