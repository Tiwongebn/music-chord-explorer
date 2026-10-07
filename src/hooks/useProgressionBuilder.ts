import { useEffect, useRef, useState } from "react";

import {
  DEFAULT_CHORD_BEATS,
  deleteProgression,
  loadSavedProgressions,
  saveProgression,
  type ProgressionChord,
  type SavedProgression,
} from "../utils/savedProgressions";
import {
  playTimedProgression,
  playTimedProgressionLoop,
  type ProgressionLoopHandle,
  type TimedChord,
} from "../utils/audio";
import {
  generateRandomProgression,
  type ScaleType,
} from "../data/scales";
import {
  getPattern,
} from "../data/patterns";
import type { ScaleChord } from "../utils/scaleHarmony";
import { TimeSignature } from "../data/rhythm";

export interface UseProgressionBuilderReturn {
  builderChords: ProgressionChord[];
  setBuilderChords: (chords: ProgressionChord[]) => void;
  progressionName: string;
  setProgressionName: (name: string) => void;
  savedProgressions: SavedProgression[];
  setSavedProgressions: (progressions: SavedProgression[]) => void;
  loopHandle: ProgressionLoopHandle | null;
  stopLoop: () => void;
  handleToggleBuilderLoop: () => void;
  handleSurpriseMe: () => void;
  handleAddToBuilder: (chord: ScaleChord) => void;
  handleAddTemplateToBuilder: (degrees: number[]) => void;
  handleSetChordBeats: (index: number, beats: number) => void;
  handleToggleRest: (index: number) => void;
  handleRemoveFromBuilder: (index: number) => void;
  handleMoveBuilderChord: (
    index: number,
    direction: -1 | 1
  ) => void;
  handleClearBuilder: () => void;
  handleSaveBuilder: () => void;
  handleDeleteSaved: (id: string) => void;
  handleLoadSaved: (saved: SavedProgression) => void;
}

