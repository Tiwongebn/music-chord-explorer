import { useEffect, useMemo, useState } from "react";

import {
  chordQualities,
  chordExtensions,
  chordAlterations,
} from "../data/chordBuilder";
import {
  formatNoteForDisplay,
  getNotesByPreference,
  type AccidentalPreference,
} from "../utils/musicTheory";

interface BuiltChord {
  intervals: number[];
  intervalNames: string[];
  symbol: string;
  name: string;
}

// Diminished and augmented triads change the 5th, not
// just the 3rd.
const fifthByQuality: Record<
  string,
  { interval: number; name: string }
> = {
  diminished: { interval: 6, name: "Diminished 5th" },
  augmented: { interval: 8, name: "Augmented 5th" },
};

const perfectFifth = { interval: 7, name: "Perfect 5th" };

// 9ths, 11ths and 13ths sit an octave above the root.
function isCompound(intervalName: string): boolean {
  return /\b(9|11|13)th\b/.test(intervalName);
}

interface ChordBuilderProps {
  rootNote: string;
  accidentalPreference: AccidentalPreference;
  onRootChange: (root: string) => void;
  onChordBuild?: (chord: BuiltChord) => void;
}

function ChordBuilder({
  rootNote,
  accidentalPreference,
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

    const fifth =
      fifthByQuality[quality] ?? perfectFifth;

    // ♭5 / ♯5 replace the 5th instead of sitting next to it.
    const hasAlteredFifth = alterations.some(
      (alteration) =>
        alteration.id === "b5" || alteration.id === "#5"
    );

    const parts = [
      { interval: 0, name: "Root" },
      {
        interval: selectedQuality?.interval ?? 4,
        name: selectedQuality?.intervalName ?? "Major 3rd",
      },
      ...(hasAlteredFifth ? [] : [fifth]),
      ...[...extensions, ...alterations].map((item) => ({
        interval: isCompound(item.intervalName)
          ? item.interval + 12
          : item.interval,
        name: item.intervalName,
      })),
    ];

    // Drop duplicates that land on the same pitch class
    // (e.g. 6th and 13th), keeping the first one.
    const seen = new Set<number>();

    const uniqueParts = parts
      .filter((part) => {
        const pitchClass = part.interval % 12;

        if (seen.has(pitchClass)) {
          return false;
        }

        seen.add(pitchClass);
        return true;
      })
      .sort((a, b) => a.interval - b.interval);

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
  intervals: uniqueParts.map((part) => part.interval),
  intervalNames: uniqueParts.map((part) => part.name),
  symbol,
  name: `${selectedQuality?.label ?? "Major"} Chord`,
  extensions,
  alterations,
};
  }, [
    quality,
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
          {getNotesByPreference(
            accidentalPreference
          ).map((note) => (
            <option key={note} value={note}>
              {formatNoteForDisplay(note)}
            </option>
          ))}
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


    </section>
  );
}

export default ChordBuilder;