import { FilmbaratokCategory } from './enums/filmbaratok-category.enum';

/**
 * An array of rules that map regular expression patterns to specific categories
 * within the Filmbarátok content. Each rule consists of a pattern to match against
 * and a corresponding category to classify the matched string.
 *
 * The `CATEGORY_RULES` can be used to categorize various Filmbarátok content such as
 * podcasts, express episodes, audiokommentárok, on-site events, or gaming shows.
 *
 * Structure:
 * - `pattern`: A regular expression to match against content titles or descriptions.
 * - `category`: The specific category associated with the matched pattern.
 */
export const CATEGORY_RULES: {
  pattern: RegExp;
  category: FilmbaratokCategory;
}[] = [
  {
    pattern: /Filmb[aá]r[aá]tok\s+Expressz/i,
    category: FilmbaratokCategory.EXPRESS,
  },
  {
    pattern: /Filmbarátok\s+audiokommentár/i,
    category: FilmbaratokCategory.AUDIO_COMMENTARY,
  },
  {
    pattern: /Filmbarátok\s+z[aá]rt/i,
    category: FilmbaratokCategory.ON_SITE,
  },
  { pattern: /Filmbarátok\s+játszanak/i, category: FilmbaratokCategory.GAME },
  {
    pattern: /Filmbarátok\s+Podcast\s+#\d+/i,
    category: FilmbaratokCategory.PODCAST,
  },
];

/**
 * A collection of regular expressions used to identify and filter out specific noise patterns
 * commonly found in podcast metadata or titles. These patterns include identifiers that
 * denote special types of podcast episodes, such as interviews, series, or celebratory
 * discussions, as well as references to specific creators.
 *
 * Each regular expression in the array is case-insensitive and may optionally capture specific
 * terms or delimiters that appear in parentheses or as standalone words/phrases within the text.
 *
 * Examples of matched patterns:
 * - Mentions of creators like "freddyD", "Zoly", "Gábor", or "Blacksheep"
 * - Words or phrases like "kibeszélő", "interjú", "sorozat", or "jubileumi kibeszélő"
 * - Variants of phrases enclosed with parentheses (e.g., "(interjú)", "(kibeszélő)", etc.)
 */
export const PODCAST_NOISE_PATTERNS: RegExp[] = [
  /\(\s*(?:freddyD?|Zoly|Gábor|Blacksheep)\s*(?:kiadás|filmje)?\s*\)/gi,
  /\(\s*\+?\s*interjú\s*\)/gi,
  /\(\s*kibeszélő\s*\)/gi,
  /\(\s*sorozat\s*\)/gi,
  /\bjubileumi\s+kibeszélő\b/gi,
];

/**
 * A collection of non-media related topics or categories used for content organization or filtering.
 * This array contains a variety of strings representing thematic labels, section identifiers, and
 * specialized content-related terms. These topics indicate areas not explicitly tied to media,
 * offering context for categorization, metadata, or discussions outside of direct media content.
 *
 * Common usages may include categorizing discussions, filtering specific sections, or marking
 * areas of interest during content curation or processing.
 */
export const NON_MEDIA_TOPICS = [
  'Felvezetés',
  'Borítókép',
  'Nép akarata',
  'Villámkérdés',
  'Keresés',
  'Rovat',
  'Előbeszélgetés',
  'Beszélgetés',
  'Vendégünk',
  'Évösszegz',
  'Évösszegző',
  'kérdőív',
  'Cinefest',
  'Franchise',
  'Megosztás',
  'Jubileumi adás',
  'éves a Filmbarátok Podcast',
  '. adást',
  'Hallgatói kérdés',
  'Vélemények bizonyos film',
  'Rendezői tapasztalat',
  'Kérdéseitekre válaszol',
  'filmgyűjtés mint szenvedély',
  'Közönség',
  'zárthelyi',
  'Szavazás',
  'filmosztás',
  'hallgató',
  'Oscar',
  'filmév',
  '1999-es filmeket amiket már kitárgyaltunk',
  'élménybeszámoló',
  'nyertes Márkkal',
  'Vissza a jövőbe trilógia vetítés',
  'Batman kezdődik keletkezéstörténete',
  'Partizán Szomszédok videója',
  'kvíz',
  'pamkutya',
  'helyreigazítás',
  'Madarász Isti',
  '2016 halottjai',
  'körbeajándékozás',
  'Filmek amikről nem lesz szó',
  'Vége Freddy embargójának',
  'Levezető',
  'Nyereményjáték',
  'Felvezető',
  'Felveztő',
  'Sztárszignál',
  'Emberkísérlet az "Öt éjjel Freddy Pizzázójában 2" után',
];

