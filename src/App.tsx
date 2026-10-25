import { useCallback, useEffect, useState } from "react";
import "./App.css";

import PianoKeyboard from "./components/PianoKeyboard";
import ChordSelector from "./components/ChordSelector";
import ChordDisplay from "./components/ChordDisplay";
import ChordAnalyzer from "./components/ChordAnalyzer";
import ChordBuilder from "./components/ChordBuilder";
import ChordProgressions from "./components/ChordProgressions";
import { chordTypes } from "./data/chords";
import { analyzeChord } from "./utils/chordAnalyzer";
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

type Mode = "explore" | "build" | "progressions";

interface LabChord {
  intervals: number[];
  intervalNames: string[];
  symbol: string;
}

const modes: { id: Mode; label: string }[] = [
  { id: "explore", label: "🎹 Explore" },
  { id: "build", label: "🧪 Chord Lab" },
  { id: "progressions", label: "🗺️ Progressions" },
];

// Find the catalog chord whose pitch-class pattern matches
// the given interval pattern (compared mod 12, order-free).
function findMatchingChordIndex(pattern: number[]): number {
  const target = pattern
    .map((interval) => interval % 12)
    .sort((a, b) => a - b);

  return chordTypes.findIndex((chord) => {
    const chordPattern = chord.intervals
      .map((interval) => interval % 12)
      .sort((a, b) => a - b);

    return (
      chordPattern.length === target.length &&
      chordPattern.every(
        (interval, index) => interval === target[index]
      )
    );
  });
}

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

  // The chord currently assembled in the Chord Lab.
  const [labChord, setLabChord] = useState<LabChord | null>(
    null
  );

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

  const labNotes = labChord
    ? calculateChordNotes(
        rootNote,
        labChord.intervals,
        labChord.intervalNames,
        accidentalPreference
      )
    : [];

  const labChordName = labChord
    ? `${formatNoteForDisplay(displayedRootNote)}${formatNoteForDisplay(labChord.symbol)}`
    : "";

  const handlePlayLabChord = () => {
    playNotes(labNotes.map((note) => `${note}4`));
  };

  // Analyzer -> selector: apply the detected chord.
  // The analyzer only exists inside Explore, so this never
  // fights the user for tab control.
  const handleUseDetectedChord = () => {
    if (!detectedChord) {
      return;
    }

    const match = findMatchingChordIndex(
      detectedChord.pattern
    );

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

  // Chord Lab -> Explore: keep the Explore chord in sync
  // in the background. ChordBuilder reports from an effect
  // that depends on this callback, so it must stay stable
  // (no deps) or every render would re-trigger the effect.
  // Never call setMode() from here.
  const handleChordBuild = useCallback((chord: LabChord) => {
    setLabChord(chord);

    const match = findMatchingChordIndex(chord.intervals);

    if (match !== -1) {
      setSelectedChordIndex(match);
    }
  }, []);

  return (
    <main className="app">

      {/* =========================
          HEADER
      ========================== */}
      <header className="header">
        <p className="eyebrow">
          INTERACTIVE MUSIC THEORY
        </p>

        <h1>Music Chord Explorer</h1>

        <p className="subtitle">
          Pick a chord, tap the keys, and watch the
          theory come alive.
        </p>

        <div className="header-actions">
          <button
            className="sound-toggle"
            type="button"
            aria-pressed={soundOn}
            onClick={handleSoundToggle}
          >
            {soundOn ? "🔊 Sound on" : "🔇 Muted"}
          </button>
        </div>
      </header>


      {/* =========================
          MODE TABS
      ========================== */}
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

      {mode === "build" && (

        /* =========================
            CHORD LAB (BUILDER)
        ========================== */
        <div className="lab-layout">
          <section className="panel lab-panel">
            <ChordBuilder
              rootNote={rootNote}
              accidentalPreference={accidentalPreference}
              onRootChange={setRootNote}
              onChordBuild={handleChordBuild}
            />
          </section>

          {labChord && (
            <section className="panel chord-display-panel">
              <ChordDisplay
                chordName={labChordName}
                notes={labNotes}
                intervalNames={labChord.intervalNames}
                intervals={labChord.intervals}
                onPlay={handlePlayLabChord}
              />
            </section>
          )}

          <section className="panel piano-panel">
            <PianoKeyboard
              chordNotes={labNotes}
              accidentalPreference={accidentalPreference}
              selectedNotes={selectedNotes}
              onNoteToggle={handleNoteToggle}
              onClearSelection={handleClearSelection}
            />
          </section>
        </div>
      )}

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