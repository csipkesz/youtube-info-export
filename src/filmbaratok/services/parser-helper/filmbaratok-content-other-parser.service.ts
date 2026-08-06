import { Injectable } from '@nestjs/common';
import { FilmbaratokContentBaseParser } from './filmbaratok-content-base-parser.abstract';
import { InjectRepository } from '@nestjs/typeorm';
import { FilmbaratokMedia } from '../../entities/filmbaratok-media.entity';
import { Repository } from 'typeorm';
import { FilmbaratokPerson } from 'src/filmbaratok/entities/filmbaratok-person.entity';
import { YoutubeVideo } from '../../../youtube/entities/youtube-video.entity';
import { FilmbaratokContent } from '../../entities/filmbaratok-content.entity';
import { FilmbaratokContentParserMaps } from '../../interfaces/filmbaratok-content-parser-maps.interface';

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
    const contentEntity = this.initContentEntity(youtubeVideo);

    const descriptionLines = this.resolveDescriptionLines(
      youtubeVideo.description,
    );

    const mappedPersonNames: string[] = Array.from(maps.persons.keys());
    const personNames = this.resolvePersonNames(descriptionLines, {
      ytVideoId: youtubeVideo.resourceVideoId,
      knownPersonNames: mappedPersonNames,
    });

    const participants: FilmbaratokPerson[] = [];
    for (const name of personNames) {
      participants.push(await this.resolvePersonByName(name, maps.persons));
    }

    contentEntity.participants = participants;

    return contentEntity;
  }
}
