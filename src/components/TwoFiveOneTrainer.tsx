import { useEffect, useMemo, useState } from "react";

import { useVoicingPlayer, type PlayerItem } from "../hooks/useVoicingPlayer";
import {
  INSTRUMENTS,
  isInstrumentId,
  preloadInstrument,
  scheduleVoicing,
  startAudioClock,
  type InstrumentId,
} from "../utils/audio";
import { MAX_BPM, MIN_BPM, clampBpm } from "../utils/metronome";
import { formatNoteForDisplay } from "../utils/musicTheory";
import {
  cycleKeys,
  keyName,
  octaveName,
  twoFiveOne,
  voiceLead,
  voiceMoves,
  type CycleOrder,
  type KeyMode,
  type VoicedChord,
  type VoicedNote,
  type VoicingStyle,
} from "../utils/voiceLeading";

// ============================================================
// ii–V–I trainer: pick a key, see the ii–V–I voiced so every
// change moves as little as possible, hear it over the click,
// then run it through all twelve keys.
// ============================================================

const SOUND_STORAGE_KEY = "chord-explorer:progression-sound";

function loadSound(): InstrumentId {
  try {
    const saved = window.localStorage.getItem(SOUND_STORAGE_KEY);
    return isInstrumentId(saved) ? saved : "piano";
  } catch {
    return "piano";
  }
}

const STYLES: { id: VoicingStyle; label: string; hint: string }[] = [
  {
    id: "shell",
    label: "Shells",
    hint: "Root, 3rd and 7th only. The 3rd and 7th are the guide tones: they carry the sound of each chord and move by half step.",
  },
  {
    id: "rootless",
    label: "Rootless",
    hint: "3rd, 7th and two colour tones (9th, 13th), no root. On piano a bass player or your left hand covers the root.",
  },
  {
    id: "sevenths",
    label: "Four-note 7ths",
    hint: "Root, 3rd, 5th and 7th, in whichever inversion moves least from the last chord.",
  },
];

const RHYTHMS = [
  { id: "short", label: "2 + 2 + 4 beats", beats: [2, 2, 4] },
  { id: "long", label: "1 bar + 1 bar + 2 bars", beats: [4, 4, 8] },
] as const;

type RhythmId = (typeof RHYTHMS)[number]["id"];

const CYCLE_ORDERS: { id: CycleOrder; label: string }[] = [
  { id: "fourths", label: "Around the circle (up a 4th)" },
  { id: "half-steps", label: "Down in half steps" },
];

// Root pitch classes in the order the key picker shows them.
const KEY_ORDER = [0, 5, 10, 3, 8, 1, 6, 11, 4, 9, 2, 7];

const display = (name: string) => formatNoteForDisplay(name);

