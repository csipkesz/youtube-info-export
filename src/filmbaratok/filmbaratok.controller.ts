import { Controller, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { FilmbaratokParserService } from './services/filmbaratok-parser.service';
import { FilmbaratokJsonExportService } from './services/filmbaratok-json-export.service';

@Controller('filmbaratok')
@ApiTags('Filmbaratok')
export class FilmbaratokController {
  constructor(
    protected readonly parserService: FilmbaratokParserService,
    protected readonly jsonExportService: FilmbaratokJsonExportService,
  ) {}

  @Post('sync-youtube-channel')
  @ApiOperation({
    summary: 'Sync Filmbarátok YouTube channel with videos',
    description:
      'Sync all video from channel, and optionally parse then. When doParse is true, its parsing only the synced youtube videos. (Like when you sync new 2 video)',
  })
  @ApiQuery({ name: 'doParse', required: false, type: Boolean })
  async syncYoutubeChannel(@Query('doParse') doParse: string) {
    await this.parserService.syncYoutubeChannelWithVideos({
      doParse: doParse === 'true',
    });
  }

  @Post('parse-videos')
  @ApiOperation({
    summary: 'Parse all videos from database',
  })
  async parseAllVideos() {
    await this.parserService.parseVideosFromDb();
  }

  @Post('sync-tmdb')
  @ApiOperation({
    summary: 'Sync all TMDb media with database',
  })
  @ApiQuery({ name: 'onlyKnownMedia', required: false, type: Boolean })
  async syncTmdb(@Query('onlyKnownMedia') onlyKnownMedia: string) {
    return await this.parserService.parseMediaWithMovieDatabase({
      onlyKnownMedia: onlyKnownMedia === 'true',
    });
  }

  @Post('export-json')
  @ApiOperation({
    summary: 'Export all data to JSON file',
  })
  async exportDataToJson() {
    await this.jsonExportService.clearExportFolder();
    await this.jsonExportService.exportDbToJson();
  }
}
