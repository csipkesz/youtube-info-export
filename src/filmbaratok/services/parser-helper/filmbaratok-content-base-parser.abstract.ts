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
  'filmgyűjtés mint szenvedély',
  'Közönség',
  'zárthelyi',
  'Szavazás',
  'filmosztás',
  'hallgató',
  'Oscar',
];

const NON_MEDIA_TOPICS_EXCEPTION = ['Oscar (1991)'];

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

  /**
   * Initializes a FilmbaratokContent entity from a YoutubeVideo entity.
   *
   * @param youtubeVideo - The YoutubeVideo entity to initialize the FilmbaratokContent from.
   * @returns A new instance of FilmbaratokContent with properties set based on the YoutubeVideo.
   */
  protected initContentEntity(youtubeVideo: YoutubeVideo) {
    return plainToInstance(FilmbaratokContent, {
      title: youtubeVideo.title,
      releaseDate: youtubeVideo.publishedAt,
      youtubeId: youtubeVideo.resourceVideoId,
      thumbnailUrl: youtubeVideo.getThumbnailUrl('hqdefault'),
    });
  }

  /**
   * Resolves the media title from a raw title string by removing any content within brackets or parentheses.
   *
   * @param rawTitle - The raw title string to resolve.
   * @returns The resolved media title without any bracketed or parenthetical content.
   */
  protected resolveMediaTitle(rawTitle: string): string {
    const firstBracketIndex = rawTitle.search(/[[(]/);
    const title =
      firstBracketIndex !== -1
        ? rawTitle.slice(0, firstBracketIndex)
        : rawTitle;

    return title.trim();
  }

  /**
   * Resolves media entities by their titles. If a media entity with the given title already exists in the database, it will be reused.
   * Otherwise, a new media entity will be created and saved to the database.
   * Filter out non media titles, but some titles has exception (like talking about Oscar gala, but there is a movie called "Oscar").
   *
   * @param titles - An array of media titles to resolve.
   * @returns A promise that resolves to an array of FilmbaratokMedia entities.
   */
  protected async resolveMediasByTitles(titles: string[]) {
    const mediaTitles = titles.filter((title) => {
      const normalizedTitle = title.toLowerCase();
      const isNonMediaTitle = NON_MEDIA_TOPICS.some((t) =>
        normalizedTitle.includes(t.toLowerCase()),
      );

      if (isNonMediaTitle) {
        const isNonMediaTitleException = NON_MEDIA_TOPICS_EXCEPTION.some(
          (t) => normalizedTitle === t.toLowerCase(),
        );
        return isNonMediaTitleException;
      }

      return true;
    });

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

  /**
   * Normalizes a media title for consistent comparison and storage.
   * The normalization process includes trimming whitespace, converting to lowercase,
   * and removing diacritical marks (accents) from characters.
   * Like fix Roma Róma or Dune Dűne
   *
   * @param title - The media title to normalize.
   * @returns The normalized media title.
   */
  private normalizeMediaKey(title: string): string {
    return title
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // ékezetek eltávolítása
  }

  /**
   * Splits a description string into an array of non-empty lines.
   *
   * @param descriptionLines - The description string to split.
   * @returns An array of non-empty lines from the description.
   */
  protected resolveDescriptionLines(descriptionLines: string): string[] {
    return descriptionLines.split('\n').filter(Boolean);
  }

  /**
   * Resolves known person names from the provided lines of text.
   * It searches for occurrences of known person names in the text and returns an array of found names.
   * The search is case-sensitive and ensures that names are matched as whole words.
   *
   * @param lines - An array of strings or a single string containing the text to search.
   * @param options - An object containing optional parameters:
   *   - ytVideoId: (optional) The YouTube video ID for logging purposes.
   *   - knownPersonNames: An array of known person names to search for in the text.
   * @returns An array of found person names from the text.
   */
  protected resolvePersonNames(
    lines: string[] | string,
    options: { ytVideoId?: string; knownPersonNames: string[] },
  ) {
    const { ytVideoId, knownPersonNames } = options;
    const fullText = Array.isArray(lines) ? lines.join('\n') : lines;

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

  /**
   * Resolves a person entity by name. If a person with the given name already exists in the provided person map, it will be returned.
   * Otherwise, a new person entity will be created, saved to the database, and added to the person map.
   *
   * @param name - The name of the person to resolve.
   * @param personMap - A map of existing person entities keyed by their names.
   * @returns A promise that resolves to the FilmbaratokPerson entity corresponding to the given name.
   */
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

  /**
   * Converts a time string in the format "HH:MM:SS" or "MM:SS" to the total number of seconds.
   *
   * @param timeText - The time string to convert.
   * @returns The total number of seconds represented by the time string.
   */
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