/**
 * A constant array that holds specific topic title that is media-related but is treated as an exception in the context of non-media topics.
 *
 * Like we filter out the topics where the participants talk about Oscar gala, but also talk about the Oscar movie.
 */
export const NON_MEDIA_TOPICS_EXCEPTION = ['Oscar (1991)'];

/**
 * Persons have similar name but separated by some sign.
 * Like: Gábor, Gábor (videodrom), Szöllőskei Gábor
 */
export const KNOWN_PERSON_NAMES = [
  'Gábor (Videodrome)',
  'Madarász Isti',
  'Szöllőskei Gábor',
  'Gigor Attila',
  'Hajdu Szabolcs',
  'Schwechtje Mihály',
  'Stöckert Gábor',
  'Ódor Kristóf',
];

/**
 * A record that maps specific media titles or categories to their respective expansions or alternative names.
 * This can be used to associate a primary media title with its related titles or sequels.
 *
 * @typedef {Record<string, string[]>} MEDIA_TITLE_EXPANSION_ALIASES
 * @property {string[]} [key] - An array of expanded titles or sequels associated with the key title or category.
 */
export const MEDIA_TITLE_EXPANSION_ALIASES: Record<string, string[]> = {
  'mátrix trilógia': ['Mátrix', 'Mátrix - Újratöltve', 'Mátrix - Forradalmak'],
};

/**
 * A mapping of media titles to their respective aliases.
 * This is used to standardize and account for different name variations of media titles.
 *
 * Each key in the record represents the standard title of a media work, and its corresponding value is an array of alternative aliases by which the media work may be known.
 * These aliases can include different translations, misspellings, regional variations, or stylistic differences.
 *
 * Example entries:
 * - "Vaják" maps to an array containing 'the witcher' and 'The Witcher / Vaják'.
 * - "12:01" maps to ['12: 01'], accounting for spacing differences.
 */
const MEDIA_TITLE_ALIASES: Record<string, string[]> = {
  ['Vaják']: ['the witcher', 'The Witcher / Vaják'],
  '12:01': ['12: 01'],
  'A Lego-kaland': ['Lego kaland', 'Lego-kaland'],
  'Shin Gojira': ['Shin Godzilla'],
  '300': ['300 - Egy jubileumi kibeszélő'],
  '365 nap: Ma': ['365 nap : Ma'],
};

/**
 * A mapping of media title aliases to their corresponding primary media titles.
 * This variable is implemented as a Map where the keys represent alternative
 * names, abbreviations, or aliases for media titles, and the values represent
 * the corresponding canonical or primary media titles.
 *
 * Intended for use in scenarios where media titles may be referenced
 * inconsistently or with alternative names, ensuring a standardized
 * representation of the titles.
 *
 * Example usage scenarios include:
 * - Resolving user input to a canonical media title.
 * - Providing consistent references to media titles in applications or systems
 *   that aggregate information from multiple sources.
 *
 *   TODO: FIND A BETTER WAY TO FILL IT UP OR IDK
 */
export const MEDIA_TITLE_ALIASES_LOOKUP = new Map<string, string>();
for (const [canonicalTitle, aliases] of Object.entries(MEDIA_TITLE_ALIASES)) {
  for (const alias of aliases) {
    // Normalizálunk (kisbetű, ékezetek nélkül, trim), hogy pl. "LEGO Kaland" is match-eljen a "Lego kaland"-ra
    const normalizedAlias = alias
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    MEDIA_TITLE_ALIASES_LOOKUP.set(normalizedAlias, canonicalTitle);
  }
}
