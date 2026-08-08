import { Module } from '@nestjs/common';
import { UploadController } from '@/modules/app/upload/upload.controller';
import { UploadService } from '@/modules/app/upload/upload.service';

@Module({
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
