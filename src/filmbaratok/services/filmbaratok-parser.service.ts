import { Injectable, OnModuleInit } from '@nestjs/common';
import { YoutubeChannelService } from '../../youtube/youtube-channel.service';
import { YoutubeVideo } from '../../youtube/entities/youtube-video.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { FilmbaratokContent } from '../entities/filmbaratok-content.entity';
import { In, IsNull, Not, Repository } from 'typeorm';
import { FilmbaratokPerson } from '../entities/filmbaratok-person.entity';
import { FilmbaratokCategory } from '../enums/filmbaratok-category.enum';
import { FilmbaratokParserHelperService } from './parser-helper/filmbaratok-parser-helper.service';
import { FilmbaratokMedia } from '../entities/filmbaratok-media.entity';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { CATEGORY_RULES } from '../filmbaratok.constants';
import { TmdbSyncReport } from '../interfaces/tmdb-sync-report.interface';

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
  ) {}

  onModuleInit() {
    // this.syncYoutubeChannelWithVideos();
    // this.parseVideosFromDb().then(() => {
    //   this.parseMediaWithMovieDatabase({
    //     onlyKnownMedia: true,
    //   });
    // });
  }

  /**
   * Synchronizes the YouTube channel with its videos, retrieves updated information, and optionally processes the videos.
   *
   * @param {Object} options - Configuration options for the synchronization process.
   * @param {boolean} [options.doParse] - Indicates whether the retrieved videos should be parsed and saved to the database.
   * @return {Promise<void>} A promise that resolves when the synchronization and optional processing is complete.
   */
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

  /**
   * Parses videos from the YouTube channel and stores them into the database.
   * Utilizes iteration over the channel videos with a defined batch size for optimization.
   *
   * @return {Promise<void>} A promise that resolves when all videos have been successfully parsed and stored in the database.
   */
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

  /**
   * Parses media items using a movie database integration to process known and unknown media.
   * This method fetches all media records, processes them in batches, updates their information,
   * and generates a report summarizing the processing results.
   *
   * @return {Promise<void>} A promise that resolves when the media parsing and report generation are complete.
   */
  async parseMediaWithMovieDatabase(
    options: { onlyKnownMedia?: boolean } = {},
  ): Promise<void> {
    const report: TmdbSyncReport = {
      mediaWithoutResult: [],
      mediaWithMoreResultWithoutFind: [],
    };

    const listOfMedia = await this.mediaRepo.find({
      where: {
        tmdbId: options.onlyKnownMedia ? Not(IsNull()) : undefined,
      },
    });

    const batchSize = 70;
    for (let i = 0; i < listOfMedia.length; i += batchSize) {
      const batch = listOfMedia.slice(i, i + batchSize);
      await Promise.all(
        batch.map((media) =>
          media.tmdbId
            ? this.parserHelper.tmdbProcessKnownMedia(media)
            : this.parserHelper.tmdbProcessUnknownMedia(media, report),
        ),
      );
    }

    await this.mediaRepo.save(listOfMedia, { chunk: 100 });

    console.log(`Overall processing of ${listOfMedia.length} media finished.`);
    console.log(`Media without result: ${report.mediaWithoutResult.length}`);
    console.log(
      `Media with more result and not found: ${report.mediaWithMoreResultWithoutFind.length}`,
    );

    await this.createMovieDBReportData({
      generatedAt: new Date().toISOString(),
      summary: {
        totalProcessed: listOfMedia.length,
        withoutResultCount: report.mediaWithoutResult.length,
        withMoreResultWithoutFindCount:
          report.mediaWithMoreResultWithoutFind.length,
      },
      ...report,
    });
  }

  /**
   * Creates a movie database report file in JSON format and saves it to the disk.
   *
   * @param {any} data - The data to be included in the generated report.
   * @return {Promise<void>} A promise that resolves when the report file is successfully saved.
   */
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

  /**
   * Parses an array of YouTube videos and updates the database with the parsed information.
   * Processes videos by categories, including podcasts and non-podcasts, and ensures that existing content does not get duplicated.
   *
   * @param {YoutubeVideo[]} youtubeVideos - The array of YouTube videos to be parsed and saved to the database. Each video should contain information such as title and resource ID.
   * @return {Promise<void>} A Promise that resolves when the parsing and database update is complete. Returns immediately if the input array is empty.
   */
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
