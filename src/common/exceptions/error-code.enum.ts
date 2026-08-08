/**
 * 业务错误码枚举
 * 命名规范：模块_操作_状态，如 USER_CREATE_EXISTS
 */
export enum ErrorCode {
  // 通用错误 10xxx
  UNKNOWN = 10000,
  INVALID_PARAMS = 10001,
  UNAUTHORIZED = 10002,
  FORBIDDEN = 10003,
  NOT_FOUND = 10004,

  // 认证模块 12xxx
  AUTH_INVALID_CREDENTIALS = 12001,
  AUTH_TOKEN_EXPIRED = 12002,
  AUTH_TOKEN_INVALID = 12003,
  AUTH_USER_NOT_FOUND = 12004,

  // 用户模块 11xxx
  USER_NOT_FOUND = 11001,
  USER_ALREADY_EXISTS = 11002,
  USER_USERNAME_EXISTS = 11003,

  // 上传模块 13xxx
  UPLOAD_CHUNK_NOT_FOUND = 13001,
  UPLOAD_MERGE_FAILED = 13002,
  UPLOAD_FILE_NOT_FOUND = 13003,
  UPLOAD_CHUNK_INDEX_INVALID = 13004,

  // 定时任务模块 14xxx
  TASK_NOT_FOUND = 14001,
  TASK_NAME_EXISTS = 14002,
  TASK_SCHEDULE_EXPR_INVALID = 14003,
  TASK_PAYLOAD_INVALID = 14004,

  // 邮件模块 15xxx
  MAIL_SEND_FAILED = 15001,
  MAIL_CODE_INVALID = 15002,
  MAIL_CODE_EXPIRED = 15003,
  MAIL_CODE_SEND_TOO_FREQUENT = 15004,
}

/**
 * 错误码对应的默认消息
 */
export const ErrorMessage: Record<ErrorCode, string> = {
  [ErrorCode.UNKNOWN]: '未知错误',
  [ErrorCode.INVALID_PARAMS]: '参数错误',
  [ErrorCode.UNAUTHORIZED]: '未授权',
  [ErrorCode.FORBIDDEN]: '禁止访问',
  [ErrorCode.NOT_FOUND]: '资源不存在',

  [ErrorCode.AUTH_INVALID_CREDENTIALS]: '用户名或密码错误',
  [ErrorCode.AUTH_TOKEN_EXPIRED]: 'Token 已过期',
  [ErrorCode.AUTH_TOKEN_INVALID]: 'Token 无效',
  [ErrorCode.AUTH_USER_NOT_FOUND]: '用户不存在',

  [ErrorCode.USER_NOT_FOUND]: '用户不存在',
  [ErrorCode.USER_ALREADY_EXISTS]: '用户已存在',
  [ErrorCode.USER_USERNAME_EXISTS]: '用户名已被占用',

  [ErrorCode.UPLOAD_CHUNK_NOT_FOUND]: '分片不存在',
  [ErrorCode.UPLOAD_MERGE_FAILED]: '分片合并失败',
  [ErrorCode.UPLOAD_FILE_NOT_FOUND]: '文件不存在',
  [ErrorCode.UPLOAD_CHUNK_INDEX_INVALID]: '分片索引无效',

  [ErrorCode.TASK_NOT_FOUND]: '任务不存在',
  [ErrorCode.TASK_NAME_EXISTS]: '任务名称已存在',
  [ErrorCode.TASK_SCHEDULE_EXPR_INVALID]: '调度表达式无效',
  [ErrorCode.TASK_PAYLOAD_INVALID]: '任务参数 JSON 格式错误',

  [ErrorCode.MAIL_SEND_FAILED]: '邮件发送失败',
  [ErrorCode.MAIL_CODE_INVALID]: '验证码无效',
  [ErrorCode.MAIL_CODE_EXPIRED]: '验证码已过期',
  [ErrorCode.MAIL_CODE_SEND_TOO_FREQUENT]: '验证码发送过于频繁',
};
