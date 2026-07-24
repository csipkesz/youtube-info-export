import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { IConfigService, validateEnvSchema } from './common/config/env';
import { TypeOrmModule } from '@nestjs/typeorm';
import { YoutubeModule } from './youtube/youtube.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => {
        return validateEnvSchema(config);
      },
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: IConfigService) => ({
        type: 'mysql',
        host: configService.get('SQL_HOST', { infer: true }),
        port: configService.get('SQL_PORT', { infer: true }),
        username: configService.get('SQL_USER', { infer: true }),
        password: configService.get('SQL_PWD', { infer: true }),
        database: configService.get('SQL_DB', { infer: true }),
        synchronize: true,
        autoLoadEntities: true,
      }),
    }),
    YoutubeModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
