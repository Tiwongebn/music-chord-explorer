import { useCallback, useEffect, useRef, useState } from "react";

import {
  DEFAULT_BPM,
  TAP_RESET_MS,
  bpmFromTaps,
  clampBpm,
  createMetronome,
  type MetronomeEngine,
} from "../utils/metronome";

export interface UseMetronomeReturn {
  bpm: number;
  setBpm: (bpm: number) => void;
  beatsPerBar: number;
  setBeatsPerBar: (beats: number) => void;
  accentOn: boolean;
  setAccentOn: (on: boolean) => void;
  isRunning: boolean;
  toggle: () => void;
  stop: () => void;
  tap: () => void;
  // Index of the beat currently sounding, or -1 when stopped.
  currentBeat: number;
}

export function useMetronome(): UseMetronomeReturn {
  const [bpm, setBpmState] = useState(DEFAULT_BPM);
  const [beatsPerBar, setBeatsPerBar] = useState(4);
  const [accentOn, setAccentOn] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(-1);

  const engineRef = useRef<MetronomeEngine | null>(null);
  const tapsRef = useRef<number[]>([]);

  const getEngine = useCallback(() => {
    if (!engineRef.current) {
      engineRef.current = createMetronome(
        { bpm: DEFAULT_BPM, beatsPerBar: 4, accentOn: true },
        setCurrentBeat
      );
    }

    return engineRef.current;
  }, []);

  // Keep the running engine in step with the controls.
  useEffect(() => {
    getEngine().update({ bpm, beatsPerBar, accentOn });
  }, [bpm, beatsPerBar, accentOn, getEngine]);

  // Never leave a click track running after unmount.
  useEffect(() => {
    return () => {
      engineRef.current?.stop();
    };
  }, []);

  const setBpm = useCallback((next: number) => {
    setBpmState(clampBpm(next));
  }, []);

  const stop = useCallback(() => {
    getEngine().stop();
    setIsRunning(false);
    setCurrentBeat(-1);
  }, [getEngine]);

  const toggle = useCallback(() => {
    const engine = getEngine();

    if (engine.isRunning()) {
      stop();
      return;
    }

    setIsRunning(true);
    engine.start().catch(() => {
      setIsRunning(false);
    });
  }, [getEngine, stop]);

  const tap = useCallback(() => {
    const now = performance.now();
    const taps = tapsRef.current;

    if (
      taps.length > 0 &&
      now - taps[taps.length - 1] > TAP_RESET_MS
    ) {
      taps.length = 0;
    }

    taps.push(now);

    const tapped = bpmFromTaps(taps);
    if (tapped !== null) {
      setBpmState(tapped);
    }
  }, []);

  return {
    bpm,
    setBpm,
    beatsPerBar,
    setBeatsPerBar,
    accentOn,
    setAccentOn,
    isRunning,
    toggle,
    stop,
    tap,
    currentBeat,
  };
}
