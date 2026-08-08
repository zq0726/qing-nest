import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  const isDev = configService.get('NODE_ENV') === 'development';

  return {
    type: 'mysql',
    host: configService.get<string>('DB_HOST'),
    port: configService.get<number>('DB_PORT'),
    username: configService.get<string>('DB_USERNAME'),
    password: configService.get<string>('DB_PASSWORD'),
    database: configService.get<string>('DB_DATABASE'),
    autoLoadEntities: true,
    synchronize: isDev,
    retryAttempts: 3,
    retryDelay: 3000,
    logging: isDev ? ['error', 'warn'] : ['error'],
    extra: {
      connectionLimit: 10,
    },
  };
};
