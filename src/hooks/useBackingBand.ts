import { useCallback, useEffect, useRef, useState } from "react";

import {
  audioClockNow,
  noteToMidi,
  preloadInstrument,
  scheduleVoicing,
  silenceVoicings,
  startAudioClock,
  type InstrumentId,
} from "../utils/audio";
import {
  pianoCompVoicing,
  planChorus,
  type BandChord,
  type BandParts,
  type ChorusPlan,
} from "../utils/backingBand";
import {
  closeBand,
  openBand,
  playBass,
  playHat,
  playRide,
  playStick,
  preloadBand,
} from "../utils/backingSounds";
import { voiceChordForGuitar } from "../utils/guitarVoicings";
import { swingBeat } from "../utils/metronome";

// Plays the backing band over a progression, round and round,
// on the audio clock with the same lookahead idea as the
// metronome. It reads the chords and settings from refs on
// every tick, so tempo, swing and parts change live, and
// edits to the progression come in at the next chorus.

export interface BandSettings {
  bpm: number;
  swingRatio: number; // 1 = straight, 2 = triplet swing
  beatsPerBar: number;
  parts: BandParts;
  instrument: InstrumentId; // for the comping chords
  countIn: boolean;
  loop: boolean;
}

export interface UseBackingBandReturn {
  isPlaying: boolean;
  activeIndex: number | null; // chord sounding now
  countIn: number | null; // count-in beat (1, 2, 3...) or null
  beatInBar: number; // -1 when silent
  chorus: number; // 1 for the first time through
  start: (chords: BandChord[], settings: BandSettings) => void;
  stop: () => void;
  update: (chords: BandChord[], settings: BandSettings) => void;
}

const LOOKAHEAD_SECONDS = 0.2;
const TICK_MS = 25;

