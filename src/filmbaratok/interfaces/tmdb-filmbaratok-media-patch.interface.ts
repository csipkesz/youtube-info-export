export interface TmdbFilmbaratokMediaPatch {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  originalTitle: string | null;
  overview: string | null;
  backdropPath: string | null;
  posterPath: string | null;
  releaseDate: Date | null;
}
