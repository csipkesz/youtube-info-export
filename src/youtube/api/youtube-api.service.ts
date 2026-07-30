import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../../common/app-config/app-config.service';
import { YoutubeApiChannelList } from './interfaces/youtube-api-channel.interface';

@Injectable()
export class YoutubeApiService {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly appConfig: AppConfigService,
  ) {
    this.baseUrl = this.appConfig.get('YOUTUBE_API_BASE_URL');
    this.apiKey = this.appConfig.get('YOUTUBE_API_KEY');
  }

  async request<T>(options: {
    method: AxiosRequestConfig['method'];
    path: string;
    query?: Record<string, string | number | boolean | string[]>;
    body?: Record<string, any>;
  }) {
    const url = `${this.baseUrl}/${options.path}`;

    try {
      const response: AxiosResponse<T> = await firstValueFrom(
        this.httpService.request({
          method: options.method,
          url,
          params: {
            ...(options.query || {}),
            key: this.apiKey,
          },
          data: options.body,
        }),
      );

      return response.data;
    } catch (e) {
      throw new Error('Youtube API Error', { cause: e });
    }
  }

  async getChannel(channelId: string) {
    const result = await this.request<YoutubeApiChannelList>({
      method: 'GET',
      path: 'channels',
      query: {
        part: 'snippet,contentDetails',
        id: channelId,
      },
    });

    if (result.pageInfo.totalResults == 0) {
      return null;
    }

    const channel = result.items.find((item) => item.id === channelId);
    if (!channel) {
      return null;
    }

    return {
      channel,
      uploadsPlaylistId: channel.contentDetails?.relatedPlaylists?.uploads,
    };
  }

  async getPlaylistItems(playlistId: string, options: {}) {}
}
