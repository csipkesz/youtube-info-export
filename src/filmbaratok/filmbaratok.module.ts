import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilmbaratokContent } from './entities/filmbaratok-content.entity';
import { FilmbaratokMedia } from './entities/filmbaratok-media.entity';
import { FilmbaratokPerson } from './entities/filmbaratok-person.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FilmbaratokContent,
      FilmbaratokMedia,
      FilmbaratokPerson,
    ]),
  ],
})
export class FilmbaratokModule {}
