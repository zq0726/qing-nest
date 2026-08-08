import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@/modules/system/redis/redis.service';
import { Server, Socket } from 'socket.io';

/** Redis 键名约定 */
const KEYS = {
  onlineUsers: 'ws:user:connections',
  userSockets: (userId: number | string) => `ws:user:${userId}:socketIds`,
  roomUsers: (room: string) => `ws:room:${room}:users`,
};

/** 在线用户信息（对外返回时用） */
export interface OnlineUser {
  userId: string;
  socketIds: string[];
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private server: Server | null = null;

  /** 内存降级：Redis 未启用时使用（仅单实例可用） */
  private fallbackOnline = new Set<string>();
  private fallbackUserSockets = new Map<string, Set<string>>();
  private fallbackRooms = new Map<string, Set<string>>();

  constructor(private readonly redis: RedisService) {}

  setServer(server: Server) {
    this.server = server;
  }

  /** 用户连接上线 */
  async addUserConnection(userId: string, socketId: string): Promise<void> {
    if (this.redis.isConnected) {
      await Promise.all([
        this.redis.sadd(KEYS.onlineUsers, userId),
        this.redis.sadd(KEYS.userSockets(userId), socketId),
      ]);
    } else {
      this.fallbackOnline.add(userId);
      if (!this.fallbackUserSockets.has(userId)) {
        this.fallbackUserSockets.set(userId, new Set());
      }
      this.fallbackUserSockets.get(userId)!.add(socketId);
    }
    this.logger.log(`[WS] 用户 ${userId} 上线 (socket=${socketId})`);
  }

  /** 用户连接下线 */
  async removeUserConnection(userId: string, socketId: string): Promise<void> {
    if (this.redis.isConnected) {
      await this.redis.srem(KEYS.userSockets(userId), socketId);
      const rest = await this.redis.scard(KEYS.userSockets(userId));
      if (rest === 0) {
        await this.redis.srem(KEYS.onlineUsers, userId);
      }
    } else {
      this.fallbackUserSockets.get(userId)?.delete(socketId);
      if ((this.fallbackUserSockets.get(userId)?.size ?? 0) === 0) {
        this.fallbackUserSockets.delete(userId);
        this.fallbackOnline.delete(userId);
      }
    }
    this.logger.log(`[WS] 用户 ${userId} 下线 (socket=${socketId})`);
  }

  /** 获取在线用户 ID 列表 */
  async getOnlineUserIds(): Promise<string[]> {
    if (this.redis.isConnected) {
      return this.redis.smembers(KEYS.onlineUsers);
    }
    return Array.from(this.fallbackOnline);
  }

  /** 判断某个用户是否在线 */
  async isUserOnline(userId: string): Promise<boolean> {
    if (this.redis.isConnected) {
      return this.redis.sismember(KEYS.onlineUsers, userId);
    }
    return this.fallbackOnline.has(userId);
  }

  /** 获取某个用户的所有 socketId（多端登录） */
  async getUserSocketIds(userId: string): Promise<string[]> {
    if (this.redis.isConnected) {
      return this.redis.smembers(KEYS.userSockets(userId));
    }
    const set = this.fallbackUserSockets.get(userId);
    return set ? Array.from(set) : [];
  }

  /** 向特定用户发送消息（所有端） */
  async sendToUser(userId: string, event: string, payload: any) {
    const sockets = await this.getUserSocketIds(userId);
    if (!this.server) return;
    sockets.forEach((sid) => {
      this.server!.to(sid).emit(event, payload);
    });
  }

  /** 广播消息（给所有已连接客户端） */
  broadcast(event: string, payload: any) {
    if (!this.server) return;
    this.server.emit(event, payload);
  }

  /** 加入房间 */
  async joinRoom(socket: Socket, room: string, userId: string) {
    await socket.join(room);
    if (this.redis.isConnected) {
      await this.redis.sadd(KEYS.roomUsers(room), userId);
    } else {
      if (!this.fallbackRooms.has(room)) {
        this.fallbackRooms.set(room, new Set());
      }
      this.fallbackRooms.get(room)!.add(userId);
    }
    this.logger.log(`[WS] 用户 ${userId} 加入房间 ${room}`);
  }

  /** 离开房间 */
  async leaveRoom(socket: Socket, room: string, userId: string) {
    await socket.leave(room);
    if (this.redis.isConnected) {
      await this.redis.srem(KEYS.roomUsers(room), userId);
    } else {
      this.fallbackRooms.get(room)?.delete(userId);
    }
    this.logger.log(`[WS] 用户 ${userId} 离开房间 ${room}`);
  }

  /** 向房间发送消息 */
  sendToRoom(room: string, event: string, payload: any) {
    if (!this.server) return;
    this.server.to(room).emit(event, payload);
  }

  /** 获取房间成员 */
  async getRoomMembers(room: string): Promise<string[]> {
    if (this.redis.isConnected) {
      return this.redis.smembers(KEYS.roomUsers(room));
    }
    const set = this.fallbackRooms.get(room);
    return set ? Array.from(set) : [];
  }
}
