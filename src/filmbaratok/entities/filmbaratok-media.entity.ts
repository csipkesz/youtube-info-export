import { Column, Entity, ManyToMany } from 'typeorm';
import { BaseEntity } from '../../common/db/entities/base.entity';
import { FilmbaratokContent } from './filmbaratok-content.entity';

@Entity()
export class FilmbaratokMedia extends BaseEntity {
  @Column({ unique: true })
  title: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  titleEn: string | null;

  @ManyToMany(() => FilmbaratokContent, (content) => content.medias, {
    onDelete: 'CASCADE',
  })
  contents: FilmbaratokContent[];

  // TODO AFTER MOVIE DB: Thumbnail, description, release date, some link to imdb if possible
}
