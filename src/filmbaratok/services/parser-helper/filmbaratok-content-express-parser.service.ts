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

interface ExpressTitleInfo {
  mediaTitle: string;
  season?: string;
  isSpoiler: boolean;
}

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

    const info = this.parseExpressTitle(youtubeVideo.title);

    const medias = await this.resolveMediasByTitles([info.mediaTitle]);
    contentEntity.medias = medias;

    if (!info.season) {
      console.warn(
        `[parseExpressTitle] No season info found (https://www.youtube.com/watch?v=${youtubeVideo.resourceVideoId})`,
      );
    }

    return contentEntity;
  }

  private parseExpressTitle(rawTitle: string): ExpressTitleInfo {
    let text = rawTitle
      .replace(/^Filmb[aá]r[aá]tok\s+Expressz:?\s*/i, '')
      .trim();

    const isSpoiler = /spoileres/i.test(text);
    text = text.replace(/\s*[[(]\s*spoileres\s*[)\]]/gi, '').trim();

    let season: string | undefined;

    const seasonMatch = text.match(
      /\(\s*(\d+(?:-\d+)?\s*\.?\s*(?:évad|rész)[^()]*)\)\s*$/i,
    );
    if (seasonMatch) {
      season = seasonMatch[1].trim();
      text = text.slice(0, seasonMatch.index).trim();
    } else if (!text.includes('(')) {
      const inlineSeasonMatch = text.match(
        /\d+(?:-\d+)?\s*\.?\s*(?:évad|rész)(?:\s*\/\s*\d+(?:-\d+)?(?:\s*\.?\s*(?:évad|rész))?)?/i,
      );
      if (inlineSeasonMatch) {
        season = inlineSeasonMatch[0].trim();
        text = text.replace(inlineSeasonMatch[0], '').trim();
      }
    }

    text = text
      .replace(/\s{2,}/g, ' ')
      .replace(/[-/]\s*$/, '')
      .trim();

    return {
      mediaTitle: text || rawTitle,
      season,
      isSpoiler,
    };
  }
}
