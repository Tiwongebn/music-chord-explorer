// Standard tuning, low string first: E2 A2 D3 G3 B3 E4.
// Values are MIDI numbers so octaves can be derived for playback.
export const STANDARD_TUNING = [40, 45, 50, 55, 59, 64];

export const MAX_FRET = 15;
const MAX_SPAN = 3; // fretted notes fit inside 4 adjacent frets

const SHARP_NAMES = [
  "C", "C#", "D", "D#", "E", "F",
  "F#", "G", "G#", "A", "A#", "B",
];

export interface GuitarVoicing {
  // One entry per string (low to high); -1 means muted.
  frets: number[];
  // Lowest fretted position, used to label the diagram.
  baseFret: number;
}

// Pitch class of a fret on a string.
function pitchClassAt(string: number, fret: number): number {
  return (STANDARD_TUNING[string] + fret) % 12;
}

// Chord tones that must appear in a voicing. Players routinely
// drop the 5th from 4+ note chords, so it is optional there.
function requiredPitchClasses(
  rootPc: number,
  intervals: number[]
): Set<number> {
  const required = new Set<number>();

  for (const interval of intervals) {
    if (intervals.length >= 4 && interval % 12 === 7) {
      continue;
    }

    required.add((rootPc + interval) % 12);
  }

  return required;
}

function scoreVoicing(frets: number[], rootPc: number): number {
  const fretted = frets.filter((fret) => fret > 0);
  const sounding = frets.filter((fret) => fret >= 0);
  const lowestString = frets.findIndex((fret) => fret >= 0);
  const bassIsRoot =
    pitchClassAt(lowestString, frets[lowestString]) === rootPc;

  const position = fretted.length ? Math.min(...fretted) : 0;
  const span = fretted.length
    ? Math.max(...fretted) - Math.min(...fretted)
    : 0;
  const muted = frets.length - sounding.length;
  const open = sounding.length - fretted.length;

  return (
    position * 0.6 +
    span * 0.8 +
    muted * 1.2 +
    (bassIsRoot ? 0 : 3) -
    open * 0.4 -
    sounding.length * 0.5
  );
}

