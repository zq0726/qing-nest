import { IsEmail, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyCodeDto {
  @ApiProperty({ example: 'user@example.com', description: '邮箱' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456', description: '验证码' })
  @IsString()
  @Length(6, 6)
  code: string;
}
