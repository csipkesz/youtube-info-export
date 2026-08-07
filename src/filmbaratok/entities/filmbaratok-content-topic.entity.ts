import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  type Relation,
} from 'typeorm';
import { BaseEntity } from '../../common/db/entities/base.entity';
import { FilmbaratokContent } from './filmbaratok-content.entity';
import { FilmbaratokMedia } from './filmbaratok-media.entity';

@Entity()
export class FilmbaratokContentTopic extends BaseEntity {
  @ManyToOne(() => FilmbaratokContent, (content) => content.topics, {
    onDelete: 'CASCADE',
  })
  content: Relation<FilmbaratokContent>;

  @Column()
  contentId: string;

  @Column()
  title: string;

  @Column({ type: 'varchar', nullable: true })
  subtitle: string | null;

  @Column({ default: 0 })
  position: number;

  @Column({ type: 'varchar', nullable: true })
  timestampString: string | null;

  @Column({ default: 0 })
  timestampInSeconds: number;

  @Column({ default: false })
  isSpoiler: boolean;

  @ManyToMany(() => FilmbaratokMedia, (media) => media.topics, {
    onDelete: 'CASCADE',
    orphanedRowAction: 'delete',
  })
  @JoinTable()
  medias: Relation<FilmbaratokMedia[]>;

  /* - Transient */
  isMedia: boolean;
}
