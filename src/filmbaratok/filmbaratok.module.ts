import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilmbaratokContent } from './entities/filmbaratok-content.entity';
import { FilmbaratokMedia } from './entities/filmbaratok-media.entity';
import { FilmbaratokPerson } from './entities/filmbaratok-person.entity';
import { FilmbaratokParserService } from './services/filmbaratok-parser.service';
import { YoutubeModule } from '../youtube/youtube.module';
import { FilmbaratokParserHelperService } from './services/parser-helper/filmbaratok-parser-helper.service';
import { FilmbaratokContentPodcastParserService } from './services/parser-helper/filmbaratok-content-podcast-parser.service';
import { FilmbaratokContentOtherParserService } from './services/parser-helper/filmbaratok-content-other-parser.service';
import { FilmbaratokContentExpressParserService } from './services/parser-helper/filmbaratok-content-express-parser.service';
import { FilmbaratokContentAudioCommentaryParserService } from './services/parser-helper/filmbaratok-content-audio-commentary-parser.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FilmbaratokContent,
      FilmbaratokMedia,
      FilmbaratokPerson,
    ]),
    YoutubeModule,
  ],
  providers: [FilmbaratokParserService, FilmbaratokParserHelperService, FilmbaratokContentPodcastParserService, FilmbaratokContentOtherParserService, FilmbaratokContentExpressParserService, FilmbaratokContentAudioCommentaryParserService],
})
export class FilmbaratokModule {}
