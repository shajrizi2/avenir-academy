import { Module } from '@nestjs/common';
import { InstructorsController } from './instructors.controller.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

@Module({
  controllers: [UsersController, InstructorsController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
