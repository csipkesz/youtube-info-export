import { BaseEntity } from '../../common/db/entities/base.entity';
import { Column, Entity, JoinTable, ManyToMany } from 'typeorm';
import { FilmbaratokCategory } from '../enums/filmbaratok-category.enum';
import { FilmbaratokPerson } from './filmbaratok-person.entity';
import { FilmbaratokMedia } from './filmbaratok-media.entity';
import { FilmbaratokContentTopic } from './columns/filmbaratok-content-topic.column';

@Entity()
export class FilmbaratokContent extends BaseEntity {
  @Column({ type: 'enum', enum: FilmbaratokCategory })
  category: FilmbaratokCategory;

  @Column()
  title: string;

  @Column({ unique: true })
  youtubeId: string;

  @Column()
  thumbnailUrl: string;

  // @Column()
  // description: string;

  @Column()
  durationInMinutes: number;

  @Column()
  releaseDate: Date;

  @Column({ type: 'simple-json', nullable: true })
  topics: FilmbaratokContentTopic[] | null;

  @ManyToMany(() => FilmbaratokPerson, (person) => person.contents, {
    orphanedRowAction: 'delete',
    onDelete: 'CASCADE',
  })
  @JoinTable()
  participants: FilmbaratokPerson[];

  // It maybe can be one to many, but prepare when need to connect one media to more content
  @ManyToMany(() => FilmbaratokMedia, (media) => media.contents, {
    orphanedRowAction: 'delete',
    onDelete: 'CASCADE',
  })
  @JoinTable()
  medias: FilmbaratokMedia[];

  get youtubeUrl() {
    return `https://www.youtube.com/watch?v=${this.youtubeId}`;
  }
}
