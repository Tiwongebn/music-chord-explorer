import { useEffect, useMemo, useState } from "react";

import {
  chordQualities,
  chordExtensions,
  chordAlterations,
} from "../data/chordBuilder";

interface BuiltChord {
  intervals: number[];
  symbol: string;
  name: string;
}

interface ChordBuilderProps {
  rootNote: string;
  onRootChange: (root: string) => void;
  onChordBuild?: (chord: BuiltChord) => void;
}

function ChordBuilder({
  rootNote,
  onRootChange,
  onChordBuild,
}: ChordBuilderProps) {
  const [quality, setQuality] =
    useState("major");

  const [selectedExtensions, setSelectedExtensions] =
    useState<string[]>([]);

  const [selectedAlterations, setSelectedAlterations] =
    useState<string[]>([]);

  const selectedQuality =
    chordQualities.find(
      (item) => item.id === quality
    );

  const toggleExtension = (id: string) => {
    setSelectedExtensions((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  };

  const toggleAlteration = (id: string) => {
    setSelectedAlterations((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  };

  const builtChord = useMemo(() => {
    const extensions =
      chordExtensions.filter((extension) =>
        selectedExtensions.includes(extension.id)
      );

    const alterations =
      chordAlterations.filter((alteration) =>
        selectedAlterations.includes(alteration.id)
      );

    const intervals = [
      0,
      selectedQuality?.interval ?? 4,
      7,
      ...extensions.map(
        (extension) => extension.interval
      ),
      ...alterations.map(
        (alteration) => alteration.interval
      ),
    ];

    const uniqueIntervals = [
      ...new Set(intervals),
    ].sort((a, b) => a - b);

    let symbol =
  selectedQuality?.symbol ?? "";

const hasMajor7 =
  selectedExtensions.includes("maj7");

const hasDominant7 =
  selectedExtensions.includes("b7");

const has9 =
  selectedExtensions.includes("9");

const has11 =
  selectedExtensions.includes("11");

const has13 =
  selectedExtensions.includes("13");

if (has13) {
  symbol += "13";
} else if (has11) {
  symbol += "11";
} else if (has9) {
  symbol += "9";
} else if (hasMajor7) {
  symbol += "maj7";
} else if (hasDominant7) {
  symbol += "7";
} else if (
  selectedExtensions.includes("6")
) {
  symbol += "6";
}

const alterationSymbols =
  alterations.map(
    (alteration) => alteration.symbol
  );

symbol += alterationSymbols.join("");

return {
  intervals: uniqueIntervals,
  symbol,
  name: `${selectedQuality?.label ?? "Major"} Chord`,
  extensions,
  alterations,
};
  }, [
    selectedQuality,
    selectedExtensions,
    selectedAlterations,
  ]);

  // Let the parent component know whenever the
  // built chord changes.
  useEffect(() => {
    onChordBuild?.(builtChord);
  }, [builtChord, onChordBuild]);

  return (
    <section className="chord-builder">

      <div className="builder-header">
        <p className="eyebrow">
          BUILD A CHORD
        </p>

        <h2>Chord Builder</h2>

        <p>
          Build a chord by selecting its individual
          components.
        </p>
      </div>


      {/* ROOT */}

      <div className="builder-control">
        <label htmlFor="builder-root">
          Root Note
        </label>

        <select
          id="builder-root"
          value={rootNote}
          onChange={(event) =>
            onRootChange(event.target.value)
          }
        >
          <option value="C">C</option>
          <option value="C#">C#</option>
          <option value="D">D</option>
          <option value="D#">D#</option>
          <option value="E">E</option>
          <option value="F">F</option>
          <option value="F#">F#</option>
          <option value="G">G</option>
          <option value="G#">G#</option>
          <option value="A">A</option>
          <option value="A#">A#</option>
          <option value="B">B</option>
        </select>
      </div>


      {/* QUALITY */}

      <div className="builder-group">

        <h3>Chord Quality</h3>

        <div className="builder-options">

          {chordQualities.map((item) => (
            <label
              className="builder-option"
              key={item.id}
            >
              <input
                type="radio"
                name="chord-quality"
                checked={quality === item.id}
                onChange={() =>
                  setQuality(item.id)
                }
              />

              <span>
                {item.label}
              </span>
            </label>
          ))}

        </div>

      </div>


      {/* EXTENSIONS */}

      <div className="builder-group">

        <h3>Extensions</h3>

        <div className="builder-options">

          {chordExtensions.map((item) => (
            <label
              className="builder-option"
              key={item.id}
            >
              <input
                type="checkbox"
                checked={selectedExtensions.includes(
                  item.id
                )}
                onChange={() =>
                  toggleExtension(item.id)
                }
              />

              <span>
                {item.label}
              </span>
            </label>
          ))}

        </div>

      </div>


      {/* ALTERATIONS */}

      <div className="builder-group">

        <h3>Alterations</h3>

        <div className="builder-options">

          {chordAlterations.map((item) => (
            <label
              className="builder-option"
              key={item.id}
            >
              <input
                type="checkbox"
                checked={selectedAlterations.includes(
                  item.id
                )}
                onChange={() =>
                  toggleAlteration(item.id)
                }
              />

              <span>
                {item.label}
              </span>
            </label>
          ))}

        </div>

      </div>


      {/* RESULT */}

      <div className="builder-result">

        <h3>Chord Structure</h3>

        <p>
          Root: <strong>{rootNote}</strong>
        </p>

        <p>
          Intervals:
        </p>

        <p>
          {builtChord.intervals.join(" → ")}
        </p>

      </div>

    </section>
  );
}

export default ChordBuilder;