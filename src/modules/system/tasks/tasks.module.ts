import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from '@/modules/system/tasks/task.entity';
import { TasksService } from '@/modules/system/tasks/tasks.service';
import { TasksController } from '@/modules/system/tasks/tasks.controller';
import { WebsocketModule } from '@/modules/system/websocket/websocket.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([Task]),
    WebsocketModule,
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
