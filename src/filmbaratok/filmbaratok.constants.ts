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
