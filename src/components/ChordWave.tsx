import { useEffect, useRef } from "react";
import { getPitchClass } from "../utils/musicTheory";

interface ChordWaveProps {
  rootNote: string;
  intervals: number[];
  // Bump this to make the wave swell, e.g. when the chord
  // is played.
  pulse: number;
}

const MIDDLE_C = 261.63;

// Draws the chord's real waveform (its notes' sine waves
// added together) behind the chord name, slowly drifting.
// Purely decorative, so it's hidden from screen readers.
function ChordWave({ rootNote, intervals, pulse }: ChordWaveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const freqsRef = useRef<number[]>([]);
  const energyRef = useRef(0);

  // Keep the root in the octave around middle C so the
  // shape stays readable for every key.
  useEffect(() => {
    const rootPc = getPitchClass(rootNote);
    const base = rootPc > 6 ? rootPc - 12 : rootPc;

    freqsRef.current = intervals.map(
      (interval) =>
        MIDDLE_C * Math.pow(2, (base + interval) / 12)
    );
  }, [rootNote, intervals]);

  useEffect(() => {
    if (pulse > 0) {
      energyRef.current = 1;
    }
  }, [pulse]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return;
    }

    const still = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let frame = 0;

    const draw = (time: number) => {
      const ratio = window.devicePixelRatio || 1;
      const width = canvas.clientWidth * ratio;
      const height = canvas.clientHeight * ratio;

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      context.clearRect(0, 0, width, height);

      const freqs = freqsRef.current;
      energyRef.current *= 0.97;
      const swell = 1 + energyRef.current * 0.9;

      const layers: [number, string, number][] = [
        [0.9, "rgba(255, 181, 71, 0.55)", 2],
        [0.5, "rgba(255, 181, 71, 0.18)", 6],
      ];

      for (const [amplitude, color, lineWidth] of layers) {
        context.beginPath();
        context.strokeStyle = color;
        context.lineWidth = lineWidth * ratio;

        for (let x = 0; x <= width; x += 3) {
          const t = (x / width) * 0.018 + time / 9000;
          let y = 0;

          for (const freq of freqs) {
            y += Math.sin(2 * Math.PI * freq * t);
          }

          y =
            height / 2 +
            (y / Math.max(freqs.length, 1)) *
              height *
              0.34 *
              amplitude *
              swell *
              Math.sin((Math.PI * x) / width);

          if (x === 0) {
            context.moveTo(x, y);
          } else {
            context.lineTo(x, y);
          }
        }

        context.stroke();
      }

      if (!still) {
        frame = requestAnimationFrame(draw);
      }
    };

    frame = requestAnimationFrame(draw);

    return () => cancelAnimationFrame(frame);
  }, [rootNote, intervals]);

  return (
    <canvas
      ref={canvasRef}
      className="chord-wave"
      aria-hidden="true"
    />
  );
}

export default ChordWave;
