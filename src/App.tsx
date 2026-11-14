import {
  useCallback,
  useEffect,
  useState,
  type MouseEvent,
} from "react";
import "./App.css";

import PianoKeyboard from "./components/PianoKeyboard";
import ChordSelector from "./components/ChordSelector";
import ChordDisplay from "./components/ChordDisplay";
import ChordAnalyzer from "./components/ChordAnalyzer";
import GuitarFretboard from "./components/GuitarFretboard";
import JazzVoicings from "./components/JazzVoicings";
import ChordProgressions from "./components/ChordProgressions";
import Metronome from "./components/Metronome";
import TwoFiveOneTrainer from "./components/TwoFiveOneTrainer";
import { chordTypes } from "./data/chords";
import {
  currentSection,
  navigateTo,
  routeParams,
  setRouteParams,
  syncFromLocation,
  type Section,
} from "./utils/route";
import { analyzeChord } from "./utils/chordAnalyzer";
import { catalogIndexFor } from "./utils/chordBuild";
import { guidePitchClasses } from "./utils/scaleHints";
import ScaleHints from "./components/ScaleHints";
import { ChordRoles } from "./components/WhyThisChord";
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
  getNotesByPreference,
  getPitchClass,
  type AccidentalPreference,
} from "./utils/musicTheory";

// The chord builder lives inside Progressions (build a chord
// and drop it straight into a progression, or edit one that's
// already there). The ii–V–I trainer has a tab of its own.
type Mode = Section;