function TwoFiveOneTrainer() {
  const [keyPc, setKeyPc] = useState(0);
  const [mode, setMode] = useState<KeyMode>("major");
  const [style, setStyle] = useState<VoicingStyle>("shell");
  const [sound, setSound] = useState<InstrumentId>(loadSound);
  const [bpm, setBpm] = useState(100);
  const [rhythmId, setRhythmId] = useState<RhythmId>("short");
  const [click, setClick] = useState(true);
  const [countIn, setCountIn] = useState(true);
  const [cycleOn, setCycleOn] = useState(false);
  const [cycleOrder, setCycleOrder] = useState<CycleOrder>("fourths");

  const player = useVoicingPlayer();
  const { stop } = player;

  const instrument = sound === "piano" ? "piano" : "guitar";
  const rhythm = RHYTHMS.find((item) => item.id === rhythmId) ?? RHYTHMS[0];

  useEffect(() => {
    try {
      window.localStorage.setItem(SOUND_STORAGE_KEY, sound);
    } catch {
      // Storage blocked; the choice just won't stick.
    }

    const id = window.setTimeout(() => preloadInstrument(sound), 300);

    return () => window.clearTimeout(id);
  }, [sound]);

  // Changing what's being played stops it, so what you hear
  // always matches what's on screen.
  useEffect(() => {
    stop();
  }, [mode, style, sound, bpm, rhythmId, click, countIn, cycleOn, cycleOrder, stop]);

  // The keys in play: just the chosen one, or all twelve
  // starting from it.
  const runKeys = useMemo(
    () => (cycleOn ? cycleKeys(keyPc, cycleOrder) : [keyPc]),
    [cycleOn, cycleOrder, keyPc]
  );

  // Voice the whole run at once, so the line keeps moving
  // smoothly from one key into the next.
  const voiced = useMemo(() => {
    const chords = runKeys.flatMap((pc) => twoFiveOne(pc, mode, style));
    const all = voiceLead(chords, style, instrument);

    return runKeys.map((pc, index) => ({
      keyPc: pc,
      chords: all.slice(index * 3, index * 3 + 3),
    }));
  }, [runKeys, mode, style, instrument]);

  const itemId = (keyIndex: number, chordIndex: number) =>
    `${keyIndex}:${chordIndex}`;

  const active = player.activeId?.split(":").map(Number) ?? null;

  // While playing, follow the sounding key; otherwise show the
  // picked one.
  const shownKeyIndex = active
    ? active[0]
    : Math.max(0, voiced.findIndex((item) => item.keyPc === keyPc));
  const shown = voiced[shownKeyIndex] ?? voiced[0];
  const nextKey = cycleOn ? voiced[(shownKeyIndex + 1) % voiced.length] : null;

  const notesToPlay = (chord: VoicedChord) =>
    [...(chord.bass ? [chord.bass] : []), ...chord.notes].map((note) => ({
      midi: note.midi,
      string: note.string,
    }));

  const items: PlayerItem[] = voiced.flatMap((item, keyIndex) =>
    item.chords.map((chord, chordIndex) => ({
      id: itemId(keyIndex, chordIndex),
      beats: rhythm.beats[chordIndex],
      notes: notesToPlay(chord),
    }))
  );

  const handlePlay = (loop: boolean) => {
    if (player.isPlaying) {
      stop();
      return;
    }

    player.play(items, { bpm, loop, click, countIn, instrument: sound });
  };

  const handlePlayOne = (chord: VoicedChord) => {
    stop();
    void startAudioClock().then((now) =>
      scheduleVoicing(
        { time: now + 0.05, duration: 2.2, notes: notesToPlay(chord) },
        sound
      )
    );
  };

  const handlePickKey = (pc: number) => {
    stop();
    setKeyPc(pc);
  };

  const tonic = keyName(shown.keyPc, mode);
  const styleInfo = STYLES.find((item) => item.id === style) ?? STYLES[0];

  return (
    <section className="panel trainer-panel">
      <header className="trainer-intro">
        <p className="eyebrow trainer-eyebrow">ii–V–I trainer</p>
        <h2 className="trainer-key">
          {display(tonic)} {mode}
          <span className="trainer-key-chords">
            {shown.chords.map((chord) => display(chord.symbol)).join("  ·  ")}
          </span>
        </h2>
        <p className="hint">
          The most common move in jazz. Watch the 3rds and 7ths: the
          7th of each chord slips down a half step to become the 3rd of
          the next, so the whole progression moves with tiny steps.
        </p>
      </header>

      <div className="trainer-controls">
        <div className="selector-group trainer-keys">
          <span className="selector-label">Key</span>
          <div className="root-pills" role="group" aria-label="Key">
            {KEY_ORDER.map((pc) => (
              <button
                key={pc}
                type="button"
                className={
                  pc === shown.keyPc ? "root-pill active" : "root-pill"
                }
                aria-pressed={pc === shown.keyPc}
                onClick={() => handlePickKey(pc)}
              >
                {display(keyName(pc, mode))}
              </button>
            ))}
          </div>
        </div>

        <div className="selector-group">
          <span className="selector-label">Major or minor</span>
          <div className="segmented" role="group" aria-label="Major or minor">
            {(["major", "minor"] as const).map((item) => (
              <button
                key={item}
                type="button"
                className={mode === item ? "seg active" : "seg"}
                aria-pressed={mode === item}
                onClick={() => setMode(item)}
              >
                {item === "major" ? "Major ii–V–I" : "Minor iiø–V–i"}
              </button>
            ))}
          </div>
        </div>

        <div className="selector-group">
          <span className="selector-label">Voicing</span>
          <div className="segmented" role="group" aria-label="Voicing">
            {STYLES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={style === item.id ? "seg active" : "seg"}
                aria-pressed={style === item.id}
                onClick={() => setStyle(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <p className="hint trainer-style-hint">{styleInfo.hint}</p>
        </div>

        <div className="selector-group">
          <label className="selector-label" htmlFor="trainer-sound">
            Sound
          </label>
          <select
            id="trainer-sound"
            value={sound}
            onChange={(event) => {
              if (isInstrumentId(event.target.value)) {
                setSound(event.target.value);
              }
            }}
          >
            {INSTRUMENTS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="trainer-transport">
        <div className="trainer-transport-buttons">
          <button
            type="button"
            className="play-chord"
            onClick={() => handlePlay(cycleOn)}
          >
            {player.isPlaying
              ? "■ Stop"
              : cycleOn
                ? "▶ Play all 12 keys"
                : "▶ Play"}
          </button>

          {!cycleOn && (
            <button
              type="button"
              className="link-button trainer-loop"
              onClick={() => handlePlay(true)}
              disabled={player.isPlaying}
            >
              Loop
            </button>
          )}

          <span
            className={
              player.isPlaying ? "trainer-beats is-on" : "trainer-beats"
            }
            aria-hidden="true"
          >
            {[0, 1, 2, 3].map((index) => (
              <span
                key={index}
                className={
                  player.beat === index
                    ? index === 0
                      ? "trainer-beat is-downbeat"
                      : "trainer-beat is-beat"
                    : "trainer-beat"
                }
              />
            ))}
          </span>

          <span className="hint trainer-status" aria-live="polite">
            {player.countingIn
              ? "Count-in…"
              : player.isPlaying && active
                ? `${display(keyName(voiced[active[0]].keyPc, mode))} ${mode} · ${display(voiced[active[0]].chords[active[1]].symbol)}`
                : ""}
          </span>
        </div>

        <div className="trainer-transport-settings">
          <div className="selector-group tempo-group">
            <label className="selector-label" htmlFor="trainer-tempo">
              Tempo
            </label>
            <div className="tempo-control">
              <input
                id="trainer-tempo"
                type="range"
                min={MIN_BPM + 10}
                max={Math.min(MAX_BPM, 220)}
                step={2}
                value={bpm}
                onChange={(event) =>
                  setBpm(clampBpm(Number(event.target.value)))
                }
              />
              <span className="tempo-value">{bpm} BPM</span>
            </div>
          </div>

          <div className="selector-group">
            <label className="selector-label" htmlFor="trainer-rhythm">
              Chord lengths
            </label>
            <select
              id="trainer-rhythm"
              value={rhythmId}
              onChange={(event) => setRhythmId(event.target.value as RhythmId)}
            >
              {RHYTHMS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="trainer-checks">
            <label className="trainer-check">
              <input
                type="checkbox"
                checked={click}
                onChange={(event) => setClick(event.target.checked)}
              />
              Metronome click
            </label>
            <label className="trainer-check">
              <input
                type="checkbox"
                checked={countIn}
                onChange={(event) => setCountIn(event.target.checked)}
              />
              One-bar count-in
            </label>
            <label className="trainer-check">
              <input
                type="checkbox"
                checked={cycleOn}
                onChange={(event) => setCycleOn(event.target.checked)}
              />
              Cycle all 12 keys
            </label>
          </div>

          {cycleOn && (
            <div className="selector-group">
              <label className="selector-label" htmlFor="trainer-order">
                Key order
              </label>
              <select
                id="trainer-order"
                value={cycleOrder}
                onChange={(event) =>
                  setCycleOrder(event.target.value as CycleOrder)
                }
              >
                {CYCLE_ORDERS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {cycleOn && (
          <ol className="trainer-run" aria-label="Keys in this run">
            {voiced.map((item, index) => (
              <li
                key={item.keyPc}
                className={
                  index === shownKeyIndex
                    ? "trainer-run-key is-current"
                    : "trainer-run-key"
                }
              >
                {display(keyName(item.keyPc, mode))}
              </li>
            ))}
          </ol>
        )}
      </div>

      <VoiceLeadingMap
        chords={shown.chords}
        next={nextKey ? nextKey.chords[0] : null}
        activeIndex={active && active[0] === shownKeyIndex ? active[1] : -1}
      />

      <div className="trainer-cards">
        {shown.chords.map((chord, chordIndex) => (
          <ChordCard
            key={chordIndex}
            chord={chord}
            instrument={instrument}
            range={keyboardRange(shown.chords)}
            isActive={
              !!active &&
              active[0] === shownKeyIndex &&
              active[1] === chordIndex
            }
            beats={rhythm.beats[chordIndex]}
            onPlay={() => handlePlayOne(chord)}
          />
        ))}
      </div>

      <MoveList chords={shown.chords} next={nextKey ? nextKey.chords[0] : null} />
    </section>
  );
}

// ---- Voice-leading map --------------------------------------
//
// Each voice is a line from chord to chord, pitch going up the
// page. Held notes are mint, half and whole steps amber, so the
// smoothness of the progression is visible at a glance.

function moveClass(semitones: number): string {
  const size = Math.abs(semitones);

  if (size === 0) {
    return "vl-line held";
  }

  return size <= 2 ? "vl-line step" : "vl-line leap";
}

function VoiceLeadingMap({
  chords,
  next,
  activeIndex,
}: {
  chords: VoicedChord[];
  next: VoicedChord | null;
  activeIndex: number;
}) {
  const columns = next ? [...chords, next] : chords;
  const midis = columns.flatMap((chord) => chord.notes.map((note) => note.midi));

  if (midis.length === 0) {
    return null;
  }

  const low = Math.min(...midis) - 1;
  const high = Math.max(...midis) + 1;
  const step = 17; // px per semitone, so neighbouring notes don't touch
  const colGap = 124;
  const left = 34;
  const top = 34;
  const width = left + colGap * (columns.length - 1) + 40;
  const height = top + (high - low) * step + 18;
  const x = (index: number) => left + index * colGap;
  const y = (midi: number) => top + (high - midi) * step;

  return (
    <figure className="vl-map">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Voice leading: ${columns
          .map((chord) => chord.notes.map(octaveName).join(" "))
          .join(", then ")}`}
      >
        {columns.map((chord, index) => (
          <g key={`col-${index}`}>
            <rect
              className={
                index === activeIndex ? "vl-col is-active" : "vl-col"
              }
              x={x(index) - 35}
              y={4}
              width={70}
              height={height - 8}
              rx={10}
            />
            <text
              className={index === chords.length ? "vl-head is-next" : "vl-head"}
              x={x(index)}
              y={20}
              textAnchor="middle"
            >
              {formatNoteForDisplay(chord.symbol)}
            </text>
          </g>
        ))}

        {columns.slice(1).map((chord, index) =>
          voiceMoves(columns[index], chord).map((move, voice) => (
            <line
              key={`line-${index}-${voice}`}
              className={
                index === chords.length - 1
                  ? `${moveClass(move.semitones)} is-next`
                  : moveClass(move.semitones)
              }
              x1={x(index) + 27}
              y1={y(move.from.midi)}
              x2={x(index + 1) - 27}
              y2={y(move.to.midi)}
            />
          ))
        )}

        {columns.map((chord, index) =>
          chord.notes.map((note) => (
            <g
              key={`note-${index}-${note.midi}`}
              className={index === chords.length ? "vl-note is-next" : "vl-note"}
            >
              <rect
                x={x(index) - 26}
                y={y(note.midi) - 8}
                width={52}
                height={16}
                rx={8}
              />
              <text
                className="vl-note-name"
                x={x(index) - 4}
                y={y(note.midi) + 4}
                textAnchor="end"
              >
                {formatNoteForDisplay(note.name)}
              </text>
              <text
                className="vl-note-label"
                x={x(index) + 2}
                y={y(note.midi) + 4}
                textAnchor="start"
              >
                {formatNoteForDisplay(note.label)}
              </text>
            </g>
          ))
        )}
      </svg>
      <figcaption className="vl-legend">
        <span className="vl-key held">held note</span>
        <span className="vl-key step">half / whole step</span>
        <span className="vl-key leap">bigger move</span>
      </figcaption>
    </figure>
  );
}

// ---- Move list ----------------------------------------------

function describeMove(semitones: number): string {
  if (semitones === 0) {
    return "stays";
  }

  const size = Math.abs(semitones);
  const name =
    size === 1 ? "half step" : size === 2 ? "whole step" : `${size} semitones`;

  return `${name} ${semitones > 0 ? "up" : "down"}`;
}

function MoveList({
  chords,
  next,
}: {
  chords: VoicedChord[];
  next: VoicedChord | null;
}) {
  const pairs: [VoicedChord, VoicedChord][] = [
    [chords[0], chords[1]],
    [chords[1], chords[2]],
  ];

  if (next) {
    pairs.push([chords[2], next]);
  }

  return (
    <div className="trainer-moves">
      {pairs.map(([from, to]) => {
        const moves = voiceMoves(from, to);
        const total = moves.reduce((sum, move) => sum + Math.abs(move.semitones), 0);
        const held = moves.filter((move) => move.semitones === 0).length;

        return (
          <div key={`${from.symbol}-${to.symbol}`} className="trainer-move">
            <h3 className="selector-label">
              {display(from.symbol)} → {display(to.symbol)}
            </h3>
            <p className="trainer-move-summary">
              {held} held · {total} semitone{total === 1 ? "" : "s"} of movement
            </p>
            <ul>
              {moves.map((move, index) => (
                <li key={index} className={move.semitones === 0 ? "is-held" : ""}>
                  <span className="trainer-move-notes">
                    {display(move.from.name)}
                    <small>{display(move.from.label)}</small>
                    {" → "}
                    {display(move.to.name)}
                    <small>{display(move.to.label)}</small>
                  </span>
                  <span className="trainer-move-size">
                    {describeMove(move.semitones)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

// ---- Chord card ---------------------------------------------

function keyboardRange(chords: VoicedChord[]): [number, number] {
  const midis = chords.flatMap((chord) => [
    ...(chord.bass ? [chord.bass.midi] : []),
    ...chord.notes.map((note) => note.midi),
  ]);
  const low = Math.min(...midis);
  const high = Math.max(...midis);

  // Whole octaves, C to B, so every card lines up.
  return [low - (low % 12), high + (11 - (high % 12))];
}

function ChordCard({
  chord,
  instrument,
  range,
  isActive,
  beats,
  onPlay,
}: {
  chord: VoicedChord;
  instrument: "piano" | "guitar";
  range: [number, number];
  isActive: boolean;
  beats: number;
  onPlay: () => void;
}) {
  const topFirst = [...chord.notes].reverse();

  return (
    <article className={isActive ? "trainer-card is-active" : "trainer-card"}>
      <div className="trainer-card-head">
        <span className="trainer-roman">{chord.roman}</span>
        <h3 className="trainer-symbol">{display(chord.symbol)}</h3>
        {chord.form && (
          <span
            className="trainer-form"
            title={
              chord.form === "A"
                ? "A form: the 3rd on the bottom"
                : "B form: the 7th on the bottom"
            }
          >
            {chord.form} form
          </span>
        )}
      </div>

      {instrument === "piano" ? (
        <MiniKeyboard chord={chord} range={range} />
      ) : (
        <FretDiagram chord={chord} />
      )}

      <ol className="trainer-voices" aria-label="Notes, top to bottom">
        {topFirst.map((note) => (
          <li key={note.midi}>
            <span>{display(octaveName(note))}</span>
            <small>{display(note.label)}</small>
          </li>
        ))}
        {chord.bass && (
          <li className="is-bass">
            <span>{display(octaveName(chord.bass))}</span>
            <small>bass</small>
          </li>
        )}
      </ol>

      <div className="trainer-card-foot">
        <button type="button" className="link-button" onClick={onPlay}>
          ▶ Hear it
        </button>
        <span className="hint">{beats} beats</span>
      </div>
    </article>
  );
}

const BLACK_PCS = new Set([1, 3, 6, 8, 10]);

function MiniKeyboard({
  chord,
  range,
}: {
  chord: VoicedChord;
  range: [number, number];
}) {
  const [low, high] = range;
  const whites: number[] = [];

  for (let midi = low; midi <= high; midi++) {
    if (!BLACK_PCS.has(midi % 12)) {
      whites.push(midi);
    }
  }

  const keyWidth = 12;
  const width = whites.length * keyWidth;
  const height = 64;
  const voiced = new Map<number, VoicedNote>(
    chord.notes.map((note) => [note.midi, note])
  );
  const bass = chord.bass?.midi ?? null;
  const whiteIndex = (midi: number) => whites.indexOf(midi);

  const blacks: number[] = [];
  for (let midi = low; midi <= high; midi++) {
    if (BLACK_PCS.has(midi % 12)) {
      blacks.push(midi);
    }
  }

  const fill = (midi: number) =>
    midi === bass ? "is-bass" : voiced.has(midi) ? "is-on" : "";

  return (
    <svg
      className="mini-keys"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Piano: ${[
        ...(chord.bass ? [octaveName(chord.bass)] : []),
        ...chord.notes.map(octaveName),
      ].join(", ")}`}
    >
      {whites.map((midi, index) => (
        <rect
          key={midi}
          className={`mini-white ${fill(midi)}`}
          x={index * keyWidth + 0.5}
          y={0.5}
          width={keyWidth - 1}
          height={height - 1}
          rx={2}
        />
      ))}
      {blacks.map((midi) => {
        const left = whiteIndex(midi - 1);

        return (
          <rect
            key={midi}
            className={`mini-black ${fill(midi)}`}
            x={(left + 1) * keyWidth - 4}
            y={0.5}
            width={8}
            height={38}
            rx={1.5}
          />
        );
      })}
      {whites.map((midi, index) =>
        midi % 12 === 0 ? (
          <text
            key={`c-${midi}`}
            className="mini-octave"
            x={index * keyWidth + keyWidth / 2}
            y={height - 6}
            textAnchor="middle"
          >
            C{Math.floor(midi / 12) - 1}
          </text>
        ) : null
      )}
    </svg>
  );
}

const DIAGRAM_FRETS = 5;

function FretDiagram({ chord }: { chord: VoicedChord }) {
  const frets = chord.frets ?? [];
  const fretted = frets.filter((fret) => fret > 0);
  const lowest = fretted.length ? Math.min(...fretted) : 1;
  const base = lowest <= 2 ? 1 : lowest;
  const labels = new Map<number, string>(
    chord.notes
      .filter((note) => note.string !== undefined)
      .map((note) => [note.string as number, note.label])
  );

  const left = 30;
  const top = 26;
  const gap = 24;
  const fretGap = 28;
  const width = left + gap * 5 + 30;
  const height = top + fretGap * DIAGRAM_FRETS + 10;

  return (
    <svg
      className="mini-frets"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Guitar shape, low E to high E: ${frets
        .map((fret) => (fret < 0 ? "x" : fret))
        .join(" ")}`}
    >
      {base === 1 ? (
        <line className="fretboard-nut" x1={left} y1={top} x2={left + gap * 5} y2={top} />
      ) : (
        <text className="fretboard-label" x={left - 10} y={top + fretGap / 2 + 4} textAnchor="end">
          {base}
        </text>
      )}

      {Array.from({ length: DIAGRAM_FRETS + 1 }, (_, row) => (
        <line
          key={`f-${row}`}
          className="fretboard-fret"
          x1={left}
          y1={top + row * fretGap}
          x2={left + gap * 5}
          y2={top + row * fretGap}
        />
      ))}

      {Array.from({ length: 6 }, (_, string) => (
        <line
          key={`s-${string}`}
          className="fretboard-string"
          x1={left + string * gap}
          y1={top}
          x2={left + string * gap}
          y2={top + fretGap * DIAGRAM_FRETS}
        />
      ))}

      {frets.map((fret, string) =>
        fret < 0 ? (
          <text
            key={`m-${string}`}
            className="fretboard-label"
            x={left + string * gap}
            y={top - 9}
            textAnchor="middle"
          >
            ×
          </text>
        ) : (
          <g key={`d-${string}`}>
            <circle
              className={
                labels.get(string) === "1" ? "fretboard-dot root" : "fretboard-dot"
              }
              cx={left + string * gap}
              cy={top + (fret - base + 0.5) * fretGap}
              r={10}
            />
            <text
              className="fretboard-dot-label"
              x={left + string * gap}
              y={top + (fret - base + 0.5) * fretGap + 3.5}
              textAnchor="middle"
            >
              {formatNoteForDisplay(labels.get(string) ?? "")}
            </text>
          </g>
        )
      )}
    </svg>
  );
}

export default TwoFiveOneTrainer;
