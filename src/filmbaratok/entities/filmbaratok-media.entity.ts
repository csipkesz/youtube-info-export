import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/db/entities/base.entity';
import { FilmbaratokContentTopic } from './filmbaratok-content-topic.entity';

@Entity()
export class FilmbaratokMedia extends BaseEntity {
  @Column({ unique: true })
  title: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  titleEn: string | null;

  @OneToMany(() => FilmbaratokContentTopic, (topic) => topic.media, {
    onDelete: 'CASCADE',
  })
  topics: FilmbaratokContentTopic[];

  // TODO AFTER MOVIE DB: Thumbnail, description, release date, some link to imdb if possible
}
