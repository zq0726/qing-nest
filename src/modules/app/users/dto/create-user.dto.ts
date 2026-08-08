import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'qing', description: '用户名' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  username: string;

  @ApiProperty({ example: 'qing@example.com', description: '邮箱' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456', description: '密码' })
  @IsString()
  @MinLength(6)
  @MaxLength(50)
  password: string;
}
