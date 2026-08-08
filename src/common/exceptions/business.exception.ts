import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode, ErrorMessage } from '@/common/exceptions/error-code.enum';

export class BusinessException extends HttpException {
  readonly code: ErrorCode;
  readonly message: string;

  constructor(code: ErrorCode, message?: string, status?: HttpStatus) {
    const msg = message ?? ErrorMessage[code] ?? '未知错误';
    super({ code, message: msg }, status ?? HttpStatus.BAD_REQUEST);
    this.code = code;
    this.message = msg;
  }

  static throw(code: ErrorCode, message?: string, status?: HttpStatus): never {
    throw new BusinessException(code, message, status);
  }
}
