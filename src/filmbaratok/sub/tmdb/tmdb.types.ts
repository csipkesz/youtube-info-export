import { TmdbService } from './tmdb.service';

export type TmdbMovieResult = Awaited<ReturnType<TmdbService['getMovie']>>;
export type TmdbSerieResult = Awaited<ReturnType<TmdbService['getSerie']>>;
export type TmdbSearchItem = Awaited<
  ReturnType<TmdbService['searchMulti']>
>['results'][number];
