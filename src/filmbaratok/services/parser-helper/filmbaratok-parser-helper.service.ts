import { Injectable } from '@nestjs/common';
import { FilmbaratokContentPodcastParserService } from './filmbaratok-content-podcast-parser.service';
import { FilmbaratokCategory } from '../../enums/filmbaratok-category.enum';

@Injectable()
export class FilmbaratokParserHelperService {
  constructor(
    protected readonly podcastParser: FilmbaratokContentPodcastParserService,
  ) {}

  getParser(category: FilmbaratokCategory) {
    // TODO: Add default and handle category
    return this.podcastParser;
  }
}
