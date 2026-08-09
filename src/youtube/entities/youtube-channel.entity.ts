import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../common/db/entities/base.entity';

@Entity()
export class YoutubeChannel extends BaseEntity {
  // @Index()
  @Column({ unique: true })
  externalId: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  customUrl: string | null;

  @Column()
  uploadsId: string;
}
