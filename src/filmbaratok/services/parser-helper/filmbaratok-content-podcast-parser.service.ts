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
import { plainToInstance } from 'class-transformer';
import { FilmbaratokContentTopic } from '../../entities/columns/filmbaratok-content-topic.column';
import { FilmbaratokPerson } from '../../entities/filmbaratok-person.entity';

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
    const contentEntity = plainToInstance(FilmbaratokContent, {
      title: video.title,
      releaseDate: video.publishedAt,
      youtubeId: video.resourceVideoId,
      thumbnailUrl: video.getThumbnailUrl('maxresdefault'),
    } as Partial<FilmbaratokContent>);

    const descriptionLines = this.resolveDescriptionLines(video.description);

    const episodeInfo = this.extractEpisodeInfo(descriptionLines);

    const topics = this.extractTopics(descriptionLines, {
      ytVideoId: video.resourceVideoId,
    });
    const mediasFromTopics = await this.resolveMediasByTitles(
      topics.map((t) => t.name),
    );

    const persons: FilmbaratokPerson[] = [];
    const personNames = this.extractPersons(descriptionLines, {
      ytVideoId: video.resourceVideoId,
    });
    for (const personName of personNames) {
      persons.push(await this.resolvePersonByName(personName, maps.persons));
    }

    contentEntity.durationInMinutes = episodeInfo?.durationInMinutes ?? 0;
    contentEntity.topics = topics;
    contentEntity.medias = mediasFromTopics;
    contentEntity.participants = persons;

    return contentEntity;
  }

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

  private extractTopics(lines: string[], context?: { ytVideoId?: string }) {
    const themeIndex = lines.findIndex((line) =>
      line.trim().startsWith('Téma'),
    );
    if (themeIndex === -1) {
      console.warn(
        `[extractTopics] No "Téma" line found${context?.ytVideoId ? ` (video #${context.ytVideoId})` : ''}`,
      );
      return [];
    }

    const topicLines: string[] = [];
    for (let i = themeIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line.startsWith('-')) break;
      topicLines.push(line);
    }

    const topics = topicLines.map((line) => {
      const match = line.match(/^-(.+?)\s*\((\d{1,2}:\d{2}(?::\d{2})?):?\)$/);

      if (!match) {
        console.warn(
          `[extractTopics] Could not parse topic line: "${line}"${context?.ytVideoId ? ` (episode #${context.ytVideoId})` : ''}`,
        );
        return null;
      }

      const [, title, timeText] = match;
      return plainToInstance(FilmbaratokContentTopic, {
        name: title.trim(),
        timestampString: timeText,
        timestampInSeconds: this.timeTextToSeconds(timeText),
      });
    });

    return topics.filter((topic) => topic !== null);
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