export function useProgressionBuilder(
  scaleType: ScaleType,
  chordByDegree: (degree: number) => ScaleChord,
  timeSignature: TimeSignature,
  swingEnabled: boolean,
  accentType: 'none' | 'first-beat' | 'first-measure',
  patternId: string,
  secondsPerBeat: number,
  resolveSnapshot: (chord: ProgressionChord) => {
    chordLabel: string;
    rawNotes: string[];
  }
): UseProgressionBuilderReturn {
  const [builderChords, setBuilderChords] = useState<
    ProgressionChord[]
  >([]);

  const [progressionName, setProgressionName] =
    useState("");

  const [savedProgressions, setSavedProgressions] =
    useState<SavedProgression[]>([]);

  useEffect(() => {
    setSavedProgressions(loadSavedProgressions());
  }, []);

  const [loopHandle, setLoopHandle] =
    useState<ProgressionLoopHandle | null>(null);

  // Mirrors loopHandle for the unmount-cleanup effect below,
  // which needs the latest handle but must only register its
  // cleanup once (an empty-deps effect only closes over the
  // state from its first render otherwise).
  const loopHandleRef = useRef<ProgressionLoopHandle | null>(
    null
  );
  loopHandleRef.current = loopHandle;

  // Stop any looping playback if this component is unmounted
  // — otherwise the loop would keep firing silently in the
  // background forever. Reads loopHandleRef (always current)
  // rather than loopHandle directly, since this effect's
  // cleanup is only registered once.
  useEffect(() => {
    return () => {
      loopHandleRef.current?.stop();
    };
  }, []);

  // Resolves a list of frozen chord snapshots to the
  // TimedChord[] shape playTimedProgression()/
  // playTimedProgressionLoop() expect, preserving each
  // chord's own beat count and including accent markers.
  const toTimedChords = (
    chords: ProgressionChord[]
  ): TimedChord[] => {
    let beatInMeasure = 0;
    const beatsPerMeasure = timeSignature.beatsPerBar;

    return chords.map((chord) => {
      const isFirstBeat =
        beatInMeasure === 0 && chord.type === 'chord';
      const shouldAccent =
        (accentType === 'first-beat' && isFirstBeat) ||
        (accentType === 'first-measure' && beatInMeasure === 0);

      beatInMeasure = (beatInMeasure + chord.beats) % beatsPerMeasure;

      return {
        notes:
          chord.type === 'chord'
            ? resolveSnapshot(chord).rawNotes
            : [],
        beats: chord.beats,
        isRest: chord.type === 'rest',
        isAccented: shouldAccent,
      };
    });
  };

  // Always stop any active builder loop before anything else
  // plays — otherwise a looping builder sequence would keep
  // firing underneath (and eventually clashing with) a
  // one-shot template/chord preview.
  const stopLoop = () => {
    setLoopHandle((current) => {
      current?.stop();
      return null;
    });
  };

  // Toggles looped playback of the builder's current chord
  // sequence. Starting a new loop (or any other playback)
  // always stops a previous one first via stopLoop() above.
  const handleToggleBuilderLoop = () => {
    if (loopHandle) {
      stopLoop();
      return;
    }

    const pattern = getPattern(patternId);

    setLoopHandle(
      playTimedProgressionLoop(
        toTimedChords(builderChords),
        secondsPerBeat,
        {
          swingEnabled,
          accentBoost: accentType === 'none' ? 0 : 5,
          pattern,
        }
      )
    );
  };

  // Replaces the builder with a freshly randomized
  // progression, walking the harmony graph for the scale
  // currently shown — a quick source of inspiration, or just
  // something fun to mash the button on.
  const handleSurpriseMe = () => {
    stopLoop();

    const degrees = generateRandomProgression(scaleType, 4);

    setBuilderChords(
      degrees.map((degree) => {
        const chord = chordByDegree(degree);
        return {
          type: 'chord' as const,
          rootNote: chord.rawRootNote,
          chordTypeIndex: chord.chordTypeIndex,
          beats: DEFAULT_CHORD_BEATS,
        };
      })
    );
  };

  // Adds a frozen snapshot of the clicked diatonic chord to
  // the builder — its own root note + the chord-type index it
  // is currently voiced with. From this point on it no longer
  // cares what the key/scale/chord-type controls do.
  const handleAddToBuilder = (chord: ScaleChord) => {
    stopLoop();

    setBuilderChords((current) => [
      ...current,
      {
        type: 'chord' as const,
        rootNote: chord.rawRootNote,
        chordTypeIndex: chord.chordTypeIndex,
        beats: DEFAULT_CHORD_BEATS,
      },
    ]);
  };

  // Adds a frozen snapshot of a preset template's chord
  // (looked up against the scale currently shown) to the
  // builder, same independence guarantee as above.
  const handleAddTemplateToBuilder = (
    degrees: number[]
  ) => {
    stopLoop();

    setBuilderChords((current) => [
      ...current,
      ...degrees.map((degree) => {
        const chord = chordByDegree(degree);
        return {
          type: 'chord' as const,
          rootNote: chord.rawRootNote,
          chordTypeIndex: chord.chordTypeIndex,
          beats: DEFAULT_CHORD_BEATS,
        };
      }),
    ]);
  };

  // Changes how many beats a single builder chord holds for,
  // clamped to the selectable beatOptions range.
  const handleSetChordBeats = (
    index: number,
    beats: number
  ) => {
    stopLoop();

    setBuilderChords((current) =>
      current.map((chord, i) =>
        i === index ? { ...chord, beats } : chord
      )
    );
  };

  // Toggles between chord and rest at a given index.
  const handleToggleRest = (index: number) => {
    stopLoop();

    setBuilderChords((current) =>
      current.map((chord, i) => {
        if (i !== index) return chord;

        if (chord.type === 'rest') {
          // Convert rest back to a default chord
          return {
            type: 'chord' as const,
            rootNote: 'C',
            chordTypeIndex: 0,
            beats: chord.beats,
          };
        } else {
          // Convert chord to rest (drop root/chordType)
          return {
            type: 'rest' as const,
            beats: chord.beats,
          };
        }
      })
    );
  };

  const handleRemoveFromBuilder = (index: number) => {
    stopLoop();

    setBuilderChords((current) =>
      current.filter((_, i) => i !== index)
    );
  };

  const handleMoveBuilderChord = (
    index: number,
    direction: -1 | 1
  ) => {
    stopLoop();

    setBuilderChords((current) => {
      const target = index + direction;

      if (target < 0 || target >= current.length) {
        return current;
      }

      const next = [...current];
      [next[index], next[target]] = [
        next[target],
        next[index],
      ];
      return next;
    });
  };

  const handleClearBuilder = () => {
    stopLoop();
    setBuilderChords([]);
  };

  const handleSaveBuilder = () => {
    const name = progressionName.trim();

    if (!name || builderChords.length === 0) {
      return;
    }

    const next = saveProgression({
      name,
      chords: builderChords,
      timeSignatureId: timeSignature.id,
      swingEnabled,
      accentType,
      patternId,
    });

    setSavedProgressions(next);
    setProgressionName("");
  };

  const handleDeleteSaved = (id: string) => {
    setSavedProgressions(deleteProgression(id));
  };

  const handleLoadSaved = (saved: SavedProgression) => {
    stopLoop();
    setBuilderChords(saved.chords);
    // Note: timeSignatureId, swingEnabled, accentType, patternId
    // will be handled by the parent component
  };

  return {
    builderChords,
    setBuilderChords,
    progressionName,
    setProgressionName,
    savedProgressions,
    setSavedProgressions,
    loopHandle,
    stopLoop,
    handleToggleBuilderLoop,
    handleSurpriseMe,
    handleAddToBuilder,
    handleAddTemplateToBuilder,
    handleSetChordBeats,
    handleToggleRest,
    handleRemoveFromBuilder,
    handleMoveBuilderChord,
    handleClearBuilder,
    handleSaveBuilder,
    handleDeleteSaved,
    handleLoadSaved,
  };
}
