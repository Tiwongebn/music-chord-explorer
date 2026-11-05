import { useCallback, useEffect, useState } from "react";
import "./App.css";

import PianoKeyboard from "./components/PianoKeyboard";
import ChordSelector from "./components/ChordSelector";
import ChordDisplay from "./components/ChordDisplay";
import ChordAnalyzer from "./components/ChordAnalyzer";
import GuitarFretboard from "./components/GuitarFretboard";
import JazzVoicings from "./components/JazzVoicings";
import ChordProgressions from "./components/ChordProgressions";
import Metronome from "./components/Metronome";
import { chordTypes } from "./data/chords";
import { analyzeChord } from "./utils/chordAnalyzer";
import { catalogIndexFor } from "./utils/chordBuild";
import {
  playNote,
  playNotes,
  preloadAudio,
  setAudioEnabled,
} from "./utils/audio";
import {
  calculateChordNotes,
  convertRootNote,
  formatNoteForDisplay,
  type AccidentalPreference,
} from "./utils/musicTheory";

// The chord builder lives inside Progressions (build a chord
// and drop it straight into a progression, or edit one that's
// already there), so there are two modes.
type Mode = "explore" | "progressions";

const modes: { id: Mode; label: string }[] = [
  { id: "explore", label: "Explore" },
  { id: "progressions", label: "Progressions" },
];

