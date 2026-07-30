import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { YoutubeChannel } from './entities/youtube-channel.entity';
import { YoutubeVideo } from './entities/youtube-video.entity';
import { YoutubeApiService } from './api/youtube-api.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    TypeOrmModule.forFeature([YoutubeChannel, YoutubeVideo]),
    HttpModule,
  ],
  providers: [YoutubeApiService],
})
export class YoutubeModule {}
