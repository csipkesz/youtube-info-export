import { Injectable, OnModuleInit } from '@nestjs/common';
import { YoutubeApiService } from './api/youtube-api.service';
import { InjectRepository } from '@nestjs/typeorm';
import { YoutubeChannel } from './entities/youtube-channel.entity';
import { Repository } from 'typeorm';

@Injectable()
export class YoutubeChannelService implements OnModuleInit {
  constructor(
    private readonly youtubeApi: YoutubeApiService,
    @InjectRepository(YoutubeChannel)
    private readonly youtubeChannelRepo: Repository<YoutubeChannel>,
  ) {}

  async onModuleInit() {
    // await this.youtubeChannelRepo.deleteAll();
    // console.log('Deleted all channels');

    await this.syncChannel({ channelId: 'UCejqyGXi812VAJK5emU3OqQ' });
  }

  async syncChannel(options: { channelId: string }) {
    const { channelId } = options;

    const channel = await this.findChannel(channelId);
    console.log(`Syncing channel: ${channel.name}`);
  }

  // TODO: Upsert logic with updated date ttl
  private async findChannel(channelId: string) {
    const existingChannel = await this.youtubeChannelRepo.findOne({
      where: { channelId },
    });

    if (existingChannel) {
      console.log(`Channel already exists: ${existingChannel.name}`);
      return existingChannel;
    }

    const channelResult = await this.youtubeApi.getChannel(channelId);

    if (!channelResult) {
      throw new Error('Channel not found');
    }

    const newChannel = this.youtubeChannelRepo.create({
      channelId: channelResult.channel.id,
      name: channelResult.channel.snippet.title,
      customUrl: channelResult.channel.snippet.customUrl,
      uploadsId: channelResult.uploadsPlaylistId,
    });

    return await this.youtubeChannelRepo.save(newChannel);
  }
}
