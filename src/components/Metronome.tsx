import { useState } from "react";

import { useMetronome } from "../hooks/useMetronome";
import { timeSignatures } from "../data/rhythm";
import {
  beatLevels,
  clicksOnBeat,
  MAX_BPM,
  MIN_BPM,
  SWING_FEELS,
  type SwingFeel,
} from "../utils/metronome";

// Compact metronome that lives in the header so it is one tap
// away on every tab. The header button shows the tempo and
// pulses with the beat; it opens a small panel with the full
// controls. The click keeps running while the panel is closed.
function Metronome() {
  const metronome = useMetronome();
  const [open, setOpen] = useState(false);

  const {
    bpm,
    setBpm,
    beatsPerBar,
    setBeatsPerBar,
    accentOn,
    setAccentOn,
    swing,
    setSwing,
    backbeat,
    setBackbeat,
    isRunning,
    toggle,
    tap,
    currentBeat,
  } = metronome;

  const levels = beatLevels(beatsPerBar, accentOn);
  const signature =
    timeSignatures.find(
      (option) => option.beatsPerBar === beatsPerBar
    ) ?? timeSignatures[0];

  return (
    <div className="metronome">
      <button
        type="button"
        className={
          isRunning
            ? "metronome-toggle is-running"
            : "metronome-toggle"
        }
        aria-expanded={open}
        aria-controls="metronome-panel"
        onClick={() => setOpen((current) => !current)}
      >
        <span
          className={
            currentBeat === 0
              ? "metronome-pulse is-downbeat"
              : currentBeat > 0
                ? "metronome-pulse is-beat"
                : "metronome-pulse"
          }
          aria-hidden="true"
        />
        Metronome
        <span className="metronome-toggle-bpm">{bpm}</span>
      </button>

      {open && (
        <div
          id="metronome-panel"
          className="metronome-panel"
          role="group"
          aria-label="Metronome"
        >
          <div className="metronome-main">
            <button
              type="button"
              className="metronome-start"
              aria-pressed={isRunning}
              onClick={toggle}
            >
              {isRunning ? "Stop" : "Start"}
            </button>

            <div className="metronome-bpm">
              <button
                type="button"
                className="metronome-step"
                aria-label="Decrease tempo"
                onClick={() => setBpm(bpm - 1)}
              >
                −
              </button>

              <label className="metronome-bpm-value">
                <input
                  type="number"
                  inputMode="numeric"
                  min={MIN_BPM}
                  max={MAX_BPM}
                  value={bpm}
                  aria-label="Beats per minute"
                  onChange={(event) => {
                    const value = event.target.valueAsNumber;
                    if (!Number.isNaN(value)) {
                      setBpm(value);
                    }
                  }}
                />
                <span>BPM</span>
              </label>

              <button
                type="button"
                className="metronome-step"
                aria-label="Increase tempo"
                onClick={() => setBpm(bpm + 1)}
              >
                +
              </button>
            </div>

            <button
              type="button"
              className="metronome-tap"
              onClick={tap}
              title="Tap along to set the tempo"
            >
              Tap
            </button>
          </div>

          <input
            className="metronome-slider"
            type="range"
            min={MIN_BPM}
            max={MAX_BPM}
            value={bpm}
            aria-label="Tempo slider"
            onChange={(event) =>
              setBpm(Number(event.target.value))
            }
          />

          <div className="metronome-options">
            <label className="metronome-select">
              <span className="selector-label">Time</span>
              <select
                value={signature.id}
                onChange={(event) => {
                  const next = timeSignatures.find(
                    (option) => option.id === event.target.value
                  );
                  if (next) {
                    setBeatsPerBar(next.beatsPerBar);
                  }
                }}
              >
                {timeSignatures.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="metronome-accent">
              <input
                type="checkbox"
                checked={accentOn}
                onChange={(event) =>
                  setAccentOn(event.target.checked)
                }
              />
              <span>Accent beat 1</span>
            </label>

            <label className="metronome-select">
              <span className="selector-label">8ths</span>
              <select
                value={swing}
                aria-label="Eighth notes and swing feel"
                title={
                  SWING_FEELS.find((item) => item.id === swing)?.hint
                }
                onChange={(event) =>
                  setSwing(event.target.value as SwingFeel)
                }
              >
                {SWING_FEELS.map((feel) => (
                  <option key={feel.id} value={feel.id}>
                    {feel.label}
                  </option>
                ))}
              </select>
            </label>

            <label
              className="metronome-accent"
              title="Jazz players practise with the click on the backbeat and feel 1 and 3 themselves"
            >
              <input
                type="checkbox"
                checked={backbeat}
                onChange={(event) =>
                  setBackbeat(event.target.checked)
                }
              />
              <span>
                {beatsPerBar === 4 ? "Click on 2 & 4" : "Click off-beats only"}
              </span>
            </label>

            <div
              className="metronome-beats"
              aria-hidden="true"
            >
              {levels.map((level, index) => (
                <span
                  key={index}
                  className={
                    `metronome-beat is-${level}` +
                    (clicksOnBeat(index, backbeat) ? "" : " is-silent") +
                    (index === currentBeat ? " is-on" : "")
                  }
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Metronome;
