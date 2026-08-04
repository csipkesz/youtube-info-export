import { BaseEntity } from '../../common/db/entities/base.entity';
import { Column, Entity, JoinTable, ManyToMany, OneToMany } from 'typeorm';
import { FilmbaratokCategory } from '../enums/filmbaratok-category.enum';
import { FilmbaratokPerson } from './filmbaratok-person.entity';
import { FilmbaratokContentTopic } from './filmbaratok-content-topic.entity';

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

  @Column({ default: 0 })
  durationInMinutes: number;

  @Column()
  releaseDate: Date;

  @OneToMany(() => FilmbaratokContentTopic, (topic) => topic.content, {
    onDelete: 'CASCADE',
    orphanedRowAction: 'delete',
    cascade: true,
  })
  topics: FilmbaratokContentTopic[] | null;

  @ManyToMany(() => FilmbaratokPerson, (person) => person.contents, {
    orphanedRowAction: 'delete',
    onDelete: 'CASCADE',
  })
  @JoinTable()
  participants: FilmbaratokPerson[];

  get youtubeUrl() {
    return `https://www.youtube.com/watch?v=${this.youtubeId}`;
  }
}
