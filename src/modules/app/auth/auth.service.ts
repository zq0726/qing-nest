import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '@/modules/app/users/users.service';
import { BusinessException } from '@/common/exceptions/business.exception';
import { ErrorCode } from '@/common/exceptions/error-code.enum';
import { LoginDto } from '@/modules/app/auth/dto/login.dto';
import { comparePassword } from '@/common/utils/bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersService.findByUsername(dto.username);

    if (!user) {
      BusinessException.throw(
        ErrorCode.AUTH_INVALID_CREDENTIALS,
        undefined,
        401,
      );
    }

    const isMatch = await comparePassword(dto.password, user.password);
    if (!isMatch) {
      BusinessException.throw(
        ErrorCode.AUTH_INVALID_CREDENTIALS,
        undefined,
        401,
      );
    }

    const payload = { sub: user.id, username: user.username };
    const token = this.jwtService.sign(payload);

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    };
  }

  async verifyToken(token: string): Promise<{ sub: number; username: string }> {
    try {
      return await this.jwtService.verifyAsync<{
        sub: number;
        username: string;
      }>(token);
    } catch (err) {
      if ((err as Error).name === 'TokenExpiredError') {
        BusinessException.throw(ErrorCode.AUTH_TOKEN_EXPIRED, undefined, 401);
      }
      BusinessException.throw(ErrorCode.AUTH_TOKEN_INVALID, undefined, 401);
    }
  }
}
