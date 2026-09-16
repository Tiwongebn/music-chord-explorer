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

  // Notes selected by clicking the piano
  const [selectedNotes, setSelectedNotes] =
    useState<string[]>([]);

  const selectedChord =
    chordTypes[selectedChordIndex];

    const pitchClasses = selectedNotes.map(
  (note) => note.replace(/\d+$/, "")
);

const detectedChord =
  analyzeChord(pitchClasses);

  // Convert the root note to the user's preferred
  // sharp/flat notation
  const displayedRootNote = convertRootNote(
    rootNote,
    accidentalPreference
  );

  // Calculate the notes that belong to the
  // currently selected chord
  const chordNotes = calculateChordNotes(
    rootNote,
    selectedChord.intervals,
    selectedChord.intervalNames,
    accidentalPreference
  );

  // Example: C + major triad = C Major
  const chordName =
    `${formatNoteForDisplay(displayedRootNote)}${selectedChord.symbol}`;

  // Handle sharp/flat preference changes
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

  // Handle clicking a piano key
  const handleNoteToggle = (note: string) => {
    setSelectedNotes((currentNotes) => {
      // If the note is already selected,
      // remove it
      if (currentNotes.includes(note)) {
        return currentNotes.filter(
          (selectedNote) => selectedNote !== note
        );
      }

      // Otherwise add it
      return [...currentNotes, note];
    });
  };

  // Clear all manually selected notes
  const handleClearSelection = () => {
    setSelectedNotes([]);
  };

  const handleUseDetectedChord = () => {
  if (!detectedChord) {
    return;
  }

  const detectedPattern =
    detectedChord.pattern
      .map((interval) => interval % 12)
      .sort((a, b) => a - b);

  const matchingChordIndex =
    chordTypes.findIndex((chord) => {
      const chordPattern =
        chord.intervals
          .map((interval) => interval % 12)
          .sort((a, b) => a - b);

      return (
        chordPattern.length ===
          detectedPattern.length &&
        chordPattern.every(
          (interval, index) =>
            interval === detectedPattern[index]
        )
      );
    });

  if (matchingChordIndex === -1) {
    return;
  }

  const convertedRoot =
    convertRootNote(
      detectedChord.root,
      accidentalPreference
    );

  setRootNote(convertedRoot);
  setSelectedChordIndex(matchingChordIndex);
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

        <p>
          Explore how chords are built from notes
          and musical intervals.
        </p>
      </header>


      {/* =========================
          CHORD SELECTOR
      ========================== */}
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


      {/* =========================
          CHORD INFORMATION
      ========================== */}
      <ChordDisplay
        chordName={chordName}
        notes={chordNotes}
        intervalNames={selectedChord.intervalNames}
        intervals={selectedChord.intervals}
      />

    <ChordBuilder
  rootNote={rootNote}
  onRootChange={setRootNote}
/>


      {/* =========================
          INTERACTIVE PIANO
      ========================== */}
           <PianoKeyboard
        chordNotes={chordNotes}
        accidentalPreference={accidentalPreference}
        selectedNotes={selectedNotes}
        onNoteToggle={handleNoteToggle}
      />

      <ChordAnalyzer
  selectedNotes={selectedNotes}
  onUseDetectedChord={
    handleUseDetectedChord
  }
/>

      <section className="selected-notes">

        <h3>Selected Notes</h3>

        {selectedNotes.length === 0 ? (
          <p>No notes selected.</p>
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
            onClick={handleClearSelection}
          >
            Clear Selection
          </button>
        )}

      </section>

    </main>
  );
}

export default App;