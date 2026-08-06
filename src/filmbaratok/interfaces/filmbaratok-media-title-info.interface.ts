/**
 * Represents the title information for a media item.
 *
 * Properties:
 * - title: The primary title of the media item (e.g., movie, show).
 * - subtitle: An optional subtitle providing additional information about the title.
 * - isSpoiler: A boolean flag that determines if the media involves spoiler content.
 */
export interface FilmbaratokMediaTitleInfo {
  title: string;
  subtitle?: string;
  isSpoiler: boolean;
}
