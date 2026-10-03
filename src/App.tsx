import { useState } from "react";
import "./App.css";

import PianoKeyboard from "./components/PianoKeyboard";
import ChordSelector from "./components/ChordSelector";
import ChordDisplay from "./components/ChordDisplay";
import ChordAnalyzer from "./components/ChordAnalyzer";
import ChordBuilder from "./components/ChordBuilder";
import { chordTypes } from "./data/chords";
import { analyzeChord } from "./utils/chordAnalyzer";
import {
  calculateChordNotes,
  convertRootNote,
  formatNoteForDisplay,
  type AccidentalPreference,
} from "./utils/musicTheory";

type Mode = "explore" | "build";

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

  // Result of the last Chord Lab build — used for the hint
  // banner only. Never switches tabs on its own.
  const [lastBuild, setLastBuild] = useState<{
    matched: boolean;
  } | null>(null);

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

  const handleAccidentalPreferenceChange = (
    preference: AccidentalPreference
  ) => {
    setRootNote(convertRootNote(rootNote, preference));
    setAccidentalPreference(preference);
  };

  const handleNoteToggle = (note: string) => {
    setSelectedNotes((current) =>
      current.includes(note)
        ? current.filter((item) => item !== note)
        : [...current, note]
    );
  };

  const handleClearSelection = () => {
    setSelectedNotes([]);
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

  // Chord Lab -> Explore: update the Explore chord silently
  // in the background and show a hint banner. Important:
  // ChordBuilder fires onChordBuild on mount AND on every
  // toggle, so switching tabs here would instantly snap the
  // user back to Explore — never call setMode() from this.
  const handleChordBuild = (chord: {
    intervals: number[];
  }) => {
    const match = findMatchingChordIndex(chord.intervals);

    setLastBuild({ matched: match !== -1 });

    if (match !== -1) {
      setSelectedChordIndex(match);
    }
  };

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
      </header>


      {/* =========================
          MODE TABS
      ========================== */}
      <nav className="mode-tabs" aria-label="App mode">
        <button
          type="button"
          className={
            mode === "explore" ? "tab active" : "tab"
          }
          onClick={() => setMode("explore")}
        >
          🎹 Explore
        </button>

        <button
          type="button"
          className={
            mode === "build" ? "tab active" : "tab"
          }
          onClick={() => setMode("build")}
        >
          🧪 Chord Lab
        </button>
      </nav>


      {mode === "explore" ? (
        <>

          {/* =========================
              HERO: PICK + SEE THE CHORD
          ========================== */}
          <section className="panel hero-card">

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

            <ChordDisplay
              chordName={chordName}
              notes={chordNotes}
              intervalNames={selectedChord.intervalNames}
              intervals={selectedChord.intervals}
            />

          </section>


          {/* =========================
              PIANO STAGE
          ========================== */}
          <section className="panel piano-panel">

            <PianoKeyboard
              chordNotes={chordNotes}
              accidentalPreference={accidentalPreference}
              selectedNotes={selectedNotes}
              onNoteToggle={handleNoteToggle}
              onClearSelection={handleClearSelection}
            />

          </section>


          {/* =========================
              ANALYZER + THEORY BITES
          ========================== */}
          <div className="duo-grid">

            <ChordAnalyzer
              selectedNotes={selectedNotes}
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
      ) : (

        /* =========================
            CHORD LAB (BUILDER)
        ========================== */
        <section className="panel lab-panel">

          {lastBuild?.matched && (
            <p className="lab-hint match">
              🎉 That matches{" "}
              <strong>{chordName}</strong> — flip to{" "}
              <strong>🎹 Explore</strong> to see it
              light up the piano.
            </p>
          )}

          {lastBuild && !lastBuild.matched && (
            <p className="lab-hint">
              🧪 That combination is more exotic than
              the catalog — the intervals below still
              tell the story.
            </p>
          )}

          <ChordBuilder
            rootNote={rootNote}
            onRootChange={setRootNote}
            onChordBuild={handleChordBuild}
          />

        </section>
      )}

    </main>
  );
}

export default App;