function App() {
  const [mode, setMode] = useState<Mode>("explore");

  const [rootNote, setRootNote] = useState("C");
  const [selectedChordIndex, setSelectedChordIndex] =
    useState(0);
  const [accidentalPreference, setAccidentalPreference] =
    useState<AccidentalPreference>("sharps");

  // Notes selected by clicking the piano
  const [selectedNotes, setSelectedNotes] = useState<
    string[]
  >([]);

  // Sound output toggle
  const [soundOn, setSoundOn] = useState(true);

  // Start fetching the piano samples right away so the
  // first key press already sounds like a piano.
  useEffect(() => {
    preloadAudio();
  }, []);

  const selectedChord = chordTypes[selectedChordIndex];

  const pitchClasses = selectedNotes.map((note) =>
    note.replace(/\d+$/, "")
  );

  const detectedChord = analyzeChord(pitchClasses);

  const displayedRootNote = convertRootNote(
    rootNote,
    accidentalPreference
  );

  const chordNotes = calculateChordNotes(
    rootNote,
    selectedChord.intervals,
    selectedChord.intervalNames,
    accidentalPreference
  );

  const chordName =
    `${formatNoteForDisplay(displayedRootNote)}${selectedChord.symbol}`;

  const handleSoundToggle = () => {
    const next = !soundOn;
    setSoundOn(next);
    setAudioEnabled(next);
  };

  const handleAccidentalPreferenceChange = (
    preference: AccidentalPreference
  ) => {
    setRootNote(convertRootNote(rootNote, preference));
    setAccidentalPreference(preference);
  };

  // Stable so PianoKeyboard's keyboard listener isn't torn
  // down and re-added on every render.
  const handleNoteToggle = useCallback((note: string) => {
    playNote(note);

    setSelectedNotes((current) =>
      current.includes(note)
        ? current.filter((item) => item !== note)
        : [...current, note]
    );
  }, []);

  const handleClearSelection = () => {
    setSelectedNotes([]);
  };

  // Play the current chord in octave 4. Pitch-class names
  // from calculateChordNotes ("C#", "E", "G") get an octave
  // tacked on; playNotes ignores anything unparseable.
  const handlePlayChord = () => {
    playNotes(chordNotes.map((note) => `${note}4`));
  };

  // Analyzer -> selector: apply the detected chord.
  // The analyzer only exists inside Explore, so this never
  // fights the user for tab control.
  const handleUseDetectedChord = () => {
    if (!detectedChord) {
      return;
    }

    const match = catalogIndexFor(detectedChord.pattern);

    if (match === -1) {
      return;
    }

    setRootNote(
      convertRootNote(
        detectedChord.root,
        accidentalPreference
      )
    );
    setSelectedChordIndex(match);
  };

  return (
    <main className="app">

      {/* =========================
          HEADER + MODE TABS
          One quiet row: name, tabs, sound.
      ========================== */}
      <header className="header">
        <h1 aria-label="Music Chord Explorer">
          chord<span aria-hidden="true">/</span>explorer
        </h1>

        <nav
          className="mode-tabs"
          role="tablist"
          aria-label="App mode"
        >
          {modes.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={mode === item.id}
              className={mode === item.id ? "tab active" : "tab"}
              onClick={() => setMode(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <button
          className="sound-toggle"
          type="button"
          aria-pressed={soundOn}
          onClick={handleSoundToggle}
        >
          {soundOn ? "Sound on" : "Muted"}
        </button>

        <Metronome />
      </header>


      {mode === "explore" ? (
        <>

          {/* =========================
              TOP: PICK A CHORD + CHORD CARD
          ========================== */}
          <div className="explore-wrapper">
            <section className="panel explore-controls">
              <h2>Pick a chord</h2>

              <ChordSelector
                rootNote={rootNote}
                chordTypeIndex={selectedChordIndex}
                accidentalPreference={accidentalPreference}
                onRootChange={setRootNote}
                onChordTypeChange={setSelectedChordIndex}
                onAccidentalPreferenceChange={
                  handleAccidentalPreferenceChange
                }
              />
            </section>

            <section className="panel chord-display-panel">
              <ChordDisplay
                chordName={chordName}
                notes={chordNotes}
                intervalNames={selectedChord.intervalNames}
                intervals={selectedChord.intervals}
                onPlay={handlePlayChord}
              />
            </section>
          </div>

          {/* =========================
              BOTTOM: PIANO + ANALYZER
              The analyzer sits right under the keys so
              the result appears next to where you tap.
          ========================== */}
          <div className="explore-stage">

            <section className="panel piano-panel">
              <PianoKeyboard
                chordNotes={chordNotes}
                accidentalPreference={accidentalPreference}
                selectedNotes={selectedNotes}
                onNoteToggle={handleNoteToggle}
                onClearSelection={handleClearSelection}
              />
            </section>

            <ChordAnalyzer
              selectedNotes={selectedNotes}
              accidentalPreference={accidentalPreference}
              onUseDetectedChord={
                handleUseDetectedChord
              }
            />

            <section className="panel guitar-panel">
              <GuitarFretboard
                chordName={chordName}
                rootNote={rootNote}
                notes={chordNotes}
                intervals={selectedChord.intervals}
              />
            </section>

            <section className="panel jazz-panel">
              <JazzVoicings
                chordName={chordName}
                rootNote={rootNote}
                intervals={selectedChord.intervals}
                accidentalPreference={accidentalPreference}
              />
            </section>

            <aside className="panel tips-card">
              <h2>Quick theory bites</h2>

              <ul className="tip-list">
                <li>
                  <strong>Major vs minor</strong> is a
                  single semitone — the 3rd.
                </li>

                <li>
                  A <strong>diminished</strong> triad
                  stacks two minor 3rds (0–3–6).
                </li>

                <li>
                  <strong>Sus chords</strong> replace the
                  3rd with a 2nd or 4th.
                </li>

                <li>
                  Same notes, different bottom key? That
                  is an <strong>inversion</strong> — the
                  analyzer spots it.
                </li>
              </ul>
            </aside>

          </div>

        </>
      ) : null}

      {mode === "progressions" && (
        <ChordProgressions
          rootNote={rootNote}
          accidentalPreference={accidentalPreference}
          onRootChange={setRootNote}
          onAccidentalPreferenceChange={
            handleAccidentalPreferenceChange
          }
        />
      )}

    </main>
  );
}

export default App;