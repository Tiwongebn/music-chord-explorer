import { useEffect, useRef } from "react";
import { getPitchClass } from "../utils/musicTheory";

interface ChordWaveProps {
  rootNote: string;
  intervals: number[];
  // Bump this when the chord is played: the wave comes alive
  // for a moment, then settles back to still.
  pulse: number;
}

const MIDDLE_C = 261.63;

// How long the wave keeps moving after a play, roughly as
// long as the chord rings.
const PLAY_SECONDS = 1.6;

// Draws the chord's real waveform (its notes' sine waves
// added together) behind the chord name. It sits still
// until the chord is played, then drifts and swells while
// the chord sounds. Purely decorative, so it's hidden from
// screen readers.
function ChordWave({ rootNote, intervals, pulse }: ChordWaveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef(0);
  const energyRef = useRef(0);
  const frameRef = useRef(0);
  const drawRef = useRef<() => void>(() => {});

  // Draw one still frame for the current chord, and again
  // whenever the canvas changes size.
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return;
    }

    // Keep the root in the octave around middle C so the
    // shape stays readable for every key.
    const rootPc = getPitchClass(rootNote);
    const base = rootPc > 6 ? rootPc - 12 : rootPc;
    const freqs = intervals.map(
      (interval) =>
        MIDDLE_C * Math.pow(2, (base + interval) / 12)
    );

    const draw = () => {
      const ratio = window.devicePixelRatio || 1;
      const width = canvas.clientWidth * ratio;
      const height = canvas.clientHeight * ratio;

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      context.clearRect(0, 0, width, height);

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
          const t = (x / width) * 0.018 + phaseRef.current;
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
    };

    drawRef.current = draw;
    draw();

    const observer = new ResizeObserver(draw);
    observer.observe(canvas);

    return () => observer.disconnect();
  }, [rootNote, intervals]);

  // Animate only while a played chord is ringing.
  useEffect(() => {
    if (pulse === 0) {
      return;
    }

    const still = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (still) {
      return;
    }

    cancelAnimationFrame(frameRef.current);

    const start = performance.now();
    let last = start;

    const tick = (now: number) => {
      const elapsed = (now - start) / 1000;
      const progress = Math.min(elapsed / PLAY_SECONDS, 1);

      // Swell in fast, fade out with the chord.
      energyRef.current = Math.sin(Math.PI * progress) ** 0.6;
      phaseRef.current += ((now - last) / 9000) * (1 - progress * 0.6);
      last = now;

      drawRef.current();

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        energyRef.current = 0;
        drawRef.current();
      }
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frameRef.current);
  }, [pulse]);

  return (
    <canvas
      ref={canvasRef}
      className="chord-wave"
      aria-hidden="true"
    />
  );
}

export default ChordWave;
