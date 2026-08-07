import { Expose, Type } from 'class-transformer';
import { FilmbaratokTopicReadDto } from './filmbaratok-topic.dto';

export class FilmbaratokMediaReadDto {
  @Expose()
  id: string;

  @Expose()
  title: string;

  @Expose()
  originalTitle: string | null;

  @Expose()
  overview: string | null;

  @Expose()
  backdropPath: string | null;

  @Expose()
  posterPath: string | null;

  @Expose()
  releaseDate: Date | null;

  @Expose()
  @Type(() => FilmbaratokTopicReadDto)
  topics: FilmbaratokTopicReadDto[];
}
