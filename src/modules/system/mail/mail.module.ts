import { Module } from '@nestjs/common';
import { MailService } from '@/modules/system/mail/mail.service';
import { RedisModule } from '@/modules/system/redis/redis.module';

@Module({
  imports: [RedisModule],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
