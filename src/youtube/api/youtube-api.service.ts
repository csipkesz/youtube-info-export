import { Injectable, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';
import { type IConfigService } from '../../common/config/env';

@Injectable()
export class YoutubeApiService implements OnModuleInit {
  private baseUrl: string;
  private apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: IConfigService,
  ) {}

  onModuleInit() {
    this.baseUrl = this.configService.get('YOUTUBE_API_BASE_URL');
    this.apiKey = this.configService.get('YOUTUBE_API_KEY');
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
}
