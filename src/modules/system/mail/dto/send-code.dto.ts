import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendCodeDto {
  @ApiProperty({ example: 'user@example.com', description: '接收验证码的邮箱' })
  @IsEmail()
  email: string;
}
