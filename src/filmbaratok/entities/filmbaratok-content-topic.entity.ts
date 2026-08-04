import { Column, Entity, ManyToOne, type Relation } from 'typeorm';
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

  @Column({ default: 0 })
  position: number;

  @Column({ type: 'varchar', nullable: true })
  timestampString: string | null;

  @Column({ default: 0 })
  timestampInSeconds: number;

  @Column({ default: false })
  isSpoiler: boolean;

  @ManyToOne(() => FilmbaratokMedia, (media) => media.topics, {
    onDelete: 'CASCADE',
    nullable: true,
    cascade: true,
  })
  media: Relation<FilmbaratokMedia>;

  @Column({ type: 'varchar', nullable: true })
  mediaId: string | null;

  /* - Transient */
  isMedia: boolean;
}
