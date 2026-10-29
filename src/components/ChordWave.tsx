import { useEffect, useRef } from "react";
import { getPitchClass } from "../utils/musicTheory";

interface ChordWaveProps {
  rootNote: string;
  intervals: number[];
  // Bump this when the chord is played: the wave rises out
  // of a flat line, moves, then eases back to flat.
  pulse: number;
}

const MIDDLE_C = 261.63;

// How long the wave stays up after a play, roughly as long
// as the chord rings, and how quickly it rises and falls
// (time constants of the easing, in seconds).
const HOLD_SECONDS = 0.9;
const RISE_SECONDS = 0.15;
const FALL_SECONDS = 0.45;

// Draws the chord's real waveform (its notes' sine waves
// added together) behind the chord name. At rest it is a
// flat line; when the chord is played it eases into motion
// and then eases back to flat. Purely decorative, so it's
// hidden from screen readers.
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

      // Flat at rest, full height while the chord rings.
      const swell = energyRef.current * 1.6;

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

  // Animate only while a played chord is ringing. The
  // height follows its target with exponential easing, so a
  // play rises smoothly, a replay mid-fall picks up from the
  // current height, and the fall settles gently to flat.
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
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;

      const rising = (now - start) / 1000 < HOLD_SECONDS;
      const target = rising ? 1 : 0;
      const tau = rising ? RISE_SECONDS : FALL_SECONDS;

      energyRef.current +=
        (target - energyRef.current) * (1 - Math.exp(-dt / tau));

      // Drift with the height, so the motion slows as the
      // line flattens instead of stopping dead.
      phaseRef.current += (dt / 9) * (0.3 + energyRef.current);

      if (!rising && energyRef.current < 0.002) {
        energyRef.current = 0;
        drawRef.current();
        return;
      }

      drawRef.current();
      frameRef.current = requestAnimationFrame(tick);
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
