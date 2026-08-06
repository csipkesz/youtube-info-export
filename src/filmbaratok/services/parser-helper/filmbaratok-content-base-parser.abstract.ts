import { FilmbaratokContent } from '../../entities/filmbaratok-content.entity';
import { YoutubeVideo } from '../../../youtube/entities/youtube-video.entity';
import { Repository } from 'typeorm';
import { FilmbaratokMedia } from '../../entities/filmbaratok-media.entity';
import { FilmbaratokPerson } from '../../entities/filmbaratok-person.entity';
import { plainToInstance } from 'class-transformer';
import { FilmbaratokContentTopic } from '../../entities/filmbaratok-content-topic.entity';
import {
  NON_MEDIA_TOPICS,
  NON_MEDIA_TOPICS_EXCEPTION,
} from '../../filmbaratok.constants';
import { FilmbaratokContentParserMaps } from '../../interfaces/filmbaratok-content-parser-maps.interface';
import { FilmbaratokMediaTitleInfo } from '../../interfaces/filmbaratok-media-title-info.interface';

export abstract class FilmbaratokContentBaseParser {
  private static readonly SEASON_PATTERN =
    /(?:sorozatajánló\s*&\s*)?(?:kibeszélés\s+)?\d+(?:[-&]\d+)?\s*\.?\s*évad(?:\s*\/\s*\d+(?:-\d+)?\s*\.?\s*(?:évad|rész)?)?(?:\s*kisfinálé)?(?:\s*\([^()]*\))?/gi;

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
   * Handle raw topic titles and return with a full topic entity with media and filled with infos.
   *
   * @param titles - An array of raw topic titles to resolve.
   * @returns A promise that resolves to an array of FilmbaratokContentTopic entities with resolved media and other information.
   */
  async resolveTopicsByRawTitles(titles: string[]) {
    let position = 0;
    const topics: FilmbaratokContentTopic[] = titles
      .map((rawTitle) => {
        const topic = this.parseTopicRawTitle(rawTitle);
        if (topic) {
          topic.position = position++;
        }
        return topic;
      })
      .filter((t) => t !== null);

    await this.resolveTopicMedias(topics);

    return topics;
  }

  private async resolveTopicMedias(
    topics: FilmbaratokContentTopic[],
  ): Promise<void> {
    const mediaTopics = topics.filter((topic) => topic.isMedia);
    if (!mediaTopics.length) {
      return;
    }

    const mediaInfoByTopic = new Map<
      FilmbaratokContentTopic,
      FilmbaratokMediaTitleInfo
    >(mediaTopics.map((topic) => [topic, this.parseMediaTitle(topic.title)]));

    const existingMediaIdByKey = await this.loadExistingMediaIds(
      [...mediaInfoByTopic.values()].map((info) => info.title),
    );

    const resolvedMediaByKey = new Map<string, FilmbaratokMedia>();

    for (const topic of mediaTopics) {
      const info = mediaInfoByTopic.get(topic)!;
      topic.isSpoiler = info.isSpoiler;
      topic.subtitle = info.subtitle || null;

      const key = this.normalizeMediaKey(info.title);

      let media = resolvedMediaByKey.get(key);
      if (!media) {
        const existingId = existingMediaIdByKey.get(key);
        media = this.mediaRepo.create({ title: info.title, id: existingId });
        resolvedMediaByKey.set(key, media);
      }

      topic.media = media;
    }

    await this.mediaRepo.save([...resolvedMediaByKey.values()]);
  }

  /**
   * Loads existing media IDs from the database for the given titles.
   *
   * @param titles - An array of media titles to check for existing IDs.
   * @returns A promise that resolves to a Map where the keys are normalized media titles and the values are the corresponding media IDs.
   * @private
   */
  private async loadExistingMediaIds(
    titles: string[],
  ): Promise<Map<string, string>> {
    if (!titles.length) {
      return new Map();
    }

    const existingMedias = await this.mediaRepo
      .createQueryBuilder('media')
      .select(['media.id', 'media.title'])
      .where('media.title IN (:...titles)', { titles })
      .getMany();

    return new Map(
      existingMedias.map((m) => [this.normalizeMediaKey(m.title), m.id]),
    );
  }