export function useBackingBand(): UseBackingBandReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [countIn, setCountIn] = useState<number | null>(null);
  const [beatInBar, setBeatInBar] = useState(-1);
  const [chorus, setChorus] = useState(0);

  const chordsRef = useRef<BandChord[]>([]);
  const settingsRef = useRef<BandSettings | null>(null);
  const generation = useRef(0);
  const timer = useRef<number | null>(null);
  const timeouts = useRef(new Set<number>());

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
  }, []);

  const resetState = useCallback(() => {
    setIsPlaying(false);
    setActiveIndex(null);
    setCountIn(null);
    setBeatInBar(-1);
    setChorus(0);
  }, []);

  const stop = useCallback(() => {
    halt();
    closeBand();
    silenceVoicings();
    resetState();
  }, [halt, resetState]);

  const update = useCallback(
    (chords: BandChord[], settings: BandSettings) => {
      chordsRef.current = chords;
      settingsRef.current = settings;
    },
    []
  );

  const start = useCallback(
    (chords: BandChord[], settings: BandSettings) => {
      halt();
      silenceVoicings();

      if (!chords.some((chord) => chord.rootPc !== null)) {
        resetState();
        return;
      }

      chordsRef.current = chords;
      settingsRef.current = settings;

      preloadBand();
      preloadInstrument(settings.instrument);
      setIsPlaying(true);
      setActiveIndex(null);
      setBeatInBar(-1);
      setChorus(1);

      const mine = generation.current;

      // Must begin inside the click for the browser to allow audio.
      void startAudioClock().then((now) => {
        if (mine !== generation.current) {
          return; // stopped or restarted while audio unlocked
        }

        let beatTime = now + 0.15;
        let countLeft = settings.countIn ? settings.beatsPerBar : 0;
        let countNumber = 0;
        let chorusNumber = 0;
        let beatInChorus = 0;
        let eventIndex = 0;
        let lastBass: number | null = null;
        let plan: ChorusPlan;
        // The chords this chorus was planned from (edits made
        // mid-chorus come in at the next one).
        let planChords: BandChord[] = [];
        // Comping voicings, carried chord to chord.
        let pianoCenter: number | null = null;
        let guitarCenter: number | null = null;
        // Keyed by chord and instrument, so changing the Sound
        // mid-chord switches voicings straight away.
        const voiced = new Map<string, { midi: number; string?: number }[]>();

        openBand(beatTime);

        const newPlan = () => {
          const current = settingsRef.current ?? settings;
          planChords = chordsRef.current;

          const result = planChorus(
            planChords,
            current.parts,
            current.beatsPerBar,
            chorusNumber,
            lastBass
          );

          lastBass = result.lastBass;
          plan = result;
          eventIndex = 0;
          voiced.clear();
        };

        const voicingFor = (index: number, instrument: InstrumentId) => {
          const key = `${index}:${instrument}`;
          const cached = voiced.get(key);

          if (cached) {
            return cached;
          }

          const chord = planChords[index];

          if (!chord || chord.rootPc === null) {
            return [];
          }

          let notes: { midi: number; string?: number }[] = [];

          if (instrument === "piano") {
            const midis = pianoCompVoicing(
              chord.pcs,
              chord.rootPc,
              settingsRef.current?.parts.bass ?? true,
              pianoCenter
            );

            pianoCenter =
              midis.reduce((sum, midi) => sum + midi, 0) /
              Math.max(1, midis.length);
            notes = midis.map((midi) => ({ midi }));
          } else {
            const shape = voiceChordForGuitar(chord.pcs, guitarCenter);

            if (shape) {
              guitarCenter = shape.center;
              notes = shape.strings.map((item) => ({
                midi: noteToMidi(item.note),
                string: item.string,
              }));
            }
          }

          voiced.set(key, notes);

          return notes;
        };

        newPlan();

        const tick = () => {
          const current = settingsRef.current ?? settings;
          const secondsPerBeat = 60 / current.bpm;

          while (beatTime < audioClockNow() + LOOKAHEAD_SECONDS) {
            // Count-in: a stick click on each beat of one bar.
            if (countLeft > 0) {
              countNumber += 1;

              const number = countNumber;

              playStick(beatTime, number === 1);
              later(beatTime, () => {
                setCountIn(number);
                setBeatInBar(number - 1);
              });

              countLeft -= 1;
              beatTime += secondsPerBeat;
              continue;
            }

            if (beatInChorus >= plan.totalBeats) {
              if (!current.loop || chordsRef.current.length === 0) {
                const endAt = beatTime;

                later(endAt, () => {
                  if (mine === generation.current) {
                    halt();
                    resetState();
                  }
                });

                if (timer.current !== null) {
                  window.clearInterval(timer.current);
                  timer.current = null;
                }

                return;
              }

              chorusNumber += 1;
              beatInChorus = 0;
              newPlan();

              if (plan.totalBeats === 0) {
                stop();
                return;
              }

              const number = chorusNumber + 1;
              later(beatTime, () => setChorus(number));
            }

            const thisBeat = beatInChorus;
            const chordIndex = plan.chordStarts.indexOf(thisBeat);
            const barBeat = thisBeat % Math.max(1, current.beatsPerBar);

            later(beatTime, () => {
              setCountIn(null);
              setBeatInBar(barBeat);

              if (chordIndex >= 0) {
                setActiveIndex(chordIndex);
              }
            });

            while (
              eventIndex < plan.events.length &&
              plan.events[eventIndex].beat < thisBeat + 1
            ) {
              const event = plan.events[eventIndex];
              eventIndex += 1;

              const at =
                beatTime +
                (swingBeat(event.beat, current.swingRatio) - thisBeat) *
                  secondsPerBeat;
              const duration = event.length * secondsPerBeat;

              if (event.kind === "bass" && event.midi !== undefined) {
                playBass(event.midi, at, duration, event.velocity);
              } else if (event.kind === "ride") {
                playRide(at, event.velocity);
              } else if (event.kind === "hat") {
                playHat(at, event.velocity);
              } else if (event.kind === "comp") {
                scheduleVoicing(
                  {
                    time: at,
                    duration,
                    notes: voicingFor(event.chordIndex, current.instrument),
                    velocity: event.velocity,
                  },
                  current.instrument
                );
              }
            }

            beatInChorus += 1;
            beatTime += secondsPerBeat;
          }
        };

        tick();
        timer.current = window.setInterval(tick, TICK_MS);
      });
    },
    [halt, resetState, stop]
  );

  // Never leave the band playing after the page goes away.
  useEffect(() => {
    return () => {
      halt();
      closeBand();
      silenceVoicings();
    };
  }, [halt]);

  return {
    isPlaying,
    activeIndex,
    countIn,
    beatInBar,
    chorus,
    start,
    stop,
    update,
  };
}
