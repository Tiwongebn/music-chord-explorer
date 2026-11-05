// ============================================================
// Backing band: a walking bass line, comping chords and a ride
// cymbal pattern, worked out from a chord progression so you
// can solo over it.
//
// Everything here is pure: it turns chords into a list of
// events placed in beats from the start of one chorus (one
// time through the progression). Off-beat events sit at x.5
// in straight time; the player swings them when it schedules
// them (see swingBeat in metronome.ts), so the same plan works
// at any swing feel and tempo.
// ============================================================

export interface BandChord {
  // null for a rest: the bass and comping lay out, the drums
  // keep time.
  rootPc: number | null;
  // Chord tones as pitch classes (0 = C), root first.
  pcs: number[];
  beats: number;
}

export type CompStyle = "charleston" | "four" | "sustain";

export const COMP_STYLES: { id: CompStyle; label: string; hint: string }[] = [
  {
    id: "charleston",
    label: "Charleston",
    hint: "Piano-style hits on 1 and the swung 'and' of 2",
  },
  {
    id: "four",
    label: "Four to the bar",
    hint: "Short chords on every beat, like a big-band guitarist",
  },
  {
    id: "sustain",
    label: "Held chords",
    hint: "One chord held for its whole length, the easiest to hear",
  },
];

export interface BandParts {
  bass: boolean;
  comp: CompStyle | null; // null = no comping
  drums: boolean;
}

export type BandEventKind = "bass" | "comp" | "ride" | "hat";

export interface BandEvent {
  kind: BandEventKind;
  beat: number; // straight-time position in the chorus
  length: number; // in beats
  velocity: number; // 0..1
  chordIndex: number; // chord sounding at this point
  midi?: number; // bass note
}

export interface ChorusPlan {
  events: BandEvent[]; // sorted by beat
  totalBeats: number;
  chordStarts: number[]; // first beat of each chord
}

// Upright bass range used for the walking line: E1 .. D3.
export const BASS_LOW = 28;
export const BASS_HIGH = 50;

function mod12(value: number): number {
  return ((value % 12) + 12) % 12;
}

// The note of pitch class `pc` closest to `reference`, kept
// inside the bass range.
export function nearestInRange(
  pc: number,
  reference: number,
  low = BASS_LOW,
  high = BASS_HIGH
): number {
  let best = low + mod12(pc - low);
  let bestDistance = Math.abs(best - reference);

  for (let midi = best + 12; midi <= high; midi += 12) {
    const distance = Math.abs(midi - reference);

    if (distance < bestDistance) {
      best = midi;
      bestDistance = distance;
    }
  }

  return best;
}

// Next chord tone strictly above (direction 1) or below (-1)
// `from`.
function stepToChordTone(
  from: number,
  pcs: number[],
  direction: 1 | -1
): number {
  for (let distance = 1; distance <= 12; distance += 1) {
    const candidate = from + distance * direction;

    if (pcs.includes(mod12(candidate))) {
      return candidate;
    }
  }

  return from + 12 * direction;
}

// Bass notes for one chord, one per beat. `previous` is the
// last note played (to keep the line smooth) and `nextRootPc`
// the root the line is walking towards (null when a rest or
// nothing follows).
export function walkChord(
  chord: BandChord,
  previous: number | null,
  nextRootPc: number | null,
  variation: number
): number[] {
  if (chord.rootPc === null || chord.beats <= 0) {
    return [];
  }

  const pcs = chord.pcs.length > 0 ? chord.pcs : [chord.rootPc];
  // Land the root near where the line already is; start low
  // (around A1..G#2) when there is nothing before it.
  const root = nearestInRange(chord.rootPc, previous ?? 38);
  const notes = [root];

  if (chord.beats === 1) {
    return notes;
  }

  // Walk up from a low root and down from a high one, so the
  // line stays in the bass's sweet spot. `variation` flips the
  // choice in the middle of the range for some variety.
  const middle = (BASS_LOW + BASS_HIGH) / 2;
  let direction: 1 | -1 =
    root < middle - 3 ? 1 : root > middle + 3 ? -1 : variation % 2 ? -1 : 1;

  const walkBeats = nextRootPc === null ? chord.beats : chord.beats - 1;
  let current = root;

  for (let beat = 1; beat < walkBeats; beat += 1) {
    let next = stepToChordTone(current, pcs, direction);

    if (next > BASS_HIGH || next < BASS_LOW) {
      direction = direction === 1 ? -1 : 1;
      next = stepToChordTone(current, pcs, direction);
    }

    notes.push(next);
    current = next;
  }

  if (nextRootPc !== null) {
    notes.push(approachNote(current, nextRootPc, variation));
  }

  return notes;
}

// The last beat of a chord leads into the next root: usually
// a half step away (from below when the line is climbing to
// it, from above when it's falling), sometimes the next
// chord's 5th, the way a dominant pulls to its tonic.
export function approachNote(
  current: number,
  nextRootPc: number,
  variation: number
): number {
  const target = nearestInRange(nextRootPc, current);

  if (variation % 3 === 2) {
    const fifth = nearestInRange(nextRootPc + 7, current);

    if (fifth !== current && fifth !== target) {
      return fifth;
    }
  }

  let approach = target >= current ? target - 1 : target + 1;

  if (approach === current) {
    approach = target >= current ? target + 1 : target - 1;
  }

  if (approach > BASS_HIGH) approach -= 2;
  if (approach < BASS_LOW) approach += 2;

  return approach;
}

