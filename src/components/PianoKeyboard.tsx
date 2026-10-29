import {
  useRef,
  useEffect,
  useState,
  type PointerEvent,
} from "react";
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
  // What the current press/drag does: "add" if it started on
  // an unselected key, "remove" otherwise. Dragging across
  // keys then only applies that one action, so sliding back
  // over a key never undoes it by accident.
  const dragAction = useRef<"add" | "remove">("add");
  const [keyboardActiveNotes, setKeyboardActiveNotes] =
    useState<Set<string>>(new Set());

  // Mobile-only disclosure for the keys themselves (not the
  // "Your notes" summary below, which stays visible either
  // way). Defaults open so first-time behavior is unchanged;
  // this just gives mobile users — who reported the keyboard
  // feels cramped — a way to tuck it away once they've made
  // their picks. Desktop/tablet always render the keys
  // regardless of this value (see .piano-toggle/.piano-keys-content
  // in App.css, which only react to it under the mobile
  // breakpoint).
  const [isPianoOpen, setIsPianoOpen] = useState(true);

  // Safety net: release the drag flag if the pointer is
  // released anywhere outside the piano keys.
  useEffect(() => {
    const handlePointerUp = () => {
      isPointerDown.current = false;
    };
    window.addEventListener("pointerup", handlePointerUp);
    // Fired when the browser takes over a touch to scroll.
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener(
        "pointercancel",
        handlePointerUp
      );
    };
  }, []);

  // Keyboard → piano key mapping
  useEffect(() => {
    const pressedKeys = new Set<string>();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        (e.target instanceof HTMLElement &&
          e.target.isContentEditable)
      )
        return;

      // Leave browser shortcuts (Ctrl+L, Cmd+D, …) alone.
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const note = keyboardMap[e.key.toLowerCase()];
      if (!note || pressedKeys.has(e.key)) return;

      pressedKeys.add(e.key);
      setKeyboardActiveNotes((prev) =>
        new Set([...prev, note])
      );
      onNoteToggle(note);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      pressedKeys.delete(e.key);
      const note = keyboardMap[e.key.toLowerCase()];
      if (!note) return;
      setKeyboardActiveNotes((prev) => {
        const next = new Set(prev);
        next.delete(note);
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

  // Selection is per key (with octave), so tapping C4 only
  // lights C4 — not every C on the keyboard.
  const isKeySelected = (noteWithOctave: string) =>
    selectedNotes.includes(noteWithOctave);

  const octaves = [3, 4, 5];

  function makeKeyHandlers(noteWithOctave: string) {
    return {
      onPointerDown: (
        e: PointerEvent<HTMLButtonElement>
      ) => {
        // Release capture so pointer-enter fires on
        // adjacent keys while dragging.
        e.currentTarget.releasePointerCapture(e.pointerId);
        isPointerDown.current = true;
        dragAction.current = isKeySelected(noteWithOctave)
          ? "remove"
          : "add";
        onNoteToggle(noteWithOctave);
      },
      onPointerEnter: () => {
        if (!isPointerDown.current) {
          return;
        }

        const selected = isKeySelected(noteWithOctave);

        if (
          (dragAction.current === "add" && !selected) ||
          (dragAction.current === "remove" && selected)
        ) {
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
      <div className="piano-section-head">
        <h2>Tap the keys</h2>

        {/* The keyboard only collapses on phones, so
            .piano-toggle is hidden above the mobile
            breakpoint (see App.css). */}
        <button
          type="button"
          className="piano-toggle"
          aria-expanded={isPianoOpen}
          aria-controls="piano-keys-content"
          onClick={() => setIsPianoOpen((current) => !current)}
        >
          {isPianoOpen ? "Hide keyboard" : "Show keyboard"}
          <span className="control-group-chevron" aria-hidden="true">
            {isPianoOpen ? "▾" : "▸"}
          </span>
        </button>
      </div>

      <p className="piano-description">
        Amber keys are the chord · pink keys are your
        picks · <kbd>A</kbd>–<kbd>L</kbd> &amp;{" "}
        <kbd>W</kbd>/<kbd>E</kbd>/<kbd>T</kbd>/<kbd>Y</kbd>/<kbd>U</kbd> = keyboard
      </p>

      <div
        id="piano-keys-content"
        className={
          isPianoOpen
            ? "piano-keys-content"
            : "piano-keys-content is-collapsed"
        }
      >
      <div className="piano-wrapper">
        <div className="piano-keyboard">

          {/* WHITE KEYS */}
          {octaves.map((octave) =>
            whiteKeys.map((note, index) => {
              const isChordNote =
                normalizedChordNotes.includes(note);

              const isSelected = isKeySelected(
                `${note}${octave}`
              );

              const isKeyboardActive =
                keyboardActiveNotes.has(`${note}${octave}`);

              return (
                <button
                  key={`${note}${octave}`}
                  className={`piano-key white ${
                    isChordNote ? "active" : ""
                  } ${isSelected ? "selected" : ""} ${
                    isKeyboardActive ? "keyboard-active" : ""
                  }`}
                  type="button"
                  aria-label={`${getDisplayNote(
                    note,
                    accidentalPreference
                  )}${octave}`}
                  aria-pressed={isSelected}
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

              const isSelected = isKeySelected(
                `${key.note}${octave}`
              );

              const isKeyboardActive =
                keyboardActiveNotes.has(
                  `${key.note}${octave}`
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
                  aria-label={`${getDisplayNote(
                    key.note,
                    accidentalPreference
                  )}${octave}`}
                  aria-pressed={isSelected}
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
                {getDisplayNote(
                  removeOctave(note),
                  accidentalPreference
                )}
                {note.slice(removeOctave(note).length)}
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