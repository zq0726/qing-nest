import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { RedisService } from '@/modules/system/redis/redis.service';
import { BusinessException } from '@/common/exceptions/business.exception';
import { ErrorCode } from '@/common/exceptions/error-code.enum';

/** 内存降级存储结构 */
interface MemoryCodeEntry {
  code: string;
  expires: number;
  sentAt: number;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;

  /** Redis 未启用时的内存降级存储 */
  private readonly memoryCodes = new Map<string, MemoryCodeEntry>();

  /** 验证码有效期 5 分钟（秒） */
  private readonly CODE_TTL = 5 * 60;
  /** 发送频率限制 60 秒 */
  private readonly SEND_INTERVAL = 60;

  constructor(
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST', 'smtp.qq.com'),
      port: this.configService.get<number>('SMTP_PORT', 465),
      secure: this.configService.get<number>('SMTP_PORT', 465) === 465,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });

    const user = this.configService.get<string>('SMTP_USER', '');
    this.from =
      this.configService.get<string>('SMTP_FROM', '') ||
      `"Qing Nest" <${user}>`;
  }

  private codeKey(email: string) {
    return `mail:code:${email}`;
  }

  private limitKey(email: string) {
    return `mail:limit:${email}`;
  }

  /** 发送验证码到指定邮箱 */
  async sendVerificationCode(email: string) {
    // 频率限制
    await this.checkRateLimit(email);

    // 生成 6 位验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 发送邮件
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: email,
        subject: '【Qing Nest】邮箱验证码',
        html: this.buildEmailHtml(code),
      });
    } catch (err) {
      this.logger.error(`邮件发送失败: ${(err as Error).message}`);
      BusinessException.throw(ErrorCode.MAIL_SEND_FAILED);
    }

    // 存储验证码
    await this.storeCode(email, code);

    const storage = this.redis.isConnected ? 'Redis' : '内存';
    this.logger.log(`验证码已发送至 ${email} (存储: ${storage})`);
    return { message: '验证码已发送' };
  }

  /** 校验验证码 */
  async verifyCode(email: string, code: string): Promise<boolean> {
    const stored = await this.getCode(email);

    if (!stored) {
      BusinessException.throw(ErrorCode.MAIL_CODE_INVALID);
    }

    if (stored !== code) {
      BusinessException.throw(ErrorCode.MAIL_CODE_INVALID);
    }

    // 验证成功，删除验证码
    await this.deleteCode(email);
    return true;
  }

  // ========== 内部方法 ==========

  private async checkRateLimit(email: string) {
    if (this.redis.isConnected) {
      const limited = await this.redis.exists(this.limitKey(email));
      if (limited) {
        const remain = await this.redis.ttl(this.limitKey(email));
        BusinessException.throw(
          ErrorCode.MAIL_CODE_SEND_TOO_FREQUENT,
          `请 ${remain > 0 ? remain : this.SEND_INTERVAL} 秒后再试`,
        );
      }
    } else {
      const existing = this.memoryCodes.get(email);
      if (
        existing &&
        Date.now() - existing.sentAt < this.SEND_INTERVAL * 1000
      ) {
        const remain = Math.ceil(
          (this.SEND_INTERVAL * 1000 - (Date.now() - existing.sentAt)) / 1000,
        );
        BusinessException.throw(
          ErrorCode.MAIL_CODE_SEND_TOO_FREQUENT,
          `请 ${remain} 秒后再试`,
        );
      }
    }
  }

  private async storeCode(email: string, code: string) {
    if (this.redis.isConnected) {
      // Redis 自动过期，无需手动清理
      await this.redis.set(this.codeKey(email), code, this.CODE_TTL);
      await this.redis.set(this.limitKey(email), '1', this.SEND_INTERVAL);
    } else {
      this.memoryCodes.set(email, {
        code,
        expires: Date.now() + this.CODE_TTL * 1000,
        sentAt: Date.now(),
      });
    }
  }

  private async getCode(email: string): Promise<string | null> {
    if (this.redis.isConnected) {
      return this.redis.get(this.codeKey(email));
    }

    const entry = this.memoryCodes.get(email);
    if (!entry) return null;

    // 内存模式手动检查过期
    if (Date.now() > entry.expires) {
      this.memoryCodes.delete(email);
      return null;
    }
    return entry.code;
  }

  private async deleteCode(email: string) {
    if (this.redis.isConnected) {
      await this.redis.del(this.codeKey(email));
      await this.redis.del(this.limitKey(email));
    } else {
      this.memoryCodes.delete(email);
    }
  }

  /** 构建邮件 HTML */
  private buildEmailHtml(code: string): string {
    return `
      <div style="max-width:480px;margin:0 auto;padding:32px;font-family:sans-serif;">
        <h2 style="color:#333;">邮箱验证码</h2>
        <p style="color:#666;font-size:14px;">您正在进行邮箱验证，验证码为：</p>
        <div style="margin:24px 0;text-align:center;">
          <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#1890ff;">${code}</span>
        </div>
        <p style="color:#999;font-size:12px;">验证码 5 分钟内有效，请勿泄露给他人。</p>
      </div>
    `;
  }
}
