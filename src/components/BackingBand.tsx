import { useEffect, useMemo, useState } from "react";

import type { UseBackingBandReturn } from "../hooks/useBackingBand";
import type { InstrumentId } from "../utils/audio";
import {
  COMP_STYLES,
  type BandChord,
  type CompStyle,
} from "../utils/backingBand";
import { SWING_FEELS, swingRatio, type SwingFeel } from "../utils/metronome";
import {
  formatNoteForDisplay,
  type AccidentalPreference,
} from "../utils/musicTheory";
import { scaleHintFor, type KeyContext } from "../utils/scaleHints";

export interface BandChordInfo extends BandChord {
  label: string;
  root: string | null; // spelled under the Sharps/Flats setting
  intervals: number[];
}

interface BackingBandProps {
  band: UseBackingBandReturn;
  chords: BandChordInfo[];
  beatsPerBar: number;
  instrument: InstrumentId;
  bpm: number;
  minBpm: number;
  maxBpm: number;
  onBpmChange: (bpm: number) => void;
  // Stop the builder's own playback before the band starts.
  onBeforeStart: () => void;
  accidentalPreference: AccidentalPreference;
  songKey?: KeyContext;
}

const BAND_FEELS = SWING_FEELS.filter((feel) => feel.id !== "off");

// "Play along": a bass player, a comping piano or guitar and a
// drummer loop the builder's progression so you can practise
// soloing over it. Shows the chord you're on, the scale for
// it and what's coming next.
function BackingBand({
  band,
  chords,
  beatsPerBar,
  instrument,
  bpm,
  minBpm,
  maxBpm,
  onBpmChange,
  onBeforeStart,
  accidentalPreference,
  songKey,
}: BackingBandProps) {
  const [feel, setFeel] = useState<SwingFeel>("medium");
  const [bass, setBass] = useState(true);
  const [comp, setComp] = useState<CompStyle | null>("charleston");
  const [drums, setDrums] = useState(true);
  const [countIn, setCountIn] = useState(true);
  const [loop, setLoop] = useState(true);
  // Remembered so turning comping back on restores the style.
  const [compStyle, setCompStyle] = useState<CompStyle>("charleston");

  const settings = useMemo(
    () => ({
      bpm,
      swingRatio: swingRatio(feel),
      beatsPerBar,
      parts: { bass, comp, drums },
      instrument,
      countIn,
      loop,
    }),
    [bpm, feel, beatsPerBar, bass, comp, drums, instrument, countIn, loop]
  );

  const { update, isPlaying, activeIndex, chorus, beatInBar } = band;

  // Tempo, feel, parts and chord edits reach the running band.
  useEffect(() => {
    update(chords, settings);
  }, [update, chords, settings]);

  const playable = chords.some((chord) => chord.rootPc !== null);

  const handleToggle = () => {
    if (isPlaying) {
      band.stop();
      return;
    }

    onBeforeStart();
    band.start(chords, settings);
  };

  const now = activeIndex !== null ? chords[activeIndex] : undefined;
  const next =
    activeIndex !== null && chords.length > 0
      ? chords[(activeIndex + 1) % chords.length]
      : undefined;
  const hint =
    now && now.root && now.rootPc !== null
      ? scaleHintFor(now.root, now.intervals, accidentalPreference, songKey)
      : null;

  const stepBpm = (delta: number) =>
    onBpmChange(Math.min(maxBpm, Math.max(minBpm, bpm + delta)));

  return (
    <section className="band" aria-label="Play-along band">
      <div className="band-head">
        <h3>Play along</h3>
        <p className="hint">
          A walking bass, comping and a ride cymbal loop your progression
          so you can solo over it. Change the chords while it plays and the
          band picks them up next time round.
        </p>
      </div>

      <div className="band-main">
        <button
          type="button"
          className={isPlaying ? "play-chord band-start is-on" : "play-chord band-start"}
          aria-pressed={isPlaying}
          disabled={!playable && !isPlaying}
          onClick={handleToggle}
        >
          {isPlaying ? "■ Stop band" : "▶ Start band"}
        </button>

        <div className="band-tempo" role="group" aria-label="Band tempo">
          <button
            type="button"
            className="metronome-step"
            aria-label="Slower"
            disabled={bpm <= minBpm}
            onClick={() => stepBpm(-5)}
          >
            −
          </button>
          <span className="band-tempo-value">
            {bpm}
            <small>BPM</small>
          </span>
          <button
            type="button"
            className="metronome-step"
            aria-label="Faster"
            disabled={bpm >= maxBpm}
            onClick={() => stepBpm(5)}
          >
            +
          </button>
        </div>

        <label className="band-select">
          <span className="selector-label">Feel</span>
          <select
            value={feel}
            title={BAND_FEELS.find((item) => item.id === feel)?.hint}
            onChange={(event) => setFeel(event.target.value as SwingFeel)}
          >
            {BAND_FEELS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="band-parts">
        <div className="segmented" role="group" aria-label="Band parts">
          <button
            type="button"
            className={bass ? "seg active" : "seg"}
            aria-pressed={bass}
            onClick={() => setBass(!bass)}
          >
            Walking bass
          </button>
          <button
            type="button"
            className={comp ? "seg active" : "seg"}
            aria-pressed={comp !== null}
            onClick={() => setComp(comp ? null : compStyle)}
          >
            Comping
          </button>
          <button
            type="button"
            className={drums ? "seg active" : "seg"}
            aria-pressed={drums}
            onClick={() => setDrums(!drums)}
          >
            Drums
          </button>
        </div>

        <label className="band-select">
          <span className="selector-label">Comp</span>
          <select
            value={compStyle}
            disabled={comp === null}
            title={COMP_STYLES.find((item) => item.id === compStyle)?.hint}
            onChange={(event) => {
              const style = event.target.value as CompStyle;
              setCompStyle(style);
              setComp(style);
            }}
          >
            {COMP_STYLES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="metronome-accent">
          <input
            type="checkbox"
            checked={countIn}
            onChange={(event) => setCountIn(event.target.checked)}
          />
          <span>Count in</span>
        </label>

        <label className="metronome-accent">
          <input
            type="checkbox"
            checked={loop}
            onChange={(event) => setLoop(event.target.checked)}
          />
          <span>Repeat</span>
        </label>
      </div>

      {isPlaying && (
        <div className="band-now" aria-live="polite">
          <div className="band-beats" aria-hidden="true">
            {Array.from({ length: beatsPerBar }, (_, index) => (
              <span
                key={index}
                className={
                  "metronome-beat" +
                  (index === 0 ? " is-strong" : "") +
                  (index === beatInBar ? " is-on" : "")
                }
              />
            ))}
          </div>

          {band.countIn !== null ? (
            <p className="band-count">
              Count-in <strong>{band.countIn}</strong>
            </p>
          ) : now ? (
            <>
              <div className="band-chord">
                <span className="band-label">Now</span>
                <strong>{now.label}</strong>
                {hint?.scale && now.root && (
                  <span className="band-scale">
                    {formatNoteForDisplay(now.root)} {hint.scale.name}
                    {hint.guideTones.length > 0 && (
                      <small>
                        {" "}
                        · guide tones{" "}
                        {hint.guideTones
                          .map((tone) => formatNoteForDisplay(tone.note))
                          .join(" ")}
                      </small>
                    )}
                  </span>
                )}
              </div>

              {next && chords.length > 1 && (
                <div className="band-chord is-next">
                  <span className="band-label">Next</span>
                  <strong>{next.label}</strong>
                </div>
              )}

              <span className="band-chorus">Chorus {chorus}</span>
            </>
          ) : null}
        </div>
      )}
    </section>
  );
}

export default BackingBand;
