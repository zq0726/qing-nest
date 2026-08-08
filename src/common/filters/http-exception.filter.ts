import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BusinessException } from '@/common/exceptions/business.exception';

interface ErrorResponse {
  code: number;
  message: string;
  data: null;
}

/**
 * 处理已知的 HTTP / 业务异常（4xx 为主）
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception.getStatus();
    const { code, message } = this.parseException(exception);

    this.logger.warn(
      `${request.method} ${request.url} -> ${status}: ${message}`,
    );

    const body: ErrorResponse = { code, message, data: null };
    response.status(status).json(body);
  }

  private parseException(exception: HttpException): {
    code: number;
    message: string;
  } {
    // 业务异常：使用业务错误码
    if (exception instanceof BusinessException) {
      return { code: exception.code, message: exception.message };
    }

    // 普通 HTTP 异常：使用 HTTP 状态码
    const res = exception.getResponse();
    let message: string;
    if (typeof res === 'string') {
      message = res;
    } else if (Array.isArray((res as Record<string, unknown>).message)) {
      message = ((res as Record<string, unknown[]>).message as string[]).join(
        '; ',
      );
    } else {
      const raw = (res as Record<string, unknown>).message;
      message = typeof raw === 'string' ? raw : exception.message;
    }

    const status = exception.getStatus();
    return { code: status, message };
  }
}
