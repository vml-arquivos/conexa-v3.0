import { Module } from '@nestjs/common';
import { ClassroomPostsService } from './classroom-posts.service';
import { ClassroomPostsController } from './classroom-posts.controller';

@Module({
  controllers: [ClassroomPostsController],
  providers: [ClassroomPostsService],
  exports: [ClassroomPostsService],
})
export class ClassroomPostsModule {}
