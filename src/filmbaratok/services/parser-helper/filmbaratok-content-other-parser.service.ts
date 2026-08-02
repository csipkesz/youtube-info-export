import { Injectable } from '@nestjs/common';
import {
  FilmbaratokContentBaseParser,
  FilmbaratokContentParserMaps,
} from './filmbaratok-content-base-parser.abstract';
import { InjectRepository } from '@nestjs/typeorm';
import { FilmbaratokMedia } from '../../entities/filmbaratok-media.entity';
import { Repository } from 'typeorm';
import { FilmbaratokPerson } from 'src/filmbaratok/entities/filmbaratok-person.entity';
import { YoutubeVideo } from '../../../youtube/entities/youtube-video.entity';
import { FilmbaratokContent } from '../../entities/filmbaratok-content.entity';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class FilmbaratokContentOtherParserService extends FilmbaratokContentBaseParser {
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
    const contentEntity = plainToInstance(FilmbaratokContent, {
      title: youtubeVideo.title,
      releaseDate: youtubeVideo.publishedAt,
      youtubeId: youtubeVideo.resourceVideoId,
      thumbnailUrl: youtubeVideo.getThumbnailUrl('maxresdefault'),
    } as Partial<FilmbaratokContent>);

    return contentEntity;
  }
}
