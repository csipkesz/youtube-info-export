import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from './env';

@Injectable()
export class AppConfigService extends ConfigService<
  EnvironmentVariables,
  true
> {
  override get<K extends keyof EnvironmentVariables>(
    key: K,
  ): EnvironmentVariables[K] {
    return super.get(key, { infer: true });
  }

  override getOrThrow<K extends keyof EnvironmentVariables>(
    key: K,
  ): EnvironmentVariables[K] {
    return super.getOrThrow(key, { infer: true });
  }
}
