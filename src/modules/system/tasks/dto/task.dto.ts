import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TaskType, ScheduleType } from '@/modules/system/tasks/task-type.enum';

export class CreateTaskDto {
  @ApiProperty({ example: 'heartbeat', description: '任务名称（唯一）' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    enum: TaskType,
    example: TaskType.NOTIFY,
    description: '任务类型',
  })
  @IsEnum(TaskType)
  type: TaskType;

  @ApiProperty({
    enum: ScheduleType,
    example: ScheduleType.CRON,
    description: '调度类型',
  })
  @IsEnum(ScheduleType)
  scheduleType: ScheduleType;

  @ApiProperty({
    example: '* * * * *',
    description: '调度表达式：cron 或 interval 毫秒数',
  })
  @IsString()
  @MaxLength(100)
  scheduleExpr: string;

  @ApiProperty({
    required: false,
    example: '{"event":"ping","data":{}}',
    description: '任务参数（JSON 字符串）',
  })
  @IsOptional()
  @IsString()
  payload?: string;

  @ApiProperty({ required: false, default: true, description: '是否启用' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateTaskDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiProperty({ required: false, enum: TaskType })
  @IsOptional()
  @IsEnum(TaskType)
  type?: TaskType;

  @ApiProperty({ required: false, enum: ScheduleType })
  @IsOptional()
  @IsEnum(ScheduleType)
  scheduleType?: ScheduleType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  scheduleExpr?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  payload?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
