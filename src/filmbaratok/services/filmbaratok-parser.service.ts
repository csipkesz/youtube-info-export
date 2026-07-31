import { Injectable, OnModuleInit } from '@nestjs/common';
import { YoutubeChannelService } from '../../youtube/youtube-channel.service';
import { YoutubeVideo } from '../../youtube/entities/youtube-video.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { FilmbaratokContent } from '../entities/filmbaratok-content.entity';
import { In, Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { FilmbaratokContentTopic } from '../entities/columns/filmbaratok-content-topic.column';
import { FilmbaratokPerson } from '../entities/filmbaratok-person.entity';
import { FilmbaratokMedia } from '../entities/filmbaratok-media.entity';
import { FilmbaratokCategory } from '../enums/filmbaratok-category.enum';

const NON_MEDIA_TOPICS = [
  'Felvezetés',
  'Borítókép',
  'Nép akarata',
  'Villámkérdés',
  'Oscar jelöltek',
];

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
    await this.ytChannelService.iterateChannelVideos(
      this.youtubeChannelId,
      async (videos) => {
        await this.parseVideosToDb(videos);
      },
    );
  }

  async processTopicsWithMedia(topics: FilmbaratokContentTopic[]) {
    if (!topics.length) {
      return [];
    }

    // TODO IN FUTURE: Remove spoileres, (spoilers), X. évad, (X. évad) etc.
    const topicNamesWithMedia = topics.filter(
      (topic) =>
        !NON_MEDIA_TOPICS.some((t) =>
          topic.name.toLowerCase().includes(t.toLowerCase()),
        ),
    );

    const existingMediaIds = await this.mediaRepo.find({
      select: { id: true, title: true },
      where: { title: In(topicNamesWithMedia.map((t) => t.name)) },
    });
    const existingMediaIdMap: Map<string, string> = new Map(
      existingMediaIds.map((e) => [e.title.toLowerCase(), e.id]),
    );
    const mediaEntities: FilmbaratokMedia[] = topicNamesWithMedia.map(
      (topic) => {
        const existingId = existingMediaIdMap.get(topic.name.toLowerCase());
        return this.mediaRepo.create({
          title: topic.name,
          id: existingId,
        });
      },
    );

    return await this.mediaRepo.save(mediaEntities);
  }

  private async parseVideosToDb(youtubeVideos: YoutubeVideo[]) {
    if (!youtubeVideos.length) {
      return;
    }

    const batchNumber = 50;
    const existingPersons = await this.personRepo.find();
    const personMap = new Map(
      existingPersons.map((person) => [person.name, person]),
    );

    for (let i = 0; i < youtubeVideos.length; i += batchNumber) {
      const batch = youtubeVideos.slice(i, i + batchNumber);
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
          CATEGORY_RULES.find((rule) => rule.pattern.test(video.title))
            ?.category || FilmbaratokCategory.OTHER;

        const contentEntity = this.contentRepo.create({
          title: video.title,
          releaseDate: video.publishedAt,
          youtubeId: video.resourceVideoId,
          thumbnailUrl: video.getThumbnailUrl('maxresdefault'),
          category,
        });

        const existingId = existingContentIdMap.get(video.resourceVideoId);
        if (existingId) {
          contentEntity.id = existingId;
        }

        if (contentEntity.category === FilmbaratokCategory.PODCAST) {
          // Prepare description
          const descriptionLines = video.description
            .split('\n')
            .filter(Boolean);
          console.log(descriptionLines);

          // Get data from header
          const episodeHeader = this.extractEpisodeHeader(descriptionLines);
          contentEntity.durationInMinutes =
            episodeHeader?.durationInMinutes || 0;

          // Get topics with time data
          contentEntity.topics = this.extractTopics(descriptionLines, {
            ytVideoId: video.resourceVideoId,
          });

          contentEntity.medias = await this.processTopicsWithMedia(
            contentEntity.topics || [],
          );

          // Handle new persons and add to participants
          const personNames = this.extractPodcastPersons(descriptionLines, {
            ytVideoId: video.resourceVideoId,
          });
          contentEntity.participants = await Promise.all(
            personNames.map(async (name) => {
              const existingPerson = personMap.get(name);
              if (existingPerson) {
                return existingPerson;
              }

              const newPerson = this.personRepo.create({
                name,
              });

              await this.personRepo.save(newPerson);
              personMap.set(name, newPerson);
              return newPerson;
            }),
          );
        }

        console.log(contentEntity);
        entities.push(contentEntity);
      }

      // Upsert is not working because the many to many handle only run on save...
      await this.contentRepo.save(entities);
      console.log(`Entities ${entities.length} entries`);
    }
  }

  private extractEpisodeHeader(lines: string[]) {
    const headerLine = lines.find((line) =>
      line.includes('Filmbarátok Podcast #'),
    );
    if (!headerLine) {
      return null;
    }

    const match = headerLine.match(/#(\d+).*?(\d+)\s*perc/);
    if (!match) {
      return null;
    }

    return {
      episodeNumber: Number(match[1]),
      durationInMinutes: Number(match[2]),
    };
  }

  private extractTopics(lines: string[], context?: { ytVideoId?: string }) {
    const themeIndex = lines.findIndex((line) =>
      line.trim().startsWith('Téma'),
    );
    if (themeIndex === -1) {
      console.warn(
        `[extractTopics] No "Téma" line found${context?.ytVideoId ? ` (video #${context.ytVideoId})` : ''}`,
      );
      return [];
    }

    const topicLines: string[] = [];
    for (let i = themeIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line.startsWith('-')) break;
      topicLines.push(line);
    }

    const topics = topicLines.map((line) => {
      const match = line.match(/^-(.+?)\s*\((\d{1,2}:\d{2}(?::\d{2})?):?\)$/);

      if (!match) {
        console.warn(
          `[extractTopics] Could not parse topic line: "${line}"${context?.ytVideoId ? ` (episode #${context.ytVideoId})` : ''}`,
        );
        return null;
      }

      const [, title, timeText] = match;
      return plainToInstance(FilmbaratokContentTopic, {
        name: title.trim(),
        timestampString: timeText,
        timestampInSeconds: timeTextToSeconds(timeText),
      });
    });

    return topics.filter((topic) => topic !== null);
  }

  private extractPodcastPersons(
    lines: string[],
    context?: { ytVideoId?: string },
  ): string[] {
    const participantsLine = lines.find((line) =>
      line.trim().startsWith('Beszélgetnek:'),
    );

    if (!participantsLine) {
      console.warn(
        `[extractParticipants] No "Beszélgetnek:" line found${context?.ytVideoId ? ` (video #${context.ytVideoId})` : ''}`,
      );
      return [];
    }

    const namesText = participantsLine.split('Beszélgetnek:')[1];
    if (!namesText) {
      return [];
    }

    return namesText
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean);
  }
}

function timeTextToSeconds(timeText: string): number {
  const parts = timeText.split(':').map(Number);

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
  }

  const [minutes, seconds] = parts;
  return minutes * 60 + seconds;
}
