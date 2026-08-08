import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({ example: 'qing', description: '用户名', required: false })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @IsOptional()
  username?: string;

  @ApiProperty({
    example: 'qing@example.com',
    description: '邮箱',
    required: false,
  })
  @IsEmail()
  @IsOptional()
  email?: string;
}
