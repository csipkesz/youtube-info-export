import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { YoutubeChannel } from './entities/youtube-channel.entity';
import { YoutubeVideo } from './entities/youtube-video.entity';

@Module({
  imports: [TypeOrmModule.forFeature([YoutubeChannel, YoutubeVideo])],
})
export class YoutubeModule {}
