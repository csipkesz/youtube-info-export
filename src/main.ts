import {NestFactory} from '@nestjs/core';
import {AppModule} from './app.module';
import {ConfigService} from "@nestjs/config";
import {IConfigService} from "./common/config/env";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Config
    const configService = app.get(ConfigService) as IConfigService;
    const APP_PORT = configService.get("APP_PORT", {infer: true})

    await app.listen(APP_PORT);
}

bootstrap();
