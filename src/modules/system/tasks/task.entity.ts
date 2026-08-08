import { Column, Entity } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { TaskType, ScheduleType } from '@/modules/system/tasks/task-type.enum';

@Entity('tasks')
export class Task extends BaseEntity {
  /** 任务名称（唯一，作为调度器内部 key） */
  @Column({ length: 100, unique: true })
  name: string;

  /** 任务类型 */
  @Column({ type: 'varchar', length: 30 })
  type: TaskType;

  /** 调度类型：cron | interval */
  @Column({ type: 'varchar', length: 10 })
  scheduleType: ScheduleType;

  /** 调度表达式：cron 表达式 或 间隔毫秒数字符串 */
  @Column({ length: 100 })
  scheduleExpr: string;

  /** 任务参数（JSON 字符串，按 type 解释） */
  @Column({ type: 'text', nullable: true })
  payload: string;

  /** 是否启用 */
  @Column({ default: true })
  enabled: boolean;

  /** 上次执行时间 */
  @Column({ type: 'datetime', nullable: true })
  lastRunAt: Date;

  /** 上次执行状态：success | failed */
  @Column({ type: 'varchar', length: 20, nullable: true })
  lastStatus: string;

  /** 上次错误信息 */
  @Column({ type: 'text', nullable: true })
  lastError: string | null;

  /** 累计执行次数 */
  @Column({ type: 'int', default: 0 })
  runCount: number;
}
