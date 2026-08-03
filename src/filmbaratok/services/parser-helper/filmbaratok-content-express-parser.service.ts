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
    _maps: FilmbaratokContentParserMaps,
  ): Promise<FilmbaratokContent> {
    const contentEntity = this.initContentEntity(youtubeVideo);

    const mediaTitle = this.extractMediaTitle(youtubeVideo.title);
    contentEntity.medias = await this.resolveMediasByTitles([mediaTitle]);

    return contentEntity;
  }

  private extractMediaTitle(rawTitle: string): string {
    const withoutPrefix = rawTitle
      .replace(/^Filmb[aá]r[aá]tok\s+Expressz:?\s*/i, '')
      .trim();

    const firstBracketIndex = withoutPrefix.search(/[[(]/);
    const title =
      firstBracketIndex !== -1
        ? withoutPrefix.slice(0, firstBracketIndex)
        : withoutPrefix;

    return title.trim();
  }
}
