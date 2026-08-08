import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CronJob } from 'cron';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import { join } from 'path';
import { Task } from '@/modules/system/tasks/task.entity';
import { TaskType, ScheduleType } from '@/modules/system/tasks/task-type.enum';
import {
  CreateTaskDto,
  UpdateTaskDto,
} from '@/modules/system/tasks/dto/task.dto';
import { BusinessException } from '@/common/exceptions/business.exception';
import { ErrorCode } from '@/common/exceptions/error-code.enum';
import { ChatService } from '@/modules/system/websocket/chat.service';

/** 任务 payload 结构（从 JSON 字符串解析） */
interface TaskPayload {
  message?: string;
  maxAgeHours?: number;
  event?: string;
  data?: unknown;
  url?: string;
  method?: string;
  headers?: Record<string, string>;
}

interface RunningJob {
  stop: () => void;
}

@Injectable()
export class TasksService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TasksService.name);
  private readonly jobs = new Map<string, RunningJob>();
  private readonly running = new Set<string>(); // 防并发：正在执行的任务名
  private readonly tmpDir = join(process.cwd(), 'uploads', 'tmp');

  constructor(
    @InjectRepository(Task)
    private readonly repo: Repository<Task>,
    private readonly chatService: ChatService,
  ) {}

  /** 启动时从数据库加载所有启用的任务并注册 */
  async onModuleInit() {
    const tasks = await this.repo.find({ where: { enabled: true } });
    for (const task of tasks) {
      this.registerJob(task);
    }
    this.logger.log(`已加载 ${tasks.length} 个定时任务`);

    // 表为空时 seed 默认任务
    const total = await this.repo.count();
    if (total === 0) {
      await this.seedDefaults();
    }
  }

  onModuleDestroy() {
    for (const name of Array.from(this.jobs.keys())) {
      this.unregisterJob(name);
    }
    this.logger.log('所有定时任务已停止');
  }

  // ========== CRUD ==========

  async findAll() {
    return this.repo.find({ order: { id: 'ASC' } });
  }

  async findOne(id: number) {
    const task = await this.repo.findOneBy({ id });
    if (!task) {
      BusinessException.throw(ErrorCode.TASK_NOT_FOUND, undefined, 404);
    }
    return task;
  }

  async create(dto: CreateTaskDto) {
    const exists = await this.repo.findOne({
      where: { name: dto.name },
    });
    if (exists) {
      BusinessException.throw(ErrorCode.TASK_NAME_EXISTS);
    }

    this.validateScheduleExpr(dto.scheduleType, dto.scheduleExpr);
    if (dto.payload) {
      this.validatePayload(dto.payload);
    }

    const task = this.repo.create({
      name: dto.name,
      type: dto.type,
      scheduleType: dto.scheduleType,
      scheduleExpr: dto.scheduleExpr,
      payload: dto.payload,
      enabled: dto.enabled ?? true,
    });
    const saved = await this.repo.save(task);

    if (saved.enabled) {
      this.registerJob(saved);
    }
    return saved;
  }

  async update(id: number, dto: UpdateTaskDto) {
    const task = await this.findOne(id);

    if (dto.name && dto.name !== task.name) {
      const dup = await this.repo.findOne({ where: { name: dto.name } });
      if (dup) {
        BusinessException.throw(ErrorCode.TASK_NAME_EXISTS);
      }
    }
    if (dto.scheduleType && dto.scheduleExpr) {
      this.validateScheduleExpr(dto.scheduleType, dto.scheduleExpr);
    } else if (dto.scheduleType && !dto.scheduleExpr) {
      this.validateScheduleExpr(dto.scheduleType, task.scheduleExpr);
    } else if (!dto.scheduleType && dto.scheduleExpr) {
      this.validateScheduleExpr(task.scheduleType, dto.scheduleExpr);
    }
    if (dto.payload !== undefined && dto.payload) {
      this.validatePayload(dto.payload);
    }

    // 先注销旧调度
    this.unregisterJob(task.name);

    Object.assign(task, dto);
    await this.repo.save(task);

    if (task.enabled) {
      this.registerJob(task);
    }
    // 重新查询返回完整数据
    return this.findOne(id);
  }

  async remove(id: number) {
    const task = await this.findOne(id);
    this.unregisterJob(task.name);
    await this.repo.remove(task);
    return { id };
  }

  /** 启用/禁用 */
  async toggle(id: number, enabled: boolean) {
    const task = await this.findOne(id);
    task.enabled = enabled;
    const saved = await this.repo.save(task);

    if (enabled) {
      this.registerJob(saved);
    } else {
      this.unregisterJob(task.name);
    }
    return saved;
  }

  /** 手动触发执行一次（不影响调度） */
  async runOnce(id: number) {
    const task = await this.findOne(id);
    await this.executeTask(task);
    return await this.findOne(id);
  }

  // ========== 调度注册 ==========

  private registerJob(task: Task) {
    this.unregisterJob(task.name);

    try {
      if (task.scheduleType === ScheduleType.CRON) {
        const job = new CronJob(task.scheduleExpr, () => {
          void this.executeTask(task).catch((e: Error) =>
            this.logger.error(`任务 ${task.name} 执行异常: ${e.message}`),
          );
        });
        job.start();
        this.jobs.set(task.name, {
          stop: () => {
            void job.stop();
          },
        });
      } else {
        const ms = parseInt(task.scheduleExpr, 10);
        if (Number.isNaN(ms) || ms < 1000) {
          this.logger.warn(
            `任务 ${task.name} 的 interval 无效: ${task.scheduleExpr}`,
          );
          return;
        }
        const timer = setInterval(() => {
          void this.executeTask(task).catch((e: Error) =>
            this.logger.error(`任务 ${task.name} 执行异常: ${e.message}`),
          );
        }, ms);
        this.jobs.set(task.name, { stop: () => clearInterval(timer) });
      }
      this.logger.log(
        `已注册任务: ${task.name} (${task.scheduleType}: ${task.scheduleExpr})`,
      );
    } catch (e) {
      this.logger.error(`注册任务 ${task.name} 失败: ${(e as Error).message}`);
    }
  }

  private unregisterJob(name: string) {
    const existing = this.jobs.get(name);
    if (existing) {
      existing.stop();
      this.jobs.delete(name);
      this.logger.log(`已注销任务: ${name}`);
    }
  }

  // ========== 任务执行 ==========

  private async executeTask(task: Task) {
    // 防并发：同一任务正在执行时跳过本次触发
    if (this.running.has(task.name)) {
      this.logger.warn(`[跳过] 任务 ${task.name} 上一次执行尚未完成`);
      return;
    }
    this.running.add(task.name);

    const start = Date.now();
    this.logger.debug(`[执行开始] ${task.name} (${task.type})`);

    try {
      const payload: TaskPayload = task.payload
        ? (JSON.parse(task.payload) as TaskPayload)
        : {};
      await this.dispatch(task.type, task.name, payload);
      await this.repo.update(task.id, {
        lastRunAt: new Date(),
        lastStatus: 'success',
        lastError: null,
      });
      await this.repo.increment({ id: task.id }, 'runCount', 1);
      this.logger.log(`[执行完成] ${task.name} 耗时 ${Date.now() - start}ms`);
    } catch (e) {
      const err = e as Error;
      await this.repo.update(task.id, {
        lastRunAt: new Date(),
        lastStatus: 'failed',
        lastError: err.message,
      });
      await this.repo.increment({ id: task.id }, 'runCount', 1);
      this.logger.error(`[执行失败] ${task.name}: ${err.message}`);
    } finally {
      this.running.delete(task.name);
    }
  }

  /** 根据 type 分发执行 */
  private async dispatch(type: TaskType, name: string, payload: TaskPayload) {
    switch (type) {
      case TaskType.NOTIFY:
        this.logger.log(`[Notify] ${name}: ${payload.message ?? '(无内容)'}`);
        break;

      case TaskType.CLEANUP_TMP:
        await this.cleanupTempFiles(payload.maxAgeHours ?? 24);
        break;

      case TaskType.WS_BROADCAST: {
        const event = payload.event ?? 'task:broadcast';
        const data = payload.data ?? { task: name };
        this.chatService.broadcast(event, data);
        this.logger.log(`[WS Broadcast] ${name} -> ${event}`);
        break;
      }

      case TaskType.WEBHOOK:
        await this.callWebhook(
          payload.url ?? '',
          payload.method ?? 'POST',
          payload.data,
          payload.headers ?? {},
        );
        break;

      default:
        this.logger.warn(`未知任务类型: ${String(type)}`);
    }
  }

  // ========== 内置执行器 ==========

  private async cleanupTempFiles(maxAgeHours: number) {
    if (!existsSync(this.tmpDir)) {
      this.logger.log('[Cleanup] tmp 目录不存在，跳过');
      return;
    }
    const entries = await fs.readdir(this.tmpDir, { withFileTypes: true });
    const now = Date.now();
    let removed = 0;

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const dirPath = join(this.tmpDir, entry.name);
      try {
        const stat = await fs.stat(dirPath);
        const ageHours = (now - stat.mtimeMs) / 3600000;
        if (ageHours > maxAgeHours) {
          await fs.rm(dirPath, { recursive: true, force: true });
          removed++;
        }
      } catch {
        // 单个目录失败不影响其他
      }
    }
    this.logger.log(
      `[Cleanup] 清理 ${removed} 个超过 ${maxAgeHours}h 的临时目录`,
    );
  }

  private async callWebhook(
    url: string,
    method: string,
    data: unknown,
    headers: Record<string, string>,
  ) {
    if (!url) {
      throw new Error('Webhook url 未配置');
    }
    const resp = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body:
        method !== 'GET' && method !== 'HEAD'
          ? JSON.stringify(data)
          : undefined,
    });
    if (!resp.ok) {
      throw new Error(`Webhook 返回 ${resp.status}: ${await resp.text()}`);
    }
    this.logger.log(`[Webhook] ${method} ${url} -> ${resp.status}`);
  }

  // ========== 校验 ==========

  private validateScheduleExpr(type: ScheduleType, expr: string) {
    if (type === ScheduleType.CRON) {
      try {
        // cron 包会在构造时校验，这里用同样方式试探
        new CronJob(expr, () => {});
      } catch {
        BusinessException.throw(ErrorCode.TASK_SCHEDULE_EXPR_INVALID);
      }
    } else {
      const ms = parseInt(expr, 10);
      if (Number.isNaN(ms) || ms < 1000) {
        BusinessException.throw(
          ErrorCode.TASK_SCHEDULE_EXPR_INVALID,
          undefined,
        );
      }
    }
  }

  private validatePayload(payload: string) {
    try {
      JSON.parse(payload);
    } catch {
      BusinessException.throw(ErrorCode.TASK_PAYLOAD_INVALID);
    }
  }

  // ========== 种子数据 ==========

  private async seedDefaults() {
    this.logger.log('首次启动，写入默认任务...');
    const defaults: Partial<Task>[] = [
      {
        name: 'heartbeat',
        type: TaskType.NOTIFY,
        scheduleType: ScheduleType.CRON,
        scheduleExpr: '0 * * * *',
        payload: JSON.stringify({ message: '服务心跳正常' }),
        enabled: true,
      },
      {
        name: 'cleanup-tmp',
        type: TaskType.CLEANUP_TMP,
        scheduleType: ScheduleType.CRON,
        scheduleExpr: '0 0 3 * * *',
        payload: JSON.stringify({ maxAgeHours: 24 }),
        enabled: true,
      },
    ];
    for (const d of defaults) {
      const task = this.repo.create(d);
      const saved = await this.repo.save(task);
      if (saved.enabled) {
        this.registerJob(saved);
      }
    }
    this.logger.log(`已写入 ${defaults.length} 个默认任务`);
  }
}
