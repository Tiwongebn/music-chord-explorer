import { useState } from "react";
import "./App.css";

import ChordSelector from "./components/ChordSelector";
import ChordDisplay from "./components/ChordDisplay";

import { chordTypes } from "./data/chords";
import { calculateChordNotes } from "./utils/musicTheory";

function App() {
  const [rootNote, setRootNote] = useState("C");
  const [selectedChordIndex, setSelectedChordIndex] = useState(0);

  const selectedChord = chordTypes[selectedChordIndex];

  const chordNotes = calculateChordNotes(
    rootNote,
    selectedChord.intervals
  );

  const chordName = `${rootNote}${selectedChord.symbol}`;

  return (
    <main className="app">
      <header className="header">
        <p className="eyebrow">INTERACTIVE MUSIC THEORY</p>
        <h1>Music Chord Explorer</h1>
        <p>
          Explore how chords are built from notes and musical intervals.
        </p>
      </header>

      <ChordSelector
        rootNote={rootNote}
        chordTypeIndex={selectedChordIndex}
        onRootChange={setRootNote}
        onChordTypeChange={setSelectedChordIndex}
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