  /**
   * Parses a raw media title to extract the cleaned title and determine if it contains spoiler information.
   *
   * @param rawTitle - The raw media title to parse.
   * @returns An object containing the cleaned title and a boolean indicating if it is a spoiler.
   */
  protected parseMediaTitle(rawTitle: string): FilmbaratokMediaTitleInfo {
    let isSpoiler = false;
    let title = rawTitle;

    // === Check spoiler
    const spoilerRegexes = [
      /[([][^()[\]]*spoiler[^()[\]]*[)\]]/gi,
      /\*?\s*spoiler\w*/gi,
    ];
    for (const regex of spoilerRegexes) {
      title = title.replace(regex, () => {
        isSpoiler = true;
        return '';
      });

      if (isSpoiler) {
        break;
      }
    }

    // Check seasons
    const subtitleParts: string[] = [];
    title = title.replace(
      FilmbaratokContentBaseParser.SEASON_PATTERN,
      (match) => {
        subtitleParts.push(match.trim());
        return '';
      },
    );
    const subtitle = subtitleParts.join(' ');

    // Clear empty brackets
    title = title
      .replace(/\s{2,}/g, ' ')
      .replace(/[-\s]+$/, '')
      .replace(/[([]\s*[)\]]/g, '')
      .trim();

    if (isSpoiler)
      console.log(
        `[parseMediaTitle] Parsed media title: "${rawTitle}" -> "${title}", isSpoiler: ${isSpoiler ? 'true' : 'false'}`,
      );

    return {
      title,
      subtitle,
      isSpoiler,
    };
  }

  /**
   * Generally parse topic raw title and handle all possible data and string formatting.
   *
   * @param rawTitle
   * @private
   */
  private parseTopicRawTitle(rawTitle: string) {
    const topicEntity = new FilmbaratokContentTopic();

    // Remove leading hyphen and whitespace from the raw title
    let title = rawTitle.replace(/^-\s*/, '').trim();
    if (!title) {
      return null;
    }

    // region Handle podcast topics like: "Róma (00:50:12)"
    const timeMatch = title.match(/\d{1,2}:\d{2}(?::\d{2})?/);
    if (timeMatch) {
      const timeIndex = Number(timeMatch.index);
      const beforeTime = title.slice(0, timeIndex).trim();
      const lastBracketIndex = Math.max(
        beforeTime.lastIndexOf('('),
        beforeTime.lastIndexOf('['),
      );

      topicEntity.timestampString = timeMatch[0];
      topicEntity.timestampInSeconds = this.timeTextToSeconds(
        topicEntity.timestampString,
      );
      title = (
        lastBracketIndex !== -1
          ? beforeTime.slice(0, lastBracketIndex)
          : beforeTime
      ).trim();
    }
    // endregion

    topicEntity.title = title;
    // Transient properties
    topicEntity.isMedia = this.titleIsMediaTitle(title);

    return topicEntity;
  }

  /**
   * Helper for determine a raw title is can be media title.
   * The non media exception is needed because guys spoke about Oscar gala, but some episode talk about Oscar the movie.
   *
   * @param title
   * @private
   */
  private titleIsMediaTitle(title: string) {
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
   * Parses topic lines from a description string, starting from the line that begins with "Téma".
   * It collects lines that start with a hyphen ("-") and handles cases where lines may be continued across multiple lines.
   *
   * @param description - The description string to parse for topic lines.
   * @returns An array of topic lines extracted from the description.
   */
  protected parseTopicLinesFromDescription(description: string): string[] {
    const lines = description.split('\n');
    const themeIndex = lines.findIndex((line) =>
      line.trim().startsWith('Téma'),
    );
    if (themeIndex === -1) {
      return [];
    }

    const topicLines: string[] = [];
    for (let i = themeIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('-')) {
        topicLines.push(line);
        continue;
      }

      if (
        topicLines.length > 0 &&
        this.hasUnbalancedOpenParen(topicLines[topicLines.length - 1])
      ) {
        // Az előző sor nyitott zárójellel végződött -> ez valószínűleg annak folytatása
        topicLines[topicLines.length - 1] += ' ' + line;
        continue;
      }

      break;
    }

    return topicLines.map((line) => line.trim()).filter(Boolean);
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

  /**
   * Checks if the given text has unbalanced open parentheses.
   *
   * @param text - The text to check for unbalanced parentheses.
   * @returns True if there are more open parentheses than close parentheses; otherwise, false.
   */
  protected hasUnbalancedOpenParen(text: string): boolean {
    const openCount = (text.match(/\(/g) ?? []).length;
    const closeCount = (text.match(/\)/g) ?? []).length;
    return openCount > closeCount;
  }
}
