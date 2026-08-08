/**
 * 定时任务类型：决定任务到点后执行什么逻辑
 */
export enum TaskType {
  /** 系统通知：记录一条日志 */
  NOTIFY = 'notify',
  /** 清理 uploads/tmp 临时分片 */
  CLEANUP_TMP = 'cleanup_tmp',
  /** WebSocket 广播消息 */
  WS_BROADCAST = 'ws_broadcast',
  /** 调用外部 HTTP 接口 */
  WEBHOOK = 'webhook',
}

/**
 * 调度类型
 */
export enum ScheduleType {
  /** cron 表达式，如 "0 * * * *" 表示每分钟 */
  CRON = 'cron',
  /** 固定间隔毫秒数，如 60000 表示每分钟 */
  INTERVAL = 'interval',
}

export const TaskTypeLabels: Record<TaskType, string> = {
  [TaskType.NOTIFY]: '系统通知',
  [TaskType.CLEANUP_TMP]: '清理临时文件',
  [TaskType.WS_BROADCAST]: 'WebSocket 广播',
  [TaskType.WEBHOOK]: 'Webhook 调用',
};

export const ScheduleTypeLabels: Record<ScheduleType, string> = {
  [ScheduleType.CRON]: 'Cron 表达式',
  [ScheduleType.INTERVAL]: '固定间隔(ms)',
};
