import { Injectable } from '@nestjs/common';
import { FilmbaratokContentPodcastParserService } from './filmbaratok-content-podcast-parser.service';
import { FilmbaratokCategory } from '../../enums/filmbaratok-category.enum';
import { FilmbaratokContentOtherParserService } from './filmbaratok-content-other-parser.service';
import { FilmbaratokContentExpressParserService } from './filmbaratok-content-express-parser.service';
import { FilmbaratokContentAudioCommentaryParserService } from './filmbaratok-content-audio-commentary-parser.service';
import { TmdbService } from '../../sub/tmdb/tmdb.service';
import { FilmbaratokMedia } from '../../entities/filmbaratok-media.entity';
import { diceCoefficient } from 'dice-coefficient';

type TmdbMovieResult = Awaited<ReturnType<TmdbService['getMovie']>>;
type TmdbSerieResult = Awaited<ReturnType<TmdbService['getSerie']>>;
type TmdbSearchItem = Awaited<
  ReturnType<TmdbService['searchMulti']>
>['results'][number];

interface TmdbMediaPatch {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  originalTitle: string | null;
  overview: string | null;
  backdropPath: string | null;
  posterPath: string | null;
  releaseDate: Date | null;
}

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

@Injectable()
export class FilmbaratokParserHelperService {
  constructor(
    protected readonly tmdbService: TmdbService,
    protected readonly podcastParser: FilmbaratokContentPodcastParserService,
    protected readonly expressParser: FilmbaratokContentExpressParserService,
    protected readonly audioCommentaryParser: FilmbaratokContentAudioCommentaryParserService,
    protected readonly otherParser: FilmbaratokContentOtherParserService,
  ) {}

  getParser(category: FilmbaratokCategory) {
    switch (category) {
      case FilmbaratokCategory.PODCAST:
        return this.podcastParser;
      case FilmbaratokCategory.EXPRESS:
        return this.expressParser;
      case FilmbaratokCategory.AUDIO_COMMENTARY:
        return this.audioCommentaryParser;
      default:
        return this.otherParser;
    }
  }

  /**
   * Apply TMDB media patch to FilmbaratokMedia entity.
   *
   * @param media FilmbaratokMedia entity to update
   * @param patch TmdbMediaPatch data to apply
   */
  private applyTmdbMediaPatch(
    media: FilmbaratokMedia,
    patch: TmdbMediaPatch,
  ): void {
    media.tmdbId = patch.tmdbId;
    media.mediaType = patch.mediaType;
    media.originalTitle = patch.originalTitle;
    media.overview = patch.overview;
    media.backdropPath = patch.backdropPath;
    media.posterPath = patch.posterPath;
    media.lastTmdbUpdate = new Date();
    if (patch.releaseDate) {
      media.releaseDate = patch.releaseDate;
    }
  }

  /**
   * Processes unknown media entries by searching their information on TMDb and updating media records accordingly.
   *
   * @param {FilmbaratokMedia} media - The media object containing details such as title and ID that needs to be processed.
   * @param {TmdbSyncReport} report - The report object used to log the results of the TMDb synchronization process.
   * @return {Promise<void>} A promise that resolves when the processing is complete.
   */
  async tmdbProcessUnknownMedia(
    media: FilmbaratokMedia,
    report: TmdbSyncReport,
  ): Promise<void> {
    const { title: mediaTitle, year: mediaYear } = this.extractYearFromTitle(
      media.title,
    );

    const results = await this.tmdbService.searchMulti(mediaTitle);
    console.log(
      `Processing ${media.title} (${mediaYear ?? 'Unknown Year'}) - Found ${results.total_results} results`,
    );

    if (results.total_results === 0) {
      report.mediaWithoutResult.push({ id: media.id, title: media.title });
      return;
    }

    const best =
      results.total_results > 1
        ? this.tmdbMultiFindBestFromItems(
            results.results,
            mediaTitle,
            mediaYear,
          )
        : { result: results.results[0] };

    if (!best) {
      report.mediaWithMoreResultWithoutFind.push({
        id: media.id,
        title: media.title,
        lastScore: 0,
        results,
      });
      return;
    }

    this.applyTmdbMediaPatch(
      media,
      this.tmdbMultiItemToMediaPatch(best.result),
    );
  }

