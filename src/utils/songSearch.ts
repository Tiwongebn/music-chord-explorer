// ============================================================
// Song lookup: finds a song in data/songs.ts by title and/or
// artist ("let it be", "wonderwall oasis", "hello by adele",
// "Journey - Don't Stop Believin"), forgiving small typos and
// missing punctuation, and turns its sections into builder
// chords in any key.
// ============================================================

import { songs, type Song } from "../data/songs";
import { parseChordName, romansToChords } from "./progressionSearch";
import type { ProgressionChord } from "./savedProgressions";

export interface SongMatch {
  song: Song;
  score: number;
}

// Lowercase, no accents or punctuation, "&" -> "and", so
// "Don't Stop Believin'" and "dont stop believin" compare
// equal.
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’.]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const tokenize = (text: string) => normalize(text).split(" ").filter(Boolean);

// Words that say nothing about which song is meant.
const fillerWords = new Set(["song", "chords", "chord", "progression", "by", "the", "a"]);

function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const current = row[j];
      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        previous + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      previous = current;
    }
  }
  return row[b.length];
}

// How well one query word matches the best word in `words`:
// exact 1, prefix of a longer word 0.8 (so "believ" finds
// "believin"), one typo away 0.7, otherwise 0.
function wordMatch(word: string, words: string[]): number {
  let best = 0;
  for (const candidate of words) {
    if (candidate === word) return 1;
    if (word.length >= 2 && candidate.startsWith(word)) best = Math.max(best, 0.8);
    if (
      word.length >= 4 &&
      Math.abs(candidate.length - word.length) <= 1 &&
      editDistance(word, candidate) <= 1
    ) {
      best = Math.max(best, 0.7);
    }
  }
  return best;
}

function scoreSong(song: Song, query: string, artistHint: string | null): number {
  const titles = [song.title, ...(song.aliases ?? [])].map(normalize);
  const artist = normalize(song.artist);
  const q = normalize(query);
  if (!q) return 0;

  let score = 0;

  // Whole-title matches beat word-by-word ones.
  if (titles.includes(q)) score = 100;
  else if (titles.some((t) => t.startsWith(q) && q.length >= 3)) score = 85;
  else if (titles.some((t) => t.includes(q) && q.length >= 4)) score = 75;

  // Word-by-word: every meaningful query word should land in
  // the title or the artist.
  const queryWords = tokenize(query).filter((w) => !fillerWords.has(w));
  if (score === 0 && queryWords.length > 0) {
    const titleWords = titles.flatMap((t) => t.split(" "));
    const artistWords = artist.split(" ");
    let titleHits = 0;
    let total = 0;
    for (const word of queryWords) {
      const inTitle = wordMatch(word, titleWords);
      const inArtist = wordMatch(word, artistWords) * 0.9;
      if (inTitle >= inArtist) titleHits += inTitle;
      total += Math.max(inTitle, inArtist);
    }
    const coverage = total / queryWords.length;
    // Every word has to count for something, and at least
    // part of the query has to be about the title (a bare
    // artist name still lists that artist's songs).
    if (coverage >= 0.65) {
      score = 40 + coverage * 30 + (titleHits > 0 ? 5 : 0);
    }
  }

  if (artistHint) {
    const hintWords = tokenize(artistHint).filter((w) => !fillerWords.has(w));
    const artistWords = artist.split(" ");
    const hit =
      hintWords.length > 0 &&
      hintWords.every((w) => wordMatch(w, artistWords) > 0);
    score = hit ? score + 10 : score * 0.5;
  }

  return score;
}

// Splits "hello by adele" / "Adele - Hello" into a title part
// and an artist hint. For "X - Y" either side may be the
// artist, so both readings are tried by the caller.
function splitQuery(raw: string): Array<{ title: string; artist: string | null }> {
  const readings: Array<{ title: string; artist: string | null }> = [
    { title: raw, artist: null },
  ];
  const by = /^(.*\S)\s+by\s+(\S.*)$/i.exec(raw);
  if (by) readings.push({ title: by[1], artist: by[2] });
  const dash = /^(.*\S)\s+[-–—]\s+(\S.*)$/.exec(raw);
  if (dash) {
    readings.push({ title: dash[2], artist: dash[1] });
    readings.push({ title: dash[1], artist: dash[2] });
  }
  return readings;
}

export function searchSongs(raw: string, limit = 6): SongMatch[] {
  if (!normalize(raw)) return [];
  const readings = splitQuery(raw);

  return songs
    .map((song) => ({
      song,
      score: Math.max(...readings.map((r) => scoreSong(song, r.title, r.artist))),
    }))
    .filter((match) => match.score >= 50)
    .sort((a, b) => b.score - a.score || a.song.title.localeCompare(b.song.title))
    .slice(0, limit);
}

export const songKeyPitchClass = (song: Song): number =>
  parseChordName(song.key)?.pitchClass ?? 0;

// The chords of one section (or several, played in order)
// voiced in `keyPitchClass` — the song's own key unless the
// user transposed it.
export function songChords(
  song: Song,
  sectionIndexes: number[],
  keyPitchClass = songKeyPitchClass(song)
): ProgressionChord[] {
  return sectionIndexes.flatMap((i) =>
    romansToChords(song.sections[i].romans, song.scaleType, keyPitchClass)
  );
}

// A web search for chords of a song that isn't in the list.
export const webChordSearchUrl = (query: string): string =>
  `https://www.google.com/search?q=${encodeURIComponent(`${query.trim()} chords`)}`;

export const songCount = songs.length;
