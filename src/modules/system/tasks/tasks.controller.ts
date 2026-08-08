import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { TasksService } from '@/modules/system/tasks/tasks.service';
import {
  CreateTaskDto,
  UpdateTaskDto,
} from '@/modules/system/tasks/dto/task.dto';

@ApiTags('tasks')
@ApiBearerAuth()
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({ summary: '获取所有定时任务' })
  findAll() {
    return this.tasksService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个定时任务' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tasksService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '创建定时任务' })
  create(@Body() dto: CreateTaskDto) {
    return this.tasksService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新定时任务' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTaskDto) {
    return this.tasksService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除定时任务' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tasksService.remove(id);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: '启用/禁用定时任务' })
  @ApiQuery({
    name: 'enabled',
    type: Boolean,
    description: 'true=启用 false=禁用',
  })
  toggle(
    @Param('id', ParseIntPipe) id: number,
    @Query('enabled') enabled: string,
  ) {
    return this.tasksService.toggle(id, enabled === 'true');
  }

  @Post(':id/run')
  @ApiOperation({ summary: '手动触发执行一次（不影响调度）' })
  runOnce(@Param('id', ParseIntPipe) id: number) {
    return this.tasksService.runOnce(id);
  }
}
