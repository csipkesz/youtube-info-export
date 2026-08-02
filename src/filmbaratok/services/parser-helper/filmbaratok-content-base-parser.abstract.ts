import { FilmbaratokContent } from '../../entities/filmbaratok-content.entity';
import { YoutubeVideo } from '../../../youtube/entities/youtube-video.entity';
import { Repository } from 'typeorm';
import { FilmbaratokMedia } from '../../entities/filmbaratok-media.entity';
import { FilmbaratokPerson } from '../../entities/filmbaratok-person.entity';

const NON_MEDIA_TOPICS = [
  'Felvezetés',
  'Borítókép',
  'Nép akarata',
  'Villámkérdés',
  'Oscar jelöltek',
];

export interface FilmbaratokContentParserMaps {
  persons: Map<string, FilmbaratokPerson>;
}

export abstract class FilmbaratokContentBaseParser {
  constructor(
    protected readonly mediaRepo: Repository<FilmbaratokMedia>,
    protected readonly personRepo: Repository<FilmbaratokPerson>,
  ) {}

  abstract parse(
    youtubeVideo: YoutubeVideo,
    maps: FilmbaratokContentParserMaps,
  ): Promise<FilmbaratokContent>;

  protected async resolveMediasByTitles(titles: string[]) {
    // TODO IN FUTURE: Remove spoileres, (spoilers), X. évad, (X. évad) etc.
    const mediaTitles = titles.filter(
      (title) =>
        !NON_MEDIA_TOPICS.some((t) =>
          title.toLowerCase().includes(t.toLowerCase()),
        ),
    );

    if (!mediaTitles.length) {
      return [];
    }

    // Get existing list of medias
    const normalizedTitles = mediaTitles.map((t) => t.toLowerCase());
    const existingMedias = await this.mediaRepo
      .createQueryBuilder('media')
      .select(['media.id', 'media.title'])
      .where('LOWER(media.title) IN (:...titles)', { titles: normalizedTitles })
      .getMany();
    const existingMediaIds = existingMedias.map((e) => ({
      title: e.title,
      id: e.id,
    }));

    const existingMediaIdMap: Map<string, string> = new Map(
      existingMediaIds.map((e) => [e.title.toLowerCase(), e.id]),
    );

    const mediaEntities: FilmbaratokMedia[] = mediaTitles.map((title) => {
      const existingId = existingMediaIdMap.get(title.toLowerCase());
      return this.mediaRepo.create({
        title,
        id: existingId,
      });
    });

    return await this.mediaRepo.save(mediaEntities);
  }

  protected resolveDescriptionLines(descriptionLines: string): string[] {
    return descriptionLines.split('\n').filter(Boolean);
  }

  protected async resolvePersonByName(
    name: string,
    personMap: FilmbaratokContentParserMaps['persons'],
  ): Promise<FilmbaratokPerson> {
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
  }

  protected timeTextToSeconds(timeText: string): number {
    const parts = timeText.split(':').map(Number);

    if (parts.length === 3) {
      const [hours, minutes, seconds] = parts;
      return hours * 3600 + minutes * 60 + seconds;
    }

    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  }
}