// Comping hits for one chord, as [beat offset in the chord,
// length in beats, velocity]. `startInBar` is the beat of the
// bar the chord starts on.
function compHits(
  style: CompStyle,
  beats: number,
  startInBar: number,
  beatsPerBar: number
): [number, number, number][] {
  const hits: [number, number, number][] = [];

  if (style === "sustain") {
    return [[0, beats * 0.95, 0.5]];
  }

  for (let beat = 0; beat < beats; beat += 1) {
    const inBar = (startInBar + beat) % beatsPerBar;

    if (style === "four") {
      // Short and even, a touch firmer on 2 and 4.
      hits.push([beat, 0.42, inBar % 2 === 1 ? 0.6 : 0.5]);
      continue;
    }

    // Charleston: a short stab on the 1 (or wherever the chord
    // comes in), then the swung "and" of 2 held over.
    if (beat === 0 || inBar === 0) {
      hits.push([beat, 0.55, 0.58]);
    }

    if (inBar === 1 && beat + 0.5 < beats) {
      hits.push([beat + 0.5, Math.min(1.4, beats - beat - 0.5), 0.5]);
    }
  }

  return hits;
}

// One time through the progression. `previousBass` carries
// the line over from the chorus before; `chorus` (0, 1, 2...)
// varies the walking line a little each time round. The last
// chord walks back into the first, ready for the next chorus.
export function planChorus(
  chords: BandChord[],
  parts: BandParts,
  beatsPerBar: number,
  chorus = 0,
  previousBass: number | null = null
): ChorusPlan & { lastBass: number | null } {
  const events: BandEvent[] = [];
  const chordStarts: number[] = [];
  const bar = Math.max(1, beatsPerBar);
  let start = 0;
  let lastBass = previousBass;

  chords.forEach((chord, index) => {
    chordStarts.push(start);

    const beats = Math.max(0, chord.beats);
    const next = chords[(index + 1) % chords.length];
    const nextRootPc = next ? next.rootPc : null;

    if (parts.bass && chord.rootPc !== null) {
      const line = walkChord(chord, lastBass, nextRootPc, chorus + index);

      line.forEach((midi, beat) => {
        events.push({
          kind: "bass",
          beat: start + beat,
          length: 0.92,
          velocity: beat === 0 ? 0.85 : 0.72,
          chordIndex: index,
          midi,
        });
      });

      lastBass = line[line.length - 1] ?? lastBass;
    }

    if (parts.comp && chord.rootPc !== null && beats > 0) {
      for (const [offset, length, velocity] of compHits(
        parts.comp,
        beats,
        start % bar,
        bar
      )) {
        events.push({
          kind: "comp",
          beat: start + offset,
          length,
          velocity,
          chordIndex: index,
        });
      }
    }

    start += beats;
  });

  const totalBeats = start;

  if (parts.drums) {
    // Ride: every beat, with the "skip" note on the "and" of 2
    // and 4 (ding, ding-a ding, ding-a). Hi-hat foot on 2 and 4.
    let chordIndex = 0;

    for (let beat = 0; beat < totalBeats; beat += 1) {
      while (
        chordIndex + 1 < chordStarts.length &&
        chordStarts[chordIndex + 1] <= beat
      ) {
        chordIndex += 1;
      }

      const backbeat = (beat % bar) % 2 === 1;

      events.push({
        kind: "ride",
        beat,
        length: 1,
        velocity: backbeat ? 0.7 : 0.55,
        chordIndex,
      });

      if (backbeat) {
        events.push({
          kind: "ride",
          beat: beat + 0.5,
          length: 0.5,
          velocity: 0.38,
          chordIndex,
        });
        events.push({
          kind: "hat",
          beat,
          length: 0.25,
          velocity: 0.7,
          chordIndex,
        });
      }
    }
  }

  events.sort((a, b) => a.beat - b.beat);

  return { events, totalBeats, chordStarts, lastBass };
}

// A compact comping voicing for piano: the chord's colour
// tones (3rd, 7th and up) stacked in the middle register,
// leaving the root to the bass. Triads keep all three notes.
// Picks the inversion closest to `previousCenter` so the
// chords move smoothly from one to the next.
export function pianoCompVoicing(
  pcs: number[],
  rootPc: number,
  dropRoot: boolean,
  previousCenter: number | null
): number[] {
  const unique = [...new Set(pcs.map(mod12))];
  const tones =
    dropRoot && unique.length >= 4
      ? unique.filter((pc) => pc !== mod12(rootPc))
      : unique;
  const target = previousCenter ?? 60;
  let best: number[] = [];
  let bestCost = Infinity;

  // Try each lowest note between C3 and B3 (and stack the rest
  // closely above it).
  for (let low = 48; low < 60; low += 1) {
    if (!tones.includes(mod12(low))) {
      continue;
    }

    const notes = [low];

    for (const pc of tones) {
      if (pc === mod12(low)) {
        continue;
      }

      notes.push(low + mod12(pc - low));
    }

    notes.sort((a, b) => a - b);

    const center = notes.reduce((sum, note) => sum + note, 0) / notes.length;
    const cost = Math.abs(center - target) + (notes[notes.length - 1] > 72 ? 6 : 0);

    if (cost < bestCost) {
      bestCost = cost;
      best = notes;
    }
  }

  return best;
}
