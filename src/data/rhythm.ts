// ============================================================
// Timing/rhythm data for the Progressions builder.
//
// Two independent knobs:
//  - Tempo (BPM): how fast the beat pulses. Lives as component
//    state, not here — it's a single number, nothing to model.
//  - Time signature: how many beats make up one bar, used
//    purely to group the builder's chord slots into bars
//    (vertical divider lines) so a sequence actually reads
//    like written rhythm instead of an undifferentiated row
//    of boxes.
//  - Per-chord beat count: how many beats a single chord in
//    the builder holds for, before the next chord starts.
//
// Simplification worth noting: 6/8 is a compound meter
// conventionally felt as 2 dotted-quarter pulses per bar, with
// tempo usually given in dotted-quarter BPM. This app instead
// treats every time signature's "beat" as its written bottom-
// number unit (so 6/8 has 6 beats per bar, each an eighth
// note) and applies the same BPM-driven seconds-per-beat to
// all of them. That keeps the duration math identical across
// every time signature (no special-casing compound meters) at
// the cost of not matching a conductor's literal beat count
// for 6/8 — an acceptable trade for a chord-progression tool
// rather than a strict rhythm trainer.
// ============================================================

export interface TimeSignatureOption {
  id: string;
  label: string; // e.g. "4/4"
  beatsPerBar: number;
}

export const timeSignatures: TimeSignatureOption[] = [
  { id: "4-4", label: "4/4", beatsPerBar: 4 },
  { id: "3-4", label: "3/4", beatsPerBar: 3 },
  { id: "6-8", label: "6/8", beatsPerBar: 6 },
  { id: "2-4", label: "2/4", beatsPerBar: 2 },
];

export const defaultTimeSignatureId = "4-4";

export function getTimeSignature(
  id: string
): TimeSignatureOption {
  return (
    timeSignatures.find((option) => option.id === id) ??
    timeSignatures[0]
  );
}

// Selectable hold-length options for a single chord in the
// builder, in beats. 1 beat matches this app's historical
// "one quick strum" default chord length exactly (see the
// DEFAULT_CHORD_BEATS note in savedProgressions.ts), so
// existing behavior is unchanged until a user deliberately
// lengthens a chord.
export const beatOptions = [1, 2, 3, 4, 6, 8];

export const minBeats = beatOptions[0];
export const maxBeats = beatOptions[beatOptions.length - 1];