  /**
   * Processes a known media item by fetching its details from TMDB service and applying a patch to update the media.
   *
   * @param {FilmbaratokMedia} media - The media object that needs to be processed. Requires a valid `tmdbId` and `mediaType`.
   * @return {Promise<void>} A promise that resolves once the processing and patching of the media item is complete.
   */
  async tmdbProcessKnownMedia(media: FilmbaratokMedia): Promise<void> {
    if (!media.tmdbId || !media.mediaType) {
      return;
    }

    if (media.mediaType === 'movie') {
      const result = await this.tmdbService.getMovie(media.tmdbId);
      this.applyTmdbMediaPatch(media, this.tmdbMovieToMediaPatch(result));
    } else if (media.mediaType === 'tv') {
      const result = await this.tmdbService.getSerie(media.tmdbId);
      this.applyTmdbMediaPatch(media, this.tmdbSerieToMediaPatch(result));
    }
  }

  /**
   * Converts a TMDB search item into a media patch object.
   *
   * @param {TmdbSearchItem} item - The TMDB search item to be converted.
   * @return {TmdbMediaPatch} The transformed media patch object.
   */
  private tmdbMultiItemToMediaPatch(item: TmdbSearchItem): TmdbMediaPatch {
    return {
      tmdbId: item.id,
      mediaType: item.media_type,
      originalTitle: item.original_title || item.original_name || null,
      overview: item.overview,
      backdropPath: item.backdrop_path,
      posterPath: item.poster_path,
      releaseDate: this.toDate(item.release_date || item.first_air_date),
    };
  }

  /**
   * Converts a TmdbMovieResult object into a TmdbMediaPatch object suitable for further processing.
   *
   * @param {TmdbMovieResult} result - The TMDb movie result object containing movie details.
   * @return {TmdbMediaPatch} A media patch object containing the essential properties extracted from the input.
   */
  private tmdbMovieToMediaPatch(result: TmdbMovieResult): TmdbMediaPatch {
    return {
      tmdbId: result.id,
      mediaType: 'movie',
      originalTitle: result.original_title,
      overview: result.overview,
      backdropPath: result.backdrop_path,
      posterPath: result.poster_path,
      releaseDate: this.toDate(result.release_date),
    };
  }

  /**
   * Converts a TmdbSerieResult object into a TmdbMediaPatch object.
   *
   * @param {TmdbSerieResult} result - The TMDB series data to be transformed.
   * @return {TmdbMediaPatch} A formatted media patch object containing relevant series information.
   */
  private tmdbSerieToMediaPatch(result: TmdbSerieResult): TmdbMediaPatch {
    return {
      tmdbId: result.id,
      mediaType: 'tv',
      originalTitle: result.original_name,
      overview: result.overview,
      backdropPath: result.backdrop_path,
      posterPath: result.poster_path,
      releaseDate: this.toDate(result.first_air_date),
    };
  }

  /**
   * Finds the best matching item from a list of TMDB search results based on title similarity and optional release year.
   *
   * @param {TmdbSearchItem[]} results - The list of TMDB search results to evaluate.
   * @param {string} mediaTitle - The title of the media to match against the search results.
   * @param {string | null} mediaYear - The release year of the media to narrow down the search results, or null if year is not considered.
   * @return {{ result: TmdbSearchItem; score: number } | null} An object containing the best-matching search result and its score, or null if no suitable match is found.
   */
  private tmdbMultiFindBestFromItems(
    results: TmdbSearchItem[],
    mediaTitle: string,
    mediaYear: string | null,
  ): { result: TmdbSearchItem; score: number } | null {
    const candidates = results
      .map((result) => {
        const titles = [
          result.title,
          result.original_title,
          // Not in the type, but TMDB API returns it some times...
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          String((result as any)?.name),
          result.original_name,
        ].filter((t): t is string => Boolean(t));

        const score = Math.max(
          ...titles.map((t) => diceCoefficient(t, mediaTitle)),
        );

        const isYearMatch = mediaYear
          ? (result.release_date || result.first_air_date || '').startsWith(
              mediaYear,
            )
          : true;

        return { result, score, isYearMatch };
      })
      .filter((c) => c.isYearMatch && c.score > 0.5)
      .sort((a, b) => b.score - a.score);

    return candidates[0] ?? null;
  }

  /**
   * Extracts the year from a title string if it matches a specific pattern and separates the title and year.
   *
   * @param {string} rawTitle - The raw title string that may contain a year in parentheses or brackets at the end.
   * @return {Object} An object containing the extracted title and year:
   *                  - `title`: The title string with any trailing year information removed.
   *                  - `year`: The extracted year as a string, or null if no year is found.
   */
  private extractYearFromTitle(rawTitle: string): {
    title: string;
    year: string | null;
  } {
    const yearMatch = rawTitle.match(/(.*?)\s*[([]((?:19|20)\d{2})[)\]]$/);
    if (!yearMatch) {
      return { title: rawTitle, year: null };
    }
    return { title: yearMatch[1].trim(), year: yearMatch[2] };
  }

  private toDate(dateString?: string | null): Date | null {
    return dateString ? new Date(dateString) : null;
  }
}
