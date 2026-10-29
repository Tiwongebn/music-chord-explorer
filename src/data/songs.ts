// ============================================================
// Song lookup data: the chord progressions of well-known
// songs, so "Let It Be" or "Wonderwall by Oasis" can be
// loaded straight into the Progressions builder.
//
// What's stored is only the harmony — the key the recording
// is in plus each section's chords as roman numerals. Chord
// progressions aren't copyrightable, but lyrics and full
// chord sheets are, so neither is bundled here.
//
// Each section is simplified to its main loop: slash chords
// and inversions are written as their plain chord (D/F# is
// just D), passing chords and one-off turnarounds are left
// out, and capo songs are written in the key you hear, not
// the shapes the guitarist plays.
//
// Numerals follow parseRoman() in utils/progressionSearch.ts:
// they count up the song's own scale, so in a minor key "VI"
// is the minor scale's 6th (A minor -> F) and "V" is the
// major dominant (A minor -> E).
// ============================================================

import type { ScaleType } from "./scales";

export interface SongSection {
  name: string;
  romans: string[];
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  year: number;
  // Key of the original recording, e.g. "A", "Db", "F#".
  key: string;
  scaleType: ScaleType;
  sections: SongSection[];
  // Other names people search for ("Time of Your Life").
  aliases?: string[];
  // Shown on the card when something needs explaining.
  note?: string;
}

// Compact form for the table below: "Verse: I V vi IV".
type SectionSpec = [name: string, romans: string];

