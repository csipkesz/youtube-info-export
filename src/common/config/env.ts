import { z } from 'zod';
import { ConfigService } from '@nestjs/config';

/**
 * Define ENV schema with validation and default values.
 */
const envSchema = z.object({
  // APP
  APP_PORT: z.coerce.number().default(5000),

  // SQL
  SQL_HOST: z.string().default('localhost'),
  SQL_PORT: z.coerce.number().default(3306),
  SQL_USER: z.string().default('root'),
  SQL_PWD: z.string().default(''),
  SQL_DB: z.string().nonempty(),

  // YOUTUBE
  YOUTUBE_API_KEY: z.string().nonempty(),
  YOUTUBE_API_BASE_URL: z
    .string()
    .default('https://youtube.googleapis.com/youtube/v3'),
});

/**
 * Validate loaded config by config module.
 * @param config
 */
export function validateEnvSchema(config: Record<string, any>) {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    console.error(
      `SCHEME ERROR: ${JSON.stringify(z.treeifyError(result.error))}`,
    );
    throw new Error('Error validateEnvSchema');
  }

  return result.data;
}

/**
 * Get config type from zod schema.
 */
export type EnvironmentVariables = z.infer<typeof envSchema>;

/**
 * Config service interface from zod schema.
 */
export type IConfigService = ConfigService<EnvironmentVariables, true>;

/**
 * Extend nodejs process env types with zod schema.
 */

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface ProcessEnv extends EnvironmentVariables {}
  }
}
