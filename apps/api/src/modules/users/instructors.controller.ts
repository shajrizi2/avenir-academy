import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import type { PublicInstructorRecord } from './user.select.js';
import { UsersService } from './users.service.js';

@ApiTags('users')
@Controller('instructors')
export class InstructorsController {
  constructor(private readonly users: UsersService) {}

  @Public()
  @Get()
  list(): Promise<PublicInstructorRecord[]> {
    return this.users.listInstructors();
  }
}
