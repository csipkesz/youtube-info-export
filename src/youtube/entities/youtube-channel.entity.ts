import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../common/db/entities/base.entity';

@Entity()
export class YoutubeChannel extends BaseEntity {
  @Column({ unique: true })
  internalId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  customUrl: string | null;

  @Column()
  uploadsId: string;
}