// Find playable shapes for a chord, best first. Shapes are
// searched, not looked up, so every chord in the catalog works.
export function findGuitarVoicings(
  rootPc: number,
  intervals: number[],
  limit = 6
): GuitarVoicing[] {
  const chordPcs = new Set(
    intervals.map((interval) => (rootPc + interval) % 12)
  );
  const required = requiredPitchClasses(rootPc, intervals);
  const minStrings = Math.min(4, chordPcs.size);
  const found = new Map<string, GuitarVoicing & { score: number }>();

  for (let window = 0; window <= MAX_FRET - MAX_SPAN; window++) {
    const options = STANDARD_TUNING.map((_, string) => {
      const frets = [-1];

      for (let fret = 0; fret <= MAX_FRET; fret++) {
        // Open strings only combine with first-position shapes;
        // higher up they would be a long stretch away.
        const inWindow =
          (fret === 0 && window <= 1) ||
          (fret >= window && fret <= window + MAX_SPAN);

        if (inWindow && chordPcs.has(pitchClassAt(string, fret))) {
          frets.push(fret);
        }
      }

      return frets;
    });

    const current: number[] = [];

    const walk = (string: number) => {
      if (string === STANDARD_TUNING.length) {
        const sounding = current.filter((fret) => fret >= 0);

        if (sounding.length < minStrings) {
          return;
        }

        // No muted string in the middle of a shape.
        const first = current.findIndex((fret) => fret >= 0);
        const last = current.length - 1 -
          [...current].reverse().findIndex((fret) => fret >= 0);

        if (current.slice(first, last + 1).includes(-1)) {
          return;
        }

        const covered = new Set(
          current.flatMap((fret, index) =>
            fret >= 0 ? [pitchClassAt(index, fret)] : []
          )
        );

        for (const pc of required) {
          if (!covered.has(pc)) {
            return;
          }
        }

        const frets = [...current];
        const key = frets.join(",");

        if (!found.has(key)) {
          const fretted = frets.filter((fret) => fret > 0);

          found.set(key, {
            frets,
            baseFret: fretted.length ? Math.min(...fretted) : 1,
            score: scoreVoicing(frets, rootPc),
          });
        }

        return;
      }

      for (const fret of options[string]) {
        current[string] = fret;
        walk(string + 1);
      }
    };

    walk(0);
  }

  const ranked = [...found.values()].sort(
    (a, b) => a.score - b.score
  );

  // Keep the list varied: one shape per bass-string/position pair.
  const seen = new Set<string>();
  const picked: GuitarVoicing[] = [];

  for (const voicing of ranked) {
    const bass = voicing.frets.findIndex((fret) => fret >= 0);
    const key = `${bass}-${voicing.baseFret}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    picked.push({
      frets: voicing.frets,
      baseFret: voicing.baseFret,
    });

    if (picked.length === limit) {
      break;
    }
  }

  return picked;
}

// Note name with octave for a string and fret: "E2", "A#3", ...
export function noteAt(string: number, fret: number): string {
  const midi = STANDARD_TUNING[string] + fret;

  return `${SHARP_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

// The sounding strings of a voicing, for the guitar sound.
export function voicingToStrings(
  frets: number[]
): { string: number; note: string }[] {
  return frets.flatMap((fret, string) =>
    fret < 0 ? [] : [{ string, note: noteAt(string, fret) }]
  );
}

// ---- Progression voicings ----------------------------------
//
// Picks a guitar shape for each chord of a progression. The best
// few shapes are candidates, and the one closest up the neck to
// the previous chord wins ties, so a progression doesn't jump
// between open position and the 10th fret on every change.

const progressionCache = new Map<string, GuitarVoicing[]>();

function candidatesFor(pitchClasses: number[]): GuitarVoicing[] {
  const key = pitchClasses.join(",");
  const cached = progressionCache.get(key);

  if (cached) {
    return cached;
  }

  const rootPc = pitchClasses[0];
  const intervals = pitchClasses.map((pc) => (pc - rootPc + 12) % 12);
  let found: GuitarVoicing[] = [];

  // Big extended chords may not fit on six strings; fall back to
  // the core chord (root, 3rd, 5th, 7th), then the plain triad.
  for (const size of [intervals.length, 4, 3]) {
    found = findGuitarVoicings(rootPc, intervals.slice(0, size), 4);

    if (found.length > 0) {
      break;
    }
  }

  progressionCache.set(key, found);

  return found;
}

function neckCenter(voicing: GuitarVoicing): number {
  const fretted = voicing.frets.filter((fret) => fret > 0);

  return fretted.length
    ? fretted.reduce((sum, fret) => sum + fret, 0) / fretted.length
    : 0;
}

export interface ProgressionVoicing {
  strings: { string: number; note: string }[];
  center: number; // average fretted position, for the next chord
}

// `pitchClasses` lists the chord tones root first (0 = C).
// Returns null when no playable shape exists.
export function voiceChordForGuitar(
  pitchClasses: number[],
  previousCenter: number | null = null
): ProgressionVoicing | null {
  if (pitchClasses.length === 0) {
    return null;
  }

  const candidates = candidatesFor(pitchClasses);

  if (candidates.length === 0) {
    return null;
  }

  let best = candidates[0];

  if (previousCenter !== null) {
    let bestCost = Infinity;

    candidates.forEach((voicing, rank) => {
      // Keep the root in the bass unless nothing else is close.
      const bass = voicing.frets.findIndex((fret) => fret >= 0);
      const rootInBass =
        pitchClassAt(bass, voicing.frets[bass]) === pitchClasses[0];
      const cost =
        rank +
        Math.abs(neckCenter(voicing) - previousCenter) * 0.35 +
        (rootInBass ? 0 : 2.5);

      if (cost < bestCost) {
        bestCost = cost;
        best = voicing;
      }
    });
  }

  return {
    strings: voicingToStrings(best.frets),
    center: neckCenter(best),
  };
}
