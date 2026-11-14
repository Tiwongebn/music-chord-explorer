import { useMemo, useState } from "react";

import { type ScaleType } from "../../data/scales";
import { getDisplayKeyRoot, resolveChordSnapshot } from "../../utils/scaleHarmony";
import { type AccidentalPreference } from "../../utils/musicTheory";
import {
  keyRootName,
  parseChordName,
  romansToChords,
  searchProgressions,
  type SearchResult,
} from "../../utils/progressionSearch";
import {
  jazzBarsLabel,
  jazzChords,
  jazzForm,
  jazzProgressions,
  type JazzProgression,
} from "../../data/jazzProgressions";
import {
  standardBarCount,
  standardForm,
  standardLevels,
  jazzStandards,
  type JazzStandard,
} from "../../data/jazzStandards";
import {
  searchSongs,
  searchStandards,
  songChords,
  songCount,
  songKeyPitchClass,
  standardKeyPitchClass,
  webChordSearchUrl,
} from "../../utils/songSearch";
import type { Song } from "../../data/songs";

import { type ProgressionChord } from "../../utils/savedProgressions";

// Clickable starter queries under the search box, so it's
// obvious what kinds of things the search understands.
const searchExamples = [
  "sad C minor",
  "jazzy ii-V-I in F",
  "pop 4 chords",
  "Am to F",
  "epic cinematic",
  "lo-fi chill in Eb",
];

// Starter songs for the "Song" search mode.
const songExamples = [
  "Let It Be",
  "Wonderwall",
  "Someone Like You",
  "Hotel California",
  "Stand by Me",
  "Autumn Leaves",
];

const searchSourceLabel: Record<SearchResult["source"], string> = {
  typed: "Typed",
  library: "Classic",
  generated: "Generated",
};

interface FindProgressionProps {
  rootNote: string;
  scaleType: ScaleType;
  accidentalPreference: AccidentalPreference;
  // Songs and jazz charts load one chord per bar.
  beatsPerBar: number;
  resolveSnapshot: (chord: ProgressionChord) => {
    chordLabel: string;
    rawNotes: string[];
  };
  onPlay: (chords: ProgressionChord[]) => void;
  // Put chords in the builder and switch the key to match.
  onLoad: (
    chords: ProgressionChord[],
    keyPitchClass: number,
    scaleType: ScaleType
  ) => void;
}

