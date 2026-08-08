import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { WinstonModule } from 'nest-winston';
import { APP_GUARD } from '@nestjs/core';
import { join } from 'path';
import * as dotenv from 'dotenv';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { envValidationSchema } from '@/config/env.validation';
import { getDatabaseConfig } from '@/config/database.config';
import { getWinstonConfig } from '@/config/logger.config';
import { LoggerMiddleware } from '@/common/middleware/logger.middleware';
import { HealthModule } from '@/modules/system/health/health.module';
import { UsersModule } from '@/modules/app/users/users.module';
import { RedisModule } from '@/modules/system/redis/redis.module';
import { AuthModule } from '@/modules/app/auth/auth.module';
import { UploadModule } from '@/modules/app/upload/upload.module';
import { TasksModule } from '@/modules/system/tasks/tasks.module';
import { WebsocketModule } from '@/modules/system/websocket/websocket.module';
import { MailModule } from '@/modules/system/mail/mail.module';
import { JwtAuthGuard } from '@/modules/app/auth/guards/jwt-auth.guard';

// 在模块定义前加载环境变量：先用基础配置，再用 .local 覆盖敏感字段
const env = process.env.NODE_ENV ?? 'development';
dotenv.config({ path: `.env.${env}` });
dotenv.config({ path: `.env.${env}.local`, override: true });

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    WinstonModule.forRoot(getWinstonConfig()),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
    }),
    RedisModule.forRootAsync(),
    ServeStaticModule.forRoot(
      {
        rootPath: join(__dirname, '..', 'public'),
        exclude: ['/api/{*path}', '/uploads/{*path}'],
      },
      {
        rootPath: join(__dirname, '..', 'uploads'),
        serveRoot: '/uploads',
        exclude: ['/api/{*path}'],
      },
    ),
    HealthModule,
    UsersModule,
    AuthModule,
    UploadModule,
    TasksModule,
    WebsocketModule,
    MailModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*path');
  }
}
