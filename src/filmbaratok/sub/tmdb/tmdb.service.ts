import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../common/app-config/app-config.service';
import TMDB from '@blacktiger/tmdb';

@Injectable()
export class TmdbService {
  private readonly tmdb: TMDB;

  constructor(protected readonly appConfig: AppConfigService) {
    this.tmdb = new TMDB(appConfig.get('TMDB_API_KEY'), 'hu-HU');
  }

  async searchMulti(query: string) {
    return this.tmdb.search.multi(query, {
      page: 1,
    });
  }

  async getMovie(movieId: number) {
    return this.tmdb.movie.details(movieId);
  }

  async getSerie(serieId: number) {
    return this.tmdb.tvseries.details(serieId);
  }
}