// "Find a progression": start from a song, a mood or chords,
// or a jazz standard, and load the result into the builder.
function FindProgression({
  rootNote,
  scaleType,
  accidentalPreference,
  beatsPerBar,
  resolveSnapshot,
  onPlay,
  onLoad,
}: FindProgressionProps) {
  // "Find a progression" search. The box text only becomes a
  // search when submitted, so results don't jump around (or
  // re-roll their generated ideas) on every keystroke.
  // searchSeed re-rolls the generated ideas for the same query.
  const [searchQuery, setSearchQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [searchSeed, setSearchSeed] = useState(0);

  // Song lookup: search a well-known song by title/artist and
  // load its chords. Results update as you type (the lookup
  // is deterministic, so nothing reshuffles). songKeys holds
  // per-song transpositions picked on the result cards.
  const [searchMode, setSearchMode] = useState<
    "song" | "mood" | "jazz"
  >("song");
  const [songQuery, setSongQuery] = useState("");
  const [songKeys, setSongKeys] = useState<Record<string, number>>({});

  // Jazz library: one key for every card. null follows the
  // key the page is set to, until a key is picked here.
  const [jazzKeyChoice, setJazzKeyChoice] = useState<number | null>(
    null
  );
  // Jazz standards tab: whole tunes to learn, or the common
  // progressions they're built from. standardKeys holds
  // per-tune transpositions, like songKeys.
  const [jazzView, setJazzView] = useState<"tunes" | "progressions">(
    "tunes"
  );
  const [standardKeys, setStandardKeys] = useState<
    Record<string, number>
  >({});

  // Results are computed against the key/scale shown when
  // the search ran; a query that names its own key ("in F",
  // "C minor", "Am to F") overrides it.
  const searchResults = useMemo(
    () =>
      submittedQuery.trim()
        ? searchProgressions(submittedQuery, {
            keyRoot: rootNote,
            scaleType,
            seed: searchSeed,
          })
        : [],
    // rootNote/scaleType deliberately left out: loading a
    // result changes them, and that shouldn't re-run (and
    // reshuffle) the search the user is looking at.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [submittedQuery, searchSeed]
  );

  const songMatches = useMemo(() => searchSongs(songQuery), [songQuery]);
  const standardMatches = useMemo(
    () => searchStandards(songQuery),
    [songQuery]
  );


  const runSearch = (query: string) => {
    setSearchQuery(query);
    setSubmittedQuery(query);
    setSearchSeed(0);
  };


  const handleLoadSearchResult = (result: SearchResult) =>
    onLoad(
      result.chords,
      result.keyPitchClass,
      result.scaleType
    );

  // The key a song card is set to: its original key unless
  // the user picked another one from the card's Key menu.
  const songKey = (song: Song) =>
    songKeys[song.id] ?? songKeyPitchClass(song);

  // Songs mostly change chord once a bar, so each chord gets
  // a full bar of the current time signature (mood-search
  // results keep the builder's default of one beat).
  const songBars = (song: Song, sectionIndexes: number[]) =>
    songChords(song, sectionIndexes, songKey(song)).map(
      (chord) => ({ ...chord, beats: beatsPerBar })
    );

  const handleLoadSong = (song: Song, sectionIndexes: number[]) =>
    onLoad(
      songBars(song, sectionIndexes),
      songKey(song),
      song.scaleType
    );

  const jazzKey =
    jazzKeyChoice ?? parseChordName(rootNote)?.pitchClass ?? 0;

  const jazzSectionChords = (
    progression: JazzProgression,
    sectionIndexes: number[]
  ) =>
    jazzChords(
      progression,
      sectionIndexes,
      jazzKey,
      beatsPerBar
    );

  const handleLoadJazz = (
    progression: JazzProgression,
    sectionIndexes: number[]
  ) =>
    onLoad(
      jazzSectionChords(progression, sectionIndexes),
      jazzKey,
      progression.scaleType
    );

  const standardKey = (standard: JazzStandard) =>
    standardKeys[standard.id] ?? standardKeyPitchClass(standard);

  // Lead sheets spell chords by the key signature (B♭maj7 in
  // G minor, never A♯maj7), so tune charts do too. Keys with
  // no clear side (C major, A minor, F♯/G♭) follow the
  // Sharps/Flats setting.
  const standardSpelling = (
    keyPitchClass: number,
    scaleType: ScaleType
  ): AccidentalPreference => {
    const majorTonic = (keyPitchClass + (scaleType === "minor" ? 3 : 0)) % 12;
    if ([5, 10, 3, 8, 1].includes(majorTonic)) return "flats";
    if ([7, 2, 9, 4, 11].includes(majorTonic)) return "sharps";
    return accidentalPreference;
  };

  const standardSectionChords = (
    standard: JazzStandard,
    sectionIndexes: number[]
  ) =>
    jazzChords(
      standard,
      sectionIndexes,
      standardKey(standard),
      beatsPerBar
    );

  const handleLoadStandard = (
    standard: JazzStandard,
    sectionIndexes: number[]
  ) =>
    onLoad(
      standardSectionChords(standard, sectionIndexes),
      standardKey(standard),
      standard.scaleType
    );

  // One tune as a card with a bar-by-bar chord chart, shared
  // by the Jazz standards tab and the song search results.
  const renderStandardCard = (standard: JazzStandard) => {
    const keyPitchClass = standardKey(standard);
    const form = standardForm(standard);
    const usualKey = standardKeyPitchClass(standard);
    const chartPreference = standardSpelling(
      keyPitchClass,
      standard.scaleType
    );
    const builtOn = standard.uses
      .map((id) => jazzProgressions.find((p) => p.id === id))
      .filter((p): p is JazzProgression => p !== undefined);
    return (
      <div
        className="saved-card search-card song-card jazz-card standard-card"
        key={standard.id}
      >
        <div className="saved-card-head">
          <strong className="song-title">{standard.title}</strong>
          <span className="saved-card-key">{standard.level}</span>
        </div>

        <p className="song-artist">
          {standard.composer} · {standard.year} · Jazz standard
        </p>

        <p className="search-description">{standard.why}</p>

        <label className="song-key">
          <span>Key</span>
          <select
            value={keyPitchClass}
            onChange={(event) =>
              setStandardKeys((current) => ({
                ...current,
                [standard.id]: Number(event.target.value),
              }))
            }
          >
            {Array.from({ length: 12 }, (_, pitchClass) => (
              <option key={pitchClass} value={pitchClass}>
                {getDisplayKeyRoot(
                  keyRootName(pitchClass),
                  standardSpelling(pitchClass, standard.scaleType)
                )}{" "}
                {standard.scaleType}
                {pitchClass === usualKey ? " (usual key)" : ""}
              </option>
            ))}
          </select>
        </label>

        {standard.sections.map((section, index) => (
          <div className="song-section" key={section.name}>
            <span className="search-source">
              {section.name} · {section.bars.length} bars
            </span>

            <ol
              className="standard-chart"
              aria-label={`${standard.title}, ${section.name}`}
            >
              {section.bars.map((bar, barIndex) => (
                <li className="standard-bar" key={barIndex}>
                  {romansToChords(
                    bar,
                    standard.scaleType,
                    keyPitchClass
                  ).map((chord, chordIndex) => (
                    <span
                      className="standard-chord"
                      key={chordIndex}
                    >
                      <span className="standard-chord-name">
                        {
                          resolveChordSnapshot(
                            chord.rootNote!,
                            chord.chordTypeIndex!,
                            chartPreference
                          ).chordLabel
                        }
                      </span>
                      <span className="standard-chord-roman">
                        {bar[chordIndex]}
                      </span>
                    </span>
                  ))}
                </li>
              ))}
            </ol>

            <div className="saved-card-actions">
              <button
                type="button"
                className="play-chord template-play"
                onClick={() =>
                  onPlay(
                    standardSectionChords(standard, [index])
                  )
                }
              >
                ▶ Play
              </button>
              <button
                type="button"
                className="template-use"
                onClick={() => handleLoadStandard(standard, [index])}
              >
                Load into builder
              </button>
            </div>
          </div>
        ))}

        {form.length > 1 && (
          <button
            type="button"
            className="template-use song-load-all"
            onClick={() => handleLoadStandard(standard, form)}
          >
            Load the whole tune
            {standard.form
              ? `, ${form
                  .map((i) => standard.sections[i].name.charAt(0))
                  .join("")}`
              : ""}{" "}
            · {standardBarCount(standard)} bars
          </button>
        )}

        {standard.simplified && (
          <p className="jazz-heard-in">
            Simplified: {standard.simplified}
          </p>
        )}

        {builtOn.length > 0 && (
          <p className="standard-built-on">
            Built on{" "}
            {builtOn.map((progression, i) => (
              <span key={progression.id}>
                {i > 0 && (i === builtOn.length - 1 ? " and " : ", ")}
                <button
                  type="button"
                  className="link-button"
                  onClick={() => {
                    setSearchMode("jazz");
                    setJazzView("progressions");
                  }}
                >
                  {progression.name}
                </button>
              </span>
            ))}
          </p>
        )}
      </div>
    );
  };

  // Jazz standards that match the song search, listed above
  // the songs when one of them is the better match.
  const standardsFirst =
    standardMatches.length > 0 &&
    standardMatches[0].score > (songMatches[0]?.score ?? 0);
  const standardResults = standardMatches.length > 0 && (
    <div className="saved-list search-results jazz-results standard-results">
      {standardMatches.map(({ standard }) => renderStandardCard(standard))}
    </div>
  );


  return (
    <section className="panel search-panel">
      <p className="eyebrow">Need a starting point?</p>
      <h2>Find a progression</h2>

      <div
        className="segmented search-mode"
        role="group"
        aria-label="Search by"
      >
        <button
          type="button"
          className={searchMode === "song" ? "seg active" : "seg"}
          aria-pressed={searchMode === "song"}
          onClick={() => setSearchMode("song")}
        >
          A song
        </button>
        <button
          type="button"
          className={searchMode === "mood" ? "seg active" : "seg"}
          aria-pressed={searchMode === "mood"}
          onClick={() => setSearchMode("mood")}
        >
          Mood or chords
        </button>
        <button
          type="button"
          className={searchMode === "jazz" ? "seg active" : "seg"}
          aria-pressed={searchMode === "jazz"}
          onClick={() => setSearchMode("jazz")}
        >
          Jazz standards
        </button>
      </div>

      {searchMode === "jazz" && (
        <>
          <div
            className="segmented jazz-view"
            role="group"
            aria-label="Show"
          >
            <button
              type="button"
              className={jazzView === "tunes" ? "seg active" : "seg"}
              aria-pressed={jazzView === "tunes"}
              onClick={() => setJazzView("tunes")}
            >
              Tunes to learn
            </button>
            <button
              type="button"
              className={
                jazzView === "progressions" ? "seg active" : "seg"
              }
              aria-pressed={jazzView === "progressions"}
              onClick={() => setJazzView("progressions")}
            >
              Common progressions
            </button>
          </div>
        </>
      )}

      {searchMode === "jazz" && jazzView === "tunes" && (
        <>
          <p className="builder-section-hint">
            Beginner-friendly standards as simplified chord
            charts, one box per bar. Play a section, then
            load it or the whole tune into the builder, in
            the usual key or any key you like.
          </p>

          {standardLevels.map((level) => (
            <div className="standard-level" key={level}>
              <h3 className="standard-level-title">{level}</h3>
              <div className="saved-list search-results jazz-results standard-results">
                {jazzStandards
                  .filter((standard) => standard.level === level)
                  .map(renderStandardCard)}
              </div>
            </div>
          ))}
        </>
      )}

      {searchMode === "jazz" && jazzView === "progressions" && (
        <>
          <p className="builder-section-hint">
            The progressions jazz players reach for most.
            Pick a key and load any of them into the
            builder, or play them here first.
          </p>

          <label className="song-key jazz-key">
            <span>Key</span>
            <select
              value={jazzKey}
              onChange={(event) =>
                setJazzKeyChoice(Number(event.target.value))
              }
            >
              {Array.from({ length: 12 }, (_, pitchClass) => (
                <option key={pitchClass} value={pitchClass}>
                  {getDisplayKeyRoot(
                    keyRootName(pitchClass),
                    accidentalPreference
                  )}
                </option>
              ))}
            </select>
          </label>

          <div className="saved-list search-results jazz-results">
            {jazzProgressions.map((progression) => {
              const form = jazzForm(progression);
              const hasForm = form.length > 1;
              return (
                <div
                  className="saved-card search-card song-card jazz-card"
                  key={progression.id}
                >
                  <div className="saved-card-head">
                    <strong className="song-title">
                      {progression.name}
                    </strong>
                    <span className="saved-card-key">
                      {getDisplayKeyRoot(
                        keyRootName(jazzKey),
                        accidentalPreference
                      )}{" "}
                      {progression.scaleType}
                    </span>
                  </div>

                  <p className="search-description">
                    {progression.description}
                  </p>

                  {progression.sections.map((section, index) => {
                    const chords = jazzSectionChords(progression, [
                      index,
                    ]);
                    return (
                      <div
                        className="song-section"
                        key={section.name}
                      >
                        <span className="search-source">
                          {section.name} · {section.bars.length}{" "}
                          bars
                        </span>

                        <div className="template-chip-row">
                          {chords.map((chord, chordIndex) => (
                            <span
                              className="template-chip"
                              key={`${chord.rootNote}-${chord.chordTypeIndex}-${chordIndex}`}
                            >
                              {resolveSnapshot(chord).chordLabel}
                            </span>
                          ))}
                        </div>

                        <p className="search-romans">
                          {jazzBarsLabel(section)}
                        </p>

                        <div className="saved-card-actions">
                          <button
                            type="button"
                            className="play-chord template-play"
                            onClick={() =>
                              onPlay(chords)
                            }
                          >
                            ▶ Play
                          </button>
                          <button
                            type="button"
                            className="template-use"
                            onClick={() =>
                              handleLoadJazz(progression, [index])
                            }
                          >
                            Load into builder
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {hasForm && (
                    <button
                      type="button"
                      className="template-use song-load-all"
                      onClick={() =>
                        handleLoadJazz(progression, form)
                      }
                    >
                      Load the whole form,{" "}
                      {form
                        .map((i) =>
                          progression.sections[i].name.charAt(0)
                        )
                        .join("")}
                    </button>
                  )}

                  <p className="jazz-heard-in">
                    Heard in {progression.heardIn}
                  </p>
                </div>
              );
            })}
          </div>
        </>
      )}

      {searchMode === "song" && (
        <>
          <p className="builder-section-hint">
            Type a song title or artist and load its chord
            progression into the builder, in the original
            key or any key you like. {songCount} well-known
            songs and {jazzStandards.length} jazz standards
            so far, simplified to their main chords.
          </p>

          <form
            className="search-form"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              // Load whichever match is listed first.
              if (standardsFirst) {
                handleLoadStandard(standardMatches[0].standard, [0]);
              } else if (songMatches[0]) {
                handleLoadSong(
                  songMatches[0].song,
                  [0]
                );
              } else if (standardMatches[0]) {
                handleLoadStandard(standardMatches[0].standard, [0]);
              }
            }}
          >
            <input
              type="search"
              className="search-input"
              aria-label="Search for a song"
              placeholder='Try "Let It Be" or "Hello by Adele"'
              value={songQuery}
              onChange={(event) =>
                setSongQuery(event.target.value)
              }
            />
            <button
              type="submit"
              className="search-submit"
              disabled={
                songMatches.length === 0 &&
                standardMatches.length === 0
              }
              title="Load the top match's first section"
            >
              Load
            </button>
          </form>

          <div className="search-examples">
            {songExamples.map((example) => (
              <button
                type="button"
                key={example}
                className="search-example"
                onClick={() => setSongQuery(example)}
              >
                {example}
              </button>
            ))}
          </div>

          {songQuery.trim() &&
            songMatches.length === 0 &&
            standardMatches.length === 0 && (
            <div className="song-missing">
              <p>
                <strong>"{songQuery.trim()}"</strong> isn't in
                the song list yet.
              </p>
              <p>
                <a
                  href={webChordSearchUrl(songQuery)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Look up its chords on the web ↗
                </a>
                , then type them under{" "}
                <button
                  type="button"
                  className="link-button"
                  onClick={() => setSearchMode("mood")}
                >
                  Mood or chords
                </button>{" "}
                (e.g. "Am F C G") to load them here.
              </p>
            </div>
          )}

          {standardsFirst && standardResults}

          {songMatches.length > 0 && (
            <div className="saved-list search-results">
              {songMatches.map(({ song }) => {
                const keyPitchClass = songKey(song);
                return (
                  <div
                    className="saved-card search-card song-card"
                    key={song.id}
                  >
                    <strong className="song-title">
                      {song.title}
                    </strong>

                    <p className="song-artist">
                      {song.artist} · {song.year}
                    </p>

                    <label className="song-key">
                      <span>Key</span>
                      <select
                        value={keyPitchClass}
                        onChange={(event) =>
                          setSongKeys((current) => ({
                            ...current,
                            [song.id]: Number(
                              event.target.value
                            ),
                          }))
                        }
                      >
                        {Array.from(
                          { length: 12 },
                          (_, pitchClass) => (
                            <option
                              key={pitchClass}
                              value={pitchClass}
                            >
                              {getDisplayKeyRoot(
                                keyRootName(pitchClass),
                                accidentalPreference
                              )}{" "}
                              {song.scaleType}
                              {pitchClass ===
                              songKeyPitchClass(song)
                                ? " (original)"
                                : ""}
                            </option>
                          )
                        )}
                      </select>
                    </label>

                    {song.sections.map((section, index) => {
                      const chords = songBars(song, [
                        index,
                      ]);
                      return (
                        <div
                          className="song-section"
                          key={section.name}
                        >
                          <span className="search-source">
                            {section.name}
                          </span>

                          <div className="template-chip-row">
                            {chords.map((chord, chordIndex) => (
                              <span
                                className="template-chip"
                                key={`${chord.rootNote}-${chord.chordTypeIndex}-${chordIndex}`}
                              >
                                {resolveSnapshot(chord).chordLabel}
                              </span>
                            ))}
                          </div>

                          <p className="search-romans">
                            {section.romans.join(" – ")}
                          </p>

                          <div className="saved-card-actions">
                            <button
                              type="button"
                              className="play-chord template-play"
                              onClick={() =>
                                onPlay(chords)
                              }
                            >
                              ▶ Play
                            </button>
                            <button
                              type="button"
                              className="template-use"
                              onClick={() =>
                                handleLoadSong(song, [index])
                              }
                            >
                              Load into builder
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {song.sections.length > 1 && (
                      <button
                        type="button"
                        className="template-use song-load-all"
                        onClick={() =>
                          handleLoadSong(
                            song,
                            song.sections.map((_, i) => i)
                          )
                        }
                      >
                        Load all sections in order
                      </button>
                    )}

                    {song.note && (
                      <p className="search-description">
                        {song.note}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!standardsFirst && standardResults}
        </>
      )}

      {searchMode === "mood" && (
        <>
        <p className="builder-section-hint">
          Describe a mood, genre or key, or type chords
          or numerals. We'll find classic progressions
          and generate new ones you can load into the
          builder.
        </p>

        <form
          className="search-form"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            runSearch(searchQuery);
          }}
        >
          <input
            type="search"
            className="search-input"
            aria-label="Search for a chord progression"
            placeholder='Try "sad C minor" or "Am to F"'
            value={searchQuery}
            onChange={(event) =>
              setSearchQuery(event.target.value)
            }
          />
          <button
            type="submit"
            className="search-submit"
            disabled={!searchQuery.trim()}
          >
            Search
          </button>
        </form>

        <div className="search-examples">
          {searchExamples.map((example) => (
            <button
              type="button"
              key={example}
              className="search-example"
              onClick={() => runSearch(example)}
            >
              {example}
            </button>
          ))}
        </div>

        {submittedQuery.trim() && (
          <>
            <div className="search-results-head">
              <p className="hint">
                {searchResults.length} result
                {searchResults.length === 1 ? "" : "s"} for{" "}
                <strong>"{submittedQuery}"</strong>
              </p>
              <button
                type="button"
                className="surprise-me-btn"
                title="Generate different ideas for this search"
                onClick={() =>
                  setSearchSeed((current) => current + 1)
                }
              >
                More ideas
              </button>
            </div>

            <div className="saved-list search-results">
              {searchResults.map((result) => (
                <div
                  className={`saved-card search-card search-${result.source}`}
                  key={result.id}
                >
                  <div className="saved-card-head">
                    <strong>{result.title}</strong>
                    <span className="saved-card-key">
                      {getDisplayKeyRoot(
                        keyRootName(result.keyPitchClass),
                        accidentalPreference
                      )}{" "}
                      {result.scaleType}
                    </span>
                  </div>

                  <span className="search-source">
                    {searchSourceLabel[result.source]}
                  </span>

                  <div className="template-chip-row">
                    {result.chords.map((chord, index) => (
                      <span
                        className="template-chip"
                        key={`${chord.rootNote}-${chord.chordTypeIndex}-${index}`}
                      >
                        {resolveSnapshot(chord).chordLabel}
                      </span>
                    ))}
                  </div>

                  <p className="search-romans">
                    {result.romans.join(" – ")}
                  </p>

                  <p className="search-description">
                    {result.description}
                  </p>

                  <div className="saved-card-actions">
                    <button
                      type="button"
                      className="play-chord template-play"
                      onClick={() =>
                        onPlay(result.chords)
                      }
                    >
                      ▶ Play
                    </button>

                    <button
                      type="button"
                      className="template-use"
                      onClick={() =>
                        handleLoadSearchResult(result)
                      }
                    >
                      Load into builder
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        </>
      )}
    </section>
  );
}

export default FindProgression;
