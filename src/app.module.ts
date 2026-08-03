import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { YoutubeModule } from './youtube/youtube.module';
import { AppConfigModule } from './common/app-config/app-config.module';
import { AppConfigService } from './common/app-config/app-config.service';
import { FilmbaratokModule } from './filmbaratok/filmbaratok.module';

@Module({
  imports: [
    AppConfigModule,
    TypeOrmModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (appConfig: AppConfigService) => ({
        type: 'mysql',
        host: appConfig.get('SQL_HOST'),
        port: appConfig.get('SQL_PORT'),
        username: appConfig.get('SQL_USER'),
        password: appConfig.get('SQL_PWD'),
        database: appConfig.get('SQL_DB'),
        synchronize: true,
        autoLoadEntities: true,
      }),
    }),
    YoutubeModule,
    FilmbaratokModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
