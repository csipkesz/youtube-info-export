import { Injectable, OnModuleInit } from '@nestjs/common';
import { YoutubeChannelService } from '../../youtube/youtube-channel.service';
import { YoutubeVideo } from '../../youtube/entities/youtube-video.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { FilmbaratokContent } from '../entities/filmbaratok-content.entity';
import { In, Repository } from 'typeorm';
import { FilmbaratokPerson } from '../entities/filmbaratok-person.entity';
import { FilmbaratokCategory } from '../enums/filmbaratok-category.enum';
import { FilmbaratokParserHelperService } from './parser-helper/filmbaratok-parser-helper.service';
import { FilmbaratokMedia } from '../entities/filmbaratok-media.entity';
import { TmdbService } from '../sub/tmdb/tmdb.service';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { diceCoefficient } from 'dice-coefficient';

const CATEGORY_RULES: { pattern: RegExp; category: FilmbaratokCategory }[] = [
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
 * Megoldandó összevont topic-media:
 * - Mátrix trilógia
 * - Így neveld a sárkányod 1-2
 * - Shop Stop 1-2
 *
 * Megoldandó media aliasok:
 * - the witcher és The Witcher / Vaják összevonás
 * - Shin Godzilla to Shin Gojira
 * - Lego kaland és LEGO-kaland
 * - (Zoly)
 * - (freddyD kiadás)
 * - 12: 01 to 12:01
 *
 * Megoldandó problémák:
 * - Egy topic, több media
 * - Tmdb szinkronnál, ha a media össze van már kapcsolva, akkor mediaType alapján kérjük le az infókat.
 * - Tmdb media 6 hónapos kötelező szinkron tmdbUpdate alapján
 */

@Injectable()
export class FilmbaratokParserService implements OnModuleInit {
  private readonly youtubeChannelId = 'UCejqyGXi812VAJK5emU3OqQ';

  constructor(
    private readonly ytChannelService: YoutubeChannelService,
    private readonly parserHelper: FilmbaratokParserHelperService,
    @InjectRepository(FilmbaratokContent)
    private readonly contentRepo: Repository<FilmbaratokContent>,
    @InjectRepository(FilmbaratokPerson)
    private readonly personRepo: Repository<FilmbaratokPerson>,
    @InjectRepository(FilmbaratokMedia)
    private readonly mediaRepo: Repository<FilmbaratokMedia>,
    private readonly tmdbService: TmdbService,
  ) {}

  onModuleInit() {
    // this.syncYoutubeChannelWithVideos();
    this.parseVideosFromDb().then(() => {
      this.parseMediaWithMovieDatabase();
    });
  }

  async syncYoutubeChannelWithVideos(options: { doParse?: boolean } = {}) {
    const result = await this.ytChannelService.syncChannel({
      externalChannelId: this.youtubeChannelId,
    });

    console.log(
      `Synchronized channel: ${result.channel.name} with ${result.videos.length} new videos.`,
    );

    if (options.doParse && result.videos.length) {
      const videos = result.videos;
      await this.parseVideosToDb(videos);
    }
  }

  async parseVideosFromDb() {
    // At this time we have 623 video on channel. Don't need more complex optimization.
    await this.ytChannelService.iterateChannelVideos(
      this.youtubeChannelId,
      async (videos) => {
        await this.parseVideosToDb(videos);
      },
      { numberOfBatches: 5000 },
    );
  }

  async parseMediaWithMovieDatabase() {
    const mediaWithoutResult: { id: string; title: string }[] = [];
    const mediaWithMoreResultWithoutFind: {
      id: string;
      title: string;
      lastScore: number;
      results: any;
    }[] = [];

    const listOfMedia = await this.mediaRepo.find();

    const processMedia = async (media: FilmbaratokMedia) => {
      // Detect when title has (xxxx) or [xxxx] year, extract and remove it
      let mediaTitle = media.title;
      let mediaYear: string | null = null;
      const yearMatch = mediaTitle.match(/(.*?)\s*[([]((?:19|20)\d{2})[)\]]$/);
      if (yearMatch) {
        mediaTitle = yearMatch[1].trim();
        mediaYear = yearMatch[2];
      }

      const results = await this.tmdbService.searchMulti(mediaTitle);
      console.log(
        `Processing ${media.title} (${mediaYear || 'Unknown Year'}) - Found ${results.total_results} results`,
      );
      if (results.total_results === 0) {
        mediaWithoutResult.push({ id: media.id, title: media.title });
        return;
      }

      const totalResults = results.total_results;
      let lastScore = 0;
      const firstResult =
        totalResults > 1
          ? results.results.find((r) => {
              const titles: string[] = [
                r.title || '',
                r.original_title || '',
                r.original_name || '',
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                String((r as any)?.name || ''),
              ].filter(Boolean);
              const scores = titles.map((title) =>
                diceCoefficient(title, mediaTitle),
              );
              const maxScore = Math.max(...scores);
              lastScore = maxScore;

              const isYearMatch = mediaYear
                ? (r.release_date || r.first_air_date || '').startsWith(
                    mediaYear,
                  )
                : true;

              return maxScore > 0.5 && isYearMatch;
            })
          : results.results[0];

      if (!firstResult) {
        mediaWithMoreResultWithoutFind.push({
          id: media.id,
          title: media.title,
          lastScore,
          results,
        });
        return;
      }

      media.tmdbId = firstResult.id;
      media.originalTitle =
        firstResult.original_title || firstResult.original_name || null;
      media.overview = firstResult.overview;
      media.backdropPath = firstResult.backdrop_path;
      media.posterPath = firstResult.poster_path;
      media.lastTmdbUpdate = new Date();
      media.mediaType = firstResult.media_type;

      if (firstResult.release_date) {
        media.releaseDate = new Date(firstResult.release_date);
      } else if (firstResult.first_air_date) {
        media.releaseDate = new Date(firstResult.first_air_date);
      }
    };

    const batchSize = 70;
    for (let i = 0; i < listOfMedia.length; i += batchSize) {
      const batch = listOfMedia.slice(i, i + batchSize);
      await Promise.all(batch.map(processMedia));
    }

    await this.mediaRepo.save(listOfMedia, { chunk: 100 });

    console.log(`Overall processing of ${listOfMedia.length} media finished.`);
    console.log(`Media without result: ${mediaWithoutResult.length}`);
    console.log(
      `Media with more result and not found: ${mediaWithMoreResultWithoutFind.length}`,
    );

    await this.createMovieDBReportData({
      generatedAt: new Date().toISOString(),
      summary: {
        totalProcessed: listOfMedia.length,
        withoutResultCount: mediaWithoutResult.length,
        withMoreResultWithoutFindCount: mediaWithMoreResultWithoutFind.length,
      },
      mediaWithoutResult,
      mediaWithMoreResultWithoutFind,
    });
  }

  private async createMovieDBReportData(data: any) {
    const outputDir = path.join(process.cwd(), 'reports');
    const filePath = path.join(
      outputDir,
      `tmdb-parse-report-${Date.now()}.json`,
    );

    try {
      await fs.mkdir(outputDir, { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');

      console.log(`Report successfully saved to: ${filePath}`);
    } catch (err) {
      console.error('Failed to write JSON report file:', err);
    }
  }

  private async parseVideosToDb(youtubeVideos: YoutubeVideo[]) {
    if (!youtubeVideos.length) {
      return;
    }

    // We need to process podcasts first, because it contains the person list.
    const podcasts: YoutubeVideo[] = [];
    const nonPodcasts: YoutubeVideo[] = [];
    const ytVideoFilmbaratokCategories: Map<string, FilmbaratokCategory> =
      new Map();
    for (const video of youtubeVideos) {
      const category = this.getCategory(video.title);
      ytVideoFilmbaratokCategories.set(video.resourceVideoId, category);

      if (category === FilmbaratokCategory.PODCAST) {
        podcasts.push(video);
      } else {
        nonPodcasts.push(video);
      }
    }

    const batchNumber = 50;
    const existingPersons = await this.personRepo.find();
    const personMap = new Map(
      existingPersons.map((person) => [person.name, person]),
    );

    const allVideos = [...podcasts, ...nonPodcasts];
    for (let i = 0; i < allVideos.length; i += batchNumber) {
      const batch = allVideos.slice(i, i + batchNumber);
      const entities: FilmbaratokContent[] = [];

      // Load existing content entities by youtubeId to avoid duplicates
      const youtubeIds = batch.map((video) => video.resourceVideoId);
      const existingContentIds = await this.contentRepo.find({
        select: { id: true, youtubeId: true },
        where: { youtubeId: In(youtubeIds) },
      });
      const existingContentIdMap: Map<string, string> = new Map(
        existingContentIds.map((e) => [e.youtubeId, e.id]),
      );

      for (const video of batch) {
        const category =
          ytVideoFilmbaratokCategories.get(video.resourceVideoId) ||
          FilmbaratokCategory.OTHER;

        const parser = this.parserHelper.getParser(category);
        const parsedContentEntity = await parser.parse(video, {
          persons: personMap,
        });

        const existingId = existingContentIdMap.get(video.resourceVideoId);
        if (existingId) {
          parsedContentEntity.id = existingId;
        }

        parsedContentEntity.category = category;

        entities.push(parsedContentEntity);
      }

      // Upsert is not working because the many to many handle only run on save...
      await this.contentRepo.save(entities);
      console.log(`Entities ${entities.length} entries`);
    }
  }

  private getCategory(title: string): FilmbaratokCategory {
    return (
      CATEGORY_RULES.find((rule) => rule.pattern.test(title))?.category ||
      FilmbaratokCategory.OTHER
    );
  }
}
