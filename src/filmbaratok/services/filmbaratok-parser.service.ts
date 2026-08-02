import { Injectable, OnModuleInit } from '@nestjs/common';
import { YoutubeChannelService } from '../../youtube/youtube-channel.service';
import { YoutubeVideo } from '../../youtube/entities/youtube-video.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { FilmbaratokContent } from '../entities/filmbaratok-content.entity';
import { In, Repository } from 'typeorm';
import { FilmbaratokPerson } from '../entities/filmbaratok-person.entity';
import { FilmbaratokMedia } from '../entities/filmbaratok-media.entity';
import { FilmbaratokCategory } from '../enums/filmbaratok-category.enum';
import { FilmbaratokParserHelperService } from './parser-helper/filmbaratok-parser-helper.service';

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
    this.parseVideosFromDb();
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
