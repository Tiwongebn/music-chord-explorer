// ============================================================
// Persists user-built chord progressions to localStorage so
// they survive a page reload. Kept deliberately tiny (no
// external storage/back end) — this is a local sketchpad.
// ============================================================

import type { ScaleType } from "../data/scales";

export type ChordVoicing = "triads" | "sevenths";

export interface SavedProgression {
  id: string;
  name: string;
  rootNote: string; // raw note, e.g. "C", "A#"
  scaleType: ScaleType;
  voicing: ChordVoicing;
  degrees: number[];
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

    return Array.isArray(parsed) ? parsed : [];
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
