import { Column, Entity, Index, ManyToMany } from 'typeorm';
import { BaseEntity } from '../../common/db/entities/base.entity';
import { FilmbaratokContent } from './filmbaratok-content.entity';

@Entity()
export class FilmbaratokPerson extends BaseEntity {
  @Index()
  @Column({ unique: true })
  name: string;

  @ManyToMany(() => FilmbaratokContent, (content) => content.participants)
  contents: FilmbaratokContent[];
}
