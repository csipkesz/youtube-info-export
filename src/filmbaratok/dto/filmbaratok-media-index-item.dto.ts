import { Expose, Type } from 'class-transformer';

export class FilmbaratokMediaIndexItemDto {
  @Expose()
  id: string;

  @Expose()
  title: string;

  @Expose()
  originalTitle: string | null;

  @Expose()
  posterPath: string | null;

  @Expose()
  backdropPath: string | null;

  @Expose()
  @Type(() => FilmbaratokMediaIndexItemContent)
  contents: FilmbaratokMediaIndexItemContent[];
}

export class FilmbaratokMediaIndexItemContent {
  @Expose()
  id: string;

  @Expose()
  title: string;

  @Expose()
  youtubeId: string;

  @Expose()
  timestampInSeconds?: number;

  @Expose()
  participants: string[];
}
