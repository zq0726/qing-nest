import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'qing', description: '用户名' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  username: string;

  @ApiProperty({ example: '123456', description: '密码' })
  @IsString()
  @MinLength(6)
  @MaxLength(50)
  password: string;
}
