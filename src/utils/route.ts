// ============================================================
// Hash routing with each section's settings in the URL.
//
//   #/explore?root=Eb&chord=m7&spell=flats
//   #/progressions?key=C&scale=minor&p=<progression>
//   #/trainer?key=Bb&mode=minor&voicing=rootless
//
// Switching section pushes a history entry, so Back and
// Forward move between sections. Changing a setting replaces
// the current entry, so the URL is always shareable and a
// refresh restores it, without filling history with every
// click. A hash works on any static host (no server rewrites).
//
// Each section keeps its own settings while you're elsewhere,
// so going back to it (or Back) returns to where you left it.
// ============================================================

import type { ProgressionChord } from "./savedProgressions";

export type Section = "explore" | "progressions" | "trainer";

export const SECTIONS: Section[] = ["explore", "progressions", "trainer"];

type Params = Record<string, string>;

const store: Record<Section, Params> = {
  explore: {},
  progressions: {},
  trainer: {},
};

let current: Section = "explore";

// Every address this module wrote. Landing on one of them
// means Back/Forward; anything else is a link or an edited URL.
const written = new Set<string>();

function isSection(value: string): value is Section {
  return (SECTIONS as string[]).includes(value);
}

export function parseHash(hash: string): {
  section: Section;
  params: Params;
} {
  const raw = hash.replace(/^#\/?/, "");
  const [path, query = ""] = raw.split("?");
  const section = isSection(path) ? path : "explore";
  const params: Params = {};
  new URLSearchParams(query).forEach((value, key) => {
    params[key] = value;
  });
  return { section, params };
}

function buildHash(section: Section): string {
  const query = new URLSearchParams(store[section]).toString();
  return `#/${section}${query ? `?${query}` : ""}`;
}

function hasWindow() {
  return typeof window !== "undefined";
}

function writeHistory(kind: "push" | "replace", hash: string) {
  written.add(hash);
  if (kind === "push") {
    window.history.pushState(null, "", hash);
  } else {
    window.history.replaceState(null, "", hash);
  }
}

// Read the URL once at start-up, before the first render.
export function initRoute(): Section {
  if (!hasWindow()) {
    return current;
  }
  const { section, params } = parseHash(window.location.hash);
  current = section;
  store[section] = params;
  // Normalise "/" or an unknown hash to a real route.
  writeHistory("replace", buildHash(section));
  return section;
}

export function currentSection(): Section {
  return current;
}

// The settings a section has in the URL: what the page was
// opened with, or what the section last wrote. Components
// read this once to restore their state.
export function routeParams(section: Section): Readonly<Params> {
  return store[section];
}

// Merge settings into a section's URL state. `undefined` or ""
// removes a key. Only touches the address bar when that
// section is the one showing.
export function setRouteParams(
  section: Section,
  partial: Record<string, string | undefined>
) {
  const next = { ...store[section] };
  for (const [key, value] of Object.entries(partial)) {
    if (value === undefined || value === "") {
      delete next[key];
    } else {
      next[key] = value;
    }
  }
  store[section] = next;

  if (hasWindow() && section === current) {
    const hash = buildHash(section);
    if (hash !== window.location.hash) {
      writeHistory("replace", hash);
    }
  }
}

// Switch section from the UI: a new history entry.
export function navigateTo(section: Section) {
  if (section === current) {
    return;
  }
  current = section;
  if (hasWindow()) {
    writeHistory("push", buildHash(section));
  }
}

// The address changed outside the app. Back/Forward to an
// entry this app wrote: adopt that section and its settings
// and return the section. A pasted link or an edited URL:
// return null, and the caller reloads so every setting in it
// applies from scratch.
export function syncFromLocation(): Section | null {
  if (!written.has(window.location.hash)) {
    return null;
  }
  const { section, params } = parseHash(window.location.hash);
  current = section;
  store[section] = params;
  return section;
}

// ------------------------------------------------------------
// Progressions in a URL
//
// Each entry is compact and readable:
//   chord: <root>.<chordTypeIndex>.<beats>      "C.0.4"
//   built: <root>.b.<quality>~<ext,..>~<alt,..>.<beats>
//   rest:  r.<beats>
// joined with "_". Roots use ASCII (# and b).
// ------------------------------------------------------------

export function encodeProgression(chords: ProgressionChord[]): string {
  return chords
    .map((chord) => {
      if (chord.type === "rest") {
        return `r.${chord.beats}`;
      }
      if (chord.build) {
        const { quality, extensions, alterations } = chord.build;
        return `${chord.rootNote}.b.${quality}~${extensions.join(",")}~${alterations.join(",")}.${chord.beats}`;
      }
      return `${chord.rootNote}.${chord.chordTypeIndex ?? 0}.${chord.beats}`;
    })
    .join("_");
}

export function decodeProgression(
  value: string | undefined
): ProgressionChord[] {
  if (!value) {
    return [];
  }

  const chords: ProgressionChord[] = [];

  for (const part of value.split("_")) {
    const bits = part.split(".");
    const beats = Number(bits[bits.length - 1]);
    if (!Number.isFinite(beats) || beats <= 0 || beats > 64) {
      continue;
    }

    if (bits[0] === "r" && bits.length === 2) {
      chords.push({ type: "rest", beats });
      continue;
    }

    const root = bits[0];
    if (!/^[A-G][#b]?$/.test(root)) {
      continue;
    }

    if (bits[1] === "b" && bits.length === 4) {
      const [quality, ext = "", alt = ""] = bits[2].split("~");
      if (!quality) {
        continue;
      }
      chords.push({
        type: "chord",
        rootNote: root,
        chordTypeIndex: -1,
        build: {
          quality,
          extensions: ext ? ext.split(",") : [],
          alterations: alt ? alt.split(",") : [],
        },
        beats,
      });
      continue;
    }

    const index = Number(bits[1]);
    if (bits.length === 3 && Number.isInteger(index) && index >= 0) {
      chords.push({
        type: "chord",
        rootNote: root,
        chordTypeIndex: index,
        beats,
      });
    }
  }

  return chords;
}
