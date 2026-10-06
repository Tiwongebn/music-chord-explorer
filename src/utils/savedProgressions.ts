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

export interface ProgressionChord {
  // Raw (ASCII #/b) root note, e.g. "C", "A#". Spelling for
  // display still follows the shared sharps/flats preference
  // at render time, same as everywhere else in the app.
  rootNote: string;
  // Index into chordTypes (src/data/chords.ts).
  chordTypeIndex: number;
}

export interface SavedProgression {
  id: string;
  name: string;
  chords: ProgressionChord[];
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
    return parsed.filter(
      (item): item is SavedProgression =>
        Array.isArray(item?.chords)
    );
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
