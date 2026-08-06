import { FilmbaratokPerson } from '../entities/filmbaratok-person.entity';

/**
 * Represents the structure to map content data for Filmbaratok.
 *
 * This interface defines a mapping for associating string keys with
 * instances.
 *
 * @interface FilmbaratokContentParserMaps
 * @property {Map<string, FilmbaratokPerson>} persons A map where the keys represent
 * string identifiers (such as names or IDs) and the values are instances of
 * FilmbaratokPerson representing individuals associated with Filmbaratok content.
 */
export interface FilmbaratokContentParserMaps {
  persons: Map<string, FilmbaratokPerson>;
}
