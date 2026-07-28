import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { AppConfigService } from './common/config/env';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Config
  const configService: AppConfigService = app.get(ConfigService);
  const APP_PORT = configService.get('APP_PORT', { infer: true });

  await app.listen(APP_PORT);
}

bootstrap();
