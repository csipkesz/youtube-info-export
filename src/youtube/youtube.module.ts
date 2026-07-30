import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { YoutubeChannel } from './entities/youtube-channel.entity';
import { YoutubeVideo } from './entities/youtube-video.entity';
import { YoutubeApiService } from './api/youtube-api.service';
import { HttpModule } from '@nestjs/axios';
import { YoutubeChannelService } from './youtube-channel.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([YoutubeChannel, YoutubeVideo]),
    HttpModule,
  ],
  providers: [YoutubeApiService, YoutubeChannelService],
  exports: [YoutubeChannelService],
})
export class YoutubeModule {}
