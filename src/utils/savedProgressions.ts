// ============================================================
// Persists user-built chord progressions to localStorage so
// they survive a page reload. Kept deliberately tiny (no
// external storage/back end) — this is a local sketchpad.
//
// Each chord in a progression is stored as a frozen,
// standalone snapshot (its own root note + chord-type index)
// rather than a reference back to a scale degree. That is
// deliberate: a scale-degree reference is only meaningful
// relative to whatever key/scale/chord-type is currently
// selected elsewhere in the UI, so if the user later changes
// those controls, every chord "referencing" a degree would
// silently change out from under them. A snapshot can't do
// that — once a chord is added to a progression, it stays
// exactly that chord no matter what else changes.
// ============================================================

import { defaultTimeSignatureId } from "../data/rhythm";

// How long a chord holds, in beats, before the next one
// starts. 1 beat at this app's default ~70 BPM works out to
// roughly the same ~0.85s a chord used to always last before
// per-chord timing existed, so progressions saved by an
// earlier version — which implicitly had no concept of beats
// — sound the same once normalized to this default on load.
export const DEFAULT_CHORD_BEATS = 1;

export interface ProgressionChord {
  // "chord" = normal chord entry; "rest" = silence with no notes
  type: 'chord' | 'rest';
  // For type === 'chord': raw (ASCII #/b) root note, e.g. "C", "A#".
  // For type === 'rest': ignored.
  rootNote?: string;
  // For type === 'chord': index into chordTypes (src/data/chords.ts).
  // For type === 'rest': ignored.
  chordTypeIndex?: number;
  // How many beats this entry (chord or rest) holds for.
  // See rhythm.ts for the selectable range.
  beats: number;
}

export interface SavedProgression {
  id: string;
  name: string;
  chords: ProgressionChord[];
  // One of rhythm.ts's timeSignatures ids (e.g. "4-4"). Only
  // affects how the builder visually groups chords into bars
  // — it doesn't change playback timing, which is driven
  // purely by each chord's own beat count + the shared BPM.
  timeSignatureId: string;
  // Swing/groove feel: when true, off-beat notes are delayed
  // by a fraction (typically 2:1 ratio, see audio.ts).
  swingEnabled: boolean;
  // Accents/dynamics: "none" (no accenting), "first-beat"
  // (boost volume on the first beat of each chord), or
  // "first-measure" (boost on the first beat of each bar).
  accentType: 'none' | 'first-beat' | 'first-measure';
  // Rhythmic pattern for articulation (e.g. "arpeggio-up",
  // "strum-down", "block"). See data/patterns.ts for the
  // full catalog. Determines when notes fire within each
  // chord's duration.
  patternId: string;
  createdAt: number;
}

const STORAGE_KEY = "chord-explorer:saved-progressions";

function isBrowser(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

export function loadSavedProgressions(): SavedProgression[] {
  if (!isBrowser()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    // Entries saved by an earlier version of this feature
    // stored a key/scale/chordTypeIndex + a list of scale
    // degrees instead of standalone chord snapshots. There is
    // no way to losslessly recover those (we'd need to know
    // what key/scale was active), so they're dropped rather
    // than risk showing wrong/crashing chords.
    return parsed
      .filter(
        (item): item is SavedProgression =>
          Array.isArray(item?.chords)
      )
      .map((progression) => ({
        ...progression,
    // Entries saved before per-chord timing existed have
        // no beats/timeSignatureId — normalize them here so
        // the rest of the app never has to special-case it.
        // Similarly, entries saved before swing/accents/patterns
        // existed get those defaults.
        timeSignatureId:
          progression.timeSignatureId ??
          defaultTimeSignatureId,
        swingEnabled: progression.swingEnabled ?? false,
        accentType: progression.accentType ?? 'none',
        patternId: progression.patternId ?? 'block',
        chords: progression.chords.map((chord) => ({
          ...chord,
          type: chord.type ?? 'chord',
          beats: chord.beats ?? DEFAULT_CHORD_BEATS,
        })),
      }));
  } catch {
    // Corrupt or inaccessible storage — fail soft, never
    // crash the Progressions tab over a parsing error.
    return [];
  }
}

function persist(progressions: SavedProgression[]): void {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(progressions)
    );
  } catch {
    // Storage full/disabled — the progression still exists
    // in memory for this session, it just won't persist.
  }
}

export function saveProgression(
  input: Omit<SavedProgression, "id" | "createdAt">
): SavedProgression[] {
  const current = loadSavedProgressions();

  const entry: SavedProgression = {
    ...input,
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}`,
    createdAt: Date.now(),
  };

  const next = [...current, entry];
  persist(next);
  return next;
}

export function deleteProgression(
  id: string
): SavedProgression[] {
  const next = loadSavedProgressions().filter(
    (item) => item.id !== id
  );
  persist(next);
  return next;
}