const ROOT_PATTERN = /^[A-G][#b]?$/;

// Explore's chord in the URL: its symbol, with "major" for
// the plain triad (whose symbol is empty).
const chordParam = (index: number) =>
  chordTypes[index]?.symbol || "major";

const chordIndexFromParam = (value: string | undefined) => {
  if (!value) return 0;
  const symbol = value === "major" ? "" : value;
  const index = chordTypes.findIndex((chord) => chord.symbol === symbol);
  return index === -1 ? 0 : index;
};

// What the URL the page opened with says. Progressions calls
// its key "key"; Explore calls it "root". They share one value.
function initialSettings() {
  const section = currentSection();
  const params = routeParams(section);
  const root =
    section === "progressions" ? params.key : routeParams("explore").root;
  const spellParam =
    params.spell ?? routeParams("explore").spell;
  return {
    root: root && ROOT_PATTERN.test(root) ? root : "C",
    chordIndex: chordIndexFromParam(routeParams("explore").chord),
    spelling: (spellParam === "flats" ? "flats" : "sharps") as AccidentalPreference,
  };
}

const modes: { id: Mode; label: string }[] = [
  { id: "explore", label: "Explore" },
  { id: "progressions", label: "Progressions" },
  { id: "trainer", label: "ii–V–I" },
];

// Explore is long, so it gets an "On this page" jump bar.
const exploreSections = [
  { id: "explore-chord", label: "Chord" },
  { id: "explore-piano", label: "Piano" },
  { id: "explore-why", label: "Why" },
  { id: "explore-scales", label: "Scales" },
  { id: "explore-guitar", label: "Guitar" },
  { id: "explore-jazz", label: "Jazz" },
];

// The URL hash holds the route, so jump links scroll and move
// focus themselves instead of changing the address.
const jumpTo =
  (id: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const target = document.getElementById(id);
    if (!target) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    if (!target.hasAttribute("tabindex")) {
      target.setAttribute("tabindex", "-1");
    }
    target.focus({ preventScroll: true });
  };

function App() {
  const [mode, setModeState] = useState<Mode>(currentSection);
  const [initial] = useState(initialSettings);

  const [rootNote, setRootNote] = useState(initial.root);
  const [selectedChordIndex, setSelectedChordIndex] =
    useState(initial.chordIndex);
  const [accidentalPreference, setAccidentalPreference] =
    useState<AccidentalPreference>(initial.spelling);

  // Switching section from the nav adds a history entry, so
  // Back returns to the previous section.
  const setMode = (next: Mode) => {
    navigateTo(next);
    setModeState(next);
  };

  // Back/Forward (or an edited address) changes the section.
  useEffect(() => {
    const handleLocation = () => {
      const section = syncFromLocation();
      if (section) {
        setModeState(section);
      } else {
        window.location.reload();
      }
    };
    window.addEventListener("hashchange", handleLocation);
    return () =>
      window.removeEventListener("hashchange", handleLocation);
  }, []);

  // Keep the shared settings in the URL so a refresh or a
  // shared link opens the same chord.
  useEffect(() => {
    const spell = accidentalPreference === "flats" ? "flats" : undefined;
    setRouteParams("explore", {
      root: rootNote,
      chord: chordParam(selectedChordIndex),
      spell,
    });
    setRouteParams("progressions", { key: rootNote, spell });
  }, [rootNote, selectedChordIndex, accidentalPreference, mode]);

  // Notes selected by clicking the piano
  const [selectedNotes, setSelectedNotes] = useState<
    string[]
  >([]);

  // Guide tones (3rd & 7th) drawn in mint on the piano and
  // guitar; switched from the improvising hints.
  const [markGuides, setMarkGuides] = useState(true);

  // Sound output toggle
  const [soundOn, setSoundOn] = useState(true);

  // Start fetching the piano samples right away so the
  // first key press already sounds like a piano.
  useEffect(() => {
    preloadAudio();
  }, []);

  // Name the current section in the browser tab too.
  useEffect(() => {
    const label = modes.find((item) => item.id === mode)?.label;
    document.title = `${label} · Music Chord Explorer`;
  }, [mode]);

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

  const guideTones = markGuides
    ? guidePitchClasses(
        getPitchClass(rootNote),
        selectedChord.intervals
      )
    : [];

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
    <>
      <a
        className="skip-link"
        href="#main-content"
        onClick={jumpTo("main-content")}
      >
        Skip to content
      </a>

      <div className="app">

      {/* =========================
          HEADER + SECTION NAV
          One quiet row: name, sections, sound.
      ========================== */}
      <header className="header">
        <p className="brand">
          <span aria-hidden="true">
            chord<span className="brand-slash">/</span>explorer
          </span>
          <span className="visually-hidden">Music Chord Explorer</span>
        </p>

        <nav className="mode-tabs" aria-label="Sections">
          {modes.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-current={mode === item.id ? "page" : undefined}
              className={`${mode === item.id ? "tab active" : "tab"}${
                item.id === "trainer" ? " tab-roman" : ""
              }`}
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

      <main id="main-content" tabIndex={-1}>

      {mode === "explore" ? (
        <>
          <h1 className="visually-hidden">Explore chords</h1>

          {/* =========================
              TOP: PICK A CHORD + CHORD CARD
          ========================== */}
          <nav className="jump-bar" aria-label="On this page">
            <ul>
              {exploreSections.map((item) => (
                <li key={item.id}>
                  <a href={`#${item.id}`} onClick={jumpTo(item.id)}>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="explore-wrapper" id="explore-chord">
            <section className="panel explore-controls" aria-label="Pick a chord">
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

            <section className="panel chord-display-panel" aria-label="Chord card">
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

            <section className="panel piano-panel" id="explore-piano" aria-label="Piano">
              <PianoKeyboard
                chordNotes={chordNotes}
                accidentalPreference={accidentalPreference}
                selectedNotes={selectedNotes}
                onNoteToggle={handleNoteToggle}
                onClearSelection={handleClearSelection}
                guideTones={guideTones}
              />
            </section>

            <ChordAnalyzer
              selectedNotes={selectedNotes}
              accidentalPreference={accidentalPreference}
              onUseDetectedChord={
                handleUseDetectedChord
              }
            />

            {/* Why this chord? Its job in the keys it
                lives in, and where it likes to go. */}
            <section className="panel why-explore-panel" id="explore-why" aria-label="Why this chord">
              <ChordRoles
                chordName={chordName}
                rootPitchClass={getPitchClass(rootNote)}
                intervals={selectedChord.intervals}
                name={(pitchClass) =>
                  formatNoteForDisplay(
                    getNotesByPreference(accidentalPreference)[pitchClass]
                  )
                }
              />
            </section>

            {/* Which scale to improvise over this chord,
                and its guide tones. */}
            <section className="panel scale-panel" id="explore-scales" aria-label="Scales to improvise with">
              <ScaleHints
                chordName={chordName}
                root={displayedRootNote}
                intervals={selectedChord.intervals}
                accidentalPreference={accidentalPreference}
                markGuides={markGuides}
                onMarkGuidesChange={setMarkGuides}
              />
            </section>

            <section className="panel guitar-panel" id="explore-guitar" aria-label="Guitar">
              <GuitarFretboard
                chordName={chordName}
                rootNote={rootNote}
                notes={chordNotes}
                intervals={selectedChord.intervals}
                guideTones={guideTones}
              />
            </section>

            <section className="panel jazz-panel" id="explore-jazz" aria-label="Jazz voicings">
              <JazzVoicings
                chordName={chordName}
                rootNote={rootNote}
                intervals={selectedChord.intervals}
                accidentalPreference={accidentalPreference}
              />
            </section>

            <aside className="panel tips-card" aria-label="Quick theory bites">
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

      {/* Progressions stays mounted while hidden so the
          progression you're building survives a trip to
          another section. `active` stops its playback. */}
      <div hidden={mode !== "progressions"}>
        <ChordProgressions
          active={mode === "progressions"}
          rootNote={rootNote}
          accidentalPreference={accidentalPreference}
          onRootChange={setRootNote}
          onAccidentalPreferenceChange={
            handleAccidentalPreferenceChange
          }
        />
      </div>

      {mode === "trainer" && <TwoFiveOneTrainer />}

      </main>

      <footer className="site-footer">
        <p>
          On Explore, your computer keys play the piano
          (<kbd>A</kbd>–<kbd>L</kbd> for white keys,{" "}
          <kbd>W</kbd> <kbd>E</kbd> <kbd>T</kbd> <kbd>Y</kbd>{" "}
          <kbd>U</kbd> for black keys). You can switch this
          off above the keyboard.
        </p>
      </footer>
      </div>
    </>
  );
}

export default App;