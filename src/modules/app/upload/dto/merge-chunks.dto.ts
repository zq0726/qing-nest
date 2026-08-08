import { IsString, IsInt, Min, Matches, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MergeChunksDto {
  @ApiProperty({ example: 'a1b2c3d4e5f6...', description: '文件整体 hash' })
  @IsString()
  @Matches(/^[a-zA-Z0-9]+$/, { message: 'fileHash 只允许字母和数字' })
  fileHash: string;

  @ApiProperty({ example: 'video.mp4', description: '原始文件名' })
  @IsString()
  @MaxLength(255)
  filename: string;

  @ApiProperty({ example: 10, description: '分片总数' })
  @IsInt()
  @Min(1)
  totalChunks: number;
}
