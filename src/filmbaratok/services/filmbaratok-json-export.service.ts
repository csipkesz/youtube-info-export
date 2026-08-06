import { Injectable } from '@nestjs/common';
import { FilmbaratokMedia } from '../entities/filmbaratok-media.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  FilmbaratokMediaIndexItemContent,
  FilmbaratokMediaIndexItemDto,
} from '../dto/filmbaratok-media-index-item.dto';
import { plainToClass } from 'class-transformer';
import path from 'node:path';
import fs from 'node:fs/promises';

@Injectable()
export class FilmbaratokJsonExportService {
  constructor(
    @InjectRepository(FilmbaratokMedia)
    private readonly mediaRepo: Repository<FilmbaratokMedia>,
  ) {}

  onModuleInit() {
    this.exportDbToJson();
  }

  async exportDbToJson() {
    console.time('Exporting DB to JSON');
    await this.exportMediaIndex();
    console.timeEnd('Exporting DB to JSON');
  }

  private async exportMediaIndex() {
    const medias = await this.mediaRepo.find({
      relations: {
        topics: {
          content: {
            participants: true,
          },
        },
      },
    });

    const listOfMediaIndex: FilmbaratokMediaIndexItemDto[] = [];
    for (const media of medias) {
      const indexItem = new FilmbaratokMediaIndexItemDto();
      indexItem.id = media.id;
      indexItem.title = media.title;
      indexItem.originalTitle = media.originalTitle;
      indexItem.posterPath = media.posterPath;
      indexItem.backdropPath = media.backdropPath;
      indexItem.contents = media.topics.map((topic) => {
        const contentItem = new FilmbaratokMediaIndexItemContent();
        contentItem.id = topic.contentId;
        contentItem.title = topic.content.title;
        contentItem.timestampInSeconds = topic.timestampInSeconds;
        contentItem.youtubeId = topic.content.youtubeId;
        contentItem.participants = topic.content.participants.map(
          (p) => p.name,
        );

        return contentItem;
      });

      // Currently we prepare manually, but for safe do transform.
      listOfMediaIndex.push(
        plainToClass(FilmbaratokMediaIndexItemDto, indexItem, {
          excludeExtraneousValues: true,
        }),
      );
    }

    await this.saveDataToJson(listOfMediaIndex, 'index/medias');
  }

  async saveDataToJson(data: any, subPath: string) {
    const outputDir = path.join(process.cwd(), 'data');
    const filePath = path.join(outputDir, `${subPath}.json`);

    const targetDir = path.dirname(filePath);

    try {
      // A targetDir-re hívjuk meg a rekurzív hozást, így a tetszőlegesen mély almappák is létrejönnek
      await fs.mkdir(targetDir, { recursive: true });

      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');

      console.log(`Data successfully saved to ${filePath}`);
    } catch (err) {
      console.error('Failed to write JSON report file:', err);
    }
  }
}
