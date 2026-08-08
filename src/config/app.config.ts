import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { HttpExceptionFilter } from '@/common/filters/http-exception.filter';
import { UnhandledExceptionFilter } from '@/common/filters/unhandled-exception.filter';
import { TransformInterceptor } from '@/common/interceptors/transform.interceptor';
import { swaggerConfig } from '@/config/swagger.config';

export function setupApp(app: INestApplication) {
  const configService = app.get(ConfigService);
  const env = configService.get<string>('NODE_ENV', 'development');

  // 安全
  app.use(helmet());

  // CORS 白名单
  const origins = configService
    .get<string>('CORS_ORIGINS', '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: origins,
    credentials: true,
  });

  // 路由前缀
  app.setGlobalPrefix('api');

  // 全局管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // 全局过滤器（兜底在前低优先级，具体在后高优先级）& 拦截器
  app.useGlobalFilters(
    new UnhandledExceptionFilter(),
    new HttpExceptionFilter(),
  );
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger 文档（生产环境关闭）
  if (env !== 'production') {
    const config = new DocumentBuilder()
      .setTitle(swaggerConfig.title)
      .setDescription(swaggerConfig.description)
      .setVersion(swaggerConfig.version)
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(swaggerConfig.path, app, document);
  }
}
