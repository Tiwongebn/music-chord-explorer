import {
  formatNoteForDisplay,
  type AccidentalPreference,
} from "../utils/musicTheory";

interface PianoKeyboardProps {
  chordNotes: string[];
  accidentalPreference: AccidentalPreference;
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
}: PianoKeyboardProps) {
  const normalizedChordNotes = chordNotes.map(
    normalizeNote
  );

  const octaves = [3, 4, 5];

  return (
    <section className="piano-section">
      <h2>Interactive Piano</h2>

      <p className="piano-description">
        The highlighted keys show the notes in the
        selected chord.
      </p>

      <div className="piano-wrapper">
        <div className="piano-keyboard">
          {octaves.map((octave) =>
            whiteKeys.map((note, index) => {
              const isActive =
                normalizedChordNotes.includes(note);

              return (
                <div
                  key={`${note}${octave}`}
                  className={`piano-key white ${
                    isActive ? "active" : ""
                  }`}
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
                </div>
              );
            })
          )}

          {octaves.flatMap((octave, octaveIndex) =>
            blackKeys.map((key) => {
              const isActive =
                normalizedChordNotes.includes(key.note);

              const whiteKeyWidth =
                100 / (whiteKeys.length * octaves.length);

              const leftPosition =
                (octaveIndex * 7 +
                  (key.whiteKeyIndex ?? 0) -
                  0.35) *
                whiteKeyWidth;

              return (
                <div
                  key={`${key.note}${octave}`}
                  className={`piano-key black ${
                    isActive ? "active" : ""
                  }`}
                  style={{
                    left: `${leftPosition}%`,
                  }}
                >
                  <span className="key-label">
                    {getDisplayNote(
                      key.note,
                      accidentalPreference
                    )}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}

export default PianoKeyboard;