function song(
  title: string,
  artist: string,
  year: number,
  key: string,
  scaleType: ScaleType,
  sections: SectionSpec[],
  extra: Pick<Song, "aliases" | "note"> = {}
): Song {
  const id = `${artist}-${title}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return {
    id,
    title,
    artist,
    year,
    key,
    scaleType,
    sections: sections.map(([name, romans]) => ({
      name,
      romans: romans.trim().split(/\s+/),
    })),
    ...extra,
  };
}

const TWELVE_BAR = "I I I I IV IV I I V IV I I";

export const songs: Song[] = [
  // ---- Pop ----
  song("Let It Be", "The Beatles", 1970, "C", "major", [
    ["Verse", "I V vi IV I V IV I"],
    ["Chorus", "vi V IV I I V IV I"],
  ]),
  song("Hey Jude", "The Beatles", 1968, "F", "major", [
    ["Verse", "I V V7 I IV I V7 I"],
    ["Outro", "I bVII IV I"],
  ]),
  song("Here Comes the Sun", "The Beatles", 1969, "A", "major", [
    ["Chorus", "I IV II7 I"],
  ]),
  song("Imagine", "John Lennon", 1971, "C", "major", [
    ["Verse", "I Imaj7 IV I Imaj7 IV"],
    ["Chorus", "IV V I III7"],
  ]),
  song("Someone Like You", "Adele", 2011, "A", "major", [
    ["Verse & chorus", "I V vi IV"],
  ]),
  song("Hello", "Adele", 2015, "F", "minor", [
    ["Verse & chorus", "i III VII VI"],
  ]),
  song("Rolling in the Deep", "Adele", 2010, "C", "minor", [
    ["Verse", "i v VII VII"],
  ]),
  song("Perfect", "Ed Sheeran", 2017, "Ab", "major", [
    ["Verse", "I vi IV V"],
  ]),
  song("Shape of You", "Ed Sheeran", 2017, "C#", "minor", [
    ["Whole song", "i iv VI VII"],
  ]),
  song("Thinking Out Loud", "Ed Sheeran", 2014, "D", "major", [
    ["Verse", "I IV V IV"],
  ]),
  song("All of Me", "John Legend", 2013, "Ab", "major", [
    ["Verse", "vi IV I V"],
    ["Chorus", "I vi IV V"],
  ]),
  song("Someone You Loved", "Lewis Capaldi", 2018, "Db", "major", [
    ["Verse & chorus", "I V vi IV"],
  ]),
  song("Stay With Me", "Sam Smith", 2014, "C", "major", [
    ["Chorus", "vi IV I I"],
  ]),
  song("Let It Go", "Idina Menzel", 2013, "Ab", "major", [
    ["Chorus", "I V vi IV"],
  ], { note: "From Disney's Frozen." }),
  song("Love Story", "Taylor Swift", 2008, "D", "major", [
    ["Verse & chorus", "I V vi IV"],
  ]),
  song("Shake It Off", "Taylor Swift", 2014, "G", "major", [
    ["Whole song", "ii IV I I"],
  ]),
  song("Roar", "Katy Perry", 2013, "Bb", "major", [
    ["Chorus", "I ii vi IV"],
  ]),
  song("Just the Way You Are", "Bruno Mars", 2010, "F", "major", [
    ["Whole song", "I vi IV I"],
  ]),
  song("Uptown Funk", "Mark Ronson ft. Bruno Mars", 2014, "D", "minor", [
    ["Groove", "i7 IV7"],
  ], { note: "The vamp is Dorian, so the IV chord is major." }),
  song("Despacito", "Luis Fonsi ft. Daddy Yankee", 2017, "D", "major", [
    ["Whole song", "vi IV I V"],
  ]),
  song("I Gotta Feeling", "The Black Eyed Peas", 2009, "G", "major", [
    ["Whole song", "I IV vi IV"],
  ]),
  song("Hey Soul Sister", "Train", 2009, "E", "major", [
    ["Verse & chorus", "I V vi IV"],
  ]),
  song("I'm Yours", "Jason Mraz", 2008, "B", "major", [
    ["Verse & chorus", "I V vi IV"],
  ]),
  song("Hey There Delilah", "Plain White T's", 2006, "D", "major", [
    ["Verse", "I iii I iii IV V vi V"],
  ]),
  song("Blinding Lights", "The Weeknd", 2019, "F", "minor", [
    ["Whole song", "i v VII IV"],
  ]),
  song("Get Lucky", "Daft Punk ft. Pharrell Williams", 2013, "B", "minor", [
    ["Whole song", "i III v IV"],
  ], { note: "B Dorian, so the IV chord (E) is major." }),
  song("Wake Me Up", "Avicii", 2013, "B", "minor", [
    ["Whole song", "i VI III VII"],
  ]),
  song("Faded", "Alan Walker", 2015, "Eb", "minor", [
    ["Whole song", "i VI III VII"],
  ]),
  song("Counting Stars", "OneRepublic", 2013, "C#", "minor", [
    ["Whole song", "i III VII VI"],
  ]),
  song("Royals", "Lorde", 2013, "D", "major", [
    ["Chorus", "I bVII IV IV"],
  ]),
  song("Take On Me", "a-ha", 1985, "A", "major", [
    ["Verse", "ii V I IV"],
  ]),
  song("Every Breath You Take", "The Police", 1983, "A", "major", [
    ["Verse", "I vi IV V"],
    ["Bridge", "bVI bVII I I"],
  ]),
  song("Somewhere Over the Rainbow", "Israel Kamakawiwo'ole", 1993, "C", "major", [
    ["Verse", "I iii vi IV I V vi IV"],
  ], { aliases: ["Over the Rainbow", "Somewhere Over the Rainbow / What a Wonderful World"] }),
  song("Can't Help Falling in Love", "Elvis Presley", 1961, "D", "major", [
    ["Verse", "I iii vi IV I V"],
  ]),
  song("Stand by Me", "Ben E. King", 1961, "A", "major", [
    ["Whole song", "I I vi vi IV V I I"],
  ]),
  song("Heart and Soul", "Hoagy Carmichael", 1938, "C", "major", [
    ["Whole song", "I vi IV V"],
  ], { note: "The piano duet everyone learns. Played in many keys; C is the usual one." }),
  song("Piano Man", "Billy Joel", 1973, "C", "major", [
    ["Verse", "I V vi I IV I II7 V"],
  ]),
  song("Don't Worry, Be Happy", "Bobby McFerrin", 1988, "B", "major", [
    ["Whole song", "I ii IV I"],
  ]),
  song("Hey Ya!", "OutKast", 2003, "G", "major", [
    ["Whole song", "I IV V VI"],
  ]),
  song("Sweet Dreams (Are Made of This)", "Eurythmics", 1983, "C", "minor", [
    ["Whole song", "i VI V V"],
  ]),
  song("Viva la Vida", "Coldplay", 2008, "Ab", "major", [
    ["Whole song", "IV V I vi"],
  ]),
  song("Clocks", "Coldplay", 2002, "Eb", "major", [
    ["Whole song", "I v v ii"],
  ]),
  song("Yellow", "Coldplay", 2000, "B", "major", [
    ["Verse", "I V IV IV"],
  ]),
  song("The Scientist", "Coldplay", 2002, "F", "major", [
    ["Verse", "vi IV I I"],
  ]),
  song("Fix You", "Coldplay", 2005, "Eb", "major", [
    ["Verse", "I iii vi V"],
  ]),
  song("Chasing Cars", "Snow Patrol", 2006, "A", "major", [
    ["Whole song", "I V IV IV"],
  ]),
  song("Demons", "Imagine Dragons", 2012, "Eb", "major", [
    ["Whole song", "I V vi IV"],
  ]),
  song("Radioactive", "Imagine Dragons", 2012, "B", "minor", [
    ["Whole song", "i III VII IV"],
  ]),
  song("Mad World", "Gary Jules", 2001, "F", "minor", [
    ["Verse", "i III VII IV"],
  ], { aliases: ["Mad World Tears for Fears"] }),
  song("I Will Survive", "Gloria Gaynor", 1978, "A", "minor", [
    ["Whole song", "i iv VII IIImaj7 VImaj7 iiø7 V V"],
  ]),
  song("Hit the Road Jack", "Ray Charles", 1961, "A", "minor", [
    ["Whole song", "i VII VI V"],
  ]),
  song("Ain't No Sunshine", "Bill Withers", 1971, "A", "minor", [
    ["Verse", "i v VII i"],
  ]),
  song("Smooth", "Santana ft. Rob Thomas", 1999, "A", "minor", [
    ["Whole song", "i VI V V"],
  ]),

  // ---- Rock ----
  song("Don't Stop Believin'", "Journey", 1981, "E", "major", [
    ["Verse", "I V vi IV I V iii IV"],
  ]),
  song("With or Without You", "U2", 1987, "D", "major", [
    ["Whole song", "I V vi IV"],
  ]),
  song("Wonderwall", "Oasis", 1995, "F#", "minor", [
    ["Verse", "i7 III VIIsus4 IVsus4"],
    ["Pre-chorus", "VI VII i i"],
  ], { note: "Played with a capo on 2 (Em7 G Dsus4 A7sus4 shapes)." }),
  song("Don't Look Back in Anger", "Oasis", 1995, "C", "major", [
    ["Verse", "I V vi III IV V I vi V"],
  ]),
  song("Creep", "Radiohead", 1992, "G", "major", [
    ["Whole song", "I III IV iv"],
  ]),
  song("Zombie", "The Cranberries", 1994, "E", "minor", [
    ["Whole song", "i VI III VII"],
  ]),
  song("Smells Like Teen Spirit", "Nirvana", 1991, "F", "major", [
    ["Whole song", "I IV bIII bVI"],
  ], { note: "Power chords, written here as major chords." }),
  song("Hotel California", "Eagles", 1976, "B", "minor", [
    ["Verse", "i V VII IV VI III iv V"],
  ]),
  song("Sweet Home Alabama", "Lynyrd Skynyrd", 1974, "D", "major", [
    ["Whole song", "I bVII IV IV"],
  ]),
  song("Sweet Child o' Mine", "Guns N' Roses", 1987, "Db", "major", [
    ["Verse", "I bVII IV I"],
    ["Chorus", "V bVII I I"],
  ], { note: "Tuned down a half step, so the D-shape riff sounds in Db." }),
  song("Back in Black", "AC/DC", 1980, "E", "major", [
    ["Riff", "I bVII IV IV"],
  ]),
  song("Livin' on a Prayer", "Bon Jovi", 1986, "E", "minor", [
    ["Verse", "i VI VII i"],
  ]),
  song("Summer of '69", "Bryan Adams", 1985, "D", "major", [
    ["Verse", "I V I V"],
    ["Chorus", "vi V I IV"],
  ]),
  song("Wish You Were Here", "Pink Floyd", 1975, "G", "major", [
    ["Verse", "IV V ii I V IV ii I"],
  ]),
  song("Knockin' on Heaven's Door", "Bob Dylan", 1973, "G", "major", [
    ["Whole song", "I V ii ii I V IV IV"],
  ]),
  song("Hallelujah", "Leonard Cohen", 1984, "C", "major", [
    ["Verse", "I vi I vi IV V I V"],
    ["Chorus", "IV vi IV I V I"],
  ], { aliases: ["Hallelujah Jeff Buckley"] }),
  song("House of the Rising Sun", "The Animals", 1964, "A", "minor", [
    ["Whole song", "i III IV VI i III V V"],
  ]),
  song("Losing My Religion", "R.E.M.", 1991, "A", "minor", [
    ["Verse", "i v i v i v iv VII"],
  ]),
  song("Californication", "Red Hot Chili Peppers", 1999, "A", "minor", [
    ["Verse", "i VI i VI"],
    ["Chorus", "III VII iv i"],
  ]),
  song("Wicked Game", "Chris Isaak", 1989, "B", "minor", [
    ["Whole song", "i VII IV IV"],
  ]),
  song("Hurt", "Johnny Cash", 2002, "A", "minor", [
    ["Verse", "i III IV i"],
  ], { aliases: ["Hurt Nine Inch Nails"] }),
  song("Numb", "Linkin Park", 2003, "F#", "minor", [
    ["Whole song", "i VI III VII"],
  ]),
  song("In the End", "Linkin Park", 2000, "Eb", "minor", [
    ["Whole song", "i VI III VII"],
  ]),
  song("Boulevard of Broken Dreams", "Green Day", 2004, "F", "minor", [
    ["Verse", "i III VII IV"],
  ]),
  song("Good Riddance (Time of Your Life)", "Green Day", 1997, "G", "major", [
    ["Verse", "I I IV V"],
  ], { aliases: ["Time of Your Life"] }),
  song("Basket Case", "Green Day", 1994, "Eb", "major", [
    ["Verse", "I V vi iii IV I V V"],
  ]),
  song("All the Small Things", "blink-182", 1999, "C", "major", [
    ["Whole song", "I V IV IV"],
  ]),
  song("Mr. Brightside", "The Killers", 2003, "Db", "major", [
    ["Verse", "I Imaj7 IV IV"],
    ["Chorus", "IV I V vi"],
  ]),
  song("Island in the Sun", "Weezer", 2001, "G", "major", [
    ["Whole song", "vi ii V I"],
  ]),
  song("What's Up?", "4 Non Blondes", 1992, "A", "major", [
    ["Whole song", "I ii IV I"],
  ]),
  song("Brown Eyed Girl", "Van Morrison", 1967, "G", "major", [
    ["Verse", "I IV I V"],
    ["Chorus", "IV V I vi IV V I V"],
  ]),
  song("Bad Moon Rising", "Creedence Clearwater Revival", 1969, "D", "major", [
    ["Verse", "I V IV I"],
    ["Chorus", "IV IV I I V IV I I"],
  ]),
  song("Free Fallin'", "Tom Petty", 1989, "F", "major", [
    ["Whole song", "I IV I V"],
  ]),
  song("Wonderful Tonight", "Eric Clapton", 1977, "G", "major", [
    ["Verse", "I V IV V"],
  ]),
  song("Wild Thing", "The Troggs", 1966, "A", "major", [
    ["Whole song", "I IV V IV"],
  ]),
  song("Louie Louie", "The Kingsmen", 1963, "A", "major", [
    ["Whole song", "I IV v IV"],
  ]),
  song("La Bamba", "Ritchie Valens", 1958, "C", "major", [
    ["Whole song", "I IV V V"],
  ]),
  song("Twist and Shout", "The Beatles", 1963, "D", "major", [
    ["Whole song", "I IV V V"],
  ]),
  song("Johnny B. Goode", "Chuck Berry", 1958, "Bb", "major", [
    ["12-bar blues", TWELVE_BAR],
  ]),
  song("Hound Dog", "Elvis Presley", 1956, "C", "major", [
    ["12-bar blues", TWELVE_BAR],
  ]),

  // ---- Folk, country & reggae ----
  song("Take Me Home, Country Roads", "John Denver", 1971, "A", "major", [
    ["Verse", "I vi V IV I"],
    ["Chorus", "I V vi IV I V IV I"],
  ], { aliases: ["Country Roads"] }),
  song("Jolene", "Dolly Parton", 1973, "C#", "minor", [
    ["Whole song", "i III VII i"],
  ]),
  song("Ring of Fire", "Johnny Cash", 1963, "G", "major", [
    ["Verse", "I IV I I V I"],
  ]),
  song("Wagon Wheel", "Old Crow Medicine Show", 2004, "A", "major", [
    ["Whole song", "I V vi IV I V IV IV"],
  ], { aliases: ["Wagon Wheel Darius Rucker"] }),
  song("Blowin' in the Wind", "Bob Dylan", 1963, "D", "major", [
    ["Verse", "I IV V I I IV I I"],
  ]),
  song("Riptide", "Vance Joy", 2013, "C", "major", [
    ["Whole song", "vi V I I"],
  ]),
  song("No Woman, No Cry", "Bob Marley & The Wailers", 1974, "C", "major", [
    ["Whole song", "I V vi IV"],
  ]),
  song("Three Little Birds", "Bob Marley & The Wailers", 1977, "A", "major", [
    ["Whole song", "I IV I V"],
  ], { aliases: ["Every Little Thing Gonna Be Alright"] }),

  // ---- Jazz standards ----
  song("Autumn Leaves", "Joseph Kosma", 1945, "G", "minor", [
    ["A section", "iv7 VII7 IIImaj7 VImaj7 iiø7 V7 i i"],
  ]),
  song("Fly Me to the Moon", "Frank Sinatra", 1964, "C", "major", [
    ["A section", "vi7 ii7 V7 Imaj7 IVmaj7 viiø7 III7 vi7"],
  ]),
  song("Blue Moon", "Rodgers & Hart", 1934, "C", "major", [
    ["Whole song", "I vi ii V"],
  ]),
  song("Oye Como Va", "Santana", 1970, "A", "minor", [
    ["Groove", "i7 IV9"],
  ], { note: "A Dorian vamp, so the IV chord is major." }),

  // ---- Traditional & classical (public domain) ----
  song("Canon in D", "Johann Pachelbel", 1680, "D", "major", [
    ["Whole piece", "I V vi iii IV I IV V"],
  ], { aliases: ["Pachelbel's Canon"] }),
  song("Greensleeves", "Traditional", 1580, "A", "minor", [
    ["Verse", "i VII VI V i VII V V"],
  ]),
  song("Amazing Grace", "Traditional", 1779, "G", "major", [
    ["Verse", "I I7 IV I I vi V V I I7 IV I I V I I"],
  ]),
  song("Happy Birthday", "Traditional", 1893, "C", "major", [
    ["Whole song", "I V V I I IV I V I"],
  ]),
  song("Silent Night", "Franz Gruber", 1818, "C", "major", [
    ["Verse", "I I V I IV I IV I V I"],
  ]),
  song("Twinkle, Twinkle, Little Star", "Traditional", 1806, "C", "major", [
    ["Whole song", "I IV I V I IV I V"],
  ]),
];
