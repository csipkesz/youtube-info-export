import { Column, Entity, ManyToOne, type Relation } from 'typeorm';
import { BaseEntity } from '../../common/db/entities/base.entity';
import { YoutubeChannel } from './youtube-channel.entity';

@Entity()
export class YoutubeVideo extends BaseEntity {
  @Column()
  youtubeChannelId: string;

  @ManyToOne(() => YoutubeChannel, { onDelete: 'CASCADE' })
  youtubeChannel: Relation<YoutubeChannel>;

  // @Index({ unique: true })
  @Column()
  resourceVideoId: string;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column()
  publishedAt: Date;

  getThumbnailUrl(
    size: 'default' | 'mqdefault' | 'hqdefault' | 'sddefault' | 'maxresdefault',
  ) {
    return `https://i.ytimg.com/vi/${this.resourceVideoId}/${size}.jpg`;
  }
}
