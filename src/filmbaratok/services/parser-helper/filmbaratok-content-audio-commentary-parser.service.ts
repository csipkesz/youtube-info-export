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
export class FilmbaratokContentAudioCommentaryParserService extends FilmbaratokContentBaseParser {
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
    _maps: FilmbaratokContentParserMaps,
  ): Promise<FilmbaratokContent> {
    const contentEntity = this.initContentEntity(youtubeVideo);

    const topicTitle = this.extractTopicTitle(youtubeVideo.title);
    contentEntity.topics = await this.resolveTopicsByRawTitles([topicTitle]);

    return contentEntity;
  }

  private extractTopicTitle(rawTitle: string): string {
    const withoutPrefix = rawTitle
      .replace(/^Filmb[aá]r[aá]tok\s+audiokommentár\s*:?\s*/i, '')
      .trim();

    return withoutPrefix;
  }
}
