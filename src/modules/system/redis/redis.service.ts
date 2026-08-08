import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis | null) {}

  get isConnected() {
    return this.client !== null;
  }

  private assertConnected() {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'Redis is not enabled. Set REDIS_ENABLED=true to use it.',
      );
    }
  }

  async get(key: string) {
    this.assertConnected();
    return this.client!.get(key);
  }

  async set(key: string, value: string, ttl?: number) {
    this.assertConnected();
    if (ttl) {
      return this.client!.set(key, value, 'EX', ttl);
    }
    return this.client!.set(key, value);
  }

  async del(key: string) {
    this.assertConnected();
    return this.client!.del(key);
  }

  async exists(key: string) {
    this.assertConnected();
    return this.client!.exists(key);
  }

  /** 获取 key 的剩余过期时间（秒），-1=永不过期，-2=不存在 */
  async ttl(key: string): Promise<number> {
    this.assertConnected();
    return this.client!.ttl(key);
  }

  /** Set: 添加成员 */
  async sadd(key: string, ...members: string[]) {
    this.assertConnected();
    return this.client!.sadd(key, ...members);
  }

  /** Set: 移除成员 */
  async srem(key: string, ...members: string[]) {
    this.assertConnected();
    return this.client!.srem(key, ...members);
  }

  /** Set: 获取所有成员 */
  async smembers(key: string): Promise<string[]> {
    this.assertConnected();
    return this.client!.smembers(key);
  }

  /** Set: 判断成员是否存在 */
  async sismember(key: string, member: string): Promise<boolean> {
    this.assertConnected();
    const result = await this.client!.sismember(key, member);
    return result === 1;
  }

  /** Set: 获取成员数量 */
  async scard(key: string): Promise<number> {
    this.assertConnected();
    return this.client!.scard(key);
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Redis connection closed');
    }
  }
}
