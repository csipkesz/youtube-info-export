import { Expose } from 'class-transformer';

export class FilmbaratokPersonReadDto {
  @Expose()
  id: string;

  @Expose()
  name: string;
}
