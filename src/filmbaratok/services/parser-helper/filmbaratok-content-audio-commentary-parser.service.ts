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

    const mediaTitle = this.extractMediaTitle(youtubeVideo.title);
    contentEntity.medias = await this.resolveMediasByTitles([mediaTitle]);

    return contentEntity;
  }

  private extractMediaTitle(rawTitle: string): string {
    const withoutPrefix = rawTitle
      .replace(/^Filmb[aá]r[aá]tok\s+audiokommentár\s*:?\s*/i, '')
      .trim();

    return this.resolveMediaTitle(withoutPrefix);
  }
}
