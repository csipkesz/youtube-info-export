import { TmdbService } from '../sub/tmdb/tmdb.service';

export interface TmdbMediaNotFoundEntry {
  id: string;
  title: string;
}

export interface TmdbMediaAmbiguousEntry {
  id: string;
  title: string;
  lastScore: number;
  results: Awaited<ReturnType<TmdbService['searchMulti']>>;
}

export interface TmdbSyncReport {
  mediaWithoutResult: TmdbMediaNotFoundEntry[];
  mediaWithMoreResultWithoutFind: TmdbMediaAmbiguousEntry[];
}
