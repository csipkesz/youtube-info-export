import { Injectable, OnModuleInit } from '@nestjs/common';
import { YoutubeApiService } from './api/youtube-api.service';

@Injectable()
export class YoutubeChannelService implements OnModuleInit {
  constructor(readonly youtubeApiService: YoutubeApiService) {}

  async onModuleInit() {
    const channel = await this.youtubeApiService.getChannel(
      'UCejqyGXi812VAJK5emU3OqQ',
    );

    console.log(
      `fetched channel: ${channel?.channel.snippet.title} | uploads: ${channel?.uploadsPlaylistId}`,
    );

    const playlistId = channel?.uploadsPlaylistId;
    if (!playlistId) {
      console.error('No uploads playlist id');
      return;
    }

    const videos = await this.youtubeApiService.getPlaylistVideos(playlistId);
    console.log(
      `fetched ${videos.videos.length} videos, first: ${videos.videos[0].title}`,
    );

    if (videos.nextPageToken) {
      console.log(
        `Has next page token: ${videos.nextPageToken}, continue fetching...`,
      );

      const nextVideos = await this.youtubeApiService.getPlaylistVideos(
        playlistId,
        {
          pageToken: videos.nextPageToken,
        },
      );
      console.log(
        `fetched ${nextVideos.videos.length} videos, last: ${nextVideos.videos[0].title}`,
      );
    }
  }
}
