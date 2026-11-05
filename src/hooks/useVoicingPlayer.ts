import { useCallback, useEffect, useRef, useState } from "react";

import {
  audioClockNow,
  preloadInstrument,
  scheduleVoicing,
  silenceVoicings,
  startAudioClock,
  type InstrumentId,
} from "../utils/audio";
import { createMetronome, type MetronomeEngine } from "../utils/metronome";

// Plays a list of exact voicings in time, optionally over the
// metronome's click and after a one-bar count-in. Chords are
// scheduled a moment ahead on the audio clock (the same
// lookahead idea as the metronome), so Stop takes effect within
// a fraction of a second even in a long run through 12 keys,
// and chords and clicks share one clock so they never drift.

export interface PlayerItem {
  id: string; // what the UI highlights while it sounds
  beats: number;
  notes: { midi: number; string?: number }[];
}

export interface PlayerOptions {
  bpm: number;
  loop: boolean;
  click: boolean;
  countIn: boolean;
  instrument: InstrumentId;
  beatsPerBar?: number;
}

export interface UseVoicingPlayerReturn {
  isPlaying: boolean;
  activeId: string | null; // the item sounding now
  countingIn: boolean;
  beat: number; // metronome beat within the bar, -1 when silent
  play: (items: PlayerItem[], options: PlayerOptions) => void;
  stop: () => void;
}

const LOOKAHEAD_SECONDS = 0.25;
const TICK_MS = 25;

export function useVoicingPlayer(): UseVoicingPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [countingIn, setCountingIn] = useState(false);
  const [beat, setBeat] = useState(-1);

  const generation = useRef(0);
  const timer = useRef<number | null>(null);
  const timeouts = useRef(new Set<number>());
  const metronome = useRef<MetronomeEngine | null>(null);

  const getMetronome = () => {
    if (!metronome.current) {
      metronome.current = createMetronome(
        { bpm: 100, beatsPerBar: 4, accentOn: true },
        setBeat
      );
    }

    return metronome.current;
  };

  const later = (atAudioTime: number, action: () => void) => {
    const delay = Math.max(0, (atAudioTime - audioClockNow()) * 1000);
    const id = window.setTimeout(() => {
      timeouts.current.delete(id);
      action();
    }, delay);

    timeouts.current.add(id);
  };

  const halt = useCallback(() => {
    generation.current += 1;

    if (timer.current !== null) {
      window.clearInterval(timer.current);
      timer.current = null;
    }

    for (const id of timeouts.current) {
      window.clearTimeout(id);
    }
    timeouts.current.clear();

    metronome.current?.stop();
  }, []);

  const stop = useCallback(() => {
    halt();
    silenceVoicings();
    setIsPlaying(false);
    setActiveId(null);
    setCountingIn(false);
    setBeat(-1);
  }, [halt]);

  const play = useCallback(
    (items: PlayerItem[], options: PlayerOptions) => {
      halt();
      silenceVoicings();

      if (items.length === 0) {
        return;
      }

      const { bpm, loop, click, countIn, instrument, beatsPerBar = 4 } =
        options;
      const secondsPerBeat = 60 / bpm;
      const mine = generation.current;

      preloadInstrument(instrument);
      setIsPlaying(true);
      setActiveId(null);
      setBeat(-1);
      setCountingIn(countIn);

      // Must start inside the click for the browser to allow audio.
      void startAudioClock().then((now) => {
        if (mine !== generation.current) {
          return; // stopped or restarted while audio unlocked
        }

        const start = now + 0.15;
        let next = start + (countIn ? beatsPerBar * secondsPerBeat : 0);
        let index = 0;

        if (click) {
          const engine = getMetronome();
          engine.update({ bpm, beatsPerBar, accentOn: true });
          void engine.start(start);
        }

        if (countIn) {
          later(next, () => setCountingIn(false));
        }

        const tick = () => {
          while (next < audioClockNow() + LOOKAHEAD_SECONDS) {
            const item = items[index];
            const duration = item.beats * secondsPerBeat;

            scheduleVoicing(
              { time: next, duration: duration * 0.97, notes: item.notes },
              instrument
            );
            later(next, () => setActiveId(item.id));

            next += duration;
            index += 1;

            if (index === items.length) {
              if (!loop) {
                if (timer.current !== null) {
                  window.clearInterval(timer.current);
                  timer.current = null;
                }

                later(next, () => {
                  halt();
                  setIsPlaying(false);
                  setActiveId(null);
                  setBeat(-1);
                });
                return;
              }

              index = 0;
            }
          }
        };

        tick();

        if (loop || index < items.length) {
          timer.current = window.setInterval(tick, TICK_MS);
        }
      });
    },
    [halt]
  );

  // Never leave a run going after the tab is closed.
  useEffect(() => {
    return () => {
      halt();
    };
  }, [halt]);

  return { isPlaying, activeId, countingIn, beat, play, stop };
}
