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
];

/**
 * A constant array that holds specific topic title that is media-related but is treated as an exception in the context of non-media topics.
 *
 * Like we filter out the topics where the participants talk about Oscar gala, but also talk about the Oscar movie.
 */
export const NON_MEDIA_TOPICS_EXCEPTION = ['Oscar (1991)'];
