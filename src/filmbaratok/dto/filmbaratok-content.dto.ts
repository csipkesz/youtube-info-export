import { Expose, Transform, Type } from 'class-transformer';
import { FilmbaratokCategory } from '../enums/filmbaratok-category.enum';
import { FilmbaratokPersonReadDto } from './filmbaratok-person.dto';

export class FilmbaratokContentReadDto {
  @Expose()
  category: FilmbaratokCategory;

  @Expose()
  title: string;

  @Expose()
  youtubeId: string;

  @Expose()
  thumbnailUrl: string;

  @Expose()
  durationInMinutes: number;

  @Expose()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  @Transform(({ value }) => (value instanceof Date ? value.getTime() : value))
  releaseDate: number;

  @Expose()
  @Type(() => FilmbaratokPersonReadDto)
  participants: FilmbaratokPersonReadDto[];
}
