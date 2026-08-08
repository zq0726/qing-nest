import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from '@/modules/app/auth/auth.controller';
import { AuthService } from '@/modules/app/auth/auth.service';
import { JwtStrategy } from '@/modules/app/auth/strategies/jwt.strategy';
import { UsersModule } from '@/modules/app/users/users.module';
import { getJwtConfig } from '@/config/jwt.config';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getJwtConfig,
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
