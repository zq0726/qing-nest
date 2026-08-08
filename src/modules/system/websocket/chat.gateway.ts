import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { ChatService } from '@/modules/system/websocket/chat.service';

export interface ChatMessage {
  userId: string;
  content: string;
  timestamp: number;
}

/**
 * 薄 Gateway：只负责协议层（连接/断开/事件分发），
 * 所有业务逻辑委托给 ChatService。
 *
 * 安全：连接时强制验证 JWT，无 token 或无效 token 直接断开。
 */
@WebSocketGateway({
  namespace: '/',
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(ChatGateway.name);
  private readonly allowedOrigins: string[];

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    this.allowedOrigins = this.configService
      .get<string>('WS_CORS_ORIGINS', '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
  }

  afterInit(server: Server) {
    this.chatService.setServer(server);
    // WebSocket 不受 HTTP CORS 限制，Origin 白名单在 handleConnection 中通过 checkOrigin 校验
    const corsDesc =
      this.allowedOrigins.length > 0 ? this.allowedOrigins.join(', ') : '不限';
    this.logger.log(`WebSocket Gateway initialized (CORS: ${corsDesc})`);
  }

  /** Origin 白名单校验 */
  private checkOrigin(client: Socket): boolean {
    if (this.allowedOrigins.length === 0) return true;
    const origin =
      client.handshake.headers.origin ?? client.handshake.headers.referer ?? '';
    return this.allowedOrigins.some((o) => origin.startsWith(o));
  }

  /** 验证 JWT，返回 userId；失败返回 null */
  private verifyToken(client: Socket): string | null {
    const token =
      (client.handshake.auth?.token as string) ??
      (client.handshake.query?.token as string);

    if (!token) {
      return null;
    }

    try {
      const payload = this.jwtService.verify<{ sub: number; username: string }>(
        token,
      );
      return String(payload.sub);
    } catch {
      return null;
    }
  }

  async handleConnection(@ConnectedSocket() client: Socket) {
    // 1. Origin 校验
    if (!this.checkOrigin(client)) {
      this.logger.warn(
        `[WS] 拒绝连接：Origin 不在白名单 ${client.handshake.headers.origin ?? '(none)'}`,
      );
      client.disconnect(true);
      return;
    }

    // 2. JWT 验证（强制）
    const userId = this.verifyToken(client);
    if (!userId) {
      this.logger.warn(`[WS] 拒绝连接：JWT 验证失败 ${client.id}`);
      client.emit('system:auth-error', { message: '认证失败，请重新登录' });
      client.disconnect(true);
      return;
    }

    (client.data as { userId?: string }).userId = userId;

    await this.chatService.addUserConnection(userId, client.id);
    this.chatService.broadcast('system:user-online', {
      userId,
      onlineCount: (await this.chatService.getOnlineUserIds()).length,
    });
  }

  async handleDisconnect(@ConnectedSocket() client: Socket) {
    const userId = (client.data as { userId?: string }).userId;
    if (!userId) return;
    await this.chatService.removeUserConnection(userId, client.id);
    this.chatService.broadcast('system:user-offline', {
      userId,
      onlineCount: (await this.chatService.getOnlineUserIds()).length,
    });
  }

  /** 聊天消息：转发到房间/全局 */
  @SubscribeMessage('chat:message')
  handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: { content: string; room?: string },
  ) {
    const userId = (client.data as { userId?: string }).userId;
    const message: ChatMessage = {
      userId,
      content: payload.content,
      timestamp: Date.now(),
    };

    if (payload.room) {
      this.chatService.sendToRoom(payload.room, 'chat:message', message);
    } else {
      this.chatService.broadcast('chat:message', message);
    }

    return { ok: true };
  }

  /** 获取在线用户列表 */
  @SubscribeMessage('chat:online-list')
  async handleOnlineList() {
    const ids = await this.chatService.getOnlineUserIds();
    return {
      event: 'chat:online-list',
      data: ids,
    };
  }

  /** 加入房间 */
  @SubscribeMessage('chat:join-room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { room: string },
  ) {
    const userId = (client.data as { userId?: string }).userId;
    await this.chatService.joinRoom(client, payload.room, userId);
    const members = await this.chatService.getRoomMembers(payload.room);
    this.chatService.sendToRoom(payload.room, 'system:room-members', {
      room: payload.room,
      members,
    });
    return { ok: true, room: payload.room };
  }

  /** 离开房间 */
  @SubscribeMessage('chat:leave-room')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { room: string },
  ) {
    const userId = (client.data as { userId?: string }).userId;
    await this.chatService.leaveRoom(client, payload.room, userId);
    return { ok: true, room: payload.room };
  }

  /** 心跳 Ping */
  @SubscribeMessage('ping')
  handlePing(@MessageBody() ts: number) {
    return { event: 'pong', data: { clientTs: ts, serverTs: Date.now() } };
  }
}
