import { useState } from "react";
import "./App.css";

import ChordSelector from "./components/ChordSelector";
import ChordDisplay from "./components/ChordDisplay";

import { chordTypes } from "./data/chords";

import {
  calculateChordNotes,
  convertRootNote,
  formatNoteForDisplay,
  type AccidentalPreference,
} from "./utils/musicTheory";

function App() {
  const [rootNote, setRootNote] = useState("C");

  const [
    selectedChordIndex,
    setSelectedChordIndex,
  ] = useState(0);

  const [
    accidentalPreference,
    setAccidentalPreference,
  ] = useState<AccidentalPreference>("sharps");

  const selectedChord =
    chordTypes[selectedChordIndex];

  const chordNotes = calculateChordNotes(
    rootNote,
    selectedChord.intervals,
    selectedChord.intervalNames
  );

  const chordName =
    `${formatNoteForDisplay(rootNote)}${selectedChord.symbol}`;

  const handleAccidentalPreferenceChange = (
    preference: AccidentalPreference
  ) => {
    const convertedRootNote = convertRootNote(
      rootNote,
      preference
    );

    setRootNote(convertedRootNote);
    setAccidentalPreference(preference);
  };

  return (
    <main className="app">
      <header className="header">
        <p className="eyebrow">
          INTERACTIVE MUSIC THEORY
        </p>

        <h1>Music Chord Explorer</h1>

        <p>
          Explore how chords are built from notes
          and musical intervals.
        </p>
      </header>

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
    </main>
  );
}

export default App;