import { DynamicModule, Global, Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { getRedisConfig } from '@/config/redis.config';
import {
  REDIS_CLIENT,
  RedisService,
} from '@/modules/system/redis/redis.service';

@Global()
@Module({})
export class RedisModule {
  static forRootAsync(): DynamicModule {
    return {
      module: RedisModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: REDIS_CLIENT,
          inject: [ConfigService],
          useFactory: (configService: ConfigService): Redis | null => {
            const logger = new Logger('RedisModule');
            const enabled = configService.get<boolean>('REDIS_ENABLED');

            if (!enabled) {
              logger.log('Redis is disabled (REDIS_ENABLED=false)');
              return null;
            }

            const options = getRedisConfig(configService);
            const client = new Redis(options);

            client.on('connect', () => {
              logger.log(
                `Connecting to Redis at ${options.host}:${options.port}...`,
              );
            });

            client.on('ready', () => {
              logger.log(`Redis connected at ${options.host}:${options.port}`);
            });

            client.on('error', (err) => {
              logger.error(`Redis error: ${err.message}`);
            });

            client.on('close', () => {
              logger.warn('Redis connection closed');
            });

            return client;
          },
        },
        RedisService,
      ],
      exports: [RedisService],
    };
  }
}
