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

    const descriptionLines = this.resolveDescriptionLines(
      youtubeVideo.description,
    );

    const mappedPersonNames: string[] = Array.from(maps.persons.keys());
    const personNames = this.extractPersons(descriptionLines, {
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

  private extractPersons(
    lines: string[],
    options: { ytVideoId?: string; knownPersonNames: string[] },
  ) {
    const { ytVideoId, knownPersonNames } = options;
    const fullText = lines.join('\n');

    const sortedNames = [...knownPersonNames].sort(
      (a, b) => b.length - a.length,
    );

    const foundNames: string[] = [];
    let remainingText = fullText;

    for (const name of sortedNames) {
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(
        `(?<![\\p{L}\\p{N}])${escapedName}(?![\\p{L}\\p{N}])`,
        'u',
      );

      if (pattern.test(remainingText)) {
        foundNames.push(name);
        remainingText = remainingText.replace(pattern, '');
      }
    }

    if (!foundNames.length) {
      console.warn(
        `[extractPersons] No known person names found${ytVideoId ? ` (https://www.youtube.com/watch?v=${ytVideoId})` : ''}`,
      );
    }

    return foundNames;
  }
}
