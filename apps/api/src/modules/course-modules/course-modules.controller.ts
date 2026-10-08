import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth-user.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../generated/prisma/enums.js';
import {
  CourseModulesService,
  type LearnCourseRecord,
  type ModuleDetailRecord,
  type TeachingModuleRecord,
} from './course-modules.service.js';
import { CreateModuleDto } from './dto/create-module.dto.js';
import { UpdateModuleDto } from './dto/update-module.dto.js';

@ApiTags('modules')
@ApiBearerAuth()
@Controller()
export class CourseModulesController {
  constructor(private readonly modules: CourseModulesService) {}

  @Roles(Role.ADMIN)
  @Post('courses/:id/modules')
  create(@Param('id') courseId: string, @Body() dto: CreateModuleDto) {
    return this.modules.create(courseId, dto);
  }

  @Roles(Role.ADMIN)
  @Patch('modules/:id')
  update(@Param('id') id: string, @Body() dto: UpdateModuleDto) {
    return this.modules.update(id, dto);
  }

  @Roles(Role.ADMIN)
  @Delete('modules/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.modules.remove(id);
  }

  /** Enrolled students (unlocked modules only), the module's instructor and admins. */
  @Get('modules/:id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<ModuleDetailRecord> {
    return this.modules.findDetail(user, id);
  }

  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @Get('me/modules')
  teaching(@CurrentUser() user: AuthUser): Promise<TeachingModuleRecord[]> {
    return this.modules.listTeaching(user);
  }

  @Roles(Role.STUDENT)
  @Get('me/courses/:slug')
  learn(@CurrentUser() user: AuthUser, @Param('slug') slug: string): Promise<LearnCourseRecord> {
    return this.modules.learnCourse(user.id, slug);
  }
}
