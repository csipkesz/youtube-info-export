import { Injectable } from '@nestjs/common';
import { FilmbaratokContentPodcastParserService } from './filmbaratok-content-podcast-parser.service';
import { FilmbaratokCategory } from '../../enums/filmbaratok-category.enum';
import { FilmbaratokContentOtherParserService } from './filmbaratok-content-other-parser.service';
import { FilmbaratokContentExpressParserService } from './filmbaratok-content-express-parser.service';

@Injectable()
export class FilmbaratokParserHelperService {
  constructor(
    protected readonly podcastParser: FilmbaratokContentPodcastParserService,
    protected readonly expressParser: FilmbaratokContentExpressParserService,
    protected readonly otherParser: FilmbaratokContentOtherParserService,
  ) {}

  getParser(category: FilmbaratokCategory) {
    switch (category) {
      case FilmbaratokCategory.PODCAST:
        return this.podcastParser;
      case FilmbaratokCategory.EXPRESS:
        return this.expressParser;
      default:
        return this.otherParser;
    }
  }
}
