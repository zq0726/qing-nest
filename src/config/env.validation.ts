import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),

  // CORS
  CORS_ORIGINS: Joi.string().default('http://localhost:5173'),

  // MySQL
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().default(3306),
  DB_USERNAME: Joi.string().default('root'),
  DB_PASSWORD: Joi.string().allow('').default(''),
  DB_DATABASE: Joi.string().default('qing_nest'),

  // Redis
  REDIS_ENABLED: Joi.boolean().default(false),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').default(''),
  REDIS_DB: Joi.number().default(0),

  // JWT
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),

  // Schedule / Tasks（是否启用定时任务）
  SCHEDULE_ENABLED: Joi.boolean().default(true),

  // WebSocket
  WS_CORS_ORIGINS: Joi.string().allow('').default(''),

  // Mail (SMTP)
  SMTP_HOST: Joi.string().default('smtp.qq.com'),
  SMTP_PORT: Joi.number().default(465),
  SMTP_USER: Joi.string().allow('').default(''),
  SMTP_PASS: Joi.string().allow('').default(''),
  SMTP_FROM: Joi.string().allow('').default(''),
});
