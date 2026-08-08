import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ChatGateway } from '@/modules/system/websocket/chat.gateway';
import { ChatService } from '@/modules/system/websocket/chat.service';
import { getJwtConfig } from '@/config/jwt.config';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getJwtConfig,
    }),
  ],
  providers: [ChatGateway, ChatService],
  exports: [ChatService],
})
export class WebsocketModule {}
