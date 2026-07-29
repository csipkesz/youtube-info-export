import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppConfigService } from './common/app-config/app-config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Config
  const appConfig: AppConfigService = app.get(AppConfigService);
  const APP_PORT = appConfig.get('APP_PORT');

  await app.listen(APP_PORT);
}

bootstrap();
