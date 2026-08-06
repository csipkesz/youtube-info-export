import { Injectable } from '@nestjs/common';
import { FilmbaratokContentBaseParser } from './filmbaratok-content-base-parser.abstract';
import { InjectRepository } from '@nestjs/typeorm';
import { FilmbaratokMedia } from '../../entities/filmbaratok-media.entity';
import { Repository } from 'typeorm';
import { FilmbaratokPerson } from '../../entities/filmbaratok-person.entity';
import { YoutubeVideo } from '../../../youtube/entities/youtube-video.entity';
import { FilmbaratokContent } from '../../entities/filmbaratok-content.entity';
import { FilmbaratokContentParserMaps } from '../../interfaces/filmbaratok-content-parser-maps.interface';

@Injectable()
export class FilmbaratokContentExpressParserService extends FilmbaratokContentBaseParser {
  constructor(
    @InjectRepository(FilmbaratokMedia)
    protected readonly mediaRepo: Repository<FilmbaratokMedia>,
    @InjectRepository(FilmbaratokPerson)
    protected readonly personRepo: Repository<FilmbaratokPerson>,
  ) {
    super(mediaRepo, personRepo);
  }

  async parse(
    youtubeVideo: YoutubeVideo,
    maps: FilmbaratokContentParserMaps,
  ): Promise<FilmbaratokContent> {
    const contentEntity = this.initContentEntity(youtubeVideo);

    const topicTitles = this.extractTopicTitle(
      youtubeVideo.title,
      youtubeVideo.description,
    );

    const mappedPersonNames: string[] = Array.from(maps.persons.keys());
    const personNames = this.resolvePersonNames(youtubeVideo.description, {
      ytVideoId: youtubeVideo.resourceVideoId,
      knownPersonNames: mappedPersonNames,
    });

    const participants: FilmbaratokPerson[] = [];
    for (const name of personNames) {
      participants.push(await this.resolvePersonByName(name, maps.persons));
    }

    contentEntity.participants = participants;
    contentEntity.topics = await this.resolveTopicsByRawTitles(topicTitles);

    return contentEntity;
  }

  private extractTopicTitle(rawTitle: string, description: string): string[] {
    const withoutPrefix = rawTitle
      .replace(/^Filmb[aá]r[aá]tok\s+Expressz:?\s*/i, '')
      .trim();

    const seriesMatch = withoutPrefix.match(/^Sorozatok\s*\((.+)\)$/i);
    if (seriesMatch) {
      return this.parseTopicLinesFromDescription(description);
    }

    return withoutPrefix ? [withoutPrefix] : [];
  }
}
