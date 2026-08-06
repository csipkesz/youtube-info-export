import { Column, Entity, ManyToMany } from 'typeorm';
import { BaseEntity } from '../../common/db/entities/base.entity';
import { FilmbaratokContentTopic } from './filmbaratok-content-topic.entity';

@Entity()
export class FilmbaratokMedia extends BaseEntity {
  @Column({ unique: true })
  title: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  originalTitle: string | null;

  @ManyToMany(() => FilmbaratokContentTopic, (topic) => topic.medias, {
    onDelete: 'CASCADE',
  })
  topics: FilmbaratokContentTopic[];

  @Column({ type: 'text', nullable: true })
  overview: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  backdropPath: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  posterPath: string | null;

  @Column({ type: 'datetime', nullable: true })
  releaseDate: Date | null;

  @Column({ type: 'int', nullable: true })
  tmdbId: number | null;

  @Column({ type: 'datetime', nullable: true })
  lastTmdbUpdate: Date | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  mediaType: string | null;
}
