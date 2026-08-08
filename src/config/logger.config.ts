import { WinstonModuleOptions, utilities } from 'nest-winston';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';

export const getWinstonConfig = (): WinstonModuleOptions => {
  const isProd = process.env.NODE_ENV === 'production';

  return {
    transports: [
      // 控制台输出（彩色）
      new winston.transports.Console({
        level: isProd ? 'info' : 'debug',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.ms(),
          utilities.format.nestLike('QingNest', {
            prettyPrint: true,
            colors: true,
          }),
        ),
      }),

      // 全部日志文件（按天轮转）
      new DailyRotateFile({
        filename: 'logs/app-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        level: 'info',
        maxSize: '20m',
        maxFiles: '14d',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.json(),
        ),
      }),

      // 错误日志文件（按天轮转）
      new DailyRotateFile({
        filename: 'logs/error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxSize: '20m',
        maxFiles: '30d',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.json(),
        ),
      }),
    ],
  };
};
