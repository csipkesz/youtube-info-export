import { Injectable } from '@nestjs/common';
import {
  FilmbaratokContentBaseParser,
  FilmbaratokContentParserMaps,
} from './filmbaratok-content-base-parser.abstract';
import { InjectRepository } from '@nestjs/typeorm';
import { FilmbaratokMedia } from '../../entities/filmbaratok-media.entity';
import { Repository } from 'typeorm';
import { YoutubeVideo } from '../../../youtube/entities/youtube-video.entity';
import { FilmbaratokContent } from '../../entities/filmbaratok-content.entity';
import { FilmbaratokPerson } from '../../entities/filmbaratok-person.entity';

/**
 * Persons have similar name but separated by some sign.
 * Like: Gábor, Gábor (videodrom), Szöllőskei Gábor
 */
const KNOWN_PERSON_NAMES = [
  'Gábor (Videodrome)',
  'Madarász Isti',
  'Szöllőskei Gábor',
  'Gigor Attila',
  'Hajdu Szabolcs',
  'Schwechtje Mihály',
  'Stöckert Gábor',
  'Ódor Kristóf',
];

@Injectable()
export class FilmbaratokContentPodcastParserService extends FilmbaratokContentBaseParser {
  constructor(
    @InjectRepository(FilmbaratokMedia)
    protected readonly mediaRepo: Repository<FilmbaratokMedia>,
    @InjectRepository(FilmbaratokPerson)
    protected readonly personRepo: Repository<FilmbaratokPerson>,
  ) {
    super(mediaRepo, personRepo);
  }

  async parse(
    video: YoutubeVideo,
    maps: FilmbaratokContentParserMaps,
  ): Promise<FilmbaratokContent> {
    const contentEntity = this.initContentEntity(video);

    const descriptionLines = this.resolveDescriptionLines(video.description);

    const episodeInfo = this.extractEpisodeInfo(descriptionLines);

    const topics = this.extractTopics(descriptionLines, {
      ytVideoId: video.resourceVideoId,
    });

    const persons: FilmbaratokPerson[] = [];
    const personNames = this.extractPersons(descriptionLines, {
      ytVideoId: video.resourceVideoId,
    });
    for (const personName of personNames) {
      persons.push(await this.resolvePersonByName(personName, maps.persons));
    }

    contentEntity.durationInMinutes = episodeInfo?.durationInMinutes ?? 0;
    contentEntity.topics = await this.resolveTopicsByRawTitles(topics);
    contentEntity.participants = persons;

    return contentEntity;
  }

  /**
   * Extracts episode information such as episode number and duration from the provided lines of text.
   *
   * @param lines
   * @private
   */
  private extractEpisodeInfo(lines: string[]) {
    const headerLine = lines.find((line) =>
      line.includes('Filmbarátok Podcast #'),
    );
    if (!headerLine) {
      return null;
    }

    const match = headerLine.match(/#(\d+).*?(\d+)\s*perc/);
    if (!match) {
      return null;
    }

    return {
      episodeNumber: Number(match[1]),
      durationInMinutes: Number(match[2]),
    };
  }

  /**
   * Extracts a list of topics from an array of lines, starting from the line containing the keyword "Téma".
   * It processes the lines to ensure continuity for topics that span multiple lines and parses them into structured topics.
   *
   * @param {string[]} lines - The array of strings representing lines to parse for topics.
   * @param {Object} [context] - Optional context object providing additional information.
   * @param {string} [context.ytVideoId] - Optional YouTube video ID for context when logging warnings.
   * @return {FilmbaratokContentTopic[]} An array of parsed topics, or an empty array if no topics are extracted.
   */
  private extractTopics(
    lines: string[],
    context?: { ytVideoId?: string },
  ): string[] {
    const themeIndex = lines.findIndex((line) =>
      line.trim().startsWith('Téma'),
    );
    if (themeIndex === -1) {
      console.warn(
        `[extractTopics] No "Téma" line found${context?.ytVideoId ? ` (video ${context.ytVideoId})` : ''}`,
      );
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

  private hasUnbalancedOpenParen(text: string): boolean {
    const openCount = (text.match(/\(/g) ?? []).length;
    const closeCount = (text.match(/\)/g) ?? []).length;
    return openCount > closeCount;
  }

  private extractPersons(
    lines: string[],
    context?: { ytVideoId?: string },
  ): string[] {
    const participantsLine = lines.find((line) =>
      line.trim().startsWith('Beszélgetnek:'),
    );

    if (!participantsLine) {
      console.warn(
        `[extractParticipants] No "Beszélgetnek:" line found${context?.ytVideoId ? ` (video #${context.ytVideoId})` : ''}`,
      );
      return [];
    }

    const namesText = participantsLine.split('Beszélgetnek:')[1];
    if (!namesText) {
      return [];
    }

    return namesText
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean)
      .flatMap((raw) => this.splitPersonNameEntry(raw));
  }

  // POSSIBLY TO BASE
  private resolveNamesFromText(text: string): string[] {
    const sortedKnownNames = [...KNOWN_PERSON_NAMES].sort(
      (a, b) => b.split(' ').length - a.split(' ').length,
    );

    const result: string[] = [];
    let remaining = text.trim();

    while (remaining.length > 0) {
      const knownMatch = sortedKnownNames.find(
        (known) => remaining === known || remaining.startsWith(known + ' '),
      );

      if (knownMatch) {
        result.push(knownMatch);
        remaining = remaining.slice(knownMatch.length).trim();
        continue;
      }

      const parenNoteMatch = remaining.match(/^\([^)]*\)\s*/);
      if (parenNoteMatch) {
        remaining = remaining.slice(parenNoteMatch[0].length).trim();
        continue;
      }

      const spaceIndex = remaining.indexOf(' ');
      if (spaceIndex === -1) {
        result.push(remaining);
        remaining = '';
      } else {
        result.push(remaining.slice(0, spaceIndex));
        remaining = remaining.slice(spaceIndex + 1).trim();
      }
    }

    return result;
  }

  private splitPersonNameEntry(raw: string): string[] {
    const name = raw.trim();

    // "Name feat. Name" / "Name feat Name"
    if (/\bfeat\.?\b/i.test(name)) {
      return name
        .split(/\s+feat\.?\s+/i)
        .flatMap((part) => this.splitPersonNameEntry(part));
    }

    // "Name. Name" -> pont vessző helyett (typo)
    if (/\.\s*[A-ZÁÉÍÓÖŐÚÜŰ]/.test(name)) {
      return name
        .split(/\.\s*(?=[A-ZÁÉÍÓÖŐÚÜŰ])/)
        .flatMap((part) => this.splitPersonNameEntry(part));
    }

    return this.resolveNamesFromText(name);
  }

  // =====
}
