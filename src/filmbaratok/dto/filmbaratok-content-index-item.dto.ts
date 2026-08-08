import { Expose } from 'class-transformer';
import { FilmbaratokCategory } from '../enums/filmbaratok-category.enum';

export class FilmbaratokContentIndexItemDto {
  @Expose()
  id: string;

  @Expose()
  title: string;

  @Expose()
  category: FilmbaratokCategory;

  @Expose()
  youtubeId: string;

  @Expose()
  thumbnailUrl: string;

  @Expose()
  releaseDate: string;

  @Expose()
  participants: string[];
}
