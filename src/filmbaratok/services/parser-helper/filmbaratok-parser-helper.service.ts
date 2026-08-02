import { Injectable } from '@nestjs/common';
import { FilmbaratokContentPodcastParserService } from './filmbaratok-content-podcast-parser.service';
import { FilmbaratokCategory } from '../../enums/filmbaratok-category.enum';
import { FilmbaratokContentOtherParserService } from './filmbaratok-content-other-parser.service';

@Injectable()
export class FilmbaratokParserHelperService {
  constructor(
    protected readonly podcastParser: FilmbaratokContentPodcastParserService,
    protected readonly otherParser: FilmbaratokContentOtherParserService,
  ) {}

  getParser(category: FilmbaratokCategory) {
    switch (category) {
      case FilmbaratokCategory.PODCAST:
        return this.podcastParser;
      default:
        return this.otherParser;
    }
  }
}
