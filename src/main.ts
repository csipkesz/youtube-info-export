import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppConfigService } from './common/app-config/app-config.service';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Config
  const appConfig: AppConfigService = app.get(AppConfigService);
  const APP_PORT = appConfig.get('APP_PORT');

  const config = new DocumentBuilder()
    .setTitle('Youtube Info Export')
    .setDescription(
      'Save and parse youtube info from youtube channels with youtube api',
    )
    .setVersion('1.0')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  await app.listen(APP_PORT);
}

bootstrap();
