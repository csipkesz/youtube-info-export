import { Injectable } from '@nestjs/common';
import TMDB from '@blacktiger/tmdb';
import { AppConfigService } from '../../../common/app-config/app-config.service';

@Injectable()
export class TmdbService {
  private readonly tmdb: TMDB;

  constructor(protected readonly appConfig: AppConfigService) {
    this.tmdb = new TMDB(appConfig.get('TMDB_API_KEY'), 'hu-HU');
  }

  async searchMovie(query: string) {
    return this.tmdb.search.movie(query, {
      page: 1,
    });
  }

  async searchMulti(query: string) {
    return this.tmdb.search.multi(query, {
      page: 1,
    });
  }
}
