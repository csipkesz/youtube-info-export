import { FilmbaratokContent } from '../../entities/filmbaratok-content.entity';
import { YoutubeVideo } from '../../../youtube/entities/youtube-video.entity';
import { Repository } from 'typeorm';
import { FilmbaratokMedia } from '../../entities/filmbaratok-media.entity';
import { FilmbaratokPerson } from '../../entities/filmbaratok-person.entity';
import { plainToInstance } from 'class-transformer';

const NON_MEDIA_TOPICS = [
  'Felvezetés',
  'Borítókép',
  'Nép akarata',
  'Villámkérdés',
  'Oscar jelöltek',
  'Keresés',
  'Rovat',
  'Előbeszélgetés',
  'Beszélgetés',
  'Vendégünk',
  'Évösszegz',
  'Évösszegző',
  'kérdőív',
  'Cinefest',
  'Franchise',
  'Megosztás',
  'Jubileumi adás',
  'éves a Filmbarátok Podcast',
  '. adást',
  'Hallgatói kérdés',
  'Vélemények bizonyos film',
  'Rendezői tapasztalat',
  'Kérdéseitekre válaszol',
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

  protected initContentEntity(youtubeVideo: YoutubeVideo) {
    return plainToInstance(FilmbaratokContent, {
      title: youtubeVideo.title,
      releaseDate: youtubeVideo.publishedAt,
      youtubeId: youtubeVideo.resourceVideoId,
      thumbnailUrl: youtubeVideo.getThumbnailUrl('hqdefault'),
    });
  }

  protected async resolveMediasByTitles(titles: string[]) {
    const mediaTitles = titles.filter(
      (title) =>
        !NON_MEDIA_TOPICS.some((t) =>
          title.toLowerCase().includes(t.toLowerCase()),
        ),
    );

    if (!mediaTitles.length) {
      return [];
    }

    const existingMedias = await this.mediaRepo
      .createQueryBuilder('media')
      .select(['media.id', 'media.title'])
      .where('media.title IN (:...titles)', { titles: mediaTitles })
      .getMany();

    const existingMediaIdMap: Map<string, string> = new Map(
      existingMedias.map((e) => [this.normalizeMediaKey(e.title), e.id]),
    );

    const mediaEntities: FilmbaratokMedia[] = mediaTitles.map((title) => {
      const existingId = existingMediaIdMap.get(this.normalizeMediaKey(title));
      return this.mediaRepo.create({ title, id: existingId });
    });

    return await this.mediaRepo.save(mediaEntities);
  }

  private normalizeMediaKey(title: string): string {
    return title
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // ékezetek eltávolítása
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
