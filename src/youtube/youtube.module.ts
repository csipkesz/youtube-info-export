import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { YoutubeChannel } from './entities/youtube-channel.entity';

@Module({
  imports: [TypeOrmModule.forFeature([YoutubeChannel])],
})
export class YoutubeModule {}
