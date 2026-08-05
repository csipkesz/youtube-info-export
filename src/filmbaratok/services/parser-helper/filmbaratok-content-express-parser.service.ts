import { Injectable } from '@nestjs/common';
import {
  FilmbaratokContentBaseParser,
  FilmbaratokContentParserMaps,
} from './filmbaratok-content-base-parser.abstract';
import { InjectRepository } from '@nestjs/typeorm';
import { FilmbaratokMedia } from '../../entities/filmbaratok-media.entity';
import { Repository } from 'typeorm';
import { FilmbaratokPerson } from '../../entities/filmbaratok-person.entity';
import { YoutubeVideo } from '../../../youtube/entities/youtube-video.entity';
import { FilmbaratokContent } from '../../entities/filmbaratok-content.entity';

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

    const topicTitles = this.extractTopicTitle(youtubeVideo.title);

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

  private extractTopicTitle(rawTitle: string): string[] {
    const withoutPrefix = rawTitle
      .replace(/^Filmb[aá]r[aá]tok\s+Expressz:?\s*/i, '')
      .trim();

    const seriesMatch = withoutPrefix.match(/^Sorozatok\s*\((.+)\)$/i);
    if (seriesMatch) {
      console.log('========= SERIES MATCH ========= - ', seriesMatch[1]);
      return seriesMatch[1]
        .split(',')
        .map((title) => title.trim())
        .filter(Boolean);
    }

    return withoutPrefix ? [withoutPrefix] : [];
  }
}
