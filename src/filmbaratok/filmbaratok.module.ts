import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilmbaratokContent } from './entities/filmbaratok-content.entity';
import { FilmbaratokMedia } from './entities/filmbaratok-media.entity';
import { FilmbaratokPerson } from './entities/filmbaratok-person.entity';
import { FilmbaratokParserService } from './services/filmbaratok-parser.service';
import { YoutubeModule } from '../youtube/youtube.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FilmbaratokContent,
      FilmbaratokMedia,
      FilmbaratokPerson,
    ]),
    YoutubeModule,
  ],
  providers: [FilmbaratokParserService],
})
export class FilmbaratokModule {}
