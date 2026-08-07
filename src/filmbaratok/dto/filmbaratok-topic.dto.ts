import { Expose, Type } from 'class-transformer';
import { FilmbaratokMediaReadDto } from './filmbaratok-media.dto';
import { FilmbaratokContentReadDto } from './filmbaratok-content.dto';

export class FilmbaratokTopicReadDto {
  @Expose()
  id: string;

  @Expose()
  title: string;

  @Expose()
  subtitle: string;

  @Expose()
  timestampString: string | null;

  @Expose()
  timestampInSeconds: number | null;

  @Expose()
  isSpoiler: boolean;

  @Expose()
  @Type(() => FilmbaratokMediaReadDto)
  medias: FilmbaratokMediaReadDto[];

  @Expose()
  @Type(() => FilmbaratokContentReadDto)
  content: FilmbaratokContentReadDto;
}
