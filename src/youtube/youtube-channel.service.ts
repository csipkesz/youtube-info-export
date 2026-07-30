import { Injectable, OnModuleInit } from '@nestjs/common';
import { YoutubeApiService } from './api/youtube-api.service';
import { InjectRepository } from '@nestjs/typeorm';
import { YoutubeChannel } from './entities/youtube-channel.entity';
import { Repository } from 'typeorm';
import { YoutubeVideo } from './entities/youtube-video.entity';
import { YoutubeApiPlaylistVideoSnippet } from './api/interfaces/youtube-api-playlist-video.interface';

@Injectable()
export class YoutubeChannelService implements OnModuleInit {
  constructor(
    private readonly youtubeApi: YoutubeApiService,
    @InjectRepository(YoutubeChannel)
    private readonly youtubeChannelRepo: Repository<YoutubeChannel>,
    @InjectRepository(YoutubeVideo)
    private readonly youtubeVideoRepo: Repository<YoutubeVideo>,
  ) {}

  async onModuleInit() {
    // await this.youtubeChannelRepo.deleteAll();
    // console.log('Deleted all channels');
    // await this.syncChannel({ externalChannelId: 'UCejqyGXi812VAJK5emU3OqQ' });
  }

  /**
   * Synchronizes a channel and its videos by its external ID. If the channel doesn't exist, it will be created.
   * @param options The options containing the external channel ID.
   * @returns An object containing the synchronized channel and its videos.
   */
  async syncChannel(options: { externalChannelId: string }) {
    const { externalChannelId } = options;

    const channel = await this.findChannel(externalChannelId);
    const videos = await this.fetchChannelVideos(channel);

    return {
      channel,
      videos,
    };
  }

  /**
   * Finds a channel by its external ID, or creates it if it doesn't exist.
   * @param externalChannelId The external ID of the channel to find or create.
   * @returns The found or created YoutubeChannel entity.
   */
  private async findChannel(externalChannelId: string) {
    const existingChannel = await this.youtubeChannelRepo.findOne({
      where: { externalId: externalChannelId },
    });

    if (existingChannel) {
      return existingChannel;
    }

    const channelResult = await this.youtubeApi.getChannel(externalChannelId);

    if (!channelResult) {
      throw new Error('Channel not found');
    }

    const newChannel = this.youtubeChannelRepo.create({
      externalId: channelResult.channel.id,
      name: channelResult.channel.snippet.title,
      customUrl: channelResult.channel.snippet.customUrl,
      uploadsId: channelResult.uploadsPlaylistId,
    });

    return await this.youtubeChannelRepo.save(newChannel);
  }

  /**
   * Fetches all videos for a given channel and upserts them into the database. When a page not contains any new videos, the iteration will stop.
   * @param channel The YoutubeChannel entity for which to fetch videos.
   * @param options Optional parameters, including forceAll to fetch all videos regardless of existing ones.
   * @returns An array of YoutubeVideo entities that were upserted.
   */
  private async fetchChannelVideos(
    channel: YoutubeChannel,
    options: { forceAll?: boolean } = {},
  ) {
    const videoEntities: YoutubeVideo[] = [];
    const lastPublishedVideo = options?.forceAll
      ? null
      : await this.youtubeVideoRepo.findOne({
          where: { youtubeChannelId: channel.id },
          order: { publishedAt: 'DESC' },
        });

    await this.iteratePlaylistVideos(channel.uploadsId, async (videos) => {
      const entities = videos.map((video) =>
        this.youtubeVideoRepo.create({
          youtubeChannelId: channel.id,
          resourceVideoId: video.resourceId.videoId,
          title: video.title,
          description: video.description,
          publishedAt: new Date(video.publishedAt),
        }),
      );

      if (lastPublishedVideo) {
        const seenNewVideo = entities.some(
          (video) => video.publishedAt > lastPublishedVideo.publishedAt,
        );
        if (!seenNewVideo) {
          return false;
        }
      }

      await this.youtubeVideoRepo.upsert(entities, ['resourceVideoId']);
      videoEntities.push(...entities);
    });

    return videoEntities;
  }

  /**
   * Iterates through all videos in a playlist, calling the provided callback for each page of results.
   * @param playlistId The ID of the playlist to iterate through.
   * @param onPage The callback function to call for each page of videos. For stop the iterate, return false.
   */
  private async iteratePlaylistVideos(
    playlistId: string,
    onPage: (
      videos: YoutubeApiPlaylistVideoSnippet[],
    ) => Promise<boolean | void>,
  ) {
    let pageToken: string | undefined;

    do {
      const { videos, nextPageToken } = await this.youtubeApi.getPlaylistVideos(
        playlistId,
        { pageToken },
      );

      const shouldContinue = await onPage(videos);
      if (shouldContinue === false) {
        break;
      }

      pageToken = nextPageToken;
    } while (pageToken);
  }
}
