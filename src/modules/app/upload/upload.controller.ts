import {
  Controller,
  Delete,
  Get,
  Post,
  Query,
  Body,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UploadService } from '@/modules/app/upload/upload.service';
import { MergeChunksDto } from '@/modules/app/upload/dto/merge-chunks.dto';
import { BusinessException } from '@/common/exceptions/business.exception';
import { ErrorCode } from '@/common/exceptions/error-code.enum';

@ApiTags('upload')
@ApiBearerAuth()
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('chunk')
  @ApiOperation({ summary: '上传分片' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        fileHash: { type: 'string', description: '文件整体 hash' },
        chunkIndex: {
          type: 'integer',
          description: '当前分片索引（从 0 开始）',
        },
        totalChunks: { type: 'integer', description: '分片总数' },
        filename: { type: 'string', description: '原始文件名' },
      },
      required: ['file', 'fileHash', 'chunkIndex', 'totalChunks', 'filename'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 单个分片最大 10MB
    }),
  )
  async uploadChunk(
    @UploadedFile() file: Express.Multer.File,
    @Body('fileHash') fileHash: string,
    @Body('chunkIndex') chunkIndex: string,
  ) {
    if (!file) {
      BusinessException.throw(ErrorCode.INVALID_PARAMS, '未收到分片文件');
    }
    const result = await this.uploadService.saveChunk(
      fileHash,
      parseInt(chunkIndex, 10),
      file.buffer,
    );
    return result;
  }

  @Get('chunks')
  @ApiOperation({ summary: '查询已上传的分片（断点续传）' })
  @ApiQuery({ name: 'fileHash', description: '文件整体 hash' })
  getUploadedChunks(@Query('fileHash') fileHash: string) {
    return this.uploadService.getUploadedChunks(fileHash);
  }

  @Post('merge')
  @ApiOperation({ summary: '合并分片' })
  mergeChunks(@Body() dto: MergeChunksDto) {
    return this.uploadService.mergeChunks(
      dto.fileHash,
      dto.filename,
      dto.totalChunks,
    );
  }

  @Delete()
  @ApiOperation({ summary: '删除文件' })
  @ApiQuery({ name: 'fileHash', description: '文件整体 hash' })
  deleteFile(@Query('fileHash') fileHash: string) {
    return this.uploadService.deleteFile(fileHash);
  }